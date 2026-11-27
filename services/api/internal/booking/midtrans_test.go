package booking

import (
	"context"
	"crypto/sha512"
	"encoding/hex"
	"errors"
	"testing"
	"time"
)

type stubRepo struct {
	booking      *BookingDetail
	paidCalled   bool
	cancelCalled bool
	savedOrderID string
	savedQRISURL string
}

func (s *stubRepo) ExpireStalePendingBookings(ctx context.Context) error { return nil }
func (s *stubRepo) GetOccupiedSeats(ctx context.Context, scheduleID int64) ([]string, error) {
	return []string{"01", "02"}, nil
}
func (s *stubRepo) CreateBooking(ctx context.Context, memberID, scheduleID int64, seatNumber string) (*BookingDetail, error) {
	return s.booking, nil
}
func (s *stubRepo) ListBookingsByMember(ctx context.Context, memberID int64) ([]BookingDetail, error) {
	return []BookingDetail{*s.booking}, nil
}
func (s *stubRepo) GetBookingByID(ctx context.Context, bookingID int64) (*BookingDetail, error) {
	if s.booking == nil || s.booking.ID != bookingID {
		return nil, ErrBookingNotFound
	}
	return s.booking, nil
}
func (s *stubRepo) GetBookingByMidtransOrderID(ctx context.Context, orderID string) (*BookingDetail, error) {
	if s.booking == nil || s.booking.MidtransOrderID != orderID {
		return nil, ErrBookingNotFound
	}
	return s.booking, nil
}
func (s *stubRepo) SaveQRISCharge(ctx context.Context, bookingID int64, orderID, qrisURL string, expiresAt time.Time) error {
	s.savedOrderID = orderID
	s.savedQRISURL = qrisURL
	if s.booking != nil {
		s.booking.MidtransOrderID = orderID
		s.booking.QRISURL = qrisURL
		s.booking.QRISExpiresAt = &expiresAt
	}
	return nil
}
func (s *stubRepo) MarkBookingPaid(ctx context.Context, bookingID int64, orderID string, paidAt time.Time) error {
	s.paidCalled = true
	if s.booking != nil {
		s.booking.Status = StatusConfirmed
	}
	return nil
}
func (s *stubRepo) MarkBookingCancelled(ctx context.Context, bookingID int64) error {
	s.cancelCalled = true
	if s.booking != nil {
		s.booking.Status = StatusCancelled
	}
	return nil
}

type stubMidtrans struct {
	serverKey string
	chargeURL string
}

func (m *stubMidtrans) IsConfigured() bool { return m.serverKey != "" }
func (m *stubMidtrans) IsProduction() bool { return false }
func (m *stubMidtrans) ChargeQRIS(ctx context.Context, input MidtransChargeInput) (*MidtransChargeResult, error) {
	return &MidtransChargeResult{
		OrderID:           input.OrderID,
		TransactionStatus: "pending",
		QRISURL:           m.chargeURL,
		ExpiresAt:         time.Now().Add(15 * time.Minute),
	}, nil
}
func (m *stubMidtrans) GetTransactionStatus(ctx context.Context, orderID string) (*MidtransStatusResult, error) {
	return &MidtransStatusResult{
		OrderID:           orderID,
		StatusCode:        "200",
		GrossAmount:       "150000.00",
		TransactionStatus: "settlement",
	}, nil
}
func (m *stubMidtrans) VerifySignature(orderID, statusCode, grossAmount, signatureKey string) bool {
	realClient := NewMidtransClient(m.serverKey, false)
	return realClient.VerifySignature(orderID, statusCode, grossAmount, signatureKey)
}

func TestVerifyMidtransSignature(t *testing.T) {
	serverKey := "SB-Mid-server-test-secret"
	client := NewMidtransClient(serverKey, false)

	orderID := "TRV-10-12345"
	statusCode := "200"
	grossAmount := "150000.00"

	sum := sha512.Sum512([]byte(orderID + statusCode + grossAmount + serverKey))
	validSig := hex.EncodeToString(sum[:])

	if !client.VerifySignature(orderID, statusCode, grossAmount, validSig) {
		t.Fatal("expected valid SHA-512 signature to pass verification")
	}

	if client.VerifySignature(orderID, statusCode, grossAmount, "tampered-signature") {
		t.Fatal("expected tampered signature to be rejected")
	}
}

func TestHandleMidtransWebhookSettlementAndExpire(t *testing.T) {
	serverKey := "SB-Mid-server-test-secret"
	orderID := "TRV-7-99999"

	repo := &stubRepo{
		booking: &BookingDetail{
			ID:              7,
			MemberID:        1,
			Price:           150000,
			Status:          StatusPendingPayment,
			MidtransOrderID: orderID,
		},
	}
	svc := NewService(repo, &stubMidtrans{serverKey: serverKey})

	// 1. Signature salah harus ditolak
	err := svc.HandleMidtransWebhook(context.Background(), MidtransNotification{
		OrderID:           orderID,
		StatusCode:        "200",
		GrossAmount:       "150000.00",
		SignatureKey:      "invalid",
		TransactionStatus: "settlement",
	})
	if !errors.Is(err, ErrInvalidSignature) {
		t.Fatalf("expected ErrInvalidSignature, got %v", err)
	}

	// 2. Settlement valid harus menandai pesanan lunas
	sum := sha512.Sum512([]byte(orderID + "200" + "150000.00" + serverKey))
	err = svc.HandleMidtransWebhook(context.Background(), MidtransNotification{
		OrderID:           orderID,
		StatusCode:        "200",
		GrossAmount:       "150000.00",
		SignatureKey:      hex.EncodeToString(sum[:]),
		TransactionStatus: "settlement",
	})
	if err != nil {
		t.Fatalf("unexpected error on valid settlement webhook: %v", err)
	}
	if !repo.paidCalled || repo.booking.Status != StatusConfirmed {
		t.Fatalf("expected booking to be marked confirmed, got status=%s", repo.booking.Status)
	}
}
