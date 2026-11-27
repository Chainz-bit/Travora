package adminmaster

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

type ctxKeyAdmin struct{}

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
	mux.HandleFunc("GET /api/admin/origin-cities", h.requireAdmin(h.ListOriginCities))
	mux.HandleFunc("POST /api/admin/origin-cities", h.requireAdmin(h.CreateOriginCity))
	mux.HandleFunc("PUT /api/admin/origin-cities/{id}", h.requireAdmin(h.UpdateOriginCity))
	mux.HandleFunc("DELETE /api/admin/origin-cities/{id}", h.requireAdmin(h.DeleteOriginCity))

	mux.HandleFunc("GET /api/admin/destination-cities", h.requireAdmin(h.ListDestinationCities))
	mux.HandleFunc("POST /api/admin/destination-cities", h.requireAdmin(h.CreateDestinationCity))
	mux.HandleFunc("PUT /api/admin/destination-cities/{id}", h.requireAdmin(h.UpdateDestinationCity))
	mux.HandleFunc("DELETE /api/admin/destination-cities/{id}", h.requireAdmin(h.DeleteDestinationCity))

	mux.HandleFunc("GET /api/admin/vehicles", h.requireAdmin(h.ListVehicles))
	mux.HandleFunc("POST /api/admin/vehicles", h.requireAdmin(h.CreateVehicle))
	mux.HandleFunc("PUT /api/admin/vehicles/{id}", h.requireAdmin(h.UpdateVehicle))
	mux.HandleFunc("DELETE /api/admin/vehicles/{id}", h.requireAdmin(h.DeleteVehicle))

	mux.HandleFunc("GET /api/admin/schedules", h.requireAdmin(h.ListSchedules))
	mux.HandleFunc("POST /api/admin/schedules", h.requireAdmin(h.CreateSchedule))
	mux.HandleFunc("PUT /api/admin/schedules/{id}", h.requireAdmin(h.UpdateSchedule))
	mux.HandleFunc("PATCH /api/admin/schedules/{id}/toggle", h.requireAdmin(h.ToggleSchedule))
	mux.HandleFunc("DELETE /api/admin/schedules/{id}", h.requireAdmin(h.DeleteSchedule))
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

func (h *Handler) requireAdmin(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		token := extractToken(r)
		if token == "" || h.sessions == nil {
			response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "sesi tidak ditemukan atau belum login")
			return
		}
		user, err := h.sessions.ValidateSession(r.Context(), token)
		if err != nil || user == nil || user.ID <= 0 {
			response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "sesi tidak valid atau telah kedaluwarsa")
			return
		}
		if user.Role != auth.RoleAdmin {
			response.Error(w, http.StatusForbidden, "FORBIDDEN", "akses ditolak: hanya administrator yang diizinkan")
			return
		}
		ctx := context.WithValue(r.Context(), ctxKeyAdmin{}, user)
		next(w, r.WithContext(ctx))
	}
}

func adminFromContext(ctx context.Context) (*auth.User, bool) {
	u, ok := ctx.Value(ctxKeyAdmin{}).(*auth.User)
	return u, ok && u != nil && u.ID > 0
}

func parseIDParam(r *http.Request) (int64, bool) {
	id, err := strconv.ParseInt(strings.TrimSpace(r.PathValue("id")), 10, 64)
	return id, err == nil && id > 0
}

func writeDomainError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, ErrInvalidInput), errors.Is(err, ErrInvalidRoute), errors.Is(err, ErrInvalidDateTime):
		response.Error(w, http.StatusBadRequest, "INVALID_INPUT", err.Error())
	case errors.Is(err, ErrNotFound):
		response.Error(w, http.StatusNotFound, "NOT_FOUND", err.Error())
	case errors.Is(err, ErrDuplicateData):
		response.Error(w, http.StatusConflict, "DUPLICATE_DATA", err.Error())
	case errors.Is(err, ErrInUse):
		response.Error(w, http.StatusConflict, "RESOURCE_IN_USE", err.Error())
	default:
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "terjadi kesalahan pada server")
	}
}

func (h *Handler) ListOriginCities(w http.ResponseWriter, r *http.Request) {
	h.listCities(w, r, true)
}

func (h *Handler) ListDestinationCities(w http.ResponseWriter, r *http.Request) {
	h.listCities(w, r, false)
}

func (h *Handler) listCities(w http.ResponseWriter, r *http.Request, isOrigin bool) {
	items, err := h.service.ListCities(r.Context(), isOrigin)
	if err != nil {
		writeDomainError(w, err)
		return
	}
	response.JSON(w, http.StatusOK, items)
}

func (h *Handler) CreateOriginCity(w http.ResponseWriter, r *http.Request) {
	h.createCity(w, r, true)
}

func (h *Handler) CreateDestinationCity(w http.ResponseWriter, r *http.Request) {
	h.createCity(w, r, false)
}

func (h *Handler) createCity(w http.ResponseWriter, r *http.Request, isOrigin bool) {
	admin, ok := adminFromContext(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "sesi admin tidak valid")
		return
	}
	var req CityRequest
	if err := json.NewDecoder(io.LimitReader(r.Body, 1048576)).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_INPUT", "payload JSON tidak valid")
		return
	}
	created, err := h.service.CreateCity(r.Context(), isOrigin, req, admin.ID)
	if err != nil {
		writeDomainError(w, err)
		return
	}
	response.JSON(w, http.StatusCreated, created)
}

func (h *Handler) UpdateOriginCity(w http.ResponseWriter, r *http.Request) {
	h.updateCity(w, r, true)
}

func (h *Handler) UpdateDestinationCity(w http.ResponseWriter, r *http.Request) {
	h.updateCity(w, r, false)
}

func (h *Handler) updateCity(w http.ResponseWriter, r *http.Request, isOrigin bool) {
	id, ok := parseIDParam(r)
	if !ok {
		response.Error(w, http.StatusBadRequest, "INVALID_INPUT", "ID kota tidak valid")
		return
	}
	var req CityRequest
	if err := json.NewDecoder(io.LimitReader(r.Body, 1048576)).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_INPUT", "payload JSON tidak valid")
		return
	}
	updated, err := h.service.UpdateCity(r.Context(), isOrigin, id, req)
	if err != nil {
		writeDomainError(w, err)
		return
	}
	response.JSON(w, http.StatusOK, updated)
}

func (h *Handler) DeleteOriginCity(w http.ResponseWriter, r *http.Request) {
	h.deleteCity(w, r, true)
}

func (h *Handler) DeleteDestinationCity(w http.ResponseWriter, r *http.Request) {
	h.deleteCity(w, r, false)
}

func (h *Handler) deleteCity(w http.ResponseWriter, r *http.Request, isOrigin bool) {
	id, ok := parseIDParam(r)
	if !ok {
		response.Error(w, http.StatusBadRequest, "INVALID_INPUT", "ID kota tidak valid")
		return
	}
	if err := h.service.DeleteCity(r.Context(), isOrigin, id); err != nil {
		writeDomainError(w, err)
		return
	}
	response.JSON(w, http.StatusOK, map[string]string{"message": "Kota berhasil dihapus"})
}

func (h *Handler) ListVehicles(w http.ResponseWriter, r *http.Request) {
	items, err := h.service.ListVehicles(r.Context())
	if err != nil {
		writeDomainError(w, err)
		return
	}
	response.JSON(w, http.StatusOK, items)
}

func (h *Handler) CreateVehicle(w http.ResponseWriter, r *http.Request) {
	admin, ok := adminFromContext(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "sesi admin tidak valid")
		return
	}
	var req VehicleRequest
	if err := json.NewDecoder(io.LimitReader(r.Body, 1048576)).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_INPUT", "payload JSON tidak valid")
		return
	}
	created, err := h.service.CreateVehicle(r.Context(), req, admin.ID)
	if err != nil {
		writeDomainError(w, err)
		return
	}
	response.JSON(w, http.StatusCreated, created)
}

func (h *Handler) UpdateVehicle(w http.ResponseWriter, r *http.Request) {
	id, ok := parseIDParam(r)
	if !ok {
		response.Error(w, http.StatusBadRequest, "INVALID_INPUT", "ID kendaraan tidak valid")
		return
	}
	var req VehicleRequest
	if err := json.NewDecoder(io.LimitReader(r.Body, 1048576)).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_INPUT", "payload JSON tidak valid")
		return
	}
	updated, err := h.service.UpdateVehicle(r.Context(), id, req)
	if err != nil {
		writeDomainError(w, err)
		return
	}
	response.JSON(w, http.StatusOK, updated)
}

func (h *Handler) DeleteVehicle(w http.ResponseWriter, r *http.Request) {
	id, ok := parseIDParam(r)
	if !ok {
		response.Error(w, http.StatusBadRequest, "INVALID_INPUT", "ID kendaraan tidak valid")
		return
	}
	if err := h.service.DeleteVehicle(r.Context(), id); err != nil {
		writeDomainError(w, err)
		return
	}
	response.JSON(w, http.StatusOK, map[string]string{"message": "Kendaraan berhasil dihapus"})
}

func (h *Handler) ListSchedules(w http.ResponseWriter, r *http.Request) {
	items, err := h.service.ListSchedules(r.Context())
	if err != nil {
		writeDomainError(w, err)
		return
	}
	response.JSON(w, http.StatusOK, items)
}

func (h *Handler) CreateSchedule(w http.ResponseWriter, r *http.Request) {
	admin, ok := adminFromContext(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "sesi admin tidak valid")
		return
	}
	var req ScheduleRequest
	if err := json.NewDecoder(io.LimitReader(r.Body, 1048576)).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_INPUT", "payload JSON tidak valid")
		return
	}
	created, err := h.service.CreateSchedule(r.Context(), req, admin.ID)
	if err != nil {
		writeDomainError(w, err)
		return
	}
	response.JSON(w, http.StatusCreated, created)
}

func (h *Handler) UpdateSchedule(w http.ResponseWriter, r *http.Request) {
	id, ok := parseIDParam(r)
	if !ok {
		response.Error(w, http.StatusBadRequest, "INVALID_INPUT", "ID jadwal tidak valid")
		return
	}
	var req ScheduleRequest
	if err := json.NewDecoder(io.LimitReader(r.Body, 1048576)).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_INPUT", "payload JSON tidak valid")
		return
	}
	updated, err := h.service.UpdateSchedule(r.Context(), id, req)
	if err != nil {
		writeDomainError(w, err)
		return
	}
	response.JSON(w, http.StatusOK, updated)
}

func (h *Handler) ToggleSchedule(w http.ResponseWriter, r *http.Request) {
	id, ok := parseIDParam(r)
	if !ok {
		response.Error(w, http.StatusBadRequest, "INVALID_INPUT", "ID jadwal tidak valid")
		return
	}
	updated, err := h.service.ToggleScheduleActive(r.Context(), id)
	if err != nil {
		writeDomainError(w, err)
		return
	}
	response.JSON(w, http.StatusOK, updated)
}

func (h *Handler) DeleteSchedule(w http.ResponseWriter, r *http.Request) {
	id, ok := parseIDParam(r)
	if !ok {
		response.Error(w, http.StatusBadRequest, "INVALID_INPUT", "ID jadwal tidak valid")
		return
	}
	res, err := h.service.DeleteSchedule(r.Context(), id)
	if err != nil {
		writeDomainError(w, err)
		return
	}
	response.JSON(w, http.StatusOK, res)
}
