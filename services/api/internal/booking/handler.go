package booking

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"

	"travora/api/internal/auth"
	"travora/api/internal/response"
)

// SessionValidator mendefinisikan kontrak validasi sesi pengguna untuk endpoint booking terproteksi.
type SessionValidator interface {
	ValidateSession(ctx context.Context, tokenString string) (*auth.User, error)
}

// Handler menangani request HTTP untuk pemesanan tiket dan pembayaran QRIS Midtrans.
type Handler struct {
	service  *Service
	sessions SessionValidator
}

// NewHandler membuat instance Handler baru untuk domain booking.
func NewHandler(service *Service, sessions SessionValidator) *Handler {
	return &Handler{
		service:  service,
		sessions: sessions,
	}
}

// RegisterRoutes mendaftarkan seluruh endpoint booking & pembayaran QRIS Midtrans ke ServeMux.
func (h *Handler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/v1/schedules/{id}/seats", h.GetSeatAvailability)
	mux.HandleFunc("POST /api/v1/bookings", h.CreateBooking)
	mux.HandleFunc("GET /api/v1/bookings/me", h.ListMyBookings)
	mux.HandleFunc("POST /api/v1/bookings/{id}/qris", h.CreateQRISPayment)
	mux.HandleFunc("GET /api/v1/bookings/{id}/payment-status", h.GetPaymentStatus)
	mux.HandleFunc("POST /api/v1/payments/midtrans/notification", h.MidtransNotificationWebhook)
}

func (h *Handler) authenticateMember(w http.ResponseWriter, r *http.Request) (*auth.User, bool) {
	cookie, err := r.Cookie(auth.SessionCookieName)
	if err != nil || cookie.Value == "" {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "silakan masuk terlebih dahulu")
		return nil, false
	}

	user, err := h.sessions.ValidateSession(r.Context(), cookie.Value)
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "sesi tidak valid atau telah kedaluwarsa")
		return nil, false
	}

	if user.Role != auth.RoleMember {
		response.Error(w, http.StatusForbidden, "FORBIDDEN", "endpoint ini hanya untuk akun member")
		return nil, false
	}

	return user, true
}

func parsePositiveID(raw string) (int64, bool) {
	id, err := strconv.ParseInt(raw, 10, 64)
	return id, err == nil && id > 0
}

// GetSeatAvailability melayani GET /api/v1/schedules/{id}/seats.
func (h *Handler) GetSeatAvailability(w http.ResponseWriter, r *http.Request) {
	scheduleID, ok := parsePositiveID(r.PathValue("id"))
	if !ok {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "ID jadwal harus berupa bilangan bulat positif")
		return
	}

	res, err := h.service.GetSeatAvailability(r.Context(), scheduleID)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "gagal memuat ketersediaan kursi")
		return
	}

	response.JSON(w, http.StatusOK, res)
}

// CreateBooking melayani POST /api/v1/bookings.
func (h *Handler) CreateBooking(w http.ResponseWriter, r *http.Request) {
	user, ok := h.authenticateMember(w, r)
	if !ok {
		return
	}

	var req CreateBookingRequest
	if err := json.NewDecoder(io.LimitReader(r.Body, 1048576)).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_INPUT", "payload JSON pemesanan tidak valid")
		return
	}

	created, err := h.service.CreateBooking(r.Context(), user.ID, req)
	if err != nil {
		switch {
		case errors.Is(err, ErrInvalidInput):
			response.Error(w, http.StatusBadRequest, "INVALID_INPUT", err.Error())
		case errors.Is(err, ErrScheduleNotFound):
			response.Error(w, http.StatusNotFound, "NOT_FOUND", err.Error())
		case errors.Is(err, ErrSeatAlreadyTaken):
			response.Error(w, http.StatusConflict, "SEAT_TAKEN", err.Error())
		default:
			response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "gagal membuat pemesanan tiket")
		}
		return
	}

	response.JSON(w, http.StatusCreated, created)
}

// ListMyBookings melayani GET /api/v1/bookings/me.
func (h *Handler) ListMyBookings(w http.ResponseWriter, r *http.Request) {
	user, ok := h.authenticateMember(w, r)
	if !ok {
		return
	}

	list, err := h.service.ListMyBookings(r.Context(), user.ID)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "gagal memuat riwayat pemesanan")
		return
	}

	response.JSON(w, http.StatusOK, list)
}

// CreateQRISPayment melayani POST /api/v1/bookings/{id}/qris.
func (h *Handler) CreateQRISPayment(w http.ResponseWriter, r *http.Request) {
	user, ok := h.authenticateMember(w, r)
	if !ok {
		return
	}

	bookingID, valid := parsePositiveID(r.PathValue("id"))
	if !valid {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "ID pesanan tidak valid")
		return
	}

	qrisRes, err := h.service.CreateOrGetQRIS(r.Context(), user.ID, bookingID)
	if err != nil {
		switch {
		case errors.Is(err, ErrBookingNotFound):
			response.Error(w, http.StatusNotFound, "NOT_FOUND", err.Error())
		case errors.Is(err, ErrForbidden):
			response.Error(w, http.StatusForbidden, "FORBIDDEN", err.Error())
		case errors.Is(err, ErrAlreadyPaid), errors.Is(err, ErrBookingCancelled):
			response.Error(w, http.StatusConflict, "INVALID_STATE", err.Error())
		case errors.Is(err, ErrMidtransNotConfigured):
			response.Error(w, http.StatusServiceUnavailable, "MIDTRANS_NOT_CONFIGURED", err.Error())
		default:
			response.Error(w, http.StatusBadGateway, "PAYMENT_GATEWAY_ERROR", err.Error())
		}
		return
	}

	response.JSON(w, http.StatusOK, qrisRes)
}

// GetPaymentStatus melayani GET /api/v1/bookings/{id}/payment-status.
func (h *Handler) GetPaymentStatus(w http.ResponseWriter, r *http.Request) {
	user, ok := h.authenticateMember(w, r)
	if !ok {
		return
	}

	bookingID, valid := parsePositiveID(r.PathValue("id"))
	if !valid {
		response.Error(w, http.StatusBadRequest, "BAD_REQUEST", "ID pesanan tidak valid")
		return
	}

	statusRes, err := h.service.CheckPaymentStatus(r.Context(), user.ID, bookingID)
	if err != nil {
		switch {
		case errors.Is(err, ErrBookingNotFound):
			response.Error(w, http.StatusNotFound, "NOT_FOUND", err.Error())
		case errors.Is(err, ErrForbidden):
			response.Error(w, http.StatusForbidden, "FORBIDDEN", err.Error())
		default:
			response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "gagal memeriksa status pembayaran")
		}
		return
	}

	response.JSON(w, http.StatusOK, statusRes)
}

// MidtransNotificationWebhook melayani POST /api/v1/payments/midtrans/notification dari server Midtrans.
func (h *Handler) MidtransNotificationWebhook(w http.ResponseWriter, r *http.Request) {
	var notif MidtransNotification
	if err := json.NewDecoder(io.LimitReader(r.Body, 1048576)).Decode(&notif); err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_INPUT", "payload webhook tidak valid")
		return
	}

	if err := h.service.HandleMidtransWebhook(r.Context(), notif); err != nil {
		switch {
		case errors.Is(err, ErrInvalidSignature):
			response.Error(w, http.StatusForbidden, "INVALID_SIGNATURE", err.Error())
		case errors.Is(err, ErrInvalidInput):
			response.Error(w, http.StatusBadRequest, "INVALID_INPUT", err.Error())
		case errors.Is(err, ErrBookingNotFound):
			response.Error(w, http.StatusNotFound, "NOT_FOUND", err.Error())
		default:
			response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "gagal memproses webhook Midtrans")
		}
		return
	}

	response.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
