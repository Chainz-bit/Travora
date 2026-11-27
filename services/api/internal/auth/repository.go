package auth

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"travora/api/internal/database"
)

// Repository mendefinisikan antarmuka akses database untuk autentikasi ketiga role.
type Repository interface {
	FindAdminByEmail(ctx context.Context, email string) (*AdminRecord, error)
	FindMemberByUsername(ctx context.Context, username string) (*MemberRecord, error)
	FindOperatorByUsername(ctx context.Context, username string) (*OperatorRecord, error)

	FindAdminByID(ctx context.Context, id int64) (*AdminRecord, error)
	FindMemberByID(ctx context.Context, id int64) (*MemberRecord, error)
	FindOperatorByID(ctx context.Context, id int64) (*OperatorRecord, error)

	UpdateAdminPassword(ctx context.Context, id int64, passwordHash string) error
	UpdateMemberPassword(ctx context.Context, id int64, passwordHash string) error
	UpdateOperatorPassword(ctx context.Context, id int64, passwordHash string) error

	CreateMember(ctx context.Context, member *MemberRecord) (*MemberRecord, error)
}

type pgRepository struct {
	db database.DBTX
}

// NewRepository membuat instance baru Repository autentikasi dengan database.DBTX.
func NewRepository(db database.DBTX) Repository {
	return &pgRepository{db: db}
}

// FindAdminByEmail mencari akun admin berdasarkan email (case-insensitive).
func (r *pgRepository) FindAdminByEmail(ctx context.Context, email string) (*AdminRecord, error) {
	const query = `
		SELECT id_admin, email, password_hash, nama_lengkap, no_telp
		FROM admin
		WHERE LOWER(email) = LOWER($1)
		LIMIT 1;
	`
	var a AdminRecord
	err := r.db.QueryRow(ctx, query, email).Scan(
		&a.ID,
		&a.Email,
		&a.PasswordHash,
		&a.NamaLengkap,
		&a.NoTelp,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("auth.Repository.FindAdminByEmail: %w", err)
	}
	return &a, nil
}

// FindMemberByUsername mencari akun member berdasarkan username (case-insensitive).
func (r *pgRepository) FindMemberByUsername(ctx context.Context, username string) (*MemberRecord, error) {
	const query = `
		SELECT id_member, nama, alamat, telepon, jen_kelamin, username, password_hash
		FROM member
		WHERE LOWER(username) = LOWER($1)
		LIMIT 1;
	`
	var m MemberRecord
	err := r.db.QueryRow(ctx, query, username).Scan(
		&m.ID,
		&m.Nama,
		&m.Alamat,
		&m.Telepon,
		&m.JenKelamin,
		&m.Username,
		&m.PasswordHash,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("auth.Repository.FindMemberByUsername: %w", err)
	}
	return &m, nil
}

// FindOperatorByUsername mencari akun operator loket berdasarkan username (case-insensitive).
func (r *pgRepository) FindOperatorByUsername(ctx context.Context, username string) (*OperatorRecord, error) {
	const query = `
		SELECT id_operator, username, password_hash, nama
		FROM operator_loket
		WHERE LOWER(username) = LOWER($1)
		LIMIT 1;
	`
	var o OperatorRecord
	err := r.db.QueryRow(ctx, query, username).Scan(
		&o.ID,
		&o.Username,
		&o.PasswordHash,
		&o.Nama,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("auth.Repository.FindOperatorByUsername: %w", err)
	}
	return &o, nil
}

// FindAdminByID mengambil profil admin berdasarkan ID.
func (r *pgRepository) FindAdminByID(ctx context.Context, id int64) (*AdminRecord, error) {
	const query = `
		SELECT id_admin, email, password_hash, nama_lengkap, no_telp
		FROM admin
		WHERE id_admin = $1;
	`
	var a AdminRecord
	err := r.db.QueryRow(ctx, query, id).Scan(
		&a.ID,
		&a.Email,
		&a.PasswordHash,
		&a.NamaLengkap,
		&a.NoTelp,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("auth.Repository.FindAdminByID: %w", err)
	}
	return &a, nil
}

// FindMemberByID mengambil profil member berdasarkan ID.
func (r *pgRepository) FindMemberByID(ctx context.Context, id int64) (*MemberRecord, error) {
	const query = `
		SELECT id_member, nama, alamat, telepon, jen_kelamin, username, password_hash
		FROM member
		WHERE id_member = $1;
	`
	var m MemberRecord
	err := r.db.QueryRow(ctx, query, id).Scan(
		&m.ID,
		&m.Nama,
		&m.Alamat,
		&m.Telepon,
		&m.JenKelamin,
		&m.Username,
		&m.PasswordHash,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("auth.Repository.FindMemberByID: %w", err)
	}
	return &m, nil
}

// FindOperatorByID mengambil profil operator loket berdasarkan ID.
func (r *pgRepository) FindOperatorByID(ctx context.Context, id int64) (*OperatorRecord, error) {
	const query = `
		SELECT id_operator, username, password_hash, nama
		FROM operator_loket
		WHERE id_operator = $1;
	`
	var o OperatorRecord
	err := r.db.QueryRow(ctx, query, id).Scan(
		&o.ID,
		&o.Username,
		&o.PasswordHash,
		&o.Nama,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("auth.Repository.FindOperatorByID: %w", err)
	}
	return &o, nil
}

// UpdateAdminPassword memperbarui password hash akun admin.
func (r *pgRepository) UpdateAdminPassword(ctx context.Context, id int64, passwordHash string) error {
	const query = `UPDATE admin SET password_hash = $1 WHERE id_admin = $2;`
	tag, err := r.db.Exec(ctx, query, passwordHash, id)
	if err != nil {
		return fmt.Errorf("auth.Repository.UpdateAdminPassword: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrUserNotFound
	}
	return nil
}

// UpdateMemberPassword memperbarui password hash akun member.
func (r *pgRepository) UpdateMemberPassword(ctx context.Context, id int64, passwordHash string) error {
	const query = `UPDATE member SET password_hash = $1 WHERE id_member = $2;`
	tag, err := r.db.Exec(ctx, query, passwordHash, id)
	if err != nil {
		return fmt.Errorf("auth.Repository.UpdateMemberPassword: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrUserNotFound
	}
	return nil
}

// UpdateOperatorPassword memperbarui password hash akun operator loket.
func (r *pgRepository) UpdateOperatorPassword(ctx context.Context, id int64, passwordHash string) error {
	const query = `UPDATE operator_loket SET password_hash = $1 WHERE id_operator = $2;`
	tag, err := r.db.Exec(ctx, query, passwordHash, id)
	if err != nil {
		return fmt.Errorf("auth.Repository.UpdateOperatorPassword: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrUserNotFound
	}
	return nil
}

// CreateMember menyisipkan akun member baru ke tabel member di PostgreSQL.
func (r *pgRepository) CreateMember(ctx context.Context, m *MemberRecord) (*MemberRecord, error) {
	const query = `
		INSERT INTO member (nama, alamat, telepon, jen_kelamin, username, password_hash)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id_member;
	`
	err := r.db.QueryRow(ctx, query, m.Nama, m.Alamat, m.Telepon, m.JenKelamin, m.Username, m.PasswordHash).Scan(&m.ID)
	if err != nil {
		return nil, fmt.Errorf("auth.Repository.CreateMember: %w", err)
	}
	return m, nil
}

