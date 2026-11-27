package adminoperators

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"golang.org/x/crypto/bcrypt"
	"travora/api/internal/auth"
)

type mockRepo struct {
	nextID int64
	items  map[int64]OperatorSummary
	hashes map[int64]string
}

func newMockRepo() *mockRepo {
	return &mockRepo{
		nextID: 2,
		items: map[int64]OperatorSummary{
			1: {
				ID:       1,
				Name:     "Ahmad Loket",
				Email:    "operator_bandung",
				Username: "operator_bandung",
				Role:     auth.RoleOperator,
			},
		},
		hashes: make(map[int64]string),
	}
}

func (m *mockRepo) ListOperators(ctx context.Context) ([]OperatorSummary, error) {
	res := make([]OperatorSummary, 0, len(m.items))
	for _, op := range m.items {
		res = append(res, op)
	}
	return res, nil
}

func (m *mockRepo) ExistsByUsername(ctx context.Context, username string) (bool, error) {
	for _, op := range m.items {
		if strings.EqualFold(op.Username, username) {
			return true, nil
		}
	}
	return false, nil
}

func (m *mockRepo) CreateOperator(ctx context.Context, name, username, passwordHash string) (*OperatorSummary, error) {
	id := m.nextID
	m.nextID++
	op := OperatorSummary{
		ID:       id,
		Name:     name,
		Email:    username,
		Username: username,
		Role:     auth.RoleOperator,
	}
	m.items[id] = op
	m.hashes[id] = passwordHash
	return &op, nil
}

func (m *mockRepo) DeleteOperator(ctx context.Context, id int64) error {
	if _, ok := m.items[id]; !ok {
		return ErrOperatorNotFound
	}
	delete(m.items, id)
	return nil
}

type mockSessionValidator struct{}

func (m *mockSessionValidator) ValidateSession(ctx context.Context, token string) (*auth.User, error) {
	switch token {
	case "admin-token":
		return &auth.User{ID: 1, Role: auth.RoleAdmin, Email: "admin@travora.id"}, nil
	case "member-token":
		return &auth.User{ID: 1, Role: auth.RoleMember, Username: "budi"}, nil
	case "operator-token":
		return &auth.User{ID: 1, Role: auth.RoleOperator, Username: "operator_bandung"}, nil
	default:
		return nil, auth.ErrUnauthorized
	}
}

func setupMux() (*http.ServeMux, *mockRepo) {
	repo := newMockRepo()
	svc := NewService(repo)
	h := NewHandler(svc, &mockSessionValidator{})
	mux := http.NewServeMux()
	h.RegisterRoutes(mux)
	return mux, repo
}

func TestAdminOperators_RBAC(t *testing.T) {
	mux, _ := setupMux()

	// 1. Tanpa cookie -> 401
	reqUnauth := httptest.NewRequest(http.MethodGet, "/api/admin/operators", nil)
	resUnauth := httptest.NewRecorder()
	mux.ServeHTTP(resUnauth, reqUnauth)
	if resUnauth.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 without cookie, got %d", resUnauth.Code)
	}

	// 2. Role member / operator -> 403
	for _, token := range []string{"member-token", "operator-token"} {
		req := httptest.NewRequest(http.MethodGet, "/api/admin/operators", nil)
		req.AddCookie(&http.Cookie{Name: auth.SessionCookieName, Value: token})
		res := httptest.NewRecorder()
		mux.ServeHTTP(res, req)
		if res.Code != http.StatusForbidden {
			t.Fatalf("token %s expected 403, got %d", token, res.Code)
		}
	}

	// 3. Role admin -> 200
	reqAdmin := httptest.NewRequest(http.MethodGet, "/api/admin/operators", nil)
	reqAdmin.AddCookie(&http.Cookie{Name: auth.SessionCookieName, Value: "admin-token"})
	resAdmin := httptest.NewRecorder()
	mux.ServeHTTP(resAdmin, reqAdmin)
	if resAdmin.Code != http.StatusOK {
		t.Fatalf("admin token expected 200, got %d", resAdmin.Code)
	}
}

func TestAdminOperators_CreateDuplicateAndDelete(t *testing.T) {
	mux, repo := setupMux()
	adminCookie := &http.Cookie{Name: auth.SessionCookieName, Value: "admin-token"}

	// Create valid operator
	body, _ := json.Marshal(CreateOperatorRequest{
		Name:     "Petugas Loket Baru",
		Email:    "petugas.baru@travora.id",
		Password: "OperatorPass123",
	})
	reqCreate := httptest.NewRequest(http.MethodPost, "/api/admin/operators", bytes.NewReader(body))
	reqCreate.AddCookie(adminCookie)
	resCreate := httptest.NewRecorder()
	mux.ServeHTTP(resCreate, reqCreate)
	if resCreate.Code != http.StatusCreated {
		t.Fatalf("expected 201 Created, got %d (%s)", resCreate.Code, resCreate.Body.String())
	}

	if err := bcrypt.CompareHashAndPassword([]byte(repo.hashes[2]), []byte("OperatorPass123")); err != nil {
		t.Fatalf("password hash tidak valid: %v", err)
	}

	// Duplicate email -> 409 Conflict
	reqDup := httptest.NewRequest(http.MethodPost, "/api/admin/operators", bytes.NewReader(body))
	reqDup.AddCookie(adminCookie)
	resDup := httptest.NewRecorder()
	mux.ServeHTTP(resDup, reqDup)
	if resDup.Code != http.StatusConflict {
		t.Fatalf("expected 409 Conflict for duplicate, got %d", resDup.Code)
	}

	// Delete created operator -> 200 OK
	reqDel := httptest.NewRequest(http.MethodDelete, "/api/admin/operators/2", nil)
	reqDel.AddCookie(adminCookie)
	resDel := httptest.NewRecorder()
	mux.ServeHTTP(resDel, reqDel)
	if resDel.Code != http.StatusOK {
		t.Fatalf("expected 200 OK on delete, got %d", resDel.Code)
	}

	// Delete missing operator -> 404 Not Found
	reqDelMissing := httptest.NewRequest(http.MethodDelete, "/api/admin/operators/999", nil)
	reqDelMissing.AddCookie(adminCookie)
	resDelMissing := httptest.NewRecorder()
	mux.ServeHTTP(resDelMissing, reqDelMissing)
	if resDelMissing.Code != http.StatusNotFound {
		t.Fatalf("expected 404 Not Found on missing delete, got %d", resDelMissing.Code)
	}
}
