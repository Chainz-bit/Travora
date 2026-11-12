package schedule

import (
	"errors"
	"net/http"
	"strconv"
	"time"

	"travora/api/internal/response"
)

// Handler menangani request HTTP untuk domain jadwal perjalanan publik.
type Handler struct {
	service Service
}

// NewHandler membuat instance Handler baru dengan Service jadwal.
func NewHandler(service Service) *Handler {
	return &Handler{service: service}
}

// RegisterRoutes mendaftarkan endpoint jadwal ke router ServeMux.
func (h *Handler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/v1/schedules", h.ListSchedules)
	mux.HandleFunc("GET /api/v1/schedules/{id}", h.GetScheduleByID)
}

// ListSchedules melayani pencarian jadwal perjalanan publik aktif dengan filter query params.
func (h *Handler) ListSchedules(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query()
	var filter PublicScheduleFilter

	// 1. Parse origin_city_id (opsional)
	if originStr := query.Get("origin_city_id"); originStr != "" {
		id, err := strconv.ParseInt(originStr, 10, 64)
		if err != nil || id <= 0 {
			response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "parameter origin_city_id harus berupa bilangan bulat positif")
			return
		}
		filter.OriginCityID = &id
	}

	// 2. Parse destination_city_id (opsional)
	if destStr := query.Get("destination_city_id"); destStr != "" {
		id, err := strconv.ParseInt(destStr, 10, 64)
		if err != nil || id <= 0 {
			response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "parameter destination_city_id harus berupa bilangan bulat positif")
			return
		}
		filter.DestinationCityID = &id
	}

	// 3. Parse departure_date (opsional, format YYYY-MM-DD)
	if dateStr := query.Get("departure_date"); dateStr != "" {
		parsedDate, err := time.Parse("2006-01-02", dateStr)
		if err != nil {
			response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "format parameter departure_date tidak valid (harus YYYY-MM-DD)")
			return
		}
		filter.DepartureDate = &parsedDate
	}

	// 4. Parse limit (opsional)
	if limitStr := query.Get("limit"); limitStr != "" {
		lim, err := strconv.Atoi(limitStr)
		if err != nil {
			response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "parameter limit harus berupa bilangan bulat")
			return
		}
		filter.Limit = lim
	}

	// 5. Parse offset (opsional, tidak boleh negatif)
	if offsetStr := query.Get("offset"); offsetStr != "" {
		off, err := strconv.Atoi(offsetStr)
		if err != nil {
			response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "parameter offset harus berupa bilangan bulat")
			return
		}
		if off < 0 {
			response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "parameter offset tidak boleh negatif")
			return
		}
		filter.Offset = off
	}

	// Panggil service
	schedules, err := h.service.ListPublicSchedules(r.Context(), filter)
	if err != nil {
		if errors.Is(err, ErrInvalidRoute) {
			response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "kota asal dan kota tujuan tidak boleh sama")
			return
		}
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "terjadi kesalahan internal pada server")
		return
	}

	// Hitung limit yang dinormalisasi untuk metadata respons
	limit := filter.Limit
	if limit <= 0 {
		limit = DefaultLimit
	} else if limit > MaxLimit {
		limit = MaxLimit
	}

	response.Paginated(w, http.StatusOK, schedules, limit, filter.Offset, len(schedules))
}

// GetScheduleByID melayani pengambilan detail jadwal perjalanan aktif berdasarkan ID.
func (h *Handler) GetScheduleByID(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	if idStr == "" {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "ID jadwal tidak boleh kosong")
		return
	}

	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil || id <= 0 {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "ID jadwal harus berupa bilangan bulat positif")
		return
	}

	schedule, err := h.service.GetPublicScheduleByID(r.Context(), id)
	if err != nil {
		if errors.Is(err, ErrScheduleNotFound) {
			response.Error(w, http.StatusNotFound, "NOT_FOUND", "jadwal tidak ditemukan atau tidak aktif")
			return
		}
		if errors.Is(err, ErrInvalidScheduleID) {
			response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "ID jadwal harus berupa bilangan bulat positif")
			return
		}
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "terjadi kesalahan internal pada server")
		return
	}

	response.JSON(w, http.StatusOK, schedule)
}

