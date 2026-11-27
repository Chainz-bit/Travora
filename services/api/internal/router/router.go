package router

import (
	"net/http"
	"strings"

	"travora/api/internal/adminmaster"
	"travora/api/internal/adminoperators"
	"travora/api/internal/auth"
	"travora/api/internal/booking"
	"travora/api/internal/bookings"
	"travora/api/internal/complaints"
	"travora/api/internal/health"
	"travora/api/internal/masterdata"
	"travora/api/internal/middleware"
	"travora/api/internal/response"
	"travora/api/internal/schedule"
	"travora/api/internal/tickets"
)

// Config menyimpan dependensi seluruh handler untuk pembangunan router HTTP.
type Config struct {
	AdminMasterHandler    *adminmaster.Handler
	AdminOperatorsHandler *adminoperators.Handler
	AuthHandler           *auth.Handler
	BookingHandler        *booking.Handler
	BookingsHandler       *bookings.Handler
	ComplaintsHandler     *complaints.Handler
	HealthHandler         *health.Handler
	MasterDataHandler     *masterdata.Handler
	ScheduleHandler       *schedule.Handler
	TicketHandler         *tickets.Handler
	CORSOrigins           []string
}

// statusRecorder menyadap status code untuk memastikan pesan error ServeMux berformat JSON.
type statusRecorder struct {
	http.ResponseWriter
	status      int
	wroteHeader bool
}

func (rec *statusRecorder) WriteHeader(code int) {
	rec.status = code
	ct := rec.Header().Get("Content-Type")

	// Jika status bukan 404/405 atau sudah berupa application/json, teruskan langsung
	if code != http.StatusNotFound && code != http.StatusMethodNotAllowed {
		rec.wroteHeader = true
		rec.ResponseWriter.WriteHeader(code)
		return
	}

	if strings.HasPrefix(ct, "application/json") {
		rec.wroteHeader = true
		rec.ResponseWriter.WriteHeader(code)
		return
	}

	// Tunda pengiriman header text/plain untuk 404/405 agar dapat diganti dengan JSON amplop
}

func (rec *statusRecorder) Write(b []byte) (int, error) {
	if !rec.wroteHeader {
		ct := rec.Header().Get("Content-Type")
		if strings.HasPrefix(ct, "application/json") {
			rec.wroteHeader = true
			if rec.status != 0 {
				rec.ResponseWriter.WriteHeader(rec.status)
			}
			return rec.ResponseWriter.Write(b)
		}
		// Abaikan penulisan body plain text bawaan Go ServeMux
		return len(b), nil
	}
	return rec.ResponseWriter.Write(b)
}

// jsonErrorHandler membungkus ServeMux agar respons 404 dan 405 mengembalikan amplop JSON standar.
func jsonErrorHandler(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		rec := &statusRecorder{ResponseWriter: w}
		next.ServeHTTP(rec, r)

		if !rec.wroteHeader {
			switch rec.status {
			case http.StatusNotFound:
				response.Error(w, http.StatusNotFound, "NOT_FOUND", "endpoint tidak ditemukan")
			case http.StatusMethodNotAllowed:
				response.Error(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "metode HTTP tidak diizinkan")
			default:
				if rec.status != 0 {
					w.WriteHeader(rec.status)
				}
			}
		}
	})
}

// New menginisialisasi router utama aplikasi dengan seluruh rute dan middleware terpasang.
func New(cfg Config) http.Handler {
	mux := http.NewServeMux()

	// 1. Daftarkan Health check endpoints
	if cfg.HealthHandler != nil {
		cfg.HealthHandler.RegisterRoutes(mux)
	}

	// 2. Daftarkan Master Data endpoints
	if cfg.MasterDataHandler != nil {
		cfg.MasterDataHandler.RegisterRoutes(mux)
	}

	// 3. Daftarkan Schedule endpoints
	if cfg.ScheduleHandler != nil {
		cfg.ScheduleHandler.RegisterRoutes(mux)
	}

	// 4. Daftarkan Authentication endpoints
	if cfg.AuthHandler != nil {
		cfg.AuthHandler.RegisterRoutes(mux)
	}

	// 5. Daftarkan Ticket & QR Check-in endpoints
	if cfg.TicketHandler != nil {
		cfg.TicketHandler.RegisterRoutes(mux)
	}

	// 6. Daftarkan Admin Operators Management endpoints (wajib role == admin)
	if cfg.AdminOperatorsHandler != nil {
		cfg.AdminOperatorsHandler.RegisterRoutes(mux)
	}

	// 7. Daftarkan Bookings & Operator Verification endpoints
	if cfg.BookingsHandler != nil {
		cfg.BookingsHandler.RegisterRoutes(mux)
	}

	// 8. Daftarkan Booking & Pembayaran QRIS Midtrans endpoints
	if cfg.BookingHandler != nil {
		cfg.BookingHandler.RegisterRoutes(mux)
	}

	// 9. Daftarkan Admin Master Data & Jadwal endpoints (wajib role == admin)
	if cfg.AdminMasterHandler != nil {
		cfg.AdminMasterHandler.RegisterRoutes(mux)
	}

	// 10. Daftarkan Complaints endpoints (member & admin)
	if cfg.ComplaintsHandler != nil {
		cfg.ComplaintsHandler.RegisterRoutes(mux)
	}

	// 11. Pasang wrapper JSON error untuk respons 404 dan 405 bawaan ServeMux
	handlerWithJSONErrors := jsonErrorHandler(mux)

	// 5. Konfigurasi dan pasang middleware CORS
	corsOpts := middleware.DefaultCORSOptions()
	if len(cfg.CORSOrigins) > 0 {
		corsOpts.AllowedOrigins = cfg.CORSOrigins
	}
	corsMiddleware := middleware.CORS(corsOpts)

	return corsMiddleware(handlerWithJSONErrors)
}
