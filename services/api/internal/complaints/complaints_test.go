package complaints

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"travora/api/internal/auth"
)

type mockComplaintsRepo struct {
	items  []ComplaintView
	nextID int64
}

func (m *mockComplaintsRepo) EnsureSchema(ctx context.Context) error { return nil }
func (m *mockComplaintsRepo) ListByMember(ctx context.Context, memberID int64) ([]ComplaintView, error) {
	return m.items, nil
}
func (m *mockComplaintsRepo) ListAll(ctx context.Context) ([]ComplaintView, error) {
	return m.items, nil
}
func (m *mockComplaintsRepo) Create(ctx context.Context, memberID int64, req CreateComplaintRequest) (*ComplaintView, error) {
	m.nextID++
	c := ComplaintView{
		ID:          "KLP-0001",
		DBID:        m.nextID,
		MemberID:    "1",
		MemberName:  "Budi",
		BookingCode: req.BookingID,
		Subject:     req.Subject,
		Message:     req.Message,
		Status:      "diajukan",
	}
	m.items = append(m.items, c)
	return &c, nil
}
func (m *mockComplaintsRepo) Reply(ctx context.Context, id int64, adminID int64, req ReplyComplaintRequest) (*ComplaintView, error) {
	for i := range m.items {
		if m.items[i].DBID == id {
			m.items[i].AdminResponse = req.AdminResponse
			m.items[i].Status = req.Status
			return &m.items[i], nil
		}
	}
	return nil, ErrComplaintNotFound
}

type mockSessions struct{}

func (m *mockSessions) ValidateSession(ctx context.Context, token string) (*auth.User, error) {
	switch token {
	case "member-tok":
		return &auth.User{ID: 1, Role: auth.RoleMember, Name: "Budi"}, nil
	case "admin-tok":
		return &auth.User{ID: 1, Role: auth.RoleAdmin, Name: "Admin"}, nil
	default:
		return nil, auth.ErrUnauthorized
	}
}

func TestComplaints_CreateAndAdminReply(t *testing.T) {
	h := NewHandler(NewService(&mockComplaintsRepo{}), &mockSessions{})
	mux := http.NewServeMux()
	h.RegisterRoutes(mux)

	body, _ := json.Marshal(CreateComplaintRequest{
		BookingID: "TRV-20261127-0001",
		Subject:   "AC Kurang Dingin",
		Message:   "Mohon dicek AC pada kursi belakang.",
	})
	reqCreate := httptest.NewRequest(http.MethodPost, "/api/v1/complaints", bytes.NewReader(body))
	reqCreate.Header.Set("Authorization", "Bearer member-tok")
	resCreate := httptest.NewRecorder()
	mux.ServeHTTP(resCreate, reqCreate)
	if resCreate.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d (%s)", resCreate.Code, resCreate.Body.String())
	}

	replyBody, _ := json.Marshal(ReplyComplaintRequest{
		AdminResponse: "Terima kasih, teknisi sudah kami tugaskan.",
		Status:        "selesai",
	})
	reqReply := httptest.NewRequest(http.MethodPatch, "/api/admin/complaints/1", bytes.NewReader(replyBody))
	reqReply.Header.Set("Authorization", "Bearer admin-tok")
	resReply := httptest.NewRecorder()
	mux.ServeHTTP(resReply, reqReply)
	if resReply.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d (%s)", resReply.Code, resReply.Body.String())
	}
}
