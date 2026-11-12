package health

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
)

type mockDB struct {
	pingErr error
}

func (m *mockDB) Ping(ctx context.Context) error {
	return m.pingErr
}

func (m *mockDB) Close() {}

func (m *mockDB) Pool() *pgxpool.Pool {
	return nil
}

func (m *mockDB) Stats() *pgxpool.Stat {
	return nil
}

func TestLive(t *testing.T) {
	h := NewHandler(&mockDB{})
	req := httptest.NewRequest(http.MethodGet, "/health/live", nil)
	w := httptest.NewRecorder()

	h.Live(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Status diharapkan %d, didapat %d", http.StatusOK, w.Code)
	}

	var res Response
	if err := json.NewDecoder(w.Body).Decode(&res); err != nil {
		t.Fatalf("Gagal decode JSON respons: %v", err)
	}

	if res.Status != "UP" {
		t.Errorf("Status diharapkan 'UP', didapat '%s'", res.Status)
	}
	if res.Service != "travora-api" {
		t.Errorf("Service diharapkan 'travora-api', didapat '%s'", res.Service)
	}
}

func TestReady_Success(t *testing.T) {
	h := NewHandler(&mockDB{pingErr: nil})
	req := httptest.NewRequest(http.MethodGet, "/health/ready", nil)
	w := httptest.NewRecorder()

	h.Ready(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Status diharapkan %d, didapat %d", http.StatusOK, w.Code)
	}

	var res Response
	if err := json.NewDecoder(w.Body).Decode(&res); err != nil {
		t.Fatalf("Gagal decode JSON respons: %v", err)
	}

	if res.Status != "UP" {
		t.Errorf("Status diharapkan 'UP', didapat '%s'", res.Status)
	}
	if res.Database != "CONNECTED" {
		t.Errorf("Database diharapkan 'CONNECTED', didapat '%s'", res.Database)
	}
}

func TestReady_Failure(t *testing.T) {
	h := NewHandler(&mockDB{pingErr: errors.New("connection refused")})
	req := httptest.NewRequest(http.MethodGet, "/health/ready", nil)
	w := httptest.NewRecorder()

	h.Ready(w, req)

	if w.Code != http.StatusServiceUnavailable {
		t.Fatalf("Status diharapkan %d, didapat %d", http.StatusServiceUnavailable, w.Code)
	}

	var res Response
	if err := json.NewDecoder(w.Body).Decode(&res); err != nil {
		t.Fatalf("Gagal decode JSON respons: %v", err)
	}

	if res.Status != "DOWN" {
		t.Errorf("Status diharapkan 'DOWN', didapat '%s'", res.Status)
	}
	if res.Database != "DISCONNECTED" {
		t.Errorf("Database diharapkan 'DISCONNECTED', didapat '%s'", res.Database)
	}
	if res.Error != "database unreachable" {
		t.Errorf("Error diharapkan 'database unreachable', didapat '%s'", res.Error)
	}
}

func TestReady_NilDB(t *testing.T) {
	h := NewHandler(nil)
	req := httptest.NewRequest(http.MethodGet, "/health/ready", nil)
	w := httptest.NewRecorder()

	h.Ready(w, req)

	if w.Code != http.StatusServiceUnavailable {
		t.Fatalf("Status diharapkan %d, didapat %d", http.StatusServiceUnavailable, w.Code)
	}
}

func TestRoot(t *testing.T) {
	h := NewHandler(&mockDB{})
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	w := httptest.NewRecorder()

	h.Root(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Status diharapkan %d, didapat %d", http.StatusOK, w.Code)
	}

	var res map[string]string
	if err := json.NewDecoder(w.Body).Decode(&res); err != nil {
		t.Fatalf("Gagal decode JSON respons: %v", err)
	}

	if res["status"] != "ok" {
		t.Errorf("Status diharapkan 'ok', didapat '%s'", res["status"])
	}
	if res["service"] != "travora-api" {
		t.Errorf("Service diharapkan 'travora-api', didapat '%s'", res["service"])
	}
}

func TestRoot_NotFound(t *testing.T) {
	h := NewHandler(&mockDB{})
	req := httptest.NewRequest(http.MethodGet, "/non-existent", nil)
	w := httptest.NewRecorder()

	h.Root(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("Status diharapkan 404 Not Found, didapat %d", w.Code)
	}
}
