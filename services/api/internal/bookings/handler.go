package bookings

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

// SessionValidator memvalidasi token sesi untuk middleware RBAC pemesanan & loket.
type SessionValidator interface {
	ValidateSession(ctx context.Context, tokenString string) (*auth.User, error)
}

// Handler menangani request HTTP untuk alur pemesanan, pembayaran, dan verifikasi loket.
type Handler struct {
	service  Service
	sessions SessionValidator
}

// NewHandler membuat instance Handler pemesanan baru.
func NewHandler(service Service, sessions SessionValidator) *Handler {
	return &Handler{
		service:  service,
		sessions: sessions,
	}
}

// RegisterRoutes mendaftarkan seluruh endpoint pemesanan & operator ke Go ServeMux.
func (h *Handler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/v1/bookings/booked-seats", h.GetBookedSeats)
	mux.HandleFunc("GET /api/v1/bookings/my", h.requireMember(h.ListMyBookings))
	mux.HandleFunc("POST /api/v1/bookings", h.requireMember(h.CreateBooking))
	mux.HandleFunc("POST /api/v1/bookings/{order_code}/confirm-payment", h.requireMember(h.ConfirmPayment))
	mux.HandleFunc("POST /api/v1/bookings/{order_code}/cancel", h.requireMember(h.CancelBooking))

	mux.HandleFunc("GET /api/v1/operator/confirmations", h.requireOperatorOrAdmin(h.ListOperatorConfirmations))
	mux.HandleFunc("POST /api/v1/operator/confirmations/{no_resi}/verify", h.requireOperatorOrAdmin(h.VerifyConfirmation))
	mux.HandleFunc("GET /api/v1/operator/bookings", h.requireOperatorOrAdmin(h.ListOperatorBookings))
	mux.HandleFunc("POST /api/v1/operator/bookings/{order_code}/validate", h.requireOperatorOrAdmin(h.ValidateDeparture))
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

func (h *Handler) authenticate(r *http.Request) (*auth.User, error) {
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

func (h *Handler) requireMember(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, err := h.authenticate(r)
		if err != nil {
			response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Silakan login terlebih dahulu")
			return
		}
		if user.Role != auth.RoleMember {
			response.Error(w, http.StatusForbidden, "FORBIDDEN", "Halaman pemesanan ini khusus akun member")
			return
		}
		ctx := context.WithValue(r.Context(), ctxKeyUser{}, user)
		next(w, r.WithContext(ctx))
	}
}

func (h *Handler) requireOperatorOrAdmin(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, err := h.authenticate(r)
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

func userFromContext(ctx context.Context) (*auth.User, bool) {
	u, ok := ctx.Value(ctxKeyUser{}).(*auth.User)
	return u, ok && u != nil && u.ID > 0
}

// GetBookedSeats melayani GET /api/v1/bookings/booked-seats?schedule_id=...
func (h *Handler) GetBookedSeats(w http.ResponseWriter, r *http.Request) {
	schedStr := strings.TrimSpace(r.URL.Query().Get("schedule_id"))
	schedID, err := strconv.ParseInt(schedStr, 10, 64)
	if err != nil || schedID <= 0 {
		response.Error(w, http.StatusBadRequest, "INVALID_INPUT", "parameter schedule_id tidak valid")
		return
	}

	seats, err := h.service.GetBookedSeats(r.Context(), schedID)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "gagal memeriksa ketersediaan kursi")
		return
	}
	response.JSON(w, http.StatusOK, seats)
}

// ListMyBookings melayani GET /api/v1/bookings/my.
func (h *Handler) ListMyBookings(w http.ResponseWriter, r *http.Request) {
	user, ok := userFromContext(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Silakan login terlebih dahulu")
		return
	}

	bookings, err := h.service.ListMemberBookings(r.Context(), user.ID)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "gagal memuat riwayat pemesanan")
		return
	}
	response.JSON(w, http.StatusOK, bookings)
}

// CreateBooking melayani POST /api/v1/bookings.
func (h *Handler) CreateBooking(w http.ResponseWriter, r *http.Request) {
	user, ok := userFromContext(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Silakan login terlebih dahulu")
		return
	}

	var req CreateBookingRequest
	dec := json.NewDecoder(io.LimitReader(r.Body, 1048576))
	if err := dec.Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_INPUT", "payload JSON pemesanan tidak valid")
		return
	}

	created, err := h.service.CreateBooking(r.Context(), user.ID, req)
	if err != nil {
		switch {
		case errors.Is(err, ErrInvalidInput):
			response.Error(w, http.StatusBadRequest, "INVALID_INPUT", err.Error())
		case errors.Is(err, ErrInvalidSeatNumber):
			response.Error(w, http.StatusBadRequest, "INVALID_SEAT", err.Error())
		case errors.Is(err, ErrScheduleNotFound):
			response.Error(w, http.StatusNotFound, "SCHEDULE_NOT_FOUND", err.Error())
		case errors.Is(err, ErrSeatAlreadyBooked):
			response.Error(w, http.StatusConflict, "SEAT_BOOKED", err.Error())
		default:
			response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "gagal membuat pesanan tiket")
		}
		return
	}

	response.JSON(w, http.StatusCreated, created)
}

// ConfirmPayment melayani POST /api/v1/bookings/{order_code}/confirm-payment.
func (h *Handler) ConfirmPayment(w http.ResponseWriter, r *http.Request) {
	user, ok := userFromContext(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Silakan login terlebih dahulu")
		return
	}

	orderCode := r.PathValue("order_code")
	var req SubmitPaymentRequest
	dec := json.NewDecoder(io.LimitReader(r.Body, 1048576))
	if err := dec.Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_INPUT", "payload JSON konfirmasi pembayaran tidak valid")
		return
	}

	conf, err := h.service.SubmitPaymentConfirmation(r.Context(), user.ID, orderCode, req)
	if err != nil {
		switch {
		case errors.Is(err, ErrInvalidInput):
			response.Error(w, http.StatusBadRequest, "INVALID_INPUT", err.Error())
		case errors.Is(err, ErrBookingNotFound):
			response.Error(w, http.StatusNotFound, "BOOKING_NOT_FOUND", err.Error())
		case errors.Is(err, ErrInvalidBookingStatus):
			response.Error(w, http.StatusConflict, "INVALID_BOOKING_STATUS", err.Error())
		default:
			response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "gagal mengirim konfirmasi pembayaran")
		}
		return
	}

	response.JSON(w, http.StatusCreated, conf)
}

// CancelBooking melayani POST /api/v1/bookings/{order_code}/cancel.
func (h *Handler) CancelBooking(w http.ResponseWriter, r *http.Request) {
	user, ok := userFromContext(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Silakan login terlebih dahulu")
		return
	}

	orderCode := r.PathValue("order_code")
	updated, err := h.service.CancelBooking(r.Context(), user.ID, orderCode)
	if err != nil {
		switch {
		case errors.Is(err, ErrInvalidInput):
			response.Error(w, http.StatusBadRequest, "INVALID_INPUT", err.Error())
		case errors.Is(err, ErrBookingNotFound):
			response.Error(w, http.StatusNotFound, "BOOKING_NOT_FOUND", err.Error())
		case errors.Is(err, ErrBookingCannotCancel):
			response.Error(w, http.StatusConflict, "CANNOT_CANCEL_BOOKING", err.Error())
		default:
			response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "gagal membatalkan pesanan")
		}
		return
	}

	response.JSON(w, http.StatusOK, updated)
}

// ListOperatorConfirmations melayani GET /api/v1/operator/confirmations.
func (h *Handler) ListOperatorConfirmations(w http.ResponseWriter, r *http.Request) {
	list, err := h.service.ListOperatorConfirmations(r.Context())
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "gagal memuat daftar konfirmasi transfer")
		return
	}
	response.JSON(w, http.StatusOK, list)
}

// VerifyConfirmation melayani POST /api/v1/operator/confirmations/{no_resi}/verify.
func (h *Handler) VerifyConfirmation(w http.ResponseWriter, r *http.Request) {
	user, ok := userFromContext(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Silakan login terlebih dahulu")
		return
	}

	noResi := r.PathValue("no_resi")
	var req VerifyConfirmationRequest
	dec := json.NewDecoder(io.LimitReader(r.Body, 1048576))
	if err := dec.Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_INPUT", "payload JSON verifikasi tidak valid")
		return
	}

	var opID *int64
	if user.Role == auth.RoleOperator {
		id := user.ID
		opID = &id
	}

	updated, err := h.service.VerifyConfirmation(r.Context(), noResi, opID, req.Approved)
	if err != nil {
		switch {
		case errors.Is(err, ErrInvalidInput):
			response.Error(w, http.StatusBadRequest, "INVALID_INPUT", err.Error())
		case errors.Is(err, ErrConfirmationNotFound):
			response.Error(w, http.StatusNotFound, "CONFIRMATION_NOT_FOUND", err.Error())
		default:
			response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "gagal memverifikasi konfirmasi transfer")
		}
		return
	}

	response.JSON(w, http.StatusOK, updated)
}

// ListOperatorBookings melayani GET /api/v1/operator/bookings.
func (h *Handler) ListOperatorBookings(w http.ResponseWriter, r *http.Request) {
	list, err := h.service.ListOperatorBookings(r.Context())
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "gagal memuat daftar pesanan penumpang")
		return
	}
	response.JSON(w, http.StatusOK, list)
}

// ValidateDeparture melayani POST /api/v1/operator/bookings/{order_code}/validate.
func (h *Handler) ValidateDeparture(w http.ResponseWriter, r *http.Request) {
	user, ok := userFromContext(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Silakan login terlebih dahulu")
		return
	}

	orderCode := r.PathValue("order_code")
	var opID *int64
	if user.Role == auth.RoleOperator {
		id := user.ID
		opID = &id
	}

	updated, err := h.service.ValidateDeparture(r.Context(), orderCode, opID)
	if err != nil {
		switch {
		case errors.Is(err, ErrInvalidInput):
			response.Error(w, http.StatusBadRequest, "INVALID_INPUT", err.Error())
		case errors.Is(err, ErrBookingNotFound):
			response.Error(w, http.StatusNotFound, "BOOKING_NOT_FOUND", err.Error())
		case errors.Is(err, ErrBookingNotConfirmed):
			response.Error(w, http.StatusConflict, "BOOKING_NOT_CONFIRMED", err.Error())
		default:
			response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "gagal memvalidasi keberangkatan")
		}
		return
	}

	response.JSON(w, http.StatusOK, updated)
}
