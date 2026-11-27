package bookings

import (
	"context"
	"strings"
)

// Service mendefinisikan kontrak business logic untuk pemesanan dan verifikasi operator.
type Service interface {
	GetBookedSeats(ctx context.Context, scheduleID int64) ([]string, error)
	CreateBooking(ctx context.Context, memberID int64, req CreateBookingRequest) (*BookingView, error)
	ListMemberBookings(ctx context.Context, memberID int64) ([]BookingView, error)
	SubmitPaymentConfirmation(ctx context.Context, memberID int64, orderCode string, req SubmitPaymentRequest) (*PaymentConfirmationView, error)
	CancelBooking(ctx context.Context, memberID int64, orderCode string) (*BookingView, error)
	ListOperatorConfirmations(ctx context.Context) ([]PaymentConfirmationView, error)
	VerifyConfirmation(ctx context.Context, noResi string, operatorID *int64, approved bool) (*PaymentConfirmationView, error)
	ListOperatorBookings(ctx context.Context) ([]BookingView, error)
	ValidateDeparture(ctx context.Context, orderCode string, operatorID *int64) (*BookingView, error)
}

type serviceImpl struct {
	repo Repository
}

// NewService membuat instance Service pemesanan baru.
func NewService(repo Repository) Service {
	return &serviceImpl{repo: repo}
}

func (s *serviceImpl) GetBookedSeats(ctx context.Context, scheduleID int64) ([]string, error) {
	if scheduleID <= 0 {
		return nil, ErrInvalidInput
	}
	return s.repo.GetBookedSeats(ctx, scheduleID)
}

func (s *serviceImpl) CreateBooking(ctx context.Context, memberID int64, req CreateBookingRequest) (*BookingView, error) {
	seat := strings.TrimSpace(req.SeatNumber)
	if memberID <= 0 || req.ScheduleID <= 0 || seat == "" {
		return nil, ErrInvalidInput
	}
	return s.repo.CreateBooking(ctx, memberID, req.ScheduleID, seat)
}

func (s *serviceImpl) ListMemberBookings(ctx context.Context, memberID int64) ([]BookingView, error) {
	if memberID <= 0 {
		return []BookingView{}, nil
	}
	return s.repo.ListMemberBookings(ctx, memberID)
}

func (s *serviceImpl) SubmitPaymentConfirmation(ctx context.Context, memberID int64, orderCode string, req SubmitPaymentRequest) (*PaymentConfirmationView, error) {
	orderCode = strings.TrimSpace(orderCode)
	req.BankName = strings.TrimSpace(req.BankName)
	req.AccountHolder = strings.TrimSpace(req.AccountHolder)
	req.AccountNumber = strings.TrimSpace(req.AccountNumber)
	req.TransferDate = strings.TrimSpace(req.TransferDate)

	if memberID <= 0 || orderCode == "" || req.BankName == "" || req.AccountHolder == "" || req.AccountNumber == "" || req.TransferDate == "" {
		return nil, ErrInvalidInput
	}
	return s.repo.SubmitPaymentConfirmation(ctx, memberID, orderCode, req)
}

func (s *serviceImpl) CancelBooking(ctx context.Context, memberID int64, orderCode string) (*BookingView, error) {
	orderCode = strings.TrimSpace(orderCode)
	if memberID <= 0 || orderCode == "" {
		return nil, ErrInvalidInput
	}
	return s.repo.CancelBooking(ctx, memberID, orderCode)
}

func (s *serviceImpl) ListOperatorConfirmations(ctx context.Context) ([]PaymentConfirmationView, error) {
	return s.repo.ListOperatorConfirmations(ctx)
}

func (s *serviceImpl) VerifyConfirmation(ctx context.Context, noResi string, operatorID *int64, approved bool) (*PaymentConfirmationView, error) {
	noResi = strings.TrimSpace(noResi)
	if noResi == "" {
		return nil, ErrInvalidInput
	}
	return s.repo.VerifyConfirmation(ctx, noResi, operatorID, approved)
}

func (s *serviceImpl) ListOperatorBookings(ctx context.Context) ([]BookingView, error) {
	return s.repo.ListOperatorBookings(ctx)
}

func (s *serviceImpl) ValidateDeparture(ctx context.Context, orderCode string, operatorID *int64) (*BookingView, error) {
	orderCode = strings.TrimSpace(orderCode)
	if orderCode == "" {
		return nil, ErrInvalidInput
	}
	return s.repo.ValidateDeparture(ctx, orderCode, operatorID)
}
