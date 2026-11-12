package masterdata

import (
	"net/http"

	"travora/api/internal/response"
)

// Handler menangani request HTTP untuk domain master data.
type Handler struct {
	service Service
}

// NewHandler membuat instance Handler baru dengan Service master data.
func NewHandler(service Service) *Handler {
	return &Handler{service: service}
}

// RegisterRoutes mendaftarkan endpoint master data ke router ServeMux.
func (h *Handler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/v1/master-data/origin-cities", h.ListOriginCities)
	mux.HandleFunc("GET /api/v1/master-data/destination-cities", h.ListDestinationCities)
	mux.HandleFunc("GET /api/v1/master-data/vehicles", h.ListVehicles)
}

// ListOriginCities melayani request daftar kota asal.
func (h *Handler) ListOriginCities(w http.ResponseWriter, r *http.Request) {
	cities, err := h.service.GetOriginCities(r.Context())
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "terjadi kesalahan internal pada server")
		return
	}
	response.JSON(w, http.StatusOK, cities)
}

// ListDestinationCities melayani request daftar kota tujuan.
func (h *Handler) ListDestinationCities(w http.ResponseWriter, r *http.Request) {
	cities, err := h.service.GetDestinationCities(r.Context())
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "terjadi kesalahan internal pada server")
		return
	}
	response.JSON(w, http.StatusOK, cities)
}

// ListVehicles melayani request daftar armada kendaraan.
func (h *Handler) ListVehicles(w http.ResponseWriter, r *http.Request) {
	vehicles, err := h.service.GetVehicles(r.Context())
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "terjadi kesalahan internal pada server")
		return
	}
	response.JSON(w, http.StatusOK, vehicles)
}

