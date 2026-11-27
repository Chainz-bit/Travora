package complaints

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository interface {
	EnsureSchema(ctx context.Context) error
	ListByMember(ctx context.Context, memberID int64) ([]ComplaintView, error)
	ListAll(ctx context.Context) ([]ComplaintView, error)
	Create(ctx context.Context, memberID int64, req CreateComplaintRequest) (*ComplaintView, error)
	Reply(ctx context.Context, id int64, adminID int64, req ReplyComplaintRequest) (*ComplaintView, error)
}

type pgRepository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) Repository {
	return &pgRepository{pool: pool}
}

func formatWIB(t time.Time) string {
	loc, err := time.LoadLocation("Asia/Jakarta")
	if err == nil {
		t = t.In(loc)
	}
	return t.Format("2006-01-02 15:04") + " WIB"
}

func normalizeStatus(raw string) string {
	if raw == "menunggu_tanggapan" || raw == "" {
		return "diajukan"
	}
	return raw
}

func (r *pgRepository) EnsureSchema(ctx context.Context) error {
	if r.pool == nil {
		return fmt.Errorf("complaints.EnsureSchema: database pool nil")
	}
	const ddl = `
		ALTER TABLE keluhan ADD COLUMN IF NOT EXISTS order_code VARCHAR(50) NULL;
		ALTER TABLE keluhan ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
		ALTER TABLE keluhan ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
	`
	if _, err := r.pool.Exec(ctx, ddl); err != nil {
		return fmt.Errorf("complaints.EnsureSchema: %w", err)
	}
	return nil
}

const selectComplaintsSQL = `
	SELECT
		k.id_keluhan,
		k.id_member,
		m.nama,
		COALESCE(k.order_code, ''),
		k.jenis_keluhan,
		k.detail_keluhan,
		k.status_keluhan,
		COALESCE(k.tanggapan_admin, ''),
		k.created_at,
		k.updated_at
	FROM keluhan k
	JOIN member m ON k.id_member = m.id_member
`

func scanComplaints(rows pgx.Rows) ([]ComplaintView, error) {
	list := make([]ComplaintView, 0)
	for rows.Next() {
		var (
			id, memberID                                       int64
			memberName, orderCode, subject, msg, status, reply string
			createdAt, updatedAt                               time.Time
		)
		if err := rows.Scan(
			&id, &memberID, &memberName, &orderCode,
			&subject, &msg, &status, &reply, &createdAt, &updatedAt,
		); err != nil {
			return nil, err
		}
		norm := normalizeStatus(status)
		resolved := ""
		if reply != "" || norm == "selesai" || norm == "diproses" {
			resolved = formatWIB(updatedAt)
		}
		list = append(list, ComplaintView{
			ID:            fmt.Sprintf("KLP-%04d", id),
			DBID:          id,
			MemberID:      strconv.FormatInt(memberID, 10),
			MemberName:    memberName,
			BookingCode:   orderCode,
			Subject:       subject,
			Message:       msg,
			Status:        norm,
			AdminResponse: reply,
			CreatedAt:     formatWIB(createdAt),
			ResolvedAt:    resolved,
		})
	}
	return list, rows.Err()
}

func (r *pgRepository) ListByMember(ctx context.Context, memberID int64) ([]ComplaintView, error) {
	query := selectComplaintsSQL + ` WHERE k.id_member = $1 ORDER BY k.id_keluhan DESC;`
	rows, err := r.pool.Query(ctx, query, memberID)
	if err != nil {
		return nil, fmt.Errorf("complaints.ListByMember: %w", err)
	}
	defer rows.Close()
	return scanComplaints(rows)
}

func (r *pgRepository) ListAll(ctx context.Context) ([]ComplaintView, error) {
	query := selectComplaintsSQL + ` ORDER BY k.id_keluhan DESC;`
	rows, err := r.pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("complaints.ListAll: %w", err)
	}
	defer rows.Close()
	return scanComplaints(rows)
}

func (r *pgRepository) Create(ctx context.Context, memberID int64, req CreateComplaintRequest) (*ComplaintView, error) {
	var orderCodePtr *string
	if req.BookingID != "" {
		orderCodePtr = &req.BookingID
	}

	var id int64
	err := r.pool.QueryRow(ctx,
		`INSERT INTO keluhan (id_member, jenis_keluhan, detail_keluhan, status_keluhan, order_code)
		 VALUES ($1, $2, $3, 'diajukan', $4)
		 RETURNING id_keluhan;`,
		memberID, req.Subject, req.Message, orderCodePtr,
	).Scan(&id)
	if err != nil {
		return nil, fmt.Errorf("complaints.Create: %w", err)
	}

	query := selectComplaintsSQL + ` WHERE k.id_keluhan = $1;`
	rows, err := r.pool.Query(ctx, query, id)
	if err != nil {
		return nil, fmt.Errorf("complaints.Create reload: %w", err)
	}
	defer rows.Close()
	list, err := scanComplaints(rows)
	if err != nil || len(list) == 0 {
		return nil, fmt.Errorf("complaints.Create reload scan: %w", err)
	}
	return &list[0], nil
}

func (r *pgRepository) Reply(ctx context.Context, id int64, adminID int64, req ReplyComplaintRequest) (*ComplaintView, error) {
	tag, err := r.pool.Exec(ctx,
		`UPDATE keluhan
		 SET tanggapan_admin = $1,
		     status_keluhan = $2,
		     id_admin = $3,
		     updated_at = NOW()
		 WHERE id_keluhan = $4;`,
		req.AdminResponse, req.Status, adminID, id,
	)
	if err != nil {
		return nil, fmt.Errorf("complaints.Reply: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return nil, ErrComplaintNotFound
	}

	query := selectComplaintsSQL + ` WHERE k.id_keluhan = $1;`
	rows, err := r.pool.Query(ctx, query, id)
	if err != nil {
		return nil, fmt.Errorf("complaints.Reply reload: %w", err)
	}
	defer rows.Close()
	list, err := scanComplaints(rows)
	if err != nil || len(list) == 0 {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrComplaintNotFound
		}
		return nil, fmt.Errorf("complaints.Reply reload scan: %w", err)
	}
	return &list[0], nil
}
