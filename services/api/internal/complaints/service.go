package complaints

import (
	"context"
	"strings"
)

type Service interface {
	ListByMember(ctx context.Context, memberID int64) ([]ComplaintView, error)
	ListAll(ctx context.Context) ([]ComplaintView, error)
	Create(ctx context.Context, memberID int64, req CreateComplaintRequest) (*ComplaintView, error)
	Reply(ctx context.Context, id int64, adminID int64, req ReplyComplaintRequest) (*ComplaintView, error)
}

type serviceImpl struct {
	repo Repository
}

func NewService(repo Repository) Service {
	return &serviceImpl{repo: repo}
}

func (s *serviceImpl) ListByMember(ctx context.Context, memberID int64) ([]ComplaintView, error) {
	if memberID <= 0 {
		return []ComplaintView{}, nil
	}
	return s.repo.ListByMember(ctx, memberID)
}

func (s *serviceImpl) ListAll(ctx context.Context) ([]ComplaintView, error) {
	return s.repo.ListAll(ctx)
}

func (s *serviceImpl) Create(ctx context.Context, memberID int64, req CreateComplaintRequest) (*ComplaintView, error) {
	req.Subject = strings.TrimSpace(req.Subject)
	req.Message = strings.TrimSpace(req.Message)
	req.BookingID = strings.TrimSpace(req.BookingID)
	if memberID <= 0 || req.Subject == "" || req.Message == "" {
		return nil, ErrInvalidInput
	}
	return s.repo.Create(ctx, memberID, req)
}

func (s *serviceImpl) Reply(ctx context.Context, id int64, adminID int64, req ReplyComplaintRequest) (*ComplaintView, error) {
	req.AdminResponse = strings.TrimSpace(req.AdminResponse)
	req.Status = strings.ToLower(strings.TrimSpace(req.Status))
	if id <= 0 || adminID <= 0 || req.AdminResponse == "" {
		return nil, ErrInvalidInput
	}
	if req.Status != "diproses" && req.Status != "selesai" {
		return nil, ErrInvalidInput
	}
	return s.repo.Reply(ctx, id, adminID, req)
}
