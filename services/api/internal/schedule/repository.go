package schedule

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"travora/api/internal/database"
)

// Repository mendefinisikan kontrak akses data untuk entitas jadwal perjalanan (tabel jadwal).
type Repository interface {
	ListPublicSchedules(ctx context.Context, filter PublicScheduleFilter) ([]PublicSchedule, error)
	GetPublicScheduleByID(ctx context.Context, id int64) (*PublicSchedule, error)
}

type pgRepository struct {
	db database.DBTX
}

// NewRepository membuat instance Repository baru dengan eksekutor database.DBTX.
func NewRepository(db database.DBTX) Repository {
	return &pgRepository{db: db}
}

// ListPublicSchedules mengambil jadwal perjalanan aktif (is_active = TRUE) dengan filter opsional dan pagination.
func (r *pgRepository) ListPublicSchedules(ctx context.Context, filter PublicScheduleFilter) ([]PublicSchedule, error) {
	filter.Normalize()

	baseQuery := `
		SELECT 
			j.id_jadwal,
			j.harga,
			j.tgl_berangkat,
			to_char(j.jam_berangkat, 'HH24:MI:SS') AS jam_berangkat,
			j.is_active,
			j.id_kendaraan,
			k.jenis_mobil,
			k.nomor_polisi,
			j.id_kota_asal,
			ka.nm_kota_asal,
			j.id_kota_tujuan,
			kt.nm_kota_tujuan
		FROM jadwal j
		JOIN kendaraan k ON j.id_kendaraan = k.id_kendaraan
		JOIN kota_asal ka ON j.id_kota_asal = ka.id_kota_asal
		JOIN kota_tujuan kt ON j.id_kota_tujuan = kt.id_kota_tujuan
	`

	conditions := []string{"j.is_active = TRUE"}
	args := make([]any, 0, 5)
	argIdx := 1

	if filter.OriginCityID != nil && *filter.OriginCityID > 0 {
		conditions = append(conditions, fmt.Sprintf("j.id_kota_asal = $%d", argIdx))
		args = append(args, *filter.OriginCityID)
		argIdx++
	}

	if filter.DestinationCityID != nil && *filter.DestinationCityID > 0 {
		conditions = append(conditions, fmt.Sprintf("j.id_kota_tujuan = $%d", argIdx))
		args = append(args, *filter.DestinationCityID)
		argIdx++
	}

	if filter.DepartureDate != nil && !filter.DepartureDate.IsZero() {
		conditions = append(conditions, fmt.Sprintf("j.tgl_berangkat = $%d::date", argIdx))
		args = append(args, filter.DepartureDate.Format("2006-01-02"))
		argIdx++
	}

	query := baseQuery + " WHERE " + strings.Join(conditions, " AND ") +
		" ORDER BY j.tgl_berangkat ASC, j.jam_berangkat ASC, j.id_jadwal ASC" +
		fmt.Sprintf(" LIMIT $%d OFFSET $%d", argIdx, argIdx+1)

	args = append(args, filter.Limit, filter.Offset)

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("schedule.Repository.ListPublicSchedules: gagal mengeksekusi kueri: %w", err)
	}
	defer rows.Close()

	schedules := make([]PublicSchedule, 0)
	for rows.Next() {
		var s PublicSchedule
		if err := rows.Scan(
			&s.ID,
			&s.Price,
			&s.DepartureDate,
			&s.DepartureTime,
			&s.IsActive,
			&s.VehicleID,
			&s.VehicleName,
			&s.PoliceNumber,
			&s.OriginCityID,
			&s.OriginCity,
			&s.DestCityID,
			&s.DestCity,
		); err != nil {
			return nil, fmt.Errorf("schedule.Repository.ListPublicSchedules: gagal membaca baris data: %w", err)
		}
		schedules = append(schedules, s)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("schedule.Repository.ListPublicSchedules: kesalahan iterasi baris: %w", err)
	}

	return schedules, nil
}

// GetPublicScheduleByID mengambil satu jadwal perjalanan aktif berdasarkan ID.
// Jika jadwal tidak ada atau bernilai is_active = FALSE, mengembalikan ErrScheduleNotFound.
func (r *pgRepository) GetPublicScheduleByID(ctx context.Context, id int64) (*PublicSchedule, error) {
	if id <= 0 {
		return nil, ErrInvalidScheduleID
	}

	const query = `
		SELECT 
			j.id_jadwal,
			j.harga,
			j.tgl_berangkat,
			to_char(j.jam_berangkat, 'HH24:MI:SS') AS jam_berangkat,
			j.is_active,
			j.id_kendaraan,
			k.jenis_mobil,
			k.nomor_polisi,
			j.id_kota_asal,
			ka.nm_kota_asal,
			j.id_kota_tujuan,
			kt.nm_kota_tujuan
		FROM jadwal j
		JOIN kendaraan k ON j.id_kendaraan = k.id_kendaraan
		JOIN kota_asal ka ON j.id_kota_asal = ka.id_kota_asal
		JOIN kota_tujuan kt ON j.id_kota_tujuan = kt.id_kota_tujuan
		WHERE j.id_jadwal = $1 AND j.is_active = TRUE;
	`

	var s PublicSchedule
	err := r.db.QueryRow(ctx, query, id).Scan(
		&s.ID,
		&s.Price,
		&s.DepartureDate,
		&s.DepartureTime,
		&s.IsActive,
		&s.VehicleID,
		&s.VehicleName,
		&s.PoliceNumber,
		&s.OriginCityID,
		&s.OriginCity,
		&s.DestCityID,
		&s.DestCity,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrScheduleNotFound
		}
		return nil, fmt.Errorf("schedule.Repository.GetPublicScheduleByID: gagal mengambil data: %w", err)
	}

	return &s, nil
}

