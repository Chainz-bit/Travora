package schedule

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"travora/api/internal/response"
)

type mockScheduleService struct {
	schedules      []PublicSchedule
	singleSchedule *PublicSchedule
	capturedFilter PublicScheduleFilter
	capturedID     int64
	err            error
}

func (m *mockScheduleService) ListPublicSchedules(ctx context.Context, filter PublicScheduleFilter) ([]PublicSchedule, error) {
	m.capturedFilter = filter
	if m.err != nil {
		return nil, m.err
	}
	return m.schedules, nil
}

func (m *mockScheduleService) GetPublicScheduleByID(ctx context.Context, id int64) (*PublicSchedule, error) {
	m.capturedID = id
	if m.err != nil {
		return nil, m.err
	}
	if m.singleSchedule == nil {
		return nil, ErrScheduleNotFound
	}
	return m.singleSchedule, nil
}

func TestHandler_ListSchedules_Success(t *testing.T) {
	fixedDate := time.Date(2026, 11, 20, 0, 0, 0, 0, time.UTC)
	mockSvc := &mockScheduleService{
		schedules: []PublicSchedule{
			{
				ID:            1,
				Price:         150000,
				DepartureDate: fixedDate,
				DepartureTime: "08:00:00",
				IsActive:      true,
				VehicleID:     1,
				VehicleName:   "Toyota HiAce",
				PoliceNumber:  "D 1111 TRV",
				OriginCityID:  1,
				OriginCity:    "Bandung",
				DestCityID:    2,
				DestCity:      "Jakarta",
			},
		},
	}

	handler := NewHandler(mockSvc)
	mux := http.NewServeMux()
	handler.RegisterRoutes(mux)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/schedules", nil)
	w := httptest.NewRecorder()

	mux.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("ekspektasi status 200, didapat: %d", w.Code)
	}

	var resp struct {
		Success bool             `json:"success"`
		Data    []PublicSchedule `json:"data"`
		Meta    response.Meta    `json:"meta"`
	}
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("gagal mendecode JSON: %v", err)
	}

	if !resp.Success {
		t.Errorf("ekspektasi success true")
	}
	if len(resp.Data) != 1 || resp.Data[0].ID != 1 {
		t.Errorf("data jadwal tidak cocok: %+v", resp.Data)
	}
	if resp.Meta.Limit != DefaultLimit || resp.Meta.Offset != 0 || resp.Meta.Count != 1 {
		t.Errorf("meta pagination tidak cocok: %+v", resp.Meta)
	}
}

func TestHandler_ListSchedules_WithValidFilters(t *testing.T) {
	mockSvc := &mockScheduleService{
		schedules: []PublicSchedule{},
	}

	handler := NewHandler(mockSvc)
	mux := http.NewServeMux()
	handler.RegisterRoutes(mux)

	url := "/api/v1/schedules?origin_city_id=5&destination_city_id=8&departure_date=2026-11-25&limit=15&offset=30"
	req := httptest.NewRequest(http.MethodGet, url, nil)
	w := httptest.NewRecorder()

	mux.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("ekspektasi status 200, didapat: %d", w.Code)
	}

	// Verifikasi parameter diteruskan dengan benar ke Service
	f := mockSvc.capturedFilter
	if f.OriginCityID == nil || *f.OriginCityID != 5 {
		t.Errorf("OriginCityID tidak sesuai: %v", f.OriginCityID)
	}
	if f.DestinationCityID == nil || *f.DestinationCityID != 8 {
		t.Errorf("DestinationCityID tidak sesuai: %v", f.DestinationCityID)
	}
	if f.DepartureDate == nil || f.DepartureDate.Format("2006-01-02") != "2026-11-25" {
		t.Errorf("DepartureDate tidak sesuai: %v", f.DepartureDate)
	}
	if f.Limit != 15 {
		t.Errorf("Limit tidak sesuai: %d", f.Limit)
	}
	if f.Offset != 30 {
		t.Errorf("Offset tidak sesuai: %d", f.Offset)
	}
}

func TestHandler_ListSchedules_ValidationErrors(t *testing.T) {
	mockSvc := &mockScheduleService{}
	handler := NewHandler(mockSvc)
	mux := http.NewServeMux()
	handler.RegisterRoutes(mux)

	tests := []struct {
		name       string
		url        string
		expectCode int
	}{
		{"OriginCityID Bukan Angka", "/api/v1/schedules?origin_city_id=abc", http.StatusBadRequest},
		{"OriginCityID Negatif", "/api/v1/schedules?origin_city_id=-1", http.StatusBadRequest},
		{"DestinationCityID Bukan Angka", "/api/v1/schedules?destination_city_id=xyz", http.StatusBadRequest},
		{"DestinationCityID Nol", "/api/v1/schedules?destination_city_id=0", http.StatusBadRequest},
		{"DepartureDate Salah Format", "/api/v1/schedules?departure_date=25-11-2026", http.StatusBadRequest},
		{"DepartureDate Tanggal Fiktif", "/api/v1/schedules?departure_date=2026-02-30", http.StatusBadRequest},
		{"Limit Bukan Angka", "/api/v1/schedules?limit=banyak", http.StatusBadRequest},
		{"Offset Negatif", "/api/v1/schedules?offset=-5", http.StatusBadRequest},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, tt.url, nil)
			w := httptest.NewRecorder()
			mux.ServeHTTP(w, req)

			if w.Code != tt.expectCode {
				t.Errorf("ekspektasi status %d, didapat: %d. Body: %s", tt.expectCode, w.Code, w.Body.String())
			}

			var errResp response.ErrorEnvelope
			if err := json.NewDecoder(w.Body).Decode(&errResp); err != nil {
				t.Fatalf("gagal mendecode response error: %v", err)
			}
			if errResp.Success {
				t.Errorf("ekspektasi success false")
			}
		})
	}
}

func TestHandler_ListSchedules_InvalidRouteError(t *testing.T) {
	mockSvc := &mockScheduleService{
		err: ErrInvalidRoute,
	}

	handler := NewHandler(mockSvc)
	mux := http.NewServeMux()
	handler.RegisterRoutes(mux)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/schedules?origin_city_id=1&destination_city_id=1", nil)
	w := httptest.NewRecorder()

	mux.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("ekspektasi status 400 untuk rute sama, didapat: %d", w.Code)
	}

	var errResp response.ErrorEnvelope
	_ = json.NewDecoder(w.Body).Decode(&errResp)
	if errResp.Error.Message != "kota asal dan kota tujuan tidak boleh sama" {
		t.Errorf("pesan error tidak sesuai: %s", errResp.Error.Message)
	}
}

func TestHandler_ListSchedules_ServiceError(t *testing.T) {
	mockSvc := &mockScheduleService{
		err: errors.New("unexpected database error: select * from pg_tables"),
	}

	handler := NewHandler(mockSvc)
	mux := http.NewServeMux()
	handler.RegisterRoutes(mux)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/schedules", nil)
	w := httptest.NewRecorder()

	mux.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Fatalf("ekspektasi status 500, didapat: %d", w.Code)
	}

	var errResp response.ErrorEnvelope
	_ = json.NewDecoder(w.Body).Decode(&errResp)
	// Pastikan database query tidak bocor ke client
	if errResp.Error.Message != "terjadi kesalahan internal pada server" {
		t.Errorf("pesan error membocorkan detail query internal: %s", errResp.Error.Message)
	}
}

func TestHandler_GetScheduleByID_Success(t *testing.T) {
	fixedDate := time.Date(2026, 11, 20, 0, 0, 0, 0, time.UTC)
	mockSvc := &mockScheduleService{
		singleSchedule: &PublicSchedule{
			ID:            42,
			Price:         175000,
			DepartureDate: fixedDate,
			DepartureTime: "09:00:00",
			IsActive:      true,
			VehicleID:     2,
			VehicleName:   "Isuzu Elf",
			PoliceNumber:  "B 2222 TRV",
			OriginCityID:  1,
			OriginCity:    "Bandung",
			DestCityID:    3,
			DestCity:      "Semarang",
		},
	}

	handler := NewHandler(mockSvc)
	mux := http.NewServeMux()
	handler.RegisterRoutes(mux)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/schedules/42", nil)
	w := httptest.NewRecorder()

	mux.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("ekspektasi status 200, didapat: %d", w.Code)
	}

	var resp struct {
		Success bool           `json:"success"`
		Data    PublicSchedule `json:"data"`
	}
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("gagal mendecode response JSON: %v", err)
	}

	if !resp.Success || resp.Data.ID != 42 {
		t.Errorf("respons data tidak cocok: %+v", resp.Data)
	}
	if mockSvc.capturedID != 42 {
		t.Errorf("ID yang diteruskan ke service tidak sesuai: %d", mockSvc.capturedID)
	}
}

func TestHandler_GetScheduleByID_NotFoundOrInactive(t *testing.T) {
	mockSvc := &mockScheduleService{
		err: ErrScheduleNotFound,
	}

	handler := NewHandler(mockSvc)
	mux := http.NewServeMux()
	handler.RegisterRoutes(mux)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/schedules/999", nil)
	w := httptest.NewRecorder()

	mux.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("ekspektasi status 404 untuk jadwal tidak ditemukan/nonaktif, didapat: %d", w.Code)
	}

	var errResp response.ErrorEnvelope
	_ = json.NewDecoder(w.Body).Decode(&errResp)
	if errResp.Error.Code != "NOT_FOUND" {
		t.Errorf("ekspektasi error code NOT_FOUND, didapat: %s", errResp.Error.Code)
	}
	if errResp.Error.Message != "jadwal tidak ditemukan atau tidak aktif" {
		t.Errorf("pesan error tidak cocok: %s", errResp.Error.Message)
	}
}

func TestHandler_GetScheduleByID_InvalidID(t *testing.T) {
	mockSvc := &mockScheduleService{}
	handler := NewHandler(mockSvc)
	mux := http.NewServeMux()
	handler.RegisterRoutes(mux)

	invalidPaths := []string{
		"/api/v1/schedules/abc",
		"/api/v1/schedules/0",
		"/api/v1/schedules/-10",
	}

	for _, path := range invalidPaths {
		t.Run(path, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, path, nil)
			w := httptest.NewRecorder()
			mux.ServeHTTP(w, req)

			if w.Code != http.StatusBadRequest {
				t.Errorf("ekspektasi status 400 untuk path %s, didapat: %d", path, w.Code)
			}
		})
	}
}

func TestHandler_GetScheduleByID_ServiceError(t *testing.T) {
	mockSvc := &mockScheduleService{
		err: errors.New("driver connection lost"),
	}

	handler := NewHandler(mockSvc)
	mux := http.NewServeMux()
	handler.RegisterRoutes(mux)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/schedules/1", nil)
	w := httptest.NewRecorder()

	mux.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Fatalf("ekspektasi status 500, didapat: %d", w.Code)
	}

	var errResp response.ErrorEnvelope
	_ = json.NewDecoder(w.Body).Decode(&errResp)
	if errResp.Error.Message != "terjadi kesalahan internal pada server" {
		t.Errorf("pesan error membocorkan detail: %s", errResp.Error.Message)
	}
}

