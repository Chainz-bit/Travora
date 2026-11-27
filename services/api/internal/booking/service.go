package booking

import (
	"context"
	"fmt"
	"log"
	"strings"
	"time"
)

// Service menangani business logic pemesanan tiket dan pembayaran QRIS Midtrans.
type Service struct {
	repo     Repository
	midtrans MidtransClient
}

// NewService membuat instance Service booking.
func NewService(repo Repository, midtrans MidtransClient) *Service {
	return &Service{
		repo:     repo,
		midtrans: midtrans,
	}
}

// GetSeatAvailability mengembalikan daftar kursi terisi pada suatu jadwal setelah membebaskan pesanan kedaluwarsa.
func (s *Service) GetSeatAvailability(ctx context.Context, scheduleID int64) (*SeatAvailabilityResponse, error) {
	if scheduleID <= 0 {
		return nil, ErrInvalidInput
	}
	_ = s.repo.ExpireStalePendingBookings(ctx)

	occupied, err := s.repo.GetOccupiedSeats(ctx, scheduleID)
	if err != nil {
		return nil, err
	}
	return &SeatAvailabilityResponse{
		ScheduleID:    scheduleID,
		OccupiedSeats: occupied,
	}, nil
}

// CreateBooking membuat pesanan tiket baru untuk member dengan validasi kursi anti double-booking.
func (s *Service) CreateBooking(ctx context.Context, memberID int64, req CreateBookingRequest) (*BookingDetail, error) {
	seat := strings.TrimSpace(req.SeatNumber)
	if memberID <= 0 || req.ScheduleID <= 0 || seat == "" || len(seat) > 10 {
		return nil, ErrInvalidInput
	}

	// Bebaskan kursi dari pesanan pending yang sudah kedaluwarsa terlebih dahulu
	_ = s.repo.ExpireStalePendingBookings(ctx)

	return s.repo.CreateBooking(ctx, memberID, req.ScheduleID, seat)
}

// ListMyBookings mengembalikan riwayat pemesanan milik member yang sedang login.
func (s *Service) ListMyBookings(ctx context.Context, memberID int64) ([]BookingDetail, error) {
	if memberID <= 0 {
		return nil, ErrInvalidInput
	}
	_ = s.repo.ExpireStalePendingBookings(ctx)
	return s.repo.ListBookingsByMember(ctx, memberID)
}

// CreateOrGetQRIS menghasilkan QRIS dinamis melalui Midtrans Core API untuk pesanan milik member.
// Jika pesanan sudah memiliki QRIS yang masih berlaku, QRIS tersebut dikembalikan ulang (idempoten).
func (s *Service) CreateOrGetQRIS(ctx context.Context, memberID, bookingID int64) (*QRISPaymentResponse, error) {
	b, err := s.repo.GetBookingByID(ctx, bookingID)
	if err != nil {
		return nil, err
	}
	if b.MemberID != memberID {
		return nil, ErrForbidden
	}
	if b.Status == StatusConfirmed || b.Status == StatusCompleted {
		return nil, ErrAlreadyPaid
	}
	if b.Status == StatusCancelled {
		return nil, ErrBookingCancelled
	}

	// Jika sudah ada QRIS yang masih aktif (> 30 detik sebelum expired), kembalikan langsung
	if b.QRISURL != "" && b.MidtransOrderID != "" && b.QRISExpiresAt != nil && b.QRISExpiresAt.After(time.Now().Add(30*time.Second)) {
		return &QRISPaymentResponse{
			BookingID:         b.ID,
			BookingCode:       b.BookingCode,
			OrderID:           b.MidtransOrderID,
			Amount:            b.Price,
			Status:            b.Status,
			TransactionStatus: "pending",
			QRISURL:           b.QRISURL,
			ExpiresAt:         *b.QRISExpiresAt,
			IsProduction:      s.midtrans.IsProduction(),
		}, nil
	}

	// Buat order_id unik <= 20 karakter (sesuai batas VARCHAR(20) pada konfirmasi_pesanan.no_resi)
	orderID := fmt.Sprintf("TRV-%d-%05d", b.ID, time.Now().Unix()%100000)

	chargeRes, err := s.midtrans.ChargeQRIS(ctx, MidtransChargeInput{
		OrderID:      orderID,
		GrossAmount:  b.Price,
		CustomerName: b.MemberName,
		Phone:        b.MemberPhone,
		ExpiryMinute: QRISExpiryMinutes,
	})
	if err != nil {
		return nil, err
	}

	if err := s.repo.SaveQRISCharge(ctx, b.ID, chargeRes.OrderID, chargeRes.QRISURL, chargeRes.ExpiresAt); err != nil {
		return nil, err
	}

	return &QRISPaymentResponse{
		BookingID:         b.ID,
		BookingCode:       b.BookingCode,
		OrderID:           chargeRes.OrderID,
		Amount:            b.Price,
		Status:            b.Status,
		TransactionStatus: chargeRes.TransactionStatus,
		QRISURL:           chargeRes.QRISURL,
		ExpiresAt:         chargeRes.ExpiresAt,
		IsProduction:      s.midtrans.IsProduction(),
	}, nil
}

// CheckPaymentStatus memeriksa status pembayaran terkini dan menyinkronkan dengan Midtrans bila masih pending.
func (s *Service) CheckPaymentStatus(ctx context.Context, memberID, bookingID int64) (*PaymentStatusResponse, error) {
	b, err := s.repo.GetBookingByID(ctx, bookingID)
	if err != nil {
		return nil, err
	}
	if b.MemberID != memberID {
		return nil, ErrForbidden
	}

	txStatus := "pending"
	if b.Status == StatusConfirmed || b.Status == StatusCompleted {
		txStatus = "settlement"
	} else if b.Status == StatusCancelled {
		txStatus = "expire"
	} else if b.MidtransOrderID != "" && s.midtrans.IsConfigured() {
		// Sinkronisasi langsung ke Midtrans (berguna saat webhook terlambat atau uji lokal)
		statusRes, statusErr := s.midtrans.GetTransactionStatus(ctx, b.MidtransOrderID)
		if statusErr == nil && statusRes != nil {
			txStatus = statusRes.TransactionStatus
			switch statusRes.TransactionStatus {
			case "settlement", "capture":
				paidAt := time.Now()
				if statusRes.SettlementTime != "" {
					if t, parseErr := parseMidtransTime(statusRes.SettlementTime); parseErr == nil {
						paidAt = t
					}
				}
				if markErr := s.repo.MarkBookingPaid(ctx, b.ID, b.MidtransOrderID, paidAt); markErr == nil {
					b.Status = StatusConfirmed
				}
			case "expire", "cancel", "deny":
				if cancelErr := s.repo.MarkBookingCancelled(ctx, b.ID); cancelErr == nil {
					b.Status = StatusCancelled
				}
			}
		}
	}

	return &PaymentStatusResponse{
		BookingID:         b.ID,
		BookingCode:       b.BookingCode,
		OrderID:           b.MidtransOrderID,
		Status:            b.Status,
		TransactionStatus: txStatus,
		Amount:            b.Price,
		QRISURL:           b.QRISURL,
		ExpiresAt:         b.QRISExpiresAt,
	}, nil
}

// HandleMidtransWebhook memverifikasi signature SHA-512 dari Midtrans dan memperbarui status pesanan secara otomatis.
func (s *Service) HandleMidtransWebhook(ctx context.Context, notif MidtransNotification) error {
	if notif.OrderID == "" || notif.StatusCode == "" || notif.GrossAmount == "" {
		return ErrInvalidInput
	}

	if !s.midtrans.VerifySignature(notif.OrderID, notif.StatusCode, notif.GrossAmount, notif.SignatureKey) {
		log.Printf("[MIDTRANS] Webhook ditolak: signature tidak valid untuk order_id=%q", notif.OrderID)
		return ErrInvalidSignature
	}

	b, err := s.repo.GetBookingByMidtransOrderID(ctx, notif.OrderID)
	if err != nil {
		return err
	}

	log.Printf("[MIDTRANS] Webhook diterima: order_id=%s booking_id=%d status=%s", notif.OrderID, b.ID, notif.TransactionStatus)

	switch notif.TransactionStatus {
	case "settlement", "capture":
		paidAt := time.Now()
		if notif.SettlementTime != "" {
			if t, parseErr := parseMidtransTime(notif.SettlementTime); parseErr == nil {
				paidAt = t
			}
		}
		return s.repo.MarkBookingPaid(ctx, b.ID, notif.OrderID, paidAt)

	case "expire", "cancel", "deny":
		return s.repo.MarkBookingCancelled(ctx, b.ID)

	default:
		// Status pending atau lainnya: tidak perlu mengubah status DB
		return nil
	}
}
