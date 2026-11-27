package masterdata

import (
	"context"
	"fmt"
)

// Service mendefinisikan antarmuka lapisan bisnis untuk master data.
type Service interface {
	GetOriginCities(ctx context.Context) ([]OriginCity, error)
	GetDestinationCities(ctx context.Context) ([]DestinationCity, error)
	GetVehicles(ctx context.Context) ([]Vehicle, error)
}

type service struct {
	repo Repository
}

// NewService membuat instance Service baru dengan dependensi Repository.
func NewService(repo Repository) Service {
	return &service{repo: repo}
}

// GetOriginCities mengembalikan daftar kota asal untuk pencarian dan pemesanan.
func (s *service) GetOriginCities(ctx context.Context) ([]OriginCity, error) {
	if err := ctx.Err(); err != nil {
		return nil, fmt.Errorf("masterdata.Service.GetOriginCities: context dibatalkan: %w", err)
	}
	cities, err := s.repo.ListOriginCities(ctx)
	if err != nil {
		return nil, fmt.Errorf("masterdata.Service.GetOriginCities: %w", err)
	}
	return cities, nil
}

// GetDestinationCities mengembalikan daftar kota tujuan untuk pencarian dan pemesanan.
func (s *service) GetDestinationCities(ctx context.Context) ([]DestinationCity, error) {
	if err := ctx.Err(); err != nil {
		return nil, fmt.Errorf("masterdata.Service.GetDestinationCities: context dibatalkan: %w", err)
	}
	cities, err := s.repo.ListDestinationCities(ctx)
	if err != nil {
		return nil, fmt.Errorf("masterdata.Service.GetDestinationCities: %w", err)
	}
	return cities, nil
}

// GetVehicles mengembalikan daftar armada kendaraan travel aktif operasional.
func (s *service) GetVehicles(ctx context.Context) ([]Vehicle, error) {
	if err := ctx.Err(); err != nil {
		return nil, fmt.Errorf("masterdata.Service.GetVehicles: context dibatalkan: %w", err)
	}
	vehicles, err := s.repo.ListVehicles(ctx)
	if err != nil {
		return nil, fmt.Errorf("masterdata.Service.GetVehicles: %w", err)
	}
	return vehicles, nil
}

