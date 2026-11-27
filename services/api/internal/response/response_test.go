package response_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"travora/api/internal/response"
)

func TestJSON(t *testing.T) {
	rec := httptest.NewRecorder()
	payload := map[string]string{"item": "value"}

	response.JSON(rec, http.StatusOK, payload)

	if rec.Code != http.StatusOK {
		t.Errorf("status = %d, want %d", rec.Code, http.StatusOK)
	}
	if ct := rec.Header().Get("Content-Type"); ct != "application/json" {
		t.Errorf("Content-Type = %q, want application/json", ct)
	}

	var res response.SuccessEnvelope
	if err := json.NewDecoder(rec.Body).Decode(&res); err != nil {
		t.Fatalf("Gagal decode JSON: %v", err)
	}
	if !res.Success {
		t.Error("Success harus bernilai true")
	}
}

func TestPaginated(t *testing.T) {
	rec := httptest.NewRecorder()
	items := []string{"a", "b", "c"}

	response.Paginated(rec, http.StatusOK, items, 10, 0, 3)

	if rec.Code != http.StatusOK {
		t.Errorf("status = %d, want %d", rec.Code, http.StatusOK)
	}
	if ct := rec.Header().Get("Content-Type"); ct != "application/json" {
		t.Errorf("Content-Type = %q, want application/json", ct)
	}

	var res response.PaginatedEnvelope
	if err := json.NewDecoder(rec.Body).Decode(&res); err != nil {
		t.Fatalf("Gagal decode JSON: %v", err)
	}
	if !res.Success {
		t.Error("Success harus bernilai true")
	}
	if res.Meta.Limit != 10 || res.Meta.Offset != 0 || res.Meta.Count != 3 {
		t.Errorf("Meta mismatch: %+v", res.Meta)
	}
}

func TestError(t *testing.T) {
	rec := httptest.NewRecorder()

	response.Error(rec, http.StatusBadRequest, "INVALID_INPUT", "Input tidak valid")

	if rec.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want %d", rec.Code, http.StatusBadRequest)
	}
	if ct := rec.Header().Get("Content-Type"); ct != "application/json" {
		t.Errorf("Content-Type = %q, want application/json", ct)
	}

	var res response.ErrorEnvelope
	if err := json.NewDecoder(rec.Body).Decode(&res); err != nil {
		t.Fatalf("Gagal decode JSON: %v", err)
	}
	if res.Success {
		t.Error("Success harus bernilai false untuk error")
	}
	if res.Error.Code != "INVALID_INPUT" || res.Error.Message != "Input tidak valid" {
		t.Errorf("Error detail mismatch: %+v", res.Error)
	}
}

