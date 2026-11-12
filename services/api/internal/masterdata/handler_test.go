package masterdata

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"travora/api/internal/response"
)

type mockMasterDataService struct {
	origins      []OriginCity
	destinations []DestinationCity
	vehicles     []Vehicle
	err          error
}

func (m *mockMasterDataService) GetOriginCities(ctx context.Context) ([]OriginCity, error) {
	if m.err != nil {
		return nil, m.err
	}
	return m.origins, nil
}

func (m *mockMasterDataService) GetDestinationCities(ctx context.Context) ([]DestinationCity, error) {
	if m.err != nil {
		return nil, m.err
	}
	return m.destinations, nil
}

func (m *mockMasterDataService) GetVehicles(ctx context.Context) ([]Vehicle, error) {
	if m.err != nil {
		return nil, m.err
	}
	return m.vehicles, nil
}

func TestHandler_ListOriginCities_Success(t *testing.T) {
	mockSvc := &mockMasterDataService{
		origins: []OriginCity{
			{ID: 1, Name: "Bandung"},
			{ID: 2, Name: "Jakarta"},
		},
	}

	handler := NewHandler(mockSvc)
	mux := http.NewServeMux()
	handler.RegisterRoutes(mux)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/master-data/origin-cities", nil)
	w := httptest.NewRecorder()

	mux.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("ekspektasi status 200, didapat: %d", w.Code)
	}

	contentType := w.Header().Get("Content-Type")
	if contentType != "application/json" {
		t.Errorf("ekspektasi Content-Type application/json, didapat: %s", contentType)
	}

	var resp struct {
		Success bool         `json:"success"`
		Data    []OriginCity `json:"data"`
	}
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("gagal mendecode JSON respons: %v", err)
	}

	if !resp.Success {
		t.Errorf("ekspektasi success true, didapat false")
	}
	if len(resp.Data) != 2 || resp.Data[0].Name != "Bandung" {
		t.Errorf("data kota asal tidak cocok: %+v", resp.Data)
	}
}

func TestHandler_ListOriginCities_ServiceError(t *testing.T) {
	mockSvc := &mockMasterDataService{
		err: errors.New("database connection timeout"),
	}

	handler := NewHandler(mockSvc)
	mux := http.NewServeMux()
	handler.RegisterRoutes(mux)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/master-data/origin-cities", nil)
	w := httptest.NewRecorder()

	mux.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Fatalf("ekspektasi status 500, didapat: %d", w.Code)
	}

	var resp response.ErrorEnvelope
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("gagal mendecode JSON error: %v", err)
	}

	if resp.Success {
		t.Errorf("ekspektasi success false, didapat true")
	}
	if resp.Error.Code != "INTERNAL_ERROR" {
		t.Errorf("ekspektasi error code INTERNAL_ERROR, didapat: %s", resp.Error.Code)
	}
	// Pastikan error mentah database tidak bocor
	if resp.Error.Message != "terjadi kesalahan internal pada server" {
		t.Errorf("pesan error membocorkan detail internal: %s", resp.Error.Message)
	}
}

func TestHandler_ListDestinationCities_Success(t *testing.T) {
	mockSvc := &mockMasterDataService{
		destinations: []DestinationCity{
			{ID: 10, Name: "Semarang"},
			{ID: 20, Name: "Surabaya"},
		},
	}

	handler := NewHandler(mockSvc)
	mux := http.NewServeMux()
	handler.RegisterRoutes(mux)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/master-data/destination-cities", nil)
	w := httptest.NewRecorder()

	mux.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("ekspektasi status 200, didapat: %d", w.Code)
	}

	var resp struct {
		Success bool              `json:"success"`
		Data    []DestinationCity `json:"data"`
	}
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("gagal mendecode JSON: %v", err)
	}

	if len(resp.Data) != 2 || resp.Data[1].Name != "Surabaya" {
		t.Errorf("data kota tujuan tidak sesuai: %+v", resp.Data)
	}
}

func TestHandler_ListVehicles_Success(t *testing.T) {
	mockSvc := &mockMasterDataService{
		vehicles: []Vehicle{
			{ID: 1, VehicleType: "Toyota HiAce", PoliceNumber: "D 1234 TRV", Color: "Putih"},
		},
	}

	handler := NewHandler(mockSvc)
	mux := http.NewServeMux()
	handler.RegisterRoutes(mux)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/master-data/vehicles", nil)
	w := httptest.NewRecorder()

	mux.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("ekspektasi status 200, didapat: %d", w.Code)
	}

	var resp struct {
		Success bool      `json:"success"`
		Data    []Vehicle `json:"data"`
	}
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("gagal mendecode JSON: %v", err)
	}

	if len(resp.Data) != 1 || resp.Data[0].PoliceNumber != "D 1234 TRV" {
		t.Errorf("data kendaraan tidak sesuai: %+v", resp.Data)
	}
}

