package adminmaster

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"travora/api/internal/auth"
)

type mockRepo struct {
	cities   []CityView
	vehicles []VehicleView
}

func (m *mockRepo) ListCities(ctx context.Context, isOrigin bool) ([]CityView, error) {
	return m.cities, nil
}
func (m *mockRepo) CreateCity(ctx context.Context, isOrigin bool, name string, adminID int64) (*CityView, error) {
	c := CityView{ID: "1", Name: name, Code: "ASAL-1"}
	m.cities = append(m.cities, c)
	return &c, nil
}
func (m *mockRepo) UpdateCity(ctx context.Context, isOrigin bool, id int64, name string) (*CityView, error) {
	return &CityView{ID: "1", Name: name, Code: "ASAL-1"}, nil
}
func (m *mockRepo) DeleteCity(ctx context.Context, isOrigin bool, id int64) error { return nil }
func (m *mockRepo) ListVehicles(ctx context.Context) ([]VehicleView, error)      { return m.vehicles, nil }
func (m *mockRepo) CreateVehicle(ctx context.Context, req VehicleRequest, adminID int64) (*VehicleView, error) {
	return &VehicleView{ID: "1", Name: req.Name, PlateNumber: req.PlateNumber, Color: req.Color, Status: "aktif"}, nil
}
func (m *mockRepo) UpdateVehicle(ctx context.Context, id int64, req VehicleRequest) (*VehicleView, error) {
	return &VehicleView{ID: "1", Name: req.Name, PlateNumber: req.PlateNumber, Color: req.Color, Status: "aktif"}, nil
}
func (m *mockRepo) DeleteVehicle(ctx context.Context, id int64) error { return nil }
func (m *mockRepo) ListSchedules(ctx context.Context) ([]ScheduleView, error) {
	return []ScheduleView{}, nil
}
func (m *mockRepo) CreateSchedule(ctx context.Context, req ScheduleRequest, adminID int64) (*ScheduleView, error) {
	return &ScheduleView{ID: "1", Price: req.Price, DepartureDate: req.DepartureDate, DepartureTime: "08:00 WIB", IsActive: req.IsActive}, nil
}
func (m *mockRepo) UpdateSchedule(ctx context.Context, id int64, req ScheduleRequest) (*ScheduleView, error) {
	return &ScheduleView{ID: "1", Price: req.Price, DepartureDate: req.DepartureDate, DepartureTime: "08:00 WIB", IsActive: req.IsActive}, nil
}
func (m *mockRepo) ToggleScheduleActive(ctx context.Context, id int64) (*ScheduleView, error) {
	return &ScheduleView{ID: "1", IsActive: false}, nil
}
func (m *mockRepo) DeleteSchedule(ctx context.Context, id int64) (*DeleteScheduleResult, error) {
	return &DeleteScheduleResult{Deactivated: false, Message: "deleted"}, nil
}

type mockSessions struct{}

func (m *mockSessions) ValidateSession(ctx context.Context, token string) (*auth.User, error) {
	switch token {
	case "admin-tok":
		return &auth.User{ID: 1, Role: auth.RoleAdmin, Name: "Super Admin"}, nil
	case "member-tok":
		return &auth.User{ID: 2, Role: auth.RoleMember, Name: "Member"}, nil
	default:
		return nil, auth.ErrUnauthorized
	}
}

func TestAdminMaster_RBACAndScheduleValidation(t *testing.T) {
	h := NewHandler(NewService(&mockRepo{}), &mockSessions{})
	mux := http.NewServeMux()
	h.RegisterRoutes(mux)

	// Member dilarang akses /api/admin/schedules -> 403
	reqMember := httptest.NewRequest(http.MethodGet, "/api/admin/schedules", nil)
	reqMember.Header.Set("Authorization", "Bearer member-tok")
	resMember := httptest.NewRecorder()
	mux.ServeHTTP(resMember, reqMember)
	if resMember.Code != http.StatusForbidden {
		t.Fatalf("expected 403 for member, got %d", resMember.Code)
	}

	// Admin bisa buat jadwal dengan jam "08:00 WIB" -> 201
	body, _ := json.Marshal(ScheduleRequest{
		OriginCityID:      1,
		DestinationCityID: 2,
		VehicleID:         1,
		DepartureDate:     "2026-12-01",
		DepartureTime:     "08:00 WIB",
		Price:             150000,
		IsActive:          true,
	})
	reqAdmin := httptest.NewRequest(http.MethodPost, "/api/admin/schedules", bytes.NewReader(body))
	reqAdmin.Header.Set("Authorization", "Bearer admin-tok")
	resAdmin := httptest.NewRecorder()
	mux.ServeHTTP(resAdmin, reqAdmin)
	if resAdmin.Code != http.StatusCreated {
		t.Fatalf("expected 201 for admin create schedule, got %d (%s)", resAdmin.Code, resAdmin.Body.String())
	}
}
