package tickets

import (
	"context"
	"strings"
)

// Service mendefinisikan business logic modul E-Tiket dan Check-in Operator.
type Service interface {
	GetMyTickets(ctx context.Context, userID int64) ([]Ticket, error)
	GetTicketByOrderCodeAndUser(ctx context.Context, orderCode string, userID int64) (*Ticket, error)
	CreateTicket(ctx context.Context, input CreateTicketInput) (*Ticket, error)
	MarkPaidByOrderCode(ctx context.Context, orderCode string) (*Ticket, error)
	ScanTicket(ctx context.Context, orderCode string) (*Ticket, error)
}

type serviceImpl struct {
	repo Repository
}

// NewService membuat instance Service tiket baru.
func NewService(repo Repository) Service {
	return &serviceImpl{repo: repo}
}

func (s *serviceImpl) GetMyTickets(ctx context.Context, userID int64) ([]Ticket, error) {
	if userID <= 0 {
		return []Ticket{}, nil
	}
	return s.repo.ListByUserID(ctx, userID)
}

func (s *serviceImpl) GetTicketByOrderCodeAndUser(ctx context.Context, orderCode string, userID int64) (*Ticket, error) {
	cleanCode := strings.TrimSpace(orderCode)
	if cleanCode == "" {
		return nil, ErrInvalidOrderCode
	}
	if userID <= 0 {
		return nil, ErrTicketNotFound
	}
	return s.repo.GetByOrderCodeAndUser(ctx, cleanCode, userID)
}

func (s *serviceImpl) CreateTicket(ctx context.Context, input CreateTicketInput) (*Ticket, error) {
	input.OrderCode = strings.TrimSpace(input.OrderCode)
	input.EventName = strings.TrimSpace(input.EventName)
	input.PaymentStatus = strings.ToLower(strings.TrimSpace(input.PaymentStatus))

	if input.UserID <= 0 || input.OrderCode == "" || input.EventName == "" || input.Amount <= 0 {
		return nil, ErrInvalidTicketData
	}
	if input.PaymentStatus == "" {
		input.PaymentStatus = PaymentStatusPending
	}
	return s.repo.CreateTicket(ctx, input)
}

func (s *serviceImpl) MarkPaidByOrderCode(ctx context.Context, orderCode string) (*Ticket, error) {
	cleanCode := strings.TrimSpace(orderCode)
	if cleanCode == "" {
		return nil, ErrInvalidOrderCode
	}
	return s.repo.MarkPaidByOrderCode(ctx, cleanCode)
}

func (s *serviceImpl) ScanTicket(ctx context.Context, orderCode string) (*Ticket, error) {
	cleanCode := strings.TrimSpace(orderCode)
	if cleanCode == "" {
		return nil, ErrInvalidOrderCode
	}
	return s.repo.ScanByOrderCode(ctx, cleanCode)
}
