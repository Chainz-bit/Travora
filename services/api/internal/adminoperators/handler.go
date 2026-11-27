package adminoperators

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"
	"strings"

	"travora/api/internal/auth"
	"travora/api/internal/response"
)

// SessionValidator mendefinisikan abstraksi validasi token sesi untuk middleware role Admin.
type SessionValidator interface {
	ValidateSession(ctx context.Context, tokenString string) (*auth.User, error)
}

// Handler menangani endpoint HTTP manajemen akun operator yang khusus diakses Admin.
type Handler struct {
	service  Service
	sessions SessionValidator
}

// NewHandler membuat instance Handler manajemen operator.
func NewHandler(service Service, sessions SessionValidator) *Handler {
	return &Handler{
		service:  service,
		sessions: sessions,
	}
}

// RegisterRoutes mendaftarkan seluruh endpoint admin operator ke Go ServeMux.
func (h *Handler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/admin/operators", h.requireAdmin(h.ListOperators))
	mux.HandleFunc("POST /api/admin/operators", h.requireAdmin(h.CreateOperator))
	mux.HandleFunc("DELETE /api/admin/operators/{id}", h.requireAdmin(h.DeleteOperator))
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

// requireAdmin memastikan hanya pengguna terotentikasi dengan role == 'admin' yang dapat mengakses endpoint.
func (h *Handler) requireAdmin(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		token := extractToken(r)
		if token == "" {
			response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "sesi tidak ditemukan atau belum login")
			return
		}

		if h.sessions == nil {
			response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "layanan validasi sesi belum tersedia")
			return
		}

		user, err := h.sessions.ValidateSession(r.Context(), token)
		if err != nil || user == nil {
			response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "sesi tidak valid atau telah kedaluwarsa")
			return
		}

		if user.Role != auth.RoleAdmin {
			response.Error(w, http.StatusForbidden, "FORBIDDEN", "akses ditolak: hanya administrator yang diizinkan")
			return
		}

		next(w, r)
	}
}

// ListOperators melayani GET /api/admin/operators.
func (h *Handler) ListOperators(w http.ResponseWriter, r *http.Request) {
	operators, err := h.service.ListOperators(r.Context())
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "gagal mengambil daftar akun operator")
		return
	}
	response.JSON(w, http.StatusOK, operators)
}

// CreateOperator melayani POST /api/admin/operators.
func (h *Handler) CreateOperator(w http.ResponseWriter, r *http.Request) {
	var req CreateOperatorRequest
	dec := json.NewDecoder(io.LimitReader(r.Body, 1048576))
	if err := dec.Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_INPUT", "payload request JSON tidak valid")
		return
	}

	created, err := h.service.CreateOperator(r.Context(), req)
	if err != nil {
		if errors.Is(err, ErrInvalidInput) {
			response.Error(w, http.StatusBadRequest, "INVALID_INPUT", err.Error())
			return
		}
		if errors.Is(err, ErrDuplicateOperator) {
			response.Error(w, http.StatusConflict, "DUPLICATE_OPERATOR", err.Error())
			return
		}
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "gagal membuat akun operator")
		return
	}

	response.JSON(w, http.StatusCreated, created)
}

// DeleteOperator melayani DELETE /api/admin/operators/{id}.
func (h *Handler) DeleteOperator(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil || id <= 0 {
		response.Error(w, http.StatusBadRequest, "INVALID_INPUT", "ID operator tidak valid")
		return
	}

	if err := h.service.DeleteOperator(r.Context(), id); err != nil {
		if errors.Is(err, ErrOperatorNotFound) {
			response.Error(w, http.StatusNotFound, "OPERATOR_NOT_FOUND", err.Error())
			return
		}
		if errors.Is(err, ErrOperatorInUse) {
			response.Error(w, http.StatusConflict, "OPERATOR_IN_USE", err.Error())
			return
		}
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "gagal menghapus akun operator")
		return
	}

	response.JSON(w, http.StatusOK, map[string]string{
		"message": "Akun operator berhasil dihapus",
	})
}
