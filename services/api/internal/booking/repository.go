package booking

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"travora/api/internal/database"
)

// Repository mendefinisikan kontrak akses data PostgreSQL untuk pemesanan & pembayaran QRIS.
type Repository interface {
	ExpireStalePendingBookings(ctx context.Context) error
	GetOccupiedSeats(ctx context.Context, scheduleID int64) ([]string, error)
	CreateBooking(ctx context.Context, memberID, scheduleID int64, seatNumber string) (*BookingDetail, error)
	ListBookingsByMember(ctx context.Context, memberID int64) ([]BookingDetail, error)
	GetBookingByID(ctx context.Context, bookingID int64) (*BookingDetail, error)
	GetBookingByMidtransOrderID(ctx context.Context, orderID string) (*BookingDetail, error)
	SaveQRISCharge(ctx context.Context, bookingID int64, orderID, qrisURL string, expiresAt time.Time) error
	MarkBookingPaid(ctx context.Context, bookingID int64, orderID string, paidAt time.Time) error
	MarkBookingCancelled(ctx context.Context, bookingID int64) error
}

type pgRepository struct {
	db database.DBTX
}

// NewRepository membuat instance Repository PostgreSQL untuk domain booking.
func NewRepository(db database.DBTX) Repository {
	return &pgRepository{db: db}
}

const selectBookingDetailSQL = `
	SELECT
		p.id_pesan,
		p.id_jadwal,
		p.id_member,
		m.nama,
		m.telepon,
		p.nomor_kursi,
		p.status,
		p.payment_method,
		j.harga,
		to_char(j.tgl_berangkat, 'YYYY-MM-DD') AS tgl_berangkat,
		to_char(j.jam_berangkat, 'HH24:MI') AS jam_berangkat,
		k.jenis_mobil,
		k.nomor_polisi,
		j.id_kota_asal,
		ka.nm_kota_asal,
		j.id_kota_tujuan,
		kt.nm_kota_tujuan,
		p.created_at,
		p.midtrans_order_id,
		p.qris_url,
		p.qris_expires_at
	FROM pesan p
	JOIN member m ON p.id_member = m.id_member
	JOIN jadwal j ON p.id_jadwal = j.id_jadwal
	JOIN kendaraan k ON j.id_kendaraan = k.id_kendaraan
	JOIN kota_asal ka ON j.id_kota_asal = ka.id_kota_asal
	JOIN kota_tujuan kt ON j.id_kota_tujuan = kt.id_kota_tujuan
`

func scanBookingDetail(row pgx.Row) (*BookingDetail, error) {
	var b BookingDetail
	var orderID sql.NullString
	var qrisURL sql.NullString
	var expiresAt sql.NullTime

	err := row.Scan(
		&b.ID,
		&b.ScheduleID,
		&b.MemberID,
		&b.MemberName,
		&b.MemberPhone,
		&b.SeatNumber,
		&b.Status,
		&b.PaymentMethod,
		&b.Price,
		&b.DepartureDate,
		&b.DepartureTime,
		&b.VehicleName,
		&b.VehiclePlate,
		&b.OriginCityID,
		&b.OriginCity,
		&b.DestCityID,
		&b.DestCity,
		&b.CreatedAt,
		&orderID,
		&qrisURL,
		&expiresAt,
	)
	if err != nil {
		return nil, err
	}

	b.BookingCode = formatBookingCode(b.ID, b.CreatedAt)
	if orderID.Valid {
		b.MidtransOrderID = orderID.String
	}
	if qrisURL.Valid {
		b.QRISURL = qrisURL.String
	}
	if expiresAt.Valid {
		t := expiresAt.Time
		b.QRISExpiresAt = &t
	}
	return &b, nil
}

func formatBookingCode(id int64, createdAt time.Time) string {
	return fmt.Sprintf("TRV-%s-%04d", createdAt.Format("200601"), id)
}

// ExpireStalePendingBookings membatalkan pesanan belum dibayar yang telah melewati batas waktu QRIS,
// sehingga kursinya otomatis kembali tersedia bagi penumpang lain.
func (r *pgRepository) ExpireStalePendingBookings(ctx context.Context) error {
	const query = `
		UPDATE pesan
		SET status = $1
		WHERE status = $2
		  AND (
		      (qris_expires_at IS NOT NULL AND qris_expires_at < NOW())
		      OR (qris_expires_at IS NULL AND created_at < NOW() - INTERVAL '30 minutes')
		  )
	`
	_, err := r.db.Exec(ctx, query, StatusCancelled, StatusPendingPayment)
	if err != nil {
		return fmt.Errorf("booking.Repository.ExpireStalePendingBookings: %w", err)
	}
	return nil
}

func (r *pgRepository) GetOccupiedSeats(ctx context.Context, scheduleID int64) ([]string, error) {
	const query = `
		SELECT nomor_kursi
		FROM pesan
		WHERE id_jadwal = $1
		  AND status <> $2
		ORDER BY nomor_kursi ASC
	`
	rows, err := r.db.Query(ctx, query, scheduleID, StatusCancelled)
	if err != nil {
		return nil, fmt.Errorf("booking.Repository.GetOccupiedSeats: %w", err)
	}
	defer rows.Close()

	seats := make([]string, 0)
	for rows.Next() {
		var seat string
		if err := rows.Scan(&seat); err != nil {
			return nil, fmt.Errorf("booking.Repository.GetOccupiedSeats scan: %w", err)
		}
		seats = append(seats, seat)
	}
	return seats, rows.Err()
}

func (r *pgRepository) CreateBooking(ctx context.Context, memberID, scheduleID int64, seatNumber string) (*BookingDetail, error) {
	// Verifikasi jadwal aktif ada
	var exists bool
	if err := r.db.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM jadwal WHERE id_jadwal = $1 AND is_active = TRUE)`, scheduleID).Scan(&exists); err != nil {
		return nil, fmt.Errorf("booking.Repository.CreateBooking check jadwal: %w", err)
	}
	if !exists {
		return nil, ErrScheduleNotFound
	}

	const insertSQL = `
		INSERT INTO pesan (nomor_kursi, status, id_member, id_jadwal, payment_method)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id_pesan
	`
	var newID int64
	err := r.db.QueryRow(ctx, insertSQL, seatNumber, StatusPendingPayment, memberID, scheduleID, PaymentMethodQRIS).Scan(&newID)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return nil, ErrSeatAlreadyTaken
		}
		return nil, fmt.Errorf("booking.Repository.CreateBooking insert: %w", err)
	}

	return r.GetBookingByID(ctx, newID)
}

func (r *pgRepository) ListBookingsByMember(ctx context.Context, memberID int64) ([]BookingDetail, error) {
	query := selectBookingDetailSQL + ` WHERE p.id_member = $1 ORDER BY p.created_at DESC, p.id_pesan DESC`
	rows, err := r.db.Query(ctx, query, memberID)
	if err != nil {
		return nil, fmt.Errorf("booking.Repository.ListBookingsByMember: %w", err)
	}
	defer rows.Close()

	list := make([]BookingDetail, 0)
	for rows.Next() {
		item, err := scanBookingDetail(rows)
		if err != nil {
			return nil, fmt.Errorf("booking.Repository.ListBookingsByMember scan: %w", err)
		}
		list = append(list, *item)
	}
	return list, rows.Err()
}

func (r *pgRepository) GetBookingByID(ctx context.Context, bookingID int64) (*BookingDetail, error) {
	query := selectBookingDetailSQL + ` WHERE p.id_pesan = $1`
	b, err := scanBookingDetail(r.db.QueryRow(ctx, query, bookingID))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrBookingNotFound
		}
		return nil, fmt.Errorf("booking.Repository.GetBookingByID: %w", err)
	}
	return b, nil
}

func (r *pgRepository) GetBookingByMidtransOrderID(ctx context.Context, orderID string) (*BookingDetail, error) {
	query := selectBookingDetailSQL + ` WHERE p.midtrans_order_id = $1`
	b, err := scanBookingDetail(r.db.QueryRow(ctx, query, orderID))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrBookingNotFound
		}
		return nil, fmt.Errorf("booking.Repository.GetBookingByMidtransOrderID: %w", err)
	}
	return b, nil
}

func (r *pgRepository) SaveQRISCharge(ctx context.Context, bookingID int64, orderID, qrisURL string, expiresAt time.Time) error {
	const query = `
		UPDATE pesan
		SET midtrans_order_id = $1,
		    qris_url = $2,
		    qris_expires_at = $3,
		    payment_method = $4
		WHERE id_pesan = $5
	`
	_, err := r.db.Exec(ctx, query, orderID, qrisURL, expiresAt, PaymentMethodQRIS, bookingID)
	if err != nil {
		return fmt.Errorf("booking.Repository.SaveQRISCharge: %w", err)
	}
	return nil
}

// MarkBookingPaid memperbarui status pesanan menjadi terkonfirmasi dan mencatatnya ke konfirmasi_pesanan secara idempoten.
func (r *pgRepository) MarkBookingPaid(ctx context.Context, bookingID int64, orderID string, paidAt time.Time) error {
	if _, err := r.db.Exec(ctx, `UPDATE pesan SET status = $1 WHERE id_pesan = $2`, StatusConfirmed, bookingID); err != nil {
		return fmt.Errorf("booking.Repository.MarkBookingPaid update pesan: %w", err)
	}

	noResi := orderID
	if len(noResi) > 20 {
		noResi = noResi[:20]
	}

	const insertKonf = `
		INSERT INTO konfirmasi_pesanan (no_resi, no_rek, tgl_transfer, jam_transfer, id_pesan, id_operator)
		VALUES ($1, 'QRIS-MIDTRANS', $2::date, $3::time, $4, NULL)
		ON CONFLICT (id_pesan) DO NOTHING
	`
	_, err := r.db.Exec(
		ctx,
		insertKonf,
		noResi,
		paidAt.Format("2006-01-02"),
		paidAt.Format("15:04:05"),
		bookingID,
	)
	if err != nil {
		return fmt.Errorf("booking.Repository.MarkBookingPaid insert konfirmasi: %w", err)
	}
	return nil
}

func (r *pgRepository) MarkBookingCancelled(ctx context.Context, bookingID int64) error {
	_, err := r.db.Exec(ctx, `UPDATE pesan SET status = $1 WHERE id_pesan = $2 AND status = $3`, StatusCancelled, bookingID, StatusPendingPayment)
	if err != nil {
		return fmt.Errorf("booking.Repository.MarkBookingCancelled: %w", err)
	}
	return nil
}
