package adminmaster

import (
	"context"
	"errors"
	"fmt"
	"strconv"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository interface {
	ListCities(ctx context.Context, isOrigin bool) ([]CityView, error)
	CreateCity(ctx context.Context, isOrigin bool, name string, adminID int64) (*CityView, error)
	UpdateCity(ctx context.Context, isOrigin bool, id int64, name string) (*CityView, error)
	DeleteCity(ctx context.Context, isOrigin bool, id int64) error

	ListVehicles(ctx context.Context) ([]VehicleView, error)
	CreateVehicle(ctx context.Context, req VehicleRequest, adminID int64) (*VehicleView, error)
	UpdateVehicle(ctx context.Context, id int64, req VehicleRequest) (*VehicleView, error)
	DeleteVehicle(ctx context.Context, id int64) error

	ListSchedules(ctx context.Context) ([]ScheduleView, error)
	CreateSchedule(ctx context.Context, req ScheduleRequest, adminID int64) (*ScheduleView, error)
	UpdateSchedule(ctx context.Context, id int64, req ScheduleRequest) (*ScheduleView, error)
	ToggleScheduleActive(ctx context.Context, id int64) (*ScheduleView, error)
	DeleteSchedule(ctx context.Context, id int64) (*DeleteScheduleResult, error)
}

type pgRepository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) Repository {
	return &pgRepository{pool: pool}
}

func isPGCode(err error, code string) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == code
}

func cityCodePrefix(isOrigin bool) string {
	if isOrigin {
		return "ASAL-"
	}
	return "TUJ-"
}

func (r *pgRepository) ListCities(ctx context.Context, isOrigin bool) ([]CityView, error) {
	query := `SELECT id_kota_asal, nm_kota_asal FROM kota_asal ORDER BY id_kota_asal ASC;`
	if !isOrigin {
		query = `SELECT id_kota_tujuan, nm_kota_tujuan FROM kota_tujuan ORDER BY id_kota_tujuan ASC;`
	}
	rows, err := r.pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("adminmaster.ListCities: %w", err)
	}
	defer rows.Close()

	prefix := cityCodePrefix(isOrigin)
	list := make([]CityView, 0)
	for rows.Next() {
		var id int64
		var name string
		if err := rows.Scan(&id, &name); err != nil {
			return nil, fmt.Errorf("adminmaster.ListCities scan: %w", err)
		}
		idStr := strconv.FormatInt(id, 10)
		list = append(list, CityView{ID: idStr, Name: name, Code: prefix + idStr})
	}
	return list, rows.Err()
}

func (r *pgRepository) CreateCity(ctx context.Context, isOrigin bool, name string, adminID int64) (*CityView, error) {
	query := `INSERT INTO kota_asal (nm_kota_asal, id_admin) VALUES ($1, $2) RETURNING id_kota_asal;`
	if !isOrigin {
		query = `INSERT INTO kota_tujuan (nm_kota_tujuan, id_admin) VALUES ($1, $2) RETURNING id_kota_tujuan;`
	}
	var id int64
	if err := r.pool.QueryRow(ctx, query, name, adminID).Scan(&id); err != nil {
		return nil, fmt.Errorf("adminmaster.CreateCity: %w", err)
	}
	idStr := strconv.FormatInt(id, 10)
	return &CityView{ID: idStr, Name: name, Code: cityCodePrefix(isOrigin) + idStr}, nil
}

func (r *pgRepository) UpdateCity(ctx context.Context, isOrigin bool, id int64, name string) (*CityView, error) {
	query := `UPDATE kota_asal SET nm_kota_asal = $1 WHERE id_kota_asal = $2;`
	if !isOrigin {
		query = `UPDATE kota_tujuan SET nm_kota_tujuan = $1 WHERE id_kota_tujuan = $2;`
	}
	tag, err := r.pool.Exec(ctx, query, name, id)
	if err != nil {
		return nil, fmt.Errorf("adminmaster.UpdateCity: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return nil, ErrNotFound
	}
	idStr := strconv.FormatInt(id, 10)
	return &CityView{ID: idStr, Name: name, Code: cityCodePrefix(isOrigin) + idStr}, nil
}

func (r *pgRepository) DeleteCity(ctx context.Context, isOrigin bool, id int64) error {
	query := `DELETE FROM kota_asal WHERE id_kota_asal = $1;`
	if !isOrigin {
		query = `DELETE FROM kota_tujuan WHERE id_kota_tujuan = $1;`
	}
	tag, err := r.pool.Exec(ctx, query, id)
	if err != nil {
		if isPGCode(err, "23503") {
			return ErrInUse
		}
		return fmt.Errorf("adminmaster.DeleteCity: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *pgRepository) ListVehicles(ctx context.Context) ([]VehicleView, error) {
	const query = `
		SELECT id_kendaraan, jenis_mobil, nomor_polisi, warna_mobil
		FROM kendaraan
		ORDER BY id_kendaraan ASC;
	`
	rows, err := r.pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("adminmaster.ListVehicles: %w", err)
	}
	defer rows.Close()

	list := make([]VehicleView, 0)
	for rows.Next() {
		var id int64
		var name, plate, color string
		if err := rows.Scan(&id, &name, &plate, &color); err != nil {
			return nil, fmt.Errorf("adminmaster.ListVehicles scan: %w", err)
		}
		list = append(list, VehicleView{
			ID:          strconv.FormatInt(id, 10),
			Name:        name,
			PlateNumber: plate,
			Color:       color,
			Status:      "aktif",
		})
	}
	return list, rows.Err()
}

func (r *pgRepository) CreateVehicle(ctx context.Context, req VehicleRequest, adminID int64) (*VehicleView, error) {
	const query = `
		INSERT INTO kendaraan (jenis_mobil, nomor_polisi, warna_mobil, id_admin)
		VALUES ($1, $2, $3, $4)
		RETURNING id_kendaraan;
	`
	var id int64
	if err := r.pool.QueryRow(ctx, query, req.Name, req.PlateNumber, req.Color, adminID).Scan(&id); err != nil {
		if isPGCode(err, "23505") {
			return nil, ErrDuplicateData
		}
		return nil, fmt.Errorf("adminmaster.CreateVehicle: %w", err)
	}
	return &VehicleView{
		ID:          strconv.FormatInt(id, 10),
		Name:        req.Name,
		PlateNumber: req.PlateNumber,
		Color:       req.Color,
		Status:      "aktif",
	}, nil
}

func (r *pgRepository) UpdateVehicle(ctx context.Context, id int64, req VehicleRequest) (*VehicleView, error) {
	const query = `
		UPDATE kendaraan
		SET jenis_mobil = $1, nomor_polisi = $2, warna_mobil = $3
		WHERE id_kendaraan = $4;
	`
	tag, err := r.pool.Exec(ctx, query, req.Name, req.PlateNumber, req.Color, id)
	if err != nil {
		if isPGCode(err, "23505") {
			return nil, ErrDuplicateData
		}
		return nil, fmt.Errorf("adminmaster.UpdateVehicle: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return nil, ErrNotFound
	}
	return &VehicleView{
		ID:          strconv.FormatInt(id, 10),
		Name:        req.Name,
		PlateNumber: req.PlateNumber,
		Color:       req.Color,
		Status:      "aktif",
	}, nil
}

func (r *pgRepository) DeleteVehicle(ctx context.Context, id int64) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM kendaraan WHERE id_kendaraan = $1;`, id)
	if err != nil {
		if isPGCode(err, "23503") {
			return ErrInUse
		}
		return fmt.Errorf("adminmaster.DeleteVehicle: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

const scheduleSelectSQL = `
	SELECT
		j.id_jadwal,
		j.id_kota_asal,
		ka.nm_kota_asal,
		j.id_kota_tujuan,
		kt.nm_kota_tujuan,
		j.id_kendaraan,
		k.jenis_mobil,
		k.nomor_polisi,
		to_char(j.tgl_berangkat, 'YYYY-MM-DD'),
		to_char(j.jam_berangkat, 'HH24:MI'),
		j.harga,
		j.is_active
	FROM jadwal j
	JOIN kota_asal ka ON j.id_kota_asal = ka.id_kota_asal
	JOIN kota_tujuan kt ON j.id_kota_tujuan = kt.id_kota_tujuan
	JOIN kendaraan k ON j.id_kendaraan = k.id_kendaraan
`

func (r *pgRepository) getScheduleByID(ctx context.Context, id int64) (*ScheduleView, error) {
	query := scheduleSelectSQL + ` WHERE j.id_jadwal = $1;`
	var (
		schedID, originID, destID, vehID, price               int64
		originName, destName, vehName, plate, depDate, depTim string
		active                                                bool
	)
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&schedID, &originID, &originName, &destID, &destName,
		&vehID, &vehName, &plate, &depDate, &depTim, &price, &active,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("adminmaster.getScheduleByID: %w", err)
	}
	return &ScheduleView{
		ID:                  strconv.FormatInt(schedID, 10),
		OriginCityID:        strconv.FormatInt(originID, 10),
		OriginCityName:      originName,
		DestinationCityID:   strconv.FormatInt(destID, 10),
		DestinationCityName: destName,
		VehicleID:           strconv.FormatInt(vehID, 10),
		VehicleName:         vehName,
		VehiclePlate:        plate,
		DepartureDate:       depDate,
		DepartureTime:       depTim + " WIB",
		Price:               price,
		IsActive:            active,
	}, nil
}

func (r *pgRepository) ListSchedules(ctx context.Context) ([]ScheduleView, error) {
	query := scheduleSelectSQL + ` ORDER BY j.tgl_berangkat DESC, j.jam_berangkat ASC, j.id_jadwal DESC;`
	rows, err := r.pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("adminmaster.ListSchedules: %w", err)
	}
	defer rows.Close()

	list := make([]ScheduleView, 0)
	for rows.Next() {
		var (
			schedID, originID, destID, vehID, price               int64
			originName, destName, vehName, plate, depDate, depTim string
			active                                                bool
		)
		if err := rows.Scan(
			&schedID, &originID, &originName, &destID, &destName,
			&vehID, &vehName, &plate, &depDate, &depTim, &price, &active,
		); err != nil {
			return nil, fmt.Errorf("adminmaster.ListSchedules scan: %w", err)
		}
		list = append(list, ScheduleView{
			ID:                  strconv.FormatInt(schedID, 10),
			OriginCityID:        strconv.FormatInt(originID, 10),
			OriginCityName:      originName,
			DestinationCityID:   strconv.FormatInt(destID, 10),
			DestinationCityName: destName,
			VehicleID:           strconv.FormatInt(vehID, 10),
			VehicleName:         vehName,
			VehiclePlate:        plate,
			DepartureDate:       depDate,
			DepartureTime:       depTim + " WIB",
			Price:               price,
			IsActive:            active,
		})
	}
	return list, rows.Err()
}

func (r *pgRepository) CreateSchedule(ctx context.Context, req ScheduleRequest, adminID int64) (*ScheduleView, error) {
	const query = `
		INSERT INTO jadwal (id_kendaraan, id_kota_asal, id_kota_tujuan, id_admin, harga, tgl_berangkat, jam_berangkat, is_active)
		VALUES ($1, $2, $3, $4, $5, $6::date, $7::time, $8)
		RETURNING id_jadwal;
	`
	var id int64
	err := r.pool.QueryRow(
		ctx, query,
		req.VehicleID, req.OriginCityID, req.DestinationCityID, adminID,
		req.Price, req.DepartureDate, req.DepartureTime, req.IsActive,
	).Scan(&id)
	if err != nil {
		if isPGCode(err, "23503") {
			return nil, ErrInvalidInput
		}
		return nil, fmt.Errorf("adminmaster.CreateSchedule: %w", err)
	}
	return r.getScheduleByID(ctx, id)
}

func (r *pgRepository) UpdateSchedule(ctx context.Context, id int64, req ScheduleRequest) (*ScheduleView, error) {
	const query = `
		UPDATE jadwal
		SET id_kendaraan = $1,
		    id_kota_asal = $2,
		    id_kota_tujuan = $3,
		    harga = $4,
		    tgl_berangkat = $5::date,
		    jam_berangkat = $6::time,
		    is_active = $7
		WHERE id_jadwal = $8;
	`
	tag, err := r.pool.Exec(
		ctx, query,
		req.VehicleID, req.OriginCityID, req.DestinationCityID,
		req.Price, req.DepartureDate, req.DepartureTime, req.IsActive, id,
	)
	if err != nil {
		if isPGCode(err, "23503") {
			return nil, ErrInvalidInput
		}
		return nil, fmt.Errorf("adminmaster.UpdateSchedule: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return nil, ErrNotFound
	}
	return r.getScheduleByID(ctx, id)
}

func (r *pgRepository) ToggleScheduleActive(ctx context.Context, id int64) (*ScheduleView, error) {
	tag, err := r.pool.Exec(ctx, `UPDATE jadwal SET is_active = NOT is_active WHERE id_jadwal = $1;`, id)
	if err != nil {
		return nil, fmt.Errorf("adminmaster.ToggleScheduleActive: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return nil, ErrNotFound
	}
	return r.getScheduleByID(ctx, id)
}

func (r *pgRepository) DeleteSchedule(ctx context.Context, id int64) (*DeleteScheduleResult, error) {
	tag, err := r.pool.Exec(ctx, `DELETE FROM jadwal WHERE id_jadwal = $1;`, id)
	if err != nil {
		if isPGCode(err, "23503") {
			updTag, updErr := r.pool.Exec(ctx, `UPDATE jadwal SET is_active = FALSE WHERE id_jadwal = $1;`, id)
			if updErr != nil {
				return nil, fmt.Errorf("adminmaster.DeleteSchedule deactivate fallback: %w", updErr)
			}
			if updTag.RowsAffected() == 0 {
				return nil, ErrNotFound
			}
			return &DeleteScheduleResult{
				Deactivated: true,
				Message:     "Jadwal memiliki riwayat pesanan sehingga otomatis dinonaktifkan agar integritas data tiket tetap terjaga.",
			}, nil
		}
		return nil, fmt.Errorf("adminmaster.DeleteSchedule: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return nil, ErrNotFound
	}
	return &DeleteScheduleResult{
		Deactivated: false,
		Message:     "Jadwal berhasil dihapus permanen.",
	}, nil
}
