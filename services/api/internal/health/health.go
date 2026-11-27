package health

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"travora/api/internal/database"
)

// Handler mengelola seluruh endpoint pemantauan kesehatan (health check) API.
type Handler struct {
	db          database.DB
	pingTimeout time.Duration
}

// Response merepresentasikan struktur payload respons standar health check.
type Response struct {
	Status   string `json:"status"`
	Service  string `json:"service"`
	Database string `json:"database,omitempty"`
	Error    string `json:"error,omitempty"`
}

// NewHandler membuat instance Handler baru dengan dependensi database.
func NewHandler(db database.DB) *Handler {
	return &Handler{
		db:          db,
		pingTimeout: 2 * time.Second,
	}
}

// RegisterRoutes mendaftarkan seluruh endpoint pemantauan ke ServeMux.
func (h *Handler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /health/live", h.Live)
	mux.HandleFunc("GET /health/ready", h.Ready)
	mux.HandleFunc("GET /", h.Root)
}

// Live menangani pemeriksaan keaktifan proses (Liveness Probe).
// Endpoint ini memastikan proses web server menyala tanpa menghubungi database.
func (h *Handler) Live(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(Response{
		Status:  "UP",
		Service: "travora-api",
	})
}

// Ready menangani pemeriksaan kesiapan melayani traffic (Readiness Probe).
// Endpoint ini memverifikasi koneksi database aktif menggunakan context timeout.
// Mengembalikan HTTP 200 jika database terhubung, atau HTTP 503 jika database terputus.
func (h *Handler) Ready(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if h.db == nil {
		w.WriteHeader(http.StatusServiceUnavailable)
		_ = json.NewEncoder(w).Encode(Response{
			Status:   "DOWN",
			Service:  "travora-api",
			Database: "DISCONNECTED",
			Error:    "database connection not initialized",
		})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), h.pingTimeout)
	defer cancel()

	if err := h.db.Ping(ctx); err != nil {
		w.WriteHeader(http.StatusServiceUnavailable)
		_ = json.NewEncoder(w).Encode(Response{
			Status:   "DOWN",
			Service:  "travora-api",
			Database: "DISCONNECTED",
			Error:    "database unreachable",
		})
		return
	}

	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(Response{
		Status:   "UP",
		Service:  "travora-api",
		Database: "CONNECTED",
	})
}

// Root menyediakan endpoint dasar untuk kompatibilitas pengecekan root status.
func (h *Handler) Root(w http.ResponseWriter, r *http.Request) {
	// Hanya layani path persis "/"
	if r.URL.Path != "/" {
		http.NotFound(w, r)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]string{
		"status":  "ok",
		"service": "travora-api",
	})
}
