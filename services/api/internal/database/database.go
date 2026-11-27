package database

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"travora/api/internal/config"
)

// DBTX mendefinisikan antarmuka eksekusi operasi SQL yang kompatibel dengan *pgxpool.Pool, pgx.Tx, dan *pgx.Conn.
// Abstraksi ini memungkinkan repository beroperasi baik secara langsung pada pool maupun di dalam transaksi atomik.
type DBTX interface {
	Exec(ctx context.Context, sql string, arguments ...any) (commandTag pgconn.CommandTag, err error)
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}

// DB mendefinisikan antarmuka abstraksi koneksi database Travora.
type DB interface {
	Ping(ctx context.Context) error
	Close()
	Pool() *pgxpool.Pool
	Stats() *pgxpool.Stat
}

// PostgresDB adalah implementasi DB menggunakan *pgxpool.Pool.
type PostgresDB struct {
	pool *pgxpool.Pool
}

// NewPool menginisialisasi connection pool PostgreSQL menggunakan pgxpool.
// Fungsi ini memvalidasi konfigurasi, menerapkan parameter pool, dan melakukan ping awal menggunakan context timeout.
func NewPool(ctx context.Context, cfg *config.Config) (DB, error) {
	if cfg == nil {
		return nil, fmt.Errorf("konfigurasi database tidak boleh nil")
	}

	if err := cfg.Validate(); err != nil {
		return nil, fmt.Errorf("validasi konfigurasi gagal: %w", err)
	}

	poolConfig, err := pgxpool.ParseConfig(cfg.DSN())
	if err != nil {
		return nil, fmt.Errorf("gagal mem-parsing konfigurasi connection pool: %w", err)
	}

	// Terapkan parameter connection pool dari konfigurasi
	poolConfig.MaxConns = int32(cfg.DBPoolMaxConns)
	poolConfig.MinConns = int32(cfg.DBPoolMinConns)
	poolConfig.MaxConnLifetime = cfg.DBPoolMaxConnLifetime
	poolConfig.MaxConnIdleTime = cfg.DBPoolMaxConnIdleTime

	// Gunakan timeout khusus saat inisialisasi pool dan verifikasi ping
	timeout := cfg.DBConnectTimeout
	if timeout <= 0 {
		timeout = 5 * time.Second
	}

	initCtx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	pool, err := pgxpool.NewWithConfig(initCtx, poolConfig)
	if err != nil {
		return nil, fmt.Errorf("gagal membuat database connection pool: %w", err)
	}

	// Verifikasi konektivitas fisik ke server PostgreSQL dengan Ping
	if err := pool.Ping(initCtx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("gagal melakukan ping awal ke database: %w", err)
	}

	return &PostgresDB{pool: pool}, nil
}

// Ping memeriksa ketersediaan koneksi database dengan context timeout.
func (db *PostgresDB) Ping(ctx context.Context) error {
	if db.pool == nil {
		return fmt.Errorf("database connection pool belum diinisialisasi")
	}
	return db.pool.Ping(ctx)
}

// Close menutup seluruh koneksi aktif di dalam pool secara rapi saat aplikasi shutdown.
func (db *PostgresDB) Close() {
	if db.pool != nil {
		db.pool.Close()
	}
}

// Pool mengembalikan pointer *pgxpool.Pool untuk eksekusi query domain.
func (db *PostgresDB) Pool() *pgxpool.Pool {
	return db.pool
}

// Stats mengembalikan metrik koneksi saat ini (total conns, idle conns, acquired conns).
func (db *PostgresDB) Stats() *pgxpool.Stat {
	if db.pool == nil {
		return nil
	}
	return db.pool.Stat()
}
