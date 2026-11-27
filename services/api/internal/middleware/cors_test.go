package middleware_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"travora/api/internal/middleware"
)

func TestCORS_AllowedOrigin(t *testing.T) {
	opts := middleware.DefaultCORSOptions()
	cors := middleware.CORS(opts)

	called := false
	handler := cors(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/test", nil)
	req.Header.Set("Origin", "http://localhost:5173")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if !called {
		t.Error("Handler berikutnya seharusnya dipanggil untuk allowed origin")
	}

	if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "http://localhost:5173" {
		t.Errorf("Access-Control-Allow-Origin = %q, want %q", got, "http://localhost:5173")
	}

	if got := rec.Header().Get("Access-Control-Allow-Methods"); got == "" {
		t.Error("Access-Control-Allow-Methods tidak boleh kosong")
	}

	if got := rec.Header().Get("Access-Control-Allow-Headers"); got == "" {
		t.Error("Access-Control-Allow-Headers tidak boleh kosong")
	}

	if got := rec.Header().Get("Access-Control-Max-Age"); got != "86400" {
		t.Errorf("Access-Control-Max-Age = %q, want 86400", got)
	}

	if rec.Code != http.StatusOK {
		t.Errorf("Status code = %d, want %d", rec.Code, http.StatusOK)
	}
}

func TestCORS_DisallowedOrigin(t *testing.T) {
	opts := middleware.DefaultCORSOptions()
	cors := middleware.CORS(opts)

	called := false
	handler := cors(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/test", nil)
	req.Header.Set("Origin", "http://evil-attacker.com")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if !called {
		t.Error("Handler berikutnya tetap dipanggil untuk non-preflight request")
	}

	if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "" {
		t.Errorf("Access-Control-Allow-Origin harusnya kosong untuk origin tidak dikenal, got %q", got)
	}
}

func TestCORS_OptionsPreflight(t *testing.T) {
	opts := middleware.DefaultCORSOptions()
	cors := middleware.CORS(opts)

	called := false
	handler := cors(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
	}))

	req := httptest.NewRequest(http.MethodOptions, "/api/v1/test", nil)
	req.Header.Set("Origin", "http://localhost:5173")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if called {
		t.Error("Handler berikutnya TIDAK boleh dipanggil pada HTTP OPTIONS preflight")
	}

	if rec.Code != http.StatusNoContent {
		t.Errorf("Status code preflight = %d, want %d (No Content)", rec.Code, http.StatusNoContent)
	}

	if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "http://localhost:5173" {
		t.Errorf("Access-Control-Allow-Origin = %q, want %q", got, "http://localhost:5173")
	}
}

func TestCORS_NoOriginHeader(t *testing.T) {
	opts := middleware.DefaultCORSOptions()
	cors := middleware.CORS(opts)

	called := false
	handler := cors(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/test", nil)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if !called {
		t.Error("Handler berikutnya harusnya dipanggil")
	}

	if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "" {
		t.Errorf("Access-Control-Allow-Origin seharusnya kosong saat Origin header tidak ada, got %q", got)
	}
}

func TestCORS_WildcardOrigin(t *testing.T) {
	opts := middleware.CORSOptions{
		AllowedOrigins: []string{"*"},
		AllowedMethods: []string{"GET"},
		AllowedHeaders: []string{"Content-Type"},
		MaxAgeSeconds:  3600,
	}
	cors := middleware.CORS(opts)

	handler := cors(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/test", nil)
	req.Header.Set("Origin", "http://any-domain.com")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "http://any-domain.com" {
		t.Errorf("Access-Control-Allow-Origin = %q, want %q", got, "http://any-domain.com")
	}
}

