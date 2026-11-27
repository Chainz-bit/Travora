package tickets

import (
	"errors"
	"time"
)

const (
	PaymentStatusPending = "pending"
	PaymentStatusPaid    = "paid"
	PaymentStatusExpired = "expired"

	TicketStatusUnused = "unused"
	TicketStatusUsed   = "used"
)

var (
	ErrInvalidOrderCode  = errors.New("kode pesanan wajib diisi")
	ErrInvalidTicketData = errors.New("data tiket tidak lengkap atau tidak valid")
	ErrTicketNotFound    = errors.New("Tiket tidak ditemukan")
	ErrTicketUnpaid      = errors.New("Tiket belum lunas / tidak valid")
	ErrTicketAlreadyUsed = errors.New("Tiket sudah digunakan")
)

// Ticket merepresentasikan entitas E-Tiket pada tabel PostgreSQL `tickets`.
type Ticket struct {
	ID            int64      `json:"id"`
	UserID        int64      `json:"user_id"`
	OrderCode     string     `json:"order_code"`
	EventName     string     `json:"event_name"`
	Amount        int64      `json:"amount"`
	PaymentStatus string     `json:"payment_status"`
	TicketStatus  string     `json:"ticket_status"`
	ScannedAt     *time.Time `json:"scanned_at"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

// CreateTicketInput mendefinisikan input saat modul pemesanan/pembayaran mencatat tiket asli ke database.
type CreateTicketInput struct {
	UserID        int64
	OrderCode     string
	EventName     string
	Amount        int64
	PaymentStatus string
}

// ScanRequest merepresentasikan payload JSON untuk POST /api/tickets/scan.
type ScanRequest struct {
	OrderCode string `json:"order_code"`
}

// ScanError merepresentasikan kegagalan validasi check-in dengan status HTTP yang tepat.
type ScanError struct {
	StatusCode int
	Code       string
	Message    string
	Err        error
}

func (e *ScanError) Error() string {
	return e.Message
}

func (e *ScanError) Unwrap() error {
	return e.Err
}
