package router_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"travora/api/internal/health"
	"travora/api/internal/masterdata"
	"travora/api/internal/router"
	"travora/api/internal/schedule"
)

type mockDB struct{}

func (m *mockDB) Ping(ctx context.Context) error {
	return nil
}

func (m *mockDB) Close() {}

func (m *mockDB) Pool() *pgxpool.Pool {
	return nil
}

func (m *mockDB) Stats() *pgxpool.Stat {
	return nil
}

type mockMasterDataRepo struct{}

func (m *mockMasterDataRepo) ListOriginCities(ctx context.Context) ([]masterdata.OriginCity, error) {
	return []masterdata.OriginCity{{ID: 1, Name: "Bandung"}}, nil
}

func (m *mockMasterDataRepo) ListDestinationCities(ctx context.Context) ([]masterdata.DestinationCity, error) {
	return []masterdata.DestinationCity{{ID: 2, Name: "Jakarta"}}, nil
}

func (m *mockMasterDataRepo) ListVehicles(ctx context.Context) ([]masterdata.Vehicle, error) {
	return []masterdata.Vehicle{
		{
			ID:           1,
			VehicleType:  "Toyota HiAce",
			PoliceNumber: "D 1234 ABC",
			Color:        "Putih",
		},
	}, nil
}

type mockScheduleRepo struct{}

func (m *mockScheduleRepo) ListPublicSchedules(ctx context.Context, filter schedule.PublicScheduleFilter) ([]schedule.PublicSchedule, error) {
	return []schedule.PublicSchedule{}, nil
}

func (m *mockScheduleRepo) GetPublicScheduleByID(ctx context.Context, id int64) (*schedule.PublicSchedule, error) {
	return &schedule.PublicSchedule{
		ID:       id,
		IsActive: true,
	}, nil
}

func setupTestRouter() http.Handler {
	db := &mockDB{}
	healthH := health.NewHandler(db)

	mdRepo := &mockMasterDataRepo{}
	mdSvc := masterdata.NewService(mdRepo)
	mdH := masterdata.NewHandler(mdSvc)

	schedRepo := &mockScheduleRepo{}
	schedSvc := schedule.NewService(schedRepo)
	schedH := schedule.NewHandler(schedSvc)

	return router.New(router.Config{
		HealthHandler:     healthH,
		MasterDataHandler: mdH,
		ScheduleHandler:   schedH,
		CORSOrigins:       []string{"http://localhost:5173"},
	})
}

func TestRouter_Endpoints(t *testing.T) {
	app := setupTestRouter()

	tests := []struct {
		name           string
		method         string
		target         string
		expectedStatus int
	}{
		// Health endpoints
		{
			name:           "Root Health",
			method:         http.MethodGet,
			target:         "/",
			expectedStatus: http.StatusOK,
		},
		{
			name:           "Liveness Health",
			method:         http.MethodGet,
			target:         "/health/live",
			expectedStatus: http.StatusOK,
		},
		{
			name:           "Readiness Health",
			method:         http.MethodGet,
			target:         "/health/ready",
			expectedStatus: http.StatusOK,
		},
		// Master Data endpoints
		{
			name:           "Get Origin Cities",
			method:         http.MethodGet,
			target:         "/api/v1/master-data/origin-cities",
			expectedStatus: http.StatusOK,
		},
		{
			name:           "Get Destination Cities",
			method:         http.MethodGet,
			target:         "/api/v1/master-data/destination-cities",
			expectedStatus: http.StatusOK,
		},
		{
			name:           "Get Vehicles",
			method:         http.MethodGet,
			target:         "/api/v1/master-data/vehicles",
			expectedStatus: http.StatusOK,
		},
		// Schedule endpoints
		{
			name:           "List Schedules",
			method:         http.MethodGet,
			target:         "/api/v1/schedules",
			expectedStatus: http.StatusOK,
		},
		{
			name:           "Get Schedule By ID",
			method:         http.MethodGet,
			target:         "/api/v1/schedules/42",
			expectedStatus: http.StatusOK,
		},
		// 404 Not Found
		{
			name:           "Nonexistent Route",
			method:         http.MethodGet,
			target:         "/api/v1/nonexistent",
			expectedStatus: http.StatusNotFound,
		},
		// 405 Method Not Allowed (Go 1.22+ ServeMux checks registered method)
		{
			name:           "Disallowed Method POST on GET route",
			method:         http.MethodPost,
			target:         "/api/v1/schedules",
			expectedStatus: http.StatusMethodNotAllowed,
		},
		{
			name:           "Disallowed Method DELETE on vehicles",
			method:         http.MethodDelete,
			target:         "/api/v1/master-data/vehicles",
			expectedStatus: http.StatusMethodNotAllowed,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(tc.method, tc.target, nil)
			rec := httptest.NewRecorder()

			app.ServeHTTP(rec, req)

			if rec.Code != tc.expectedStatus {
				t.Errorf("Method %s %s: status = %d, want %d", tc.method, tc.target, rec.Code, tc.expectedStatus)
			}

			// Verifikasi Content-Type application/json untuk semua respons (termasuk 404 dan 405)
			ct := rec.Header().Get("Content-Type")
			if ct != "application/json" {
				t.Errorf("Method %s %s: Content-Type = %q, want 'application/json'", tc.method, tc.target, ct)
			}
		})
	}
}

func TestRouter_CORSIntegration(t *testing.T) {
	app := setupTestRouter()

	// 1. Regular request with allowed origin
	req := httptest.NewRequest(http.MethodGet, "/api/v1/master-data/origin-cities", nil)
	req.Header.Set("Origin", "http://localhost:5173")
	rec := httptest.NewRecorder()

	app.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("status = %d, want %d", rec.Code, http.StatusOK)
	}
	if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "http://localhost:5173" {
		t.Errorf("Access-Control-Allow-Origin = %q, want %q", got, "http://localhost:5173")
	}

	// 2. Preflight request
	reqOptions := httptest.NewRequest(http.MethodOptions, "/api/v1/schedules", nil)
	reqOptions.Header.Set("Origin", "http://localhost:5173")
	recOptions := httptest.NewRecorder()

	app.ServeHTTP(recOptions, reqOptions)

	if recOptions.Code != http.StatusNoContent {
		t.Errorf("preflight status = %d, want %d", recOptions.Code, http.StatusNoContent)
	}
	if got := recOptions.Header().Get("Access-Control-Allow-Origin"); got != "http://localhost:5173" {
		t.Errorf("preflight Access-Control-Allow-Origin = %q, want %q", got, "http://localhost:5173")
	}
}
