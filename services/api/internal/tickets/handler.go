package tickets

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"

	"travora/api/internal/auth"
	"travora/api/internal/response"
)

type ctxKeyUser struct{}

// SessionValidator mendefinisikan abstraksi validasi token sesi/Bearer untuk middleware autentikasi.
type SessionValidator interface {
	ValidateSession(ctx context.Context, tokenString string) (*auth.User, error)
}

// Handler menangani request HTTP untuk domain E-Tiket dan Check-in QR.
type Handler struct {
	service  Service
	sessions SessionValidator
}

// NewHandler membuat instance Handler tiket baru dengan dependensi validasi sesi auth Travora.
func NewHandler(service Service, sessions SessionValidator) *Handler {
	return &Handler{
		service:  service,
		sessions: sessions,
	}
}

// RegisterRoutes mendaftarkan seluruh endpoint modul tiket yang dilindungi autentikasi ke Go ServeMux.
func (h *Handler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/tickets/my", h.requireAuth(h.GetMyTickets))
	mux.HandleFunc("GET /api/tickets/{order_code}", h.requireAuth(h.GetTicketByOrderCode))
	mux.HandleFunc("POST /api/tickets/scan", h.requireOperatorOrAdmin(h.ScanTicket))
}

func extractToken(r *http.Request) string {
	authHeader := strings.TrimSpace(r.Header.Get("Authorization"))
	if len(authHeader) > 7 && strings.EqualFold(authHeader[:7], "Bearer ") {
		if token := strings.TrimSpace(authHeader[7:]); token != "" {
			return token
		}
	}

	if cookie, err := r.Cookie(auth.SessionCookieName); err == nil && strings.TrimSpace(cookie.Value) != "" {
		return strings.TrimSpace(cookie.Value)
	}

	return ""
}

func (h *Handler) authenticateRequest(r *http.Request) (*auth.User, error) {
	token := extractToken(r)
	if token == "" || h.sessions == nil {
		return nil, auth.ErrUnauthorized
	}

	user, err := h.sessions.ValidateSession(r.Context(), token)
	if err != nil || user == nil || user.ID <= 0 {
		return nil, auth.ErrUnauthorized
	}

	return user, nil
}

func (h *Handler) requireAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, err := h.authenticateRequest(r)
		if err != nil {
			response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Silakan login terlebih dahulu")
			return
		}

		ctx := context.WithValue(r.Context(), ctxKeyUser{}, user)
		next(w, r.WithContext(ctx))
	}
}

func (h *Handler) requireOperatorOrAdmin(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, err := h.authenticateRequest(r)
		if err != nil {
			response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Silakan login terlebih dahulu")
			return
		}

		if user.Role != auth.RoleOperator && user.Role != auth.RoleAdmin {
			response.Error(w, http.StatusForbidden, "FORBIDDEN", "Akses ditolak: khusus petugas operator")
			return
		}

		ctx := context.WithValue(r.Context(), ctxKeyUser{}, user)
		next(w, r.WithContext(ctx))
	}
}

func authenticatedUserFromContext(ctx context.Context) (*auth.User, bool) {
	user, ok := ctx.Value(ctxKeyUser{}).(*auth.User)
	if !ok || user == nil || user.ID <= 0 {
		return nil, false
	}
	return user, true
}

// GetMyTickets melayani GET /api/tickets/my khusus pengguna yang sedang login.
func (h *Handler) GetMyTickets(w http.ResponseWriter, r *http.Request) {
	user, ok := authenticatedUserFromContext(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Silakan login terlebih dahulu")
		return
	}

	// Hanya akun member yang memiliki tiket di tabel tickets (FK -> member.id_member).
	if user.Role != auth.RoleMember {
		response.JSON(w, http.StatusOK, []Ticket{})
		return
	}

	tickets, err := h.service.GetMyTickets(r.Context(), user.ID)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "terjadi kesalahan saat mengambil daftar tiket")
		return
	}

	response.JSON(w, http.StatusOK, tickets)
}

// GetTicketByOrderCode melayani GET /api/tickets/{order_code} khusus pemilik tiket tersebut.
func (h *Handler) GetTicketByOrderCode(w http.ResponseWriter, r *http.Request) {
	user, ok := authenticatedUserFromContext(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Silakan login terlebih dahulu")
		return
	}

	if user.Role != auth.RoleMember {
		response.Error(w, http.StatusNotFound, "TICKET_NOT_FOUND", "Tiket tidak ditemukan")
		return
	}

	orderCode := r.PathValue("order_code")
	ticket, err := h.service.GetTicketByOrderCodeAndUser(r.Context(), orderCode, user.ID)
	if err != nil {
		if errors.Is(err, ErrInvalidOrderCode) {
			response.Error(w, http.StatusBadRequest, "INVALID_INPUT", err.Error())
			return
		}
		if errors.Is(err, ErrTicketNotFound) {
			response.Error(w, http.StatusNotFound, "TICKET_NOT_FOUND", "Tiket tidak ditemukan")
			return
		}
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "terjadi kesalahan saat mengambil detail tiket")
		return
	}

	response.JSON(w, http.StatusOK, ticket)
}

// ScanTicket melayani POST /api/tickets/scan khusus role operator atau admin.
func (h *Handler) ScanTicket(w http.ResponseWriter, r *http.Request) {
	var req ScanRequest
	dec := json.NewDecoder(io.LimitReader(r.Body, 1048576))
	if err := dec.Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_INPUT", "payload JSON tidak valid")
		return
	}

	ticket, err := h.service.ScanTicket(r.Context(), req.OrderCode)
	if err != nil {
		if errors.Is(err, ErrInvalidOrderCode) {
			response.Error(w, http.StatusBadRequest, "INVALID_INPUT", err.Error())
			return
		}

		var scanErr *ScanError
		if errors.As(err, &scanErr) {
			response.Error(w, scanErr.StatusCode, scanErr.Code, scanErr.Message)
			return
		}

		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "terjadi kesalahan saat memvalidasi scan tiket")
		return
	}

	response.JSON(w, http.StatusOK, ticket)
}
