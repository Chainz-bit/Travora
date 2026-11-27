package bookings

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Repository mendefinisikan operasi database atomik untuk pemesanan, konfirmasi pembayaran,
// dan sinkronisasi langsung dengan tabel `tickets`.
type Repository interface {
	EnsureSchema(ctx context.Context) error
	GetBookedSeats(ctx context.Context, scheduleID int64) ([]string, error)
	CreateBooking(ctx context.Context, memberID int64, scheduleID int64, seatNumber string) (*BookingView, error)
	ListMemberBookings(ctx context.Context, memberID int64) ([]BookingView, error)
	SubmitPaymentConfirmation(ctx context.Context, memberID int64, orderCode string, req SubmitPaymentRequest) (*PaymentConfirmationView, error)
	CancelBooking(ctx context.Context, memberID int64, orderCode string) (*BookingView, error)
	ListOperatorConfirmations(ctx context.Context) ([]PaymentConfirmationView, error)
	VerifyConfirmation(ctx context.Context, noResi string, operatorID *int64, approved bool) (*PaymentConfirmationView, error)
	ListOperatorBookings(ctx context.Context) ([]BookingView, error)
	ValidateDeparture(ctx context.Context, orderCode string, operatorID *int64) (*BookingView, error)
}

type pgRepository struct {
	pool *pgxpool.Pool
}

// NewRepository membuat instance Repository baru berbasis *pgxpool.Pool.
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

func inferSeatCapacity(vehicleName string) int {
	switch {
	case strings.Contains(vehicleName, "14"):
		return 14
	case strings.Contains(vehicleName, "12"):
		return 12
	case strings.Contains(vehicleName, "11"):
		return 11
	case strings.Contains(vehicleName, "8"):
		return 8
	case strings.Contains(vehicleName, "6"):
		return 6
	default:
		return 11
	}
}

// EnsureSchema menambahkan kolom sinkronisasi yang diperlukan secara idempoten pada tabel
// `pesan` dan `konfirmasi_pesanan` tanpa merusak skema 000001_initial_schema.
func (r *pgRepository) EnsureSchema(ctx context.Context) error {
	if r.pool == nil {
		return fmt.Errorf("bookings.Repository.EnsureSchema: database pool nil")
	}

	const ddl = `
		ALTER TABLE pesan ADD COLUMN IF NOT EXISTS order_code VARCHAR(50);
		ALTER TABLE pesan ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

		UPDATE pesan
		SET order_code = 'TRV-' || to_char(COALESCE(created_at, NOW()), 'YYYYMMDD') || '-' || LPAD(id_pesan::text, 4, '0')
		WHERE order_code IS NULL OR order_code = '';

		DO $$
		BEGIN
			IF NOT EXISTS (
				SELECT 1 FROM pg_constraint WHERE conname = 'uq_pesan_order_code'
			) THEN
				ALTER TABLE pesan ADD CONSTRAINT uq_pesan_order_code UNIQUE (order_code);
			END IF;
		END $$;

		ALTER TABLE konfirmasi_pesanan ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100) NOT NULL DEFAULT '';
		ALTER TABLE konfirmasi_pesanan ADD COLUMN IF NOT EXISTS account_holder VARCHAR(120) NOT NULL DEFAULT '';
		ALTER TABLE konfirmasi_pesanan ADD COLUMN IF NOT EXISTS transfer_amount BIGINT NOT NULL DEFAULT 0;
		ALTER TABLE konfirmasi_pesanan ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'menunggu_verifikasi';
		ALTER TABLE konfirmasi_pesanan ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

		CREATE UNIQUE INDEX IF NOT EXISTS uq_pesan_active_seat
			ON pesan (id_jadwal, nomor_kursi)
			WHERE status <> 'dibatalkan';
	`

	if _, err := r.pool.Exec(ctx, ddl); err != nil {
		return fmt.Errorf("bookings.Repository.EnsureSchema: %w", err)
	}
	return nil
}

func (r *pgRepository) GetBookedSeats(ctx context.Context, scheduleID int64) ([]string, error) {
	const query = `
		SELECT nomor_kursi
		FROM pesan
		WHERE id_jadwal = $1 AND status <> 'dibatalkan'
		ORDER BY nomor_kursi ASC;
	`
	rows, err := r.pool.Query(ctx, query, scheduleID)
	if err != nil {
		return nil, fmt.Errorf("bookings.Repository.GetBookedSeats: %w", err)
	}
	defer rows.Close()

	seats := make([]string, 0)
	for rows.Next() {
		var seat string
		if err := rows.Scan(&seat); err != nil {
			return nil, fmt.Errorf("bookings.Repository.GetBookedSeats scan: %w", err)
		}
		seats = append(seats, seat)
	}
	return seats, rows.Err()
}

// CreateBooking membuat pesanan pada tabel `pesan` sekaligus mencatat baris tiket
// berstatus payment_status='pending' pada tabel `tickets` dalam satu transaksi database.
func (r *pgRepository) CreateBooking(ctx context.Context, memberID int64, scheduleID int64, seatNumber string) (*BookingView, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("bookings.Repository.CreateBooking begin tx: %w", err)
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	const schedQuery = `
		SELECT
			j.id_jadwal,
			j.harga,
			to_char(j.tgl_berangkat, 'YYYY-MM-DD'),
			to_char(j.jam_berangkat, 'HH24:MI'),
			j.id_kota_asal,
			ka.nm_kota_asal,
			j.id_kota_tujuan,
			kt.nm_kota_tujuan,
			k.jenis_mobil,
			k.nomor_polisi
		FROM jadwal j
		JOIN kota_asal ka ON j.id_kota_asal = ka.id_kota_asal
		JOIN kota_tujuan kt ON j.id_kota_tujuan = kt.id_kota_tujuan
		JOIN kendaraan k ON j.id_kendaraan = k.id_kendaraan
		WHERE j.id_jadwal = $1 AND j.is_active = TRUE
		FOR UPDATE OF j;
	`

	var (
		schedID, originID, destID, price            int64
		depDate, depTime, originName, destName      string
		vehicleName, vehiclePlate                   string
	)
	err = tx.QueryRow(ctx, schedQuery, scheduleID).Scan(
		&schedID, &price, &depDate, &depTime,
		&originID, &originName, &destID, &destName,
		&vehicleName, &vehiclePlate,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrScheduleNotFound
		}
		return nil, fmt.Errorf("bookings.Repository.CreateBooking query schedule: %w", err)
	}

	capacity := inferSeatCapacity(vehicleName)
	seatInt, seatParseErr := strconv.Atoi(strings.TrimSpace(seatNumber))
	if seatParseErr != nil || seatInt < 1 || seatInt > capacity {
		return nil, ErrInvalidSeatNumber
	}
	seatNumber = strconv.Itoa(seatInt)

	// Cek apakah kursi sudah terisi oleh penumpang lain pada jadwal tersebut
	const seatCheckQuery = `
		SELECT id_pesan
		FROM pesan
		WHERE id_jadwal = $1 AND nomor_kursi = $2 AND status <> 'dibatalkan'
		FOR UPDATE;
	`
	var existingSeatID int64
	seatErr := tx.QueryRow(ctx, seatCheckQuery, scheduleID, seatNumber).Scan(&existingSeatID)
	if seatErr == nil {
		return nil, ErrSeatAlreadyBooked
	}
	if !errors.Is(seatErr, pgx.ErrNoRows) {
		return nil, fmt.Errorf("bookings.Repository.CreateBooking check seat: %w", seatErr)
	}

	// Ambil nama & telepon member untuk view model
	var memberName, memberPhone string
	if err := tx.QueryRow(ctx,
		`SELECT nama, telepon FROM member WHERE id_member = $1;`,
		memberID,
	).Scan(&memberName, &memberPhone); err != nil {
		return nil, fmt.Errorf("bookings.Repository.CreateBooking query member: %w", err)
	}

	var idPesan int64
	var createdAt time.Time
	if err := tx.QueryRow(ctx,
		`INSERT INTO pesan (nomor_kursi, status, id_member, id_jadwal)
		 VALUES ($1, 'menunggu_pembayaran', $2, $3)
		 RETURNING id_pesan, created_at;`,
		seatNumber, memberID, scheduleID,
	).Scan(&idPesan, &createdAt); err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return nil, ErrSeatAlreadyBooked
		}
		return nil, fmt.Errorf("bookings.Repository.CreateBooking insert pesan: %w", err)
	}

	loc, locErr := time.LoadLocation("Asia/Jakarta")
	ts := createdAt
	if locErr == nil {
		ts = ts.In(loc)
	}
	orderCode := fmt.Sprintf("TRV-%s-%04d", ts.Format("20060102"), idPesan)

	if _, err := tx.Exec(ctx,
		`UPDATE pesan SET order_code = $1 WHERE id_pesan = $2;`,
		orderCode, idPesan,
	); err != nil {
		return nil, fmt.Errorf("bookings.Repository.CreateBooking set order_code: %w", err)
	}

	eventName := fmt.Sprintf("%s -> %s (%s %s WIB • Kursi %s)", originName, destName, depDate, depTime, seatNumber)
	if _, err := tx.Exec(ctx,
		`INSERT INTO tickets (user_id, order_code, event_name, amount, payment_status, ticket_status)
		 VALUES ($1, $2, $3, $4, 'pending', 'unused');`,
		memberID, orderCode, eventName, price,
	); err != nil {
		return nil, fmt.Errorf("bookings.Repository.CreateBooking insert ticket: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("bookings.Repository.CreateBooking commit: %w", err)
	}

	return &BookingView{
		ID:         orderCode,
		DBID:       idPesan,
		ScheduleID: strconv.FormatInt(schedID, 10),
		Schedule: ScheduleView{
			ID:             strconv.FormatInt(schedID, 10),
			OriginCityID:   strconv.FormatInt(originID, 10),
			OriginCityName: originName,
			DestCityID:     strconv.FormatInt(destID, 10),
			DestCityName:   destName,
			DepartureDate:  depDate,
			DepartureTime:  depTime,
			VehicleName:    vehicleName,
			VehiclePlate:   vehiclePlate,
			Price:          price,
			AvailableSeats: inferSeatCapacity(vehicleName),
		},
		MemberID:    strconv.FormatInt(memberID, 10),
		MemberName:  memberName,
		MemberPhone: memberPhone,
		SeatNumber:  seatNumber,
		TotalPrice:  price,
		BookingDate: formatWIB(createdAt),
		Status:      "menunggu_pembayaran",
	}, nil
}

const bookingSelectSQL = `
	SELECT
		p.id_pesan,
		COALESCE(p.order_code, 'TRV-' || p.id_pesan::text),
		p.nomor_kursi,
		p.status,
		p.id_member,
		m.nama,
		m.telepon,
		p.created_at,
		j.id_jadwal,
		j.harga,
		to_char(j.tgl_berangkat, 'YYYY-MM-DD'),
		to_char(j.jam_berangkat, 'HH24:MI'),
		j.id_kota_asal,
		ka.nm_kota_asal,
		j.id_kota_tujuan,
		kt.nm_kota_tujuan,
		k.jenis_mobil,
		k.nomor_polisi,
		COALESCE(kp.no_resi, '')
	FROM pesan p
	JOIN member m ON p.id_member = m.id_member
	JOIN jadwal j ON p.id_jadwal = j.id_jadwal
	JOIN kota_asal ka ON j.id_kota_asal = ka.id_kota_asal
	JOIN kota_tujuan kt ON j.id_kota_tujuan = kt.id_kota_tujuan
	JOIN kendaraan k ON j.id_kendaraan = k.id_kendaraan
	LEFT JOIN konfirmasi_pesanan kp ON kp.id_pesan = p.id_pesan
`

func scanBookingRows(rows pgx.Rows) ([]BookingView, error) {
	list := make([]BookingView, 0)
	for rows.Next() {
		var (
			idPesan, memberID, schedID, price, originID, destID     int64
			orderCode, seatNumber, status, memberName, memberPhone  string
			depDate, depTime, originName, destName, vehName, plate  string
			confID                                                  string
			createdAt                                               time.Time
		)
		if err := rows.Scan(
			&idPesan, &orderCode, &seatNumber, &status,
			&memberID, &memberName, &memberPhone, &createdAt,
			&schedID, &price, &depDate, &depTime,
			&originID, &originName, &destID, &destName,
			&vehName, &plate, &confID,
		); err != nil {
			return nil, err
		}

		list = append(list, BookingView{
			ID:         orderCode,
			DBID:       idPesan,
			ScheduleID: strconv.FormatInt(schedID, 10),
			Schedule: ScheduleView{
				ID:             strconv.FormatInt(schedID, 10),
				OriginCityID:   strconv.FormatInt(originID, 10),
				OriginCityName: originName,
				DestCityID:     strconv.FormatInt(destID, 10),
				DestCityName:   destName,
				DepartureDate:  depDate,
				DepartureTime:  depTime,
				VehicleName:    vehName,
				VehiclePlate:   plate,
				Price:          price,
				AvailableSeats: inferSeatCapacity(vehName),
			},
			MemberID:              strconv.FormatInt(memberID, 10),
			MemberName:            memberName,
			MemberPhone:           memberPhone,
			SeatNumber:            seatNumber,
			TotalPrice:            price,
			BookingDate:           formatWIB(createdAt),
			Status:                status,
			PaymentConfirmationID: confID,
		})
	}
	return list, rows.Err()
}

func (r *pgRepository) ListMemberBookings(ctx context.Context, memberID int64) ([]BookingView, error) {
	query := bookingSelectSQL + ` WHERE p.id_member = $1 ORDER BY p.id_pesan DESC;`
	rows, err := r.pool.Query(ctx, query, memberID)
	if err != nil {
		return nil, fmt.Errorf("bookings.Repository.ListMemberBookings: %w", err)
	}
	defer rows.Close()

	list, err := scanBookingRows(rows)
	if err != nil {
		return nil, fmt.Errorf("bookings.Repository.ListMemberBookings scan: %w", err)
	}
	return list, nil
}

func (r *pgRepository) ListOperatorBookings(ctx context.Context) ([]BookingView, error) {
	query := bookingSelectSQL + ` ORDER BY p.id_pesan DESC;`
	rows, err := r.pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("bookings.Repository.ListOperatorBookings: %w", err)
	}
	defer rows.Close()

	list, err := scanBookingRows(rows)
	if err != nil {
		return nil, fmt.Errorf("bookings.Repository.ListOperatorBookings scan: %w", err)
	}
	return list, nil
}

// SubmitPaymentConfirmation menyimpan konfirmasi transfer manual member ke `konfirmasi_pesanan`
// dan memperbarui status pesanan pada `pesan` menjadi `menunggu_verifikasi`.
func (r *pgRepository) SubmitPaymentConfirmation(ctx context.Context, memberID int64, orderCode string, req SubmitPaymentRequest) (*PaymentConfirmationView, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("bookings.Repository.SubmitPaymentConfirmation begin tx: %w", err)
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	var idPesan, harga int64
	var currentStatus string
	err = tx.QueryRow(ctx,
		`SELECT p.id_pesan, p.status, j.harga
		 FROM pesan p
		 JOIN jadwal j ON p.id_jadwal = j.id_jadwal
		 WHERE p.order_code = $1 AND p.id_member = $2
		 FOR UPDATE OF p;`,
		orderCode, memberID,
	).Scan(&idPesan, &currentStatus, &harga)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrBookingNotFound
		}
		return nil, fmt.Errorf("bookings.Repository.SubmitPaymentConfirmation find booking: %w", err)
	}

	if currentStatus != "menunggu_pembayaran" && currentStatus != "menunggu_verifikasi" {
		return nil, ErrInvalidBookingStatus
	}

	amount := req.TransferAmount
	if amount <= 0 {
		amount = harga
	}

	noResi := fmt.Sprintf("KNF-%06d", idPesan)
	loc, locErr := time.LoadLocation("Asia/Jakarta")
	now := time.Now()
	if locErr == nil {
		now = now.In(loc)
	}
	jamTransfer := now.Format("15:04:05")

	const upsertSQL = `
		INSERT INTO konfirmasi_pesanan
			(no_resi, no_rek, tgl_transfer, jam_transfer, id_pesan, bank_name, account_holder, transfer_amount, status, created_at)
		VALUES
			($1, $2, $3::date, $4::time, $5, $6, $7, $8, 'menunggu_verifikasi', NOW())
		ON CONFLICT (id_pesan) DO UPDATE
		SET no_rek = EXCLUDED.no_rek,
		    tgl_transfer = EXCLUDED.tgl_transfer,
		    jam_transfer = EXCLUDED.jam_transfer,
		    bank_name = EXCLUDED.bank_name,
		    account_holder = EXCLUDED.account_holder,
		    transfer_amount = EXCLUDED.transfer_amount,
		    status = 'menunggu_verifikasi',
		    created_at = NOW()
		RETURNING no_resi, created_at;
	`

	var savedResi string
	var createdAt time.Time
	if err := tx.QueryRow(ctx, upsertSQL,
		noResi, req.AccountNumber, req.TransferDate, jamTransfer, idPesan,
		req.BankName, req.AccountHolder, amount,
	).Scan(&savedResi, &createdAt); err != nil {
		return nil, fmt.Errorf("bookings.Repository.SubmitPaymentConfirmation upsert: %w", err)
	}

	if _, err := tx.Exec(ctx,
		`UPDATE pesan SET status = 'menunggu_verifikasi' WHERE id_pesan = $1;`,
		idPesan,
	); err != nil {
		return nil, fmt.Errorf("bookings.Repository.SubmitPaymentConfirmation update pesan: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("bookings.Repository.SubmitPaymentConfirmation commit: %w", err)
	}

	return &PaymentConfirmationView{
		ID:             savedResi,
		BookingID:      orderCode,
		BankName:       req.BankName,
		AccountHolder:  req.AccountHolder,
		AccountNumber:  req.AccountNumber,
		TransferAmount: amount,
		TransferDate:   req.TransferDate,
		Status:         "menunggu_verifikasi",
		SubmittedAt:    formatWIB(createdAt),
	}, nil
}

func (r *pgRepository) ListOperatorConfirmations(ctx context.Context) ([]PaymentConfirmationView, error) {
	const query = `
		SELECT
			kp.no_resi,
			COALESCE(p.order_code, 'TRV-' || p.id_pesan::text),
			COALESCE(NULLIF(kp.bank_name, ''), 'Transfer Bank Manual'),
			COALESCE(NULLIF(kp.account_holder, ''), m.nama),
			kp.no_rek,
			CASE WHEN kp.transfer_amount > 0 THEN kp.transfer_amount ELSE j.harga END,
			to_char(kp.tgl_transfer, 'YYYY-MM-DD'),
			kp.status,
			kp.created_at
		FROM konfirmasi_pesanan kp
		JOIN pesan p ON kp.id_pesan = p.id_pesan
		JOIN member m ON p.id_member = m.id_member
		JOIN jadwal j ON p.id_jadwal = j.id_jadwal
		ORDER BY kp.created_at DESC, p.id_pesan DESC;
	`

	rows, err := r.pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("bookings.Repository.ListOperatorConfirmations: %w", err)
	}
	defer rows.Close()

	list := make([]PaymentConfirmationView, 0)
	for rows.Next() {
		var (
			id, bookingID, bankName, accHolder, accNum, tglTransfer, status string
			amount                                                          int64
			createdAt                                                       time.Time
		)
		if err := rows.Scan(
			&id, &bookingID, &bankName, &accHolder, &accNum,
			&amount, &tglTransfer, &status, &createdAt,
		); err != nil {
			return nil, fmt.Errorf("bookings.Repository.ListOperatorConfirmations scan: %w", err)
		}
		list = append(list, PaymentConfirmationView{
			ID:             id,
			BookingID:      bookingID,
			BankName:       bankName,
			AccountHolder:  accHolder,
			AccountNumber:  accNum,
			TransferAmount: amount,
			TransferDate:   tglTransfer,
			Status:         status,
			SubmittedAt:    formatWIB(createdAt),
		})
	}
	return list, rows.Err()
}

// VerifyConfirmation memverifikasi atau menolak pembayaran pada `konfirmasi_pesanan`, `pesan`,
// dan langsung menyinkronkan `payment_status = 'paid'` pada tabel `tickets` dalam satu transaksi.
func (r *pgRepository) VerifyConfirmation(ctx context.Context, noResi string, operatorID *int64, approved bool) (*PaymentConfirmationView, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("bookings.Repository.VerifyConfirmation begin tx: %w", err)
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	const lockQuery = `
		SELECT
			kp.no_resi,
			kp.id_pesan,
			COALESCE(p.order_code, 'TRV-' || p.id_pesan::text),
			p.id_member,
			p.nomor_kursi,
			COALESCE(NULLIF(kp.bank_name, ''), 'Transfer Bank Manual'),
			COALESCE(NULLIF(kp.account_holder, ''), m.nama),
			kp.no_rek,
			CASE WHEN kp.transfer_amount > 0 THEN kp.transfer_amount ELSE j.harga END,
			to_char(kp.tgl_transfer, 'YYYY-MM-DD'),
			kp.created_at,
			ka.nm_kota_asal,
			kt.nm_kota_tujuan,
			to_char(j.tgl_berangkat, 'YYYY-MM-DD'),
			to_char(j.jam_berangkat, 'HH24:MI'),
			j.harga
		FROM konfirmasi_pesanan kp
		JOIN pesan p ON kp.id_pesan = p.id_pesan
		JOIN member m ON p.id_member = m.id_member
		JOIN jadwal j ON p.id_jadwal = j.id_jadwal
		JOIN kota_asal ka ON j.id_kota_asal = ka.id_kota_asal
		JOIN kota_tujuan kt ON j.id_kota_tujuan = kt.id_kota_tujuan
		WHERE kp.no_resi = $1
		FOR UPDATE OF kp, p;
	`

	var (
		id, orderCode, seatNumber, bankName, accHolder, accNum, tglTransfer string
		originName, destName, depDate, depTime                              string
		idPesan, memberID, amount, harga                                    int64
		createdAt                                                           time.Time
	)

	err = tx.QueryRow(ctx, lockQuery, noResi).Scan(
		&id, &idPesan, &orderCode, &memberID, &seatNumber,
		&bankName, &accHolder, &accNum, &amount, &tglTransfer, &createdAt,
		&originName, &destName, &depDate, &depTime, &harga,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrConfirmationNotFound
		}
		return nil, fmt.Errorf("bookings.Repository.VerifyConfirmation lock: %w", err)
	}

	confStatus := "ditolak"
	pesanStatus := "menunggu_pembayaran"
	ticketPaymentStatus := "pending"
	if approved {
		confStatus = "terverifikasi"
		pesanStatus = "terkonfirmasi"
		ticketPaymentStatus = "paid"
	}

	if _, err := tx.Exec(ctx,
		`UPDATE konfirmasi_pesanan SET status = $1, id_operator = $2 WHERE no_resi = $3;`,
		confStatus, operatorID, noResi,
	); err != nil {
		return nil, fmt.Errorf("bookings.Repository.VerifyConfirmation update konfirmasi: %w", err)
	}

	if _, err := tx.Exec(ctx,
		`UPDATE pesan SET status = $1, id_operator = $2 WHERE id_pesan = $3;`,
		pesanStatus, operatorID, idPesan,
	); err != nil {
		return nil, fmt.Errorf("bookings.Repository.VerifyConfirmation update pesan: %w", err)
	}

	// Sinkronkan status pembayaran pada tabel tickets untuk order_code terkait
	tag, err := tx.Exec(ctx,
		`UPDATE tickets SET payment_status = $1, updated_at = NOW() WHERE order_code = $2;`,
		ticketPaymentStatus, orderCode,
	)
	if err != nil {
		return nil, fmt.Errorf("bookings.Repository.VerifyConfirmation update tickets: %w", err)
	}

	// Jika pesanan lama belum memiliki baris di tabel tickets, buatkan sekaligus
	if tag.RowsAffected() == 0 {
		eventName := fmt.Sprintf("%s -> %s (%s %s WIB • Kursi %s)", originName, destName, depDate, depTime, seatNumber)
		if _, err := tx.Exec(ctx,
			`INSERT INTO tickets (user_id, order_code, event_name, amount, payment_status, ticket_status)
			 VALUES ($1, $2, $3, $4, $5, 'unused')
			 ON CONFLICT (order_code) DO UPDATE
			 SET payment_status = EXCLUDED.payment_status, updated_at = NOW();`,
			memberID, orderCode, eventName, harga, ticketPaymentStatus,
		); err != nil {
			return nil, fmt.Errorf("bookings.Repository.VerifyConfirmation upsert tickets: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("bookings.Repository.VerifyConfirmation commit: %w", err)
	}

	return &PaymentConfirmationView{
		ID:             id,
		BookingID:      orderCode,
		BankName:       bankName,
		AccountHolder:  accHolder,
		AccountNumber:  accNum,
		TransferAmount: amount,
		TransferDate:   tglTransfer,
		Status:         confStatus,
		SubmittedAt:    formatWIB(createdAt),
	}, nil
}

// ValidateDeparture memvalidasi keberangkatan di loket fisik sekaligus menyinkronkan
// ticket_status = 'used' pada tabel `tickets`.
func (r *pgRepository) ValidateDeparture(ctx context.Context, orderCode string, operatorID *int64) (*BookingView, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("bookings.Repository.ValidateDeparture begin tx: %w", err)
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	var idPesan int64
	var status string
	err = tx.QueryRow(ctx,
		`SELECT id_pesan, status FROM pesan WHERE order_code = $1 FOR UPDATE;`,
		orderCode,
	).Scan(&idPesan, &status)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrBookingNotFound
		}
		return nil, fmt.Errorf("bookings.Repository.ValidateDeparture lock: %w", err)
	}

	if status != "terkonfirmasi" {
		return nil, ErrBookingNotConfirmed
	}

	if _, err := tx.Exec(ctx,
		`UPDATE pesan SET status = 'selesai', id_operator = COALESCE($1, id_operator) WHERE id_pesan = $2;`,
		operatorID, idPesan,
	); err != nil {
		return nil, fmt.Errorf("bookings.Repository.ValidateDeparture update pesan: %w", err)
	}

	if _, err := tx.Exec(ctx,
		`UPDATE tickets SET ticket_status = 'used', scanned_at = COALESCE(scanned_at, NOW()), updated_at = NOW() WHERE order_code = $1;`,
		orderCode,
	); err != nil {
		return nil, fmt.Errorf("bookings.Repository.ValidateDeparture update tickets: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("bookings.Repository.ValidateDeparture commit: %w", err)
	}

	query := bookingSelectSQL + ` WHERE p.id_pesan = $1;`
	rows, err := r.pool.Query(ctx, query, idPesan)
	if err != nil {
		return nil, fmt.Errorf("bookings.Repository.ValidateDeparture reload: %w", err)
	}
	defer rows.Close()

	list, err := scanBookingRows(rows)
	if err != nil || len(list) == 0 {
		return nil, fmt.Errorf("bookings.Repository.ValidateDeparture reload scan: %w", err)
	}
	return &list[0], nil
}

// CancelBooking membatalkan pesanan member yang masih berstatus `menunggu_pembayaran`
// dan menandai tiket terkait sebagai `expired` sehingga kursi kembali tersedia.
func (r *pgRepository) CancelBooking(ctx context.Context, memberID int64, orderCode string) (*BookingView, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("bookings.Repository.CancelBooking begin tx: %w", err)
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	var idPesan int64
	var status string
	err = tx.QueryRow(ctx,
		`SELECT id_pesan, status
		 FROM pesan
		 WHERE order_code = $1 AND id_member = $2
		 FOR UPDATE;`,
		orderCode, memberID,
	).Scan(&idPesan, &status)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrBookingNotFound
		}
		return nil, fmt.Errorf("bookings.Repository.CancelBooking lock: %w", err)
	}

	if status != "menunggu_pembayaran" {
		return nil, ErrBookingCannotCancel
	}

	if _, err := tx.Exec(ctx,
		`UPDATE pesan SET status = 'dibatalkan' WHERE id_pesan = $1;`,
		idPesan,
	); err != nil {
		return nil, fmt.Errorf("bookings.Repository.CancelBooking update pesan: %w", err)
	}

	if _, err := tx.Exec(ctx,
		`UPDATE tickets SET payment_status = 'expired', updated_at = NOW() WHERE order_code = $1;`,
		orderCode,
	); err != nil {
		return nil, fmt.Errorf("bookings.Repository.CancelBooking update tickets: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("bookings.Repository.CancelBooking commit: %w", err)
	}

	query := bookingSelectSQL + ` WHERE p.id_pesan = $1;`
	rows, err := r.pool.Query(ctx, query, idPesan)
	if err != nil {
		return nil, fmt.Errorf("bookings.Repository.CancelBooking reload: %w", err)
	}
	defer rows.Close()

	list, err := scanBookingRows(rows)
	if err != nil || len(list) == 0 {
		return nil, fmt.Errorf("bookings.Repository.CancelBooking reload scan: %w", err)
	}
	return &list[0], nil
}
