package schedule

import (
	"context"
	"fmt"
)

// Service mendefinisikan antarmuka lapisan logika bisnis untuk jadwal perjalanan.
type Service interface {
	ListPublicSchedules(ctx context.Context, filter PublicScheduleFilter) ([]PublicSchedule, error)
	GetPublicScheduleByID(ctx context.Context, id int64) (*PublicSchedule, error)
}

type service struct {
	repo Repository
}

// NewService membuat instance Service baru dengan dependensi Repository jadwal.
func NewService(repo Repository) Service {
	return &service{repo: repo}
}

// ListPublicSchedules memvalidasi filter pencarian, menormalisasi pagination, dan mengambil jadwal aktif.
func (s *service) ListPublicSchedules(ctx context.Context, filter PublicScheduleFilter) ([]PublicSchedule, error) {
	if err := ctx.Err(); err != nil {
		return nil, fmt.Errorf("schedule.Service.ListPublicSchedules: context dibatalkan: %w", err)
	}

	// Validasi aturan bisnis: rute kota asal dan kota tujuan tidak boleh sama
	if filter.OriginCityID != nil && filter.DestinationCityID != nil {
		if *filter.OriginCityID > 0 && *filter.DestinationCityID > 0 && *filter.OriginCityID == *filter.DestinationCityID {
			return nil, ErrInvalidRoute
		}
	}

	// Normalisasi batas pagination
	filter.Normalize()

	schedules, err := s.repo.ListPublicSchedules(ctx, filter)
	if err != nil {
		return nil, fmt.Errorf("schedule.Service.ListPublicSchedules: %w", err)
	}

	return schedules, nil
}

// GetPublicScheduleByID memvalidasi ID dan mengambil detail jadwal publik aktif.
func (s *service) GetPublicScheduleByID(ctx context.Context, id int64) (*PublicSchedule, error) {
	if err := ctx.Err(); err != nil {
		return nil, fmt.Errorf("schedule.Service.GetPublicScheduleByID: context dibatalkan: %w", err)
	}

	if id <= 0 {
		return nil, ErrInvalidScheduleID
	}

	res, err := s.repo.GetPublicScheduleByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("schedule.Service.GetPublicScheduleByID: %w", err)
	}

	return res, nil
}

