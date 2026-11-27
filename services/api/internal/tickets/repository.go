package tickets

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Repository mendefinisikan kontrak akses database untuk domain E-Tiket.
type Repository interface {
	EnsureSchema(ctx context.Context) error
	ListByUserID(ctx context.Context, userID int64) ([]Ticket, error)
	GetByOrderCodeAndUser(ctx context.Context, orderCode string, userID int64) (*Ticket, error)
	CreateTicket(ctx context.Context, input CreateTicketInput) (*Ticket, error)
	MarkPaidByOrderCode(ctx context.Context, orderCode string) (*Ticket, error)
	ScanByOrderCode(ctx context.Context, orderCode string) (*Ticket, error)
}

type pgRepository struct {
	pool *pgxpool.Pool
}

// NewRepository membuat instance Repository tiket berbasis *pgxpool.Pool.
func NewRepository(pool *pgxpool.Pool) Repository {
	return &pgRepository{pool: pool}
}

// EnsureSchema memastikan tabel `tickets` tersedia tanpa DEFAULT 1, membersihkan sisa tiket dummy,
// dan memastikan Foreign Key ke member(id_member) terpasang aman di PostgreSQL.
func (r *pgRepository) EnsureSchema(ctx context.Context) error {
	if r.pool == nil {
		return fmt.Errorf("tickets.Repository.EnsureSchema: database pool nil")
	}

	const schemaSQL = `
		CREATE TABLE IF NOT EXISTS tickets (
			id SERIAL PRIMARY KEY,
			user_id BIGINT NOT NULL,
			order_code VARCHAR(50) NOT NULL UNIQUE,
			event_name VARCHAR(255) NOT NULL,
			amount BIGINT NOT NULL,
			payment_status VARCHAR(20) NOT NULL DEFAULT 'pending',
			ticket_status VARCHAR(20) NOT NULL DEFAULT 'unused',
			scanned_at TIMESTAMPTZ NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			CONSTRAINT fk_tickets_member FOREIGN KEY (user_id)
				REFERENCES member(id_member) ON DELETE CASCADE,
			CONSTRAINT chk_tickets_payment_status CHECK (payment_status IN ('pending', 'paid', 'expired')),
			CONSTRAINT chk_tickets_ticket_status CHECK (ticket_status IN ('unused', 'used'))
		);
		CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON tickets (user_id);
	`

	if _, err := r.pool.Exec(ctx, schemaSQL); err != nil {
		return fmt.Errorf("tickets.Repository.EnsureSchema create table: %w", err)
	}

	const cleanupSQL = `
		DELETE FROM tickets WHERE order_code LIKE 'TKT-DUMMY-%';
		ALTER TABLE tickets ALTER COLUMN user_id DROP DEFAULT;
		DO $$
		BEGIN
			IF NOT EXISTS (
				SELECT 1 FROM pg_constraint WHERE conname = 'fk_tickets_member'
			) THEN
				ALTER TABLE tickets
					ADD CONSTRAINT fk_tickets_member
					FOREIGN KEY (user_id) REFERENCES member(id_member) ON DELETE CASCADE;
			END IF;
		END $$;
	`

	tag, err := r.pool.Exec(ctx, cleanupSQL)
	if err != nil {
		return fmt.Errorf("tickets.Repository.EnsureSchema cleanup/alter: %w", err)
	}

	if tag.RowsAffected() > 0 {
		log.Printf("[TICKETS] Membersihkan %d baris tiket dummy dari tabel tickets.", tag.RowsAffected())
	}

	return nil
}

// ListByUserID mengambil seluruh tiket milik user berdasarkan user_id yang terotentikasi.
func (r *pgRepository) ListByUserID(ctx context.Context, userID int64) ([]Ticket, error) {
	const query = `
		SELECT id, user_id, order_code, event_name, amount, payment_status, ticket_status, scanned_at, created_at, updated_at
		FROM tickets
		WHERE user_id = $1
		ORDER BY created_at DESC, id DESC
	`

	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("tickets.Repository.ListByUserID: %w", err)
	}
	defer rows.Close()

	list := make([]Ticket, 0)
	for rows.Next() {
		var t Ticket
		if err := rows.Scan(
			&t.ID,
			&t.UserID,
			&t.OrderCode,
			&t.EventName,
			&t.Amount,
			&t.PaymentStatus,
			&t.TicketStatus,
			&t.ScannedAt,
			&t.CreatedAt,
			&t.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("tickets.Repository.ListByUserID scan: %w", err)
		}
		list = append(list, t)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("tickets.Repository.ListByUserID rows: %w", err)
	}

	return list, nil
}

// GetByOrderCodeAndUser mengambil detail 1 tiket berdasarkan order_code yang dimiliki user terkait.
func (r *pgRepository) GetByOrderCodeAndUser(ctx context.Context, orderCode string, userID int64) (*Ticket, error) {
	const query = `
		SELECT id, user_id, order_code, event_name, amount, payment_status, ticket_status, scanned_at, created_at, updated_at
		FROM tickets
		WHERE order_code = $1 AND user_id = $2
	`

	var t Ticket
	err := r.pool.QueryRow(ctx, query, orderCode, userID).Scan(
		&t.ID,
		&t.UserID,
		&t.OrderCode,
		&t.EventName,
		&t.Amount,
		&t.PaymentStatus,
		&t.TicketStatus,
		&t.ScannedAt,
		&t.CreatedAt,
		&t.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrTicketNotFound
		}
		return nil, fmt.Errorf("tickets.Repository.GetByOrderCodeAndUser: %w", err)
	}

	return &t, nil
}

// CreateTicket mencatat tiket asli dari alur pemesanan ke tabel tickets.
func (r *pgRepository) CreateTicket(ctx context.Context, input CreateTicketInput) (*Ticket, error) {
	const query = `
		INSERT INTO tickets (user_id, order_code, event_name, amount, payment_status, ticket_status)
		VALUES ($1, $2, $3, $4, $5, 'unused')
		ON CONFLICT (order_code) DO UPDATE
		SET payment_status = EXCLUDED.payment_status,
		    updated_at = NOW()
		RETURNING id, user_id, order_code, event_name, amount, payment_status, ticket_status, scanned_at, created_at, updated_at
	`

	var t Ticket
	err := r.pool.QueryRow(
		ctx,
		query,
		input.UserID,
		input.OrderCode,
		input.EventName,
		input.Amount,
		input.PaymentStatus,
	).Scan(
		&t.ID,
		&t.UserID,
		&t.OrderCode,
		&t.EventName,
		&t.Amount,
		&t.PaymentStatus,
		&t.TicketStatus,
		&t.ScannedAt,
		&t.CreatedAt,
		&t.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("tickets.Repository.CreateTicket: %w", err)
	}

	return &t, nil
}

// MarkPaidByOrderCode memperbarui status pembayaran tiket menjadi 'paid' setelah pembayaran terverifikasi.
func (r *pgRepository) MarkPaidByOrderCode(ctx context.Context, orderCode string) (*Ticket, error) {
	const query = `
		UPDATE tickets
		SET payment_status = 'paid',
		    updated_at = NOW()
		WHERE order_code = $1
		RETURNING id, user_id, order_code, event_name, amount, payment_status, ticket_status, scanned_at, created_at, updated_at
	`

	var t Ticket
	err := r.pool.QueryRow(ctx, query, orderCode).Scan(
		&t.ID,
		&t.UserID,
		&t.OrderCode,
		&t.EventName,
		&t.Amount,
		&t.PaymentStatus,
		&t.TicketStatus,
		&t.ScannedAt,
		&t.CreatedAt,
		&t.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrTicketNotFound
		}
		return nil, fmt.Errorf("tickets.Repository.MarkPaidByOrderCode: %w", err)
	}

	return &t, nil
}

// ScanByOrderCode memvalidasi dan menandai tiket sebagai used di dalam database transaction
// dengan row-level locking PostgreSQL (SELECT ... FOR UPDATE) untuk mencegah double check-in.
func (r *pgRepository) ScanByOrderCode(ctx context.Context, orderCode string) (*Ticket, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("tickets.Repository.ScanByOrderCode begin tx: %w", err)
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	const lockQuery = `
		SELECT id, user_id, order_code, event_name, amount, payment_status, ticket_status, scanned_at, created_at, updated_at
		FROM tickets
		WHERE order_code = $1
		FOR UPDATE
	`

	var t Ticket
	err = tx.QueryRow(ctx, lockQuery, orderCode).Scan(
		&t.ID,
		&t.UserID,
		&t.OrderCode,
		&t.EventName,
		&t.Amount,
		&t.PaymentStatus,
		&t.TicketStatus,
		&t.ScannedAt,
		&t.CreatedAt,
		&t.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, &ScanError{
				StatusCode: http.StatusNotFound,
				Code:       "TICKET_NOT_FOUND",
				Message:    "Tiket tidak ditemukan",
				Err:        ErrTicketNotFound,
			}
		}
		return nil, fmt.Errorf("tickets.Repository.ScanByOrderCode select for update: %w", err)
	}

	if t.PaymentStatus != PaymentStatusPaid {
		return nil, &ScanError{
			StatusCode: http.StatusBadRequest,
			Code:       "TICKET_UNPAID",
			Message:    "Tiket belum lunas / tidak valid",
			Err:        ErrTicketUnpaid,
		}
	}

	if t.TicketStatus == TicketStatusUsed {
		scannedText := "-"
		if t.ScannedAt != nil {
			loc, locErr := time.LoadLocation("Asia/Jakarta")
			ts := *t.ScannedAt
			if locErr == nil {
				ts = ts.In(loc)
			}
			scannedText = ts.Format("02 Jan 2006 15:04:05 WIB")
		}
		return nil, &ScanError{
			StatusCode: http.StatusConflict,
			Code:       "TICKET_ALREADY_USED",
			Message:    fmt.Sprintf("Tiket sudah digunakan pada %s", scannedText),
			Err:        ErrTicketAlreadyUsed,
		}
	}

	const updateQuery = `
		UPDATE tickets
		SET ticket_status = 'used',
		    scanned_at = NOW(),
		    updated_at = NOW()
		WHERE id = $1
		RETURNING ticket_status, scanned_at, updated_at
	`

	if err := tx.QueryRow(ctx, updateQuery, t.ID).Scan(
		&t.TicketStatus,
		&t.ScannedAt,
		&t.UpdatedAt,
	); err != nil {
		return nil, fmt.Errorf("tickets.Repository.ScanByOrderCode update: %w", err)
	}

	// Sinkronkan juga status keberangkatan pada tabel `pesan` jika order_code berasal dari pemesanan travel.
	if _, err := tx.Exec(ctx,
		`UPDATE pesan SET status = 'selesai' WHERE order_code = $1 AND status = 'terkonfirmasi';`,
		orderCode,
	); err != nil {
		return nil, fmt.Errorf("tickets.Repository.ScanByOrderCode sync pesan: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("tickets.Repository.ScanByOrderCode commit: %w", err)
	}

	return &t, nil
}
