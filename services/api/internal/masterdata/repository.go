package masterdata

import (
	"context"
	"fmt"

	"travora/api/internal/database"
)

// Repository mendefinisikan kontrak akses data untuk entitas master data Travora.
type Repository interface {
	ListOriginCities(ctx context.Context) ([]OriginCity, error)
	ListDestinationCities(ctx context.Context) ([]DestinationCity, error)
	ListVehicles(ctx context.Context) ([]Vehicle, error)
}

type pgRepository struct {
	db database.DBTX
}

// NewRepository membuat instance baru Repository dengan eksekutor database.DBTX.
func NewRepository(db database.DBTX) Repository {
	return &pgRepository{db: db}
}

// ListOriginCities mengambil seluruh kota asal terdaftar, diurutkan menurut nama kota (A-Z).
func (r *pgRepository) ListOriginCities(ctx context.Context) ([]OriginCity, error) {
	const query = `
		SELECT id_kota_asal, nm_kota_asal
		FROM kota_asal
		ORDER BY nm_kota_asal ASC;
	`

	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("masterdata.Repository.ListOriginCities: gagal mengeksekusi kueri: %w", err)
	}
	defer rows.Close()

	cities := make([]OriginCity, 0)
	for rows.Next() {
		var c OriginCity
		if err := rows.Scan(&c.ID, &c.Name); err != nil {
			return nil, fmt.Errorf("masterdata.Repository.ListOriginCities: gagal membaca baris data: %w", err)
		}
		cities = append(cities, c)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("masterdata.Repository.ListOriginCities: kesalahan iterasi baris: %w", err)
	}

	return cities, nil
}

// ListDestinationCities mengambil seluruh kota tujuan terdaftar, diurutkan menurut nama kota (A-Z).
func (r *pgRepository) ListDestinationCities(ctx context.Context) ([]DestinationCity, error) {
	const query = `
		SELECT id_kota_tujuan, nm_kota_tujuan
		FROM kota_tujuan
		ORDER BY nm_kota_tujuan ASC;
	`

	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("masterdata.Repository.ListDestinationCities: gagal mengeksekusi kueri: %w", err)
	}
	defer rows.Close()

	cities := make([]DestinationCity, 0)
	for rows.Next() {
		var c DestinationCity
		if err := rows.Scan(&c.ID, &c.Name); err != nil {
			return nil, fmt.Errorf("masterdata.Repository.ListDestinationCities: gagal membaca baris data: %w", err)
		}
		cities = append(cities, c)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("masterdata.Repository.ListDestinationCities: kesalahan iterasi baris: %w", err)
	}

	return cities, nil
}

// ListVehicles mengambil seluruh armada kendaraan, diurutkan menurut jenis mobil dan ID kendaraan.
// Atribut is_active sengaja tidak disertakan karena tidak ada pada skema DDL kendaraan.
func (r *pgRepository) ListVehicles(ctx context.Context) ([]Vehicle, error) {
	const query = `
		SELECT id_kendaraan, jenis_mobil, nomor_polisi, warna_mobil
		FROM kendaraan
		ORDER BY jenis_mobil ASC, id_kendaraan ASC;
	`

	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("masterdata.Repository.ListVehicles: gagal mengeksekusi kueri: %w", err)
	}
	defer rows.Close()

	vehicles := make([]Vehicle, 0)
	for rows.Next() {
		var v Vehicle
		if err := rows.Scan(&v.ID, &v.VehicleType, &v.PoliceNumber, &v.Color); err != nil {
			return nil, fmt.Errorf("masterdata.Repository.ListVehicles: gagal membaca baris data: %w", err)
		}
		vehicles = append(vehicles, v)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("masterdata.Repository.ListVehicles: kesalahan iterasi baris: %w", err)
	}

	return vehicles, nil
}

