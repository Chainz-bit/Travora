package adminoperators

import (
	"context"
	"fmt"
	"strings"

	"golang.org/x/crypto/bcrypt"
)

// Service mendefinisikan logika bisnis pengelolaan akun operator oleh Admin.
type Service interface {
	ListOperators(ctx context.Context) ([]OperatorSummary, error)
	CreateOperator(ctx context.Context, req CreateOperatorRequest) (*OperatorSummary, error)
	DeleteOperator(ctx context.Context, id int64) error
}

type serviceImpl struct {
	repo Repository
}

// NewService membuat instance Service manajemen operator.
func NewService(repo Repository) Service {
	return &serviceImpl{repo: repo}
}

func (s *serviceImpl) ListOperators(ctx context.Context) ([]OperatorSummary, error) {
	return s.repo.ListOperators(ctx)
}

func (s *serviceImpl) CreateOperator(ctx context.Context, req CreateOperatorRequest) (*OperatorSummary, error) {
	name := strings.TrimSpace(req.Name)
	identifier := strings.TrimSpace(req.Email)
	if identifier == "" {
		identifier = strings.TrimSpace(req.Username)
	}
	password := req.Password

	if name == "" || identifier == "" || len(password) < 6 {
		return nil, ErrInvalidInput
	}

	exists, err := s.repo.ExistsByUsername(ctx, identifier)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, ErrDuplicateOperator
	}

	hashBytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("gagal melakukan hashing password operator: %w", err)
	}

	return s.repo.CreateOperator(ctx, name, identifier, string(hashBytes))
}

func (s *serviceImpl) DeleteOperator(ctx context.Context, id int64) error {
	if id <= 0 {
		return ErrOperatorNotFound
	}
	return s.repo.DeleteOperator(ctx, id)
}
