package booking

import (
	"errors"
	"time"
)

const (
	StatusPendingPayment = "menunggu_pembayaran"
	StatusConfirmed      = "terkonfirmasi"
	StatusCompleted      = "selesai"
	StatusCancelled      = "dibatalkan"

	PaymentMethodQRIS = "qris"
	QRISExpiryMinutes = 15
)

var (
	ErrBookingNotFound       = errors.New("pesanan tidak ditemukan")
	ErrScheduleNotFound      = errors.New("jadwal tidak ditemukan atau tidak aktif")
	ErrSeatAlreadyTaken      = errors.New("nomor kursi sudah dipesan penumpang lain")
	ErrInvalidInput          = errors.New("data pemesanan tidak valid")
	ErrForbidden             = errors.New("anda tidak memiliki akses ke pesanan ini")
	ErrAlreadyPaid           = errors.New("pesanan ini sudah lunas")
	ErrBookingCancelled      = errors.New("pesanan ini sudah dibatalkan")
	ErrMidtransNotConfigured = errors.New("MIDTRANS_SERVER_KEY belum dikonfigurasi pada server")
	ErrInvalidSignature      = errors.New("signature notifikasi Midtrans tidak valid")
)

// CreateBookingRequest adalah payload POST /api/v1/bookings.
type CreateBookingRequest struct {
	ScheduleID int64  `json:"schedule_id"`
	SeatNumber string `json:"seat_number"`
}

// BookingDetail merepresentasikan detail lengkap pemesanan tiket yang dikembalikan API.
type BookingDetail struct {
	ID              int64      `json:"id_pesan"`
	BookingCode     string     `json:"booking_code"`
	ScheduleID      int64      `json:"id_jadwal"`
	MemberID        int64      `json:"id_member"`
	MemberName      string     `json:"member_name"`
	MemberPhone     string     `json:"member_phone"`
	SeatNumber      string     `json:"nomor_kursi"`
	Status          string     `json:"status"`
	PaymentMethod   string     `json:"payment_method"`
	Price           int64      `json:"harga"`
	DepartureDate   string     `json:"tgl_berangkat"`
	DepartureTime   string     `json:"jam_berangkat"`
	VehicleName     string     `json:"jenis_mobil"`
	VehiclePlate    string     `json:"nomor_polisi"`
	OriginCityID    int64      `json:"id_kota_asal"`
	OriginCity      string     `json:"nm_kota_asal"`
	DestCityID      int64      `json:"id_kota_tujuan"`
	DestCity        string     `json:"nm_kota_tujuan"`
	CreatedAt       time.Time  `json:"created_at"`
	MidtransOrderID string     `json:"midtrans_order_id,omitempty"`
	QRISURL         string     `json:"qris_url,omitempty"`
	QRISExpiresAt   *time.Time `json:"qris_expires_at,omitempty"`
}

// SeatAvailabilityResponse adalah respons GET /api/v1/schedules/{id}/seats.
type SeatAvailabilityResponse struct {
	ScheduleID    int64    `json:"schedule_id"`
	OccupiedSeats []string `json:"occupied_seats"`
}

// QRISPaymentResponse adalah respons pembuatan/pengambilan QRIS Midtrans.
type QRISPaymentResponse struct {
	BookingID         int64     `json:"booking_id"`
	BookingCode       string    `json:"booking_code"`
	OrderID           string    `json:"order_id"`
	Amount            int64     `json:"amount"`
	Status            string    `json:"status"`
	TransactionStatus string    `json:"transaction_status"`
	QRISURL           string    `json:"qris_url"`
	ExpiresAt         time.Time `json:"expires_at"`
	IsProduction      bool      `json:"is_production"`
}

// PaymentStatusResponse adalah respons GET /api/v1/bookings/{id}/payment-status.
type PaymentStatusResponse struct {
	BookingID         int64      `json:"booking_id"`
	BookingCode       string     `json:"booking_code"`
	OrderID           string     `json:"order_id,omitempty"`
	Status            string     `json:"status"`
	TransactionStatus string     `json:"transaction_status"`
	Amount            int64      `json:"amount"`
	QRISURL           string     `json:"qris_url,omitempty"`
	ExpiresAt         *time.Time `json:"expires_at,omitempty"`
}

// MidtransNotification merepresentasikan payload webhook dari Midtrans Core API.
type MidtransNotification struct {
	TransactionStatus string `json:"transaction_status"`
	StatusCode        string `json:"status_code"`
	OrderID           string `json:"order_id"`
	GrossAmount       string `json:"gross_amount"`
	SignatureKey      string `json:"signature_key"`
	PaymentType       string `json:"payment_type"`
	SettlementTime    string `json:"settlement_time"`
	FraudStatus       string `json:"fraud_status"`
}
