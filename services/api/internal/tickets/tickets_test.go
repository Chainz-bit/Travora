package tickets

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"travora/api/internal/auth"
)

type mockTicketRepo struct {
	tickets map[string]*Ticket
}

func newMockTicketRepo() *mockTicketRepo {
	usedAt := time.Date(2026, 11, 27, 10, 0, 0, 0, time.FixedZone("WIB", 7*3600))
	return &mockTicketRepo{
		tickets: map[string]*Ticket{
			"TKT-20261127-001": {
				ID:            1,
				UserID:        10,
				OrderCode:     "TKT-20261127-001",
				EventName:     "Bandung - Jakarta Executive Shuttle",
				Amount:        250000,
				PaymentStatus: PaymentStatusPaid,
				TicketStatus:  TicketStatusUnused,
			},
			"TKT-20261127-002": {
				ID:            2,
				UserID:        10,
				OrderCode:     "TKT-20261127-002",
				EventName:     "Yogyakarta - Semarang Travel",
				Amount:        500000,
				PaymentStatus: PaymentStatusPaid,
				TicketStatus:  TicketStatusUsed,
				ScannedAt:     &usedAt,
			},
			"TKT-20261127-003": {
				ID:            3,
				UserID:        10,
				OrderCode:     "TKT-20261127-003",
				EventName:     "Jakarta - Bandung Morning Shuttle",
				Amount:        150000,
				PaymentStatus: PaymentStatusPending,
				TicketStatus:  TicketStatusUnused,
			},
			"TKT-20261127-999": {
				ID:            4,
				UserID:        20,
				OrderCode:     "TKT-20261127-999",
				EventName:     "Tiket Milik Member Lain",
				Amount:        200000,
				PaymentStatus: PaymentStatusPaid,
				TicketStatus:  TicketStatusUnused,
			},
		},
	}
}

func (m *mockTicketRepo) EnsureSchema(ctx context.Context) error {
	return nil
}

func (m *mockTicketRepo) ListByUserID(ctx context.Context, userID int64) ([]Ticket, error) {
	result := make([]Ticket, 0)
	for _, t := range m.tickets {
		if t.UserID == userID {
			result = append(result, *t)
		}
	}
	return result, nil
}

func (m *mockTicketRepo) GetByOrderCodeAndUser(ctx context.Context, orderCode string, userID int64) (*Ticket, error) {
	t, ok := m.tickets[orderCode]
	if !ok || t.UserID != userID {
		return nil, ErrTicketNotFound
	}
	cp := *t
	return &cp, nil
}

func (m *mockTicketRepo) CreateTicket(ctx context.Context, input CreateTicketInput) (*Ticket, error) {
	t := &Ticket{
		ID:            int64(len(m.tickets) + 1),
		UserID:        input.UserID,
		OrderCode:     input.OrderCode,
		EventName:     input.EventName,
		Amount:        input.Amount,
		PaymentStatus: input.PaymentStatus,
		TicketStatus:  TicketStatusUnused,
	}
	m.tickets[input.OrderCode] = t
	cp := *t
	return &cp, nil
}

func (m *mockTicketRepo) MarkPaidByOrderCode(ctx context.Context, orderCode string) (*Ticket, error) {
	t, ok := m.tickets[orderCode]
	if !ok {
		return nil, ErrTicketNotFound
	}
	t.PaymentStatus = PaymentStatusPaid
	cp := *t
	return &cp, nil
}

func (m *mockTicketRepo) ScanByOrderCode(ctx context.Context, orderCode string) (*Ticket, error) {
	t, ok := m.tickets[orderCode]
	if !ok {
		return nil, &ScanError{
			StatusCode: http.StatusNotFound,
			Code:       "TICKET_NOT_FOUND",
			Message:    "Tiket tidak ditemukan",
			Err:        ErrTicketNotFound,
		}
	}
	if t.PaymentStatus != PaymentStatusPaid {
		return nil, &ScanError{
			StatusCode: http.StatusBadRequest,
			Code:       "TICKET_UNPAID",
			Message:    "Tiket belum lunas / tidak valid",
			Err:        ErrTicketUnpaid,
		}
	}
	if t.TicketStatus == TicketStatusUsed {
		return nil, &ScanError{
			StatusCode: http.StatusConflict,
			Code:       "TICKET_ALREADY_USED",
			Message:    "Tiket sudah digunakan pada 27 Nov 2026 10:00:00 WIB",
			Err:        ErrTicketAlreadyUsed,
		}
	}

	now := time.Now()
	t.TicketStatus = TicketStatusUsed
	t.ScannedAt = &now
	t.UpdatedAt = now
	cp := *t
	return &cp, nil
}

type mockSessionValidator struct{}

func (m *mockSessionValidator) ValidateSession(ctx context.Context, token string) (*auth.User, error) {
	switch token {
	case "member-10-token":
		return &auth.User{ID: 10, Role: auth.RoleMember, Username: "member10"}, nil
	case "member-20-token":
		return &auth.User{ID: 20, Role: auth.RoleMember, Username: "member20"}, nil
	case "operator-token":
		return &auth.User{ID: 1, Role: auth.RoleOperator, Username: "operator_bandung"}, nil
	case "admin-token":
		return &auth.User{ID: 1, Role: auth.RoleAdmin, Email: "admin@travora.id"}, nil
	default:
		return nil, auth.ErrUnauthorized
	}
}

func setupTicketMux() *http.ServeMux {
	repo := newMockTicketRepo()
	svc := NewService(repo)
	h := NewHandler(svc, &mockSessionValidator{})
	mux := http.NewServeMux()
	h.RegisterRoutes(mux)
	return mux
}

func TestTickets_RequireAuthAndOwnership(t *testing.T) {
	mux := setupTicketMux()

	// 1. Tanpa login -> 401
	for _, target := range []string{"/api/tickets/my", "/api/tickets/TKT-20261127-001"} {
		req := httptest.NewRequest(http.MethodGet, target, nil)
		rec := httptest.NewRecorder()
		mux.ServeHTTP(rec, req)
		if rec.Code != http.StatusUnauthorized {
			t.Fatalf("%s tanpa token expected 401, got %d", target, rec.Code)
		}
	}

	// 2. Member 10 via Bearer token -> hanya melihat 3 tiket miliknya sendiri
	reqList := httptest.NewRequest(http.MethodGet, "/api/tickets/my", nil)
	reqList.Header.Set("Authorization", "Bearer member-10-token")
	recList := httptest.NewRecorder()
	mux.ServeHTTP(recList, reqList)
	if recList.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d (%s)", recList.Code, recList.Body.String())
	}

	var listResp struct {
		Success bool     `json:"success"`
		Data    []Ticket `json:"data"`
	}
	if err := json.NewDecoder(recList.Body).Decode(&listResp); err != nil {
		t.Fatalf("decode list failed: %v", err)
	}
	if !listResp.Success || len(listResp.Data) != 3 {
		t.Fatalf("expected 3 tickets belonging to user 10, got %d", len(listResp.Data))
	}

	// 3. Member 10 tidak bisa membuka detail tiket milik Member 20 -> 404
	reqCross := httptest.NewRequest(http.MethodGet, "/api/tickets/TKT-20261127-999", nil)
	reqCross.AddCookie(&http.Cookie{Name: auth.SessionCookieName, Value: "member-10-token"})
	recCross := httptest.NewRecorder()
	mux.ServeHTTP(recCross, reqCross)
	if recCross.Code != http.StatusNotFound {
		t.Fatalf("expected 404 for cross-user ticket detail, got %d", recCross.Code)
	}

	// 4. Member 20 bisa membuka detail tiket miliknya -> 200
	reqOwn := httptest.NewRequest(http.MethodGet, "/api/tickets/TKT-20261127-999", nil)
	reqOwn.Header.Set("Authorization", "Bearer member-20-token")
	recOwn := httptest.NewRecorder()
	mux.ServeHTTP(recOwn, reqOwn)
	if recOwn.Code != http.StatusOK {
		t.Fatalf("expected 200 for own ticket detail, got %d", recOwn.Code)
	}
}

func TestTickets_ScanRBACAndValidations(t *testing.T) {
	mux := setupTicketMux()

	// 1. Scan tanpa login -> 401
	body, _ := json.Marshal(ScanRequest{OrderCode: "TKT-20261127-001"})
	reqUnauth := httptest.NewRequest(http.MethodPost, "/api/tickets/scan", bytes.NewReader(body))
	recUnauth := httptest.NewRecorder()
	mux.ServeHTTP(recUnauth, reqUnauth)
	if recUnauth.Code != http.StatusUnauthorized {
		t.Fatalf("scan without auth expected 401, got %d", recUnauth.Code)
	}

	// 2. Scan dengan role member -> 403 Forbidden
	reqMember := httptest.NewRequest(http.MethodPost, "/api/tickets/scan", bytes.NewReader(body))
	reqMember.Header.Set("Authorization", "Bearer member-10-token")
	recMember := httptest.NewRecorder()
	mux.ServeHTTP(recMember, reqMember)
	if recMember.Code != http.StatusForbidden {
		t.Fatalf("scan by member expected 403, got %d", recMember.Code)
	}

	// 3. Scan dengan role operator & admin -> validasi check-in penuh
	cases := []struct {
		name           string
		token          string
		orderCode      string
		expectedStatus int
	}{
		{"Not Found", "operator-token", "TKT-TIDAK-ADA", http.StatusNotFound},
		{"Unpaid Pending", "operator-token", "TKT-20261127-003", http.StatusBadRequest},
		{"Already Used", "operator-token", "TKT-20261127-002", http.StatusConflict},
		{"Valid Check-in Operator", "operator-token", "TKT-20261127-001", http.StatusOK},
		{"Double Check-in Admin", "admin-token", "TKT-20261127-001", http.StatusConflict},
		{"Valid Check-in Admin", "admin-token", "TKT-20261127-999", http.StatusOK},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			reqBody, _ := json.Marshal(ScanRequest{OrderCode: tc.orderCode})
			req := httptest.NewRequest(http.MethodPost, "/api/tickets/scan", bytes.NewReader(reqBody))
			req.Header.Set("Content-Type", "application/json")
			req.Header.Set("Authorization", "Bearer "+tc.token)
			rec := httptest.NewRecorder()
			mux.ServeHTTP(rec, req)

			if rec.Code != tc.expectedStatus {
				t.Fatalf("%s: expected status %d, got %d (body: %s)", tc.name, tc.expectedStatus, rec.Code, rec.Body.String())
			}
		})
	}
}
