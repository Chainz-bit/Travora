package complaints

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

type ctxKeyUser struct{}

type SessionValidator interface {
	ValidateSession(ctx context.Context, tokenString string) (*auth.User, error)
}

type Handler struct {
	service  Service
	sessions SessionValidator
}

func NewHandler(service Service, sessions SessionValidator) *Handler {
	return &Handler{
		service:  service,
		sessions: sessions,
	}
}

func (h *Handler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/v1/complaints/my", h.requireRole(auth.RoleMember, h.ListMyComplaints))
	mux.HandleFunc("POST /api/v1/complaints", h.requireRole(auth.RoleMember, h.CreateComplaint))
	mux.HandleFunc("GET /api/admin/complaints", h.requireRole(auth.RoleAdmin, h.ListAllComplaints))
	mux.HandleFunc("PATCH /api/admin/complaints/{id}", h.requireRole(auth.RoleAdmin, h.ReplyComplaint))
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

func (h *Handler) requireRole(expectedRole string, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		token := extractToken(r)
		if token == "" || h.sessions == nil {
			response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Silakan login terlebih dahulu")
			return
		}
		user, err := h.sessions.ValidateSession(r.Context(), token)
		if err != nil || user == nil || user.ID <= 0 {
			response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "sesi tidak valid atau telah kedaluwarsa")
			return
		}
		if user.Role != expectedRole {
			response.Error(w, http.StatusForbidden, "FORBIDDEN", "Akses ditolak untuk peran Anda")
			return
		}
		ctx := context.WithValue(r.Context(), ctxKeyUser{}, user)
		next(w, r.WithContext(ctx))
	}
}

func userFromContext(ctx context.Context) (*auth.User, bool) {
	u, ok := ctx.Value(ctxKeyUser{}).(*auth.User)
	return u, ok && u != nil && u.ID > 0
}

func (h *Handler) ListMyComplaints(w http.ResponseWriter, r *http.Request) {
	user, ok := userFromContext(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Silakan login terlebih dahulu")
		return
	}
	list, err := h.service.ListByMember(r.Context(), user.ID)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "gagal memuat daftar keluhan")
		return
	}
	response.JSON(w, http.StatusOK, list)
}

func (h *Handler) CreateComplaint(w http.ResponseWriter, r *http.Request) {
	user, ok := userFromContext(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Silakan login terlebih dahulu")
		return
	}
	var req CreateComplaintRequest
	if err := json.NewDecoder(io.LimitReader(r.Body, 1048576)).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_INPUT", "payload JSON tidak valid")
		return
	}
	created, err := h.service.Create(r.Context(), user.ID, req)
	if err != nil {
		if errors.Is(err, ErrInvalidInput) {
			response.Error(w, http.StatusBadRequest, "INVALID_INPUT", err.Error())
			return
		}
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "gagal mengirim keluhan")
		return
	}
	response.JSON(w, http.StatusCreated, created)
}

func (h *Handler) ListAllComplaints(w http.ResponseWriter, r *http.Request) {
	list, err := h.service.ListAll(r.Context())
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "gagal memuat seluruh keluhan")
		return
	}
	response.JSON(w, http.StatusOK, list)
}

func (h *Handler) ReplyComplaint(w http.ResponseWriter, r *http.Request) {
	admin, ok := userFromContext(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "sesi admin tidak valid")
		return
	}
	id, err := strconv.ParseInt(strings.TrimSpace(r.PathValue("id")), 10, 64)
	if err != nil || id <= 0 {
		response.Error(w, http.StatusBadRequest, "INVALID_INPUT", "ID keluhan tidak valid")
		return
	}
	var req ReplyComplaintRequest
	if err := json.NewDecoder(io.LimitReader(r.Body, 1048576)).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_INPUT", "payload JSON tidak valid")
		return
	}
	updated, err := h.service.Reply(r.Context(), id, admin.ID, req)
	if err != nil {
		if errors.Is(err, ErrInvalidInput) {
			response.Error(w, http.StatusBadRequest, "INVALID_INPUT", err.Error())
			return
		}
		if errors.Is(err, ErrComplaintNotFound) {
			response.Error(w, http.StatusNotFound, "NOT_FOUND", err.Error())
			return
		}
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "gagal menyimpan tanggapan keluhan")
		return
	}
	response.JSON(w, http.StatusOK, updated)
}
