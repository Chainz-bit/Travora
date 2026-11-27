package testutil

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
)

// MockDBTX adalah implementasi tiruan dari database.DBTX untuk unit testing.
type MockDBTX struct {
	ExecFunc     func(ctx context.Context, sql string, arguments ...any) (pgconn.CommandTag, error)
	QueryFunc    func(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
	QueryRowFunc func(ctx context.Context, sql string, args ...any) pgx.Row
}

func (m *MockDBTX) Exec(ctx context.Context, sql string, arguments ...any) (pgconn.CommandTag, error) {
	if m.ExecFunc != nil {
		return m.ExecFunc(ctx, sql, arguments...)
	}
	return pgconn.NewCommandTag(""), nil
}

func (m *MockDBTX) Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error) {
	if m.QueryFunc != nil {
		return m.QueryFunc(ctx, sql, args...)
	}
	return NewMockRows(nil), nil
}

func (m *MockDBTX) QueryRow(ctx context.Context, sql string, args ...any) pgx.Row {
	if m.QueryRowFunc != nil {
		return m.QueryRowFunc(ctx, sql, args...)
	}
	return &MockRow{ErrVal: pgx.ErrNoRows}
}

// MockRows adalah tiruan antarmuka pgx.Rows untuk hasil query berlapis.
type MockRows struct {
	data   [][]any
	index  int
	err    error
	closed bool
}

// NewMockRows menginisialisasi MockRows dari matriks data baris.
func NewMockRows(data [][]any) *MockRows {
	return &MockRows{
		data:  data,
		index: -1,
	}
}

// SetError menetapkan error yang akan dikembalikan oleh rows.Err().
func (r *MockRows) SetError(err error) *MockRows {
	r.err = err
	return r
}

func (r *MockRows) Close() {
	r.closed = true
}

func (r *MockRows) Err() error {
	return r.err
}

func (r *MockRows) CommandTag() pgconn.CommandTag {
	return pgconn.NewCommandTag("SELECT")
}

func (r *MockRows) FieldDescriptions() []pgconn.FieldDescription {
	return nil
}

func (r *MockRows) Next() bool {
	if r.closed || r.err != nil {
		return false
	}
	r.index++
	return r.index < len(r.data)
}

func (r *MockRows) Scan(dest ...any) error {
	if r.index < 0 || r.index >= len(r.data) {
		return fmt.Errorf("scan dipanggil di luar rentang baris")
	}
	row := r.data[r.index]
	if len(dest) != len(row) {
		return fmt.Errorf("jumlah kolom tujuan (%d) tidak cocok dengan kolom baris (%d)", len(dest), len(row))
	}
	for i, val := range row {
		if err := assignValue(dest[i], val); err != nil {
			return fmt.Errorf("gagal menetapkan nilai pada kolom %d: %w", i, err)
		}
	}
	return nil
}

func (r *MockRows) Values() ([]any, error) {
	if r.index < 0 || r.index >= len(r.data) {
		return nil, fmt.Errorf("values dipanggil di luar rentang baris")
	}
	return r.data[r.index], nil
}

func (r *MockRows) RawValues() [][]byte {
	return nil
}

func (r *MockRows) Conn() *pgx.Conn {
	return nil
}

func (r *MockRows) TypeMap() *pgtype.Map {
	return nil
}

// MockRow adalah tiruan antarmuka pgx.Row untuk hasil query tunggal.
type MockRow struct {
	Values []any
	ErrVal error
}

func (r *MockRow) Scan(dest ...any) error {
	if r.ErrVal != nil {
		return r.ErrVal
	}
	if len(dest) != len(r.Values) {
		return fmt.Errorf("jumlah kolom tujuan (%d) tidak cocok dengan kolom baris (%d)", len(dest), len(r.Values))
	}
	for i, val := range r.Values {
		if err := assignValue(dest[i], val); err != nil {
			return fmt.Errorf("gagal menetapkan nilai pada kolom %d: %w", i, err)
		}
	}
	return nil
}

// assignValue menyalin nilai mock ke pointer dest secara aman.
func assignValue(dest any, val any) error {
	switch d := dest.(type) {
	case *int64:
		if v, ok := val.(int64); ok {
			*d = v
			return nil
		}
		if v, ok := val.(int); ok {
			*d = int64(v)
			return nil
		}
	case *int:
		if v, ok := val.(int); ok {
			*d = v
			return nil
		}
	case *string:
		if v, ok := val.(string); ok {
			*d = v
			return nil
		}
	case *bool:
		if v, ok := val.(bool); ok {
			*d = v
			return nil
		}
	case *time.Time:
		if v, ok := val.(time.Time); ok {
			*d = v
			return nil
		}
	default:
		// Fallback untuk tipe lain seperti time.Time
		if tVal, ok := val.(interface{ Scan(any) error }); ok {
			return tVal.Scan(dest)
		}
		// Direct pointer assignment via type assertion
		switch t := dest.(type) {
		case *any:
			*t = val
			return nil
		}
		return fmt.Errorf("tipe tujuan %T tidak didukung oleh assignValue", dest)
	}
	return fmt.Errorf("gagal mengonversi %T ke tujuan %T", val, dest)
}
