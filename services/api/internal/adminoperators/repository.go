package adminoperators

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"travora/api/internal/auth"
	"travora/api/internal/database"
)

// Repository mendefinisikan operasi database untuk manajemen akun operator oleh Admin.
type Repository interface {
	ListOperators(ctx context.Context) ([]OperatorSummary, error)
	ExistsByUsername(ctx context.Context, username string) (bool, error)
	CreateOperator(ctx context.Context, name, username, passwordHash string) (*OperatorSummary, error)
	DeleteOperator(ctx context.Context, id int64) error
}

type pgRepository struct {
	db database.DBTX
}

// NewRepository membuat instance Repository baru berbasis database.DBTX.
func NewRepository(db database.DBTX) Repository {
	return &pgRepository{db: db}
}

func (r *pgRepository) ListOperators(ctx context.Context) ([]OperatorSummary, error) {
	const query = `
		SELECT id_operator, nama, username
		FROM operator_loket
		ORDER BY id_operator ASC;
	`

	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("adminoperators.Repository.ListOperators: %w", err)
	}
	defer rows.Close()

	operators := make([]OperatorSummary, 0)
	for rows.Next() {
		var id int64
		var nama, username string
		if err := rows.Scan(&id, &nama, &username); err != nil {
			return nil, fmt.Errorf("adminoperators.Repository.ListOperators scan: %w", err)
		}
		operators = append(operators, OperatorSummary{
			ID:       id,
			Name:     nama,
			Email:    username,
			Username: username,
			Role:     auth.RoleOperator,
		})
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("adminoperators.Repository.ListOperators rows: %w", err)
	}

	return operators, nil
}

func (r *pgRepository) ExistsByUsername(ctx context.Context, username string) (bool, error) {
	const query = `SELECT 1 FROM operator_loket WHERE LOWER(username) = LOWER($1) LIMIT 1;`
	var one int
	err := r.db.QueryRow(ctx, query, username).Scan(&one)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return false, nil
		}
		return false, fmt.Errorf("adminoperators.Repository.ExistsByUsername: %w", err)
	}
	return true, nil
}

func (r *pgRepository) CreateOperator(ctx context.Context, name, username, passwordHash string) (*OperatorSummary, error) {
	const query = `
		INSERT INTO operator_loket (username, password_hash, nama)
		VALUES ($1, $2, $3)
		RETURNING id_operator;
	`

	var id int64
	err := r.db.QueryRow(ctx, query, username, passwordHash, name).Scan(&id)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return nil, ErrDuplicateOperator
		}
		return nil, fmt.Errorf("adminoperators.Repository.CreateOperator: %w", err)
	}

	return &OperatorSummary{
		ID:       id,
		Name:     name,
		Email:    username,
		Username: username,
		Role:     auth.RoleOperator,
	}, nil
}

func (r *pgRepository) DeleteOperator(ctx context.Context, id int64) error {
	const query = `DELETE FROM operator_loket WHERE id_operator = $1;`
	tag, err := r.db.Exec(ctx, query, id)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23503" {
			return ErrOperatorInUse
		}
		return fmt.Errorf("adminoperators.Repository.DeleteOperator: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrOperatorNotFound
	}
	return nil
}
