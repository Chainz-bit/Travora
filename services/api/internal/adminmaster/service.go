package adminmaster

import (
	"context"
	"strings"
	"time"
)

type Service interface {
	ListCities(ctx context.Context, isOrigin bool) ([]CityView, error)
	CreateCity(ctx context.Context, isOrigin bool, req CityRequest, adminID int64) (*CityView, error)
	UpdateCity(ctx context.Context, isOrigin bool, id int64, req CityRequest) (*CityView, error)
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

type serviceImpl struct {
	repo Repository
}

func NewService(repo Repository) Service {
	return &serviceImpl{repo: repo}
}

func (s *serviceImpl) ListCities(ctx context.Context, isOrigin bool) ([]CityView, error) {
	return s.repo.ListCities(ctx, isOrigin)
}

func (s *serviceImpl) CreateCity(ctx context.Context, isOrigin bool, req CityRequest, adminID int64) (*CityView, error) {
	name := strings.TrimSpace(req.Name)
	if name == "" || adminID <= 0 {
		return nil, ErrInvalidInput
	}
	return s.repo.CreateCity(ctx, isOrigin, name, adminID)
}

func (s *serviceImpl) UpdateCity(ctx context.Context, isOrigin bool, id int64, req CityRequest) (*CityView, error) {
	name := strings.TrimSpace(req.Name)
	if id <= 0 || name == "" {
		return nil, ErrInvalidInput
	}
	return s.repo.UpdateCity(ctx, isOrigin, id, name)
}

func (s *serviceImpl) DeleteCity(ctx context.Context, isOrigin bool, id int64) error {
	if id <= 0 {
		return ErrInvalidInput
	}
	return s.repo.DeleteCity(ctx, isOrigin, id)
}

func (s *serviceImpl) ListVehicles(ctx context.Context) ([]VehicleView, error) {
	return s.repo.ListVehicles(ctx)
}

func normalizeVehicleRequest(req VehicleRequest) (VehicleRequest, error) {
	req.Name = strings.TrimSpace(req.Name)
	req.PlateNumber = strings.ToUpper(strings.TrimSpace(req.PlateNumber))
	req.Color = strings.TrimSpace(req.Color)
	if req.Color == "" {
		req.Color = "Hitam"
	}
	if req.Name == "" || req.PlateNumber == "" {
		return req, ErrInvalidInput
	}
	return req, nil
}

func (s *serviceImpl) CreateVehicle(ctx context.Context, req VehicleRequest, adminID int64) (*VehicleView, error) {
	if adminID <= 0 {
		return nil, ErrInvalidInput
	}
	clean, err := normalizeVehicleRequest(req)
	if err != nil {
		return nil, err
	}
	return s.repo.CreateVehicle(ctx, clean, adminID)
}

func (s *serviceImpl) UpdateVehicle(ctx context.Context, id int64, req VehicleRequest) (*VehicleView, error) {
	if id <= 0 {
		return nil, ErrInvalidInput
	}
	clean, err := normalizeVehicleRequest(req)
	if err != nil {
		return nil, err
	}
	return s.repo.UpdateVehicle(ctx, id, clean)
}

func (s *serviceImpl) DeleteVehicle(ctx context.Context, id int64) error {
	if id <= 0 {
		return ErrInvalidInput
	}
	return s.repo.DeleteVehicle(ctx, id)
}

func normalizeScheduleRequest(req ScheduleRequest) (ScheduleRequest, error) {
	if req.OriginCityID <= 0 || req.DestinationCityID <= 0 || req.VehicleID <= 0 || req.Price <= 0 {
		return req, ErrInvalidInput
	}
	if req.OriginCityID == req.DestinationCityID {
		return req, ErrInvalidRoute
	}

	req.DepartureDate = strings.TrimSpace(req.DepartureDate)
	if _, err := time.Parse("2006-01-02", req.DepartureDate); err != nil {
		return req, ErrInvalidDateTime
	}

	rawTime := strings.TrimSpace(req.DepartureTime)
	rawTime = strings.TrimSpace(strings.TrimSuffix(strings.TrimSuffix(rawTime, "WIB"), "wib"))
	if _, err := time.Parse("15:04", rawTime); err == nil {
		req.DepartureTime = rawTime + ":00"
	} else if _, err := time.Parse("15:04:05", rawTime); err == nil {
		req.DepartureTime = rawTime
	} else {
		return req, ErrInvalidDateTime
	}

	return req, nil
}

func (s *serviceImpl) ListSchedules(ctx context.Context) ([]ScheduleView, error) {
	return s.repo.ListSchedules(ctx)
}

func (s *serviceImpl) CreateSchedule(ctx context.Context, req ScheduleRequest, adminID int64) (*ScheduleView, error) {
	if adminID <= 0 {
		return nil, ErrInvalidInput
	}
	clean, err := normalizeScheduleRequest(req)
	if err != nil {
		return nil, err
	}
	return s.repo.CreateSchedule(ctx, clean, adminID)
}

func (s *serviceImpl) UpdateSchedule(ctx context.Context, id int64, req ScheduleRequest) (*ScheduleView, error) {
	if id <= 0 {
		return nil, ErrInvalidInput
	}
	clean, err := normalizeScheduleRequest(req)
	if err != nil {
		return nil, err
	}
	return s.repo.UpdateSchedule(ctx, id, clean)
}

func (s *serviceImpl) ToggleScheduleActive(ctx context.Context, id int64) (*ScheduleView, error) {
	if id <= 0 {
		return nil, ErrInvalidInput
	}
	return s.repo.ToggleScheduleActive(ctx, id)
}

func (s *serviceImpl) DeleteSchedule(ctx context.Context, id int64) (*DeleteScheduleResult, error) {
	if id <= 0 {
		return nil, ErrInvalidInput
	}
	return s.repo.DeleteSchedule(ctx, id)
}
