package config

import (
	"strings"
	"testing"
	"time"
)

func TestDefaultValues(t *testing.T) {
	emptyLookup := func(key string) string {
		return ""
	}

	cfg, err := LoadFromEnv(emptyLookup)
	if err != nil {
		t.Fatalf("LoadFromEnv gagal dengan nilai default: %v", err)
	}

	if cfg.AppPort != "8080" {
		t.Errorf("AppPort diharapkan '8080', didapat '%s'", cfg.AppPort)
	}
	if cfg.AppEnv != "development" {
		t.Errorf("AppEnv diharapkan 'development', didapat '%s'", cfg.AppEnv)
	}
	if cfg.DBHost != "localhost" {
		t.Errorf("DBHost diharapkan 'localhost', didapat '%s'", cfg.DBHost)
	}
	if cfg.DBPort != "5432" {
		t.Errorf("DBPort diharapkan '5432', didapat '%s'", cfg.DBPort)
	}
	if cfg.DBName != "travora_db" {
		t.Errorf("DBName diharapkan 'travora_db', didapat '%s'", cfg.DBName)
	}
	if cfg.DBUser != "postgres" {
		t.Errorf("DBUser diharapkan 'postgres', didapat '%s'", cfg.DBUser)
	}
	if cfg.DBSSLMode != "disable" {
		t.Errorf("DBSSLMode diharapkan 'disable', didapat '%s'", cfg.DBSSLMode)
	}
	if cfg.DBPoolMaxConns != 25 {
		t.Errorf("DBPoolMaxConns diharapkan 25, didapat %d", cfg.DBPoolMaxConns)
	}
	if cfg.DBPoolMinConns != 5 {
		t.Errorf("DBPoolMinConns diharapkan 5, didapat %d", cfg.DBPoolMinConns)
	}
	if cfg.DBPoolMaxConnLifetime != 1*time.Hour {
		t.Errorf("DBPoolMaxConnLifetime diharapkan 1h, didapat %v", cfg.DBPoolMaxConnLifetime)
	}
	if cfg.DBConnectTimeout != 5*time.Second {
		t.Errorf("DBConnectTimeout diharapkan 5s, didapat %v", cfg.DBConnectTimeout)
	}
}

func TestEnvOverrides(t *testing.T) {
	customEnv := map[string]string{
		"APP_ENV":            "production",
		"APP_PORT":           "9000",
		"DB_HOST":            "10.0.0.5",
		"DB_PORT":            "5433",
		"DB_NAME":            "travora_prod",
		"DB_USER":            "travora_app",
		"DB_PASSWORD":        "P@ssw0rd!Secret",
		"DB_SSLMODE":         "require",
		"DB_POOL_MAX_CONNS":  "50",
		"DB_POOL_MIN_CONNS":  "10",
		"DB_CONNECT_TIMEOUT": "10s",
	}

	customLookup := func(key string) string {
		return customEnv[key]
	}

	cfg, err := LoadFromEnv(customLookup)
	if err != nil {
		t.Fatalf("LoadFromEnv gagal dengan env kustom: %v", err)
	}

	if cfg.AppPort != "9000" {
		t.Errorf("AppPort diharapkan '9000', didapat '%s'", cfg.AppPort)
	}
	if cfg.DBHost != "10.0.0.5" {
		t.Errorf("DBHost diharapkan '10.0.0.5', didapat '%s'", cfg.DBHost)
	}
	if cfg.DBPassword != "P@ssw0rd!Secret" {
		t.Errorf("DBPassword tidak sesuai")
	}
	if cfg.DBPoolMaxConns != 50 {
		t.Errorf("DBPoolMaxConns diharapkan 50, didapat %d", cfg.DBPoolMaxConns)
	}
	if cfg.DBPoolMinConns != 10 {
		t.Errorf("DBPoolMinConns diharapkan 10, didapat %d", cfg.DBPoolMinConns)
	}
	if cfg.DBConnectTimeout != 10*time.Second {
		t.Errorf("DBConnectTimeout diharapkan 10s, didapat %v", cfg.DBConnectTimeout)
	}
}

func TestValidationErrors(t *testing.T) {
	tests := []struct {
		name      string
		modifyEnv map[string]string
		errMsg    string
	}{
		{
			name:      "Port aplikasi tidak valid",
			modifyEnv: map[string]string{"APP_PORT": "invalid_port"},
			errMsg:    "APP_PORT tidak valid",
		},
		{
			name:      "Port aplikasi di luar rentang",
			modifyEnv: map[string]string{"APP_PORT": "70000"},
			errMsg:    "APP_PORT tidak valid",
		},
		{
			name:      "DB_HOST kosong",
			modifyEnv: map[string]string{"DB_HOST": "   "},
			errMsg:    "DB_HOST tidak boleh kosong",
		},
		{
			name:      "DB_PORT tidak valid",
			modifyEnv: map[string]string{"DB_PORT": "abc"},
			errMsg:    "DB_PORT tidak valid",
		},
		{
			name:      "DB_NAME kosong",
			modifyEnv: map[string]string{"DB_NAME": " "},
			errMsg:    "DB_NAME tidak boleh kosong",
		},
		{
			name:      "DB_USER kosong",
			modifyEnv: map[string]string{"DB_USER": " "},
			errMsg:    "DB_USER tidak boleh kosong",
		},
		{
			name:      "DB_POOL_MAX_CONNS nol atau negatif",
			modifyEnv: map[string]string{"DB_POOL_MAX_CONNS": "0"},
			errMsg:    "DB_POOL_MAX_CONNS (0) harus lebih besar dari 0",
		},
		{
			name:      "DB_POOL_MIN_CONNS negatif",
			modifyEnv: map[string]string{"DB_POOL_MIN_CONNS": "-1"},
			errMsg:    "DB_POOL_MIN_CONNS (-1) tidak boleh negatif",
		},
		{
			name:      "DB_POOL_MIN_CONNS melebihi MAX_CONNS",
			modifyEnv: map[string]string{"DB_POOL_MAX_CONNS": "10", "DB_POOL_MIN_CONNS": "20"},
			errMsg:    "DB_POOL_MIN_CONNS (20) tidak boleh melebihi DB_POOL_MAX_CONNS (10)",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			lookup := func(key string) string {
				if val, ok := tt.modifyEnv[key]; ok {
					return val
				}
				// Default fallback
				switch key {
				case "APP_PORT":
					return "8080"
				case "DB_HOST":
					return "localhost"
				case "DB_PORT":
					return "5432"
				case "DB_NAME":
					return "travora_db"
				case "DB_USER":
					return "postgres"
				default:
					return ""
				}
			}

			_, err := LoadFromEnv(lookup)
			if err == nil {
				t.Fatalf("Diharapkan error validasi, tetapi lolos tanpa error")
			}
			if !strings.Contains(err.Error(), tt.errMsg) {
				t.Errorf("Error '%v' tidak memuat pesan yang diharapkan '%s'", err, tt.errMsg)
			}
		})
	}
}

func TestDSNAndSanitization(t *testing.T) {
	cfg := &Config{
		AppPort:          "8080",
		DBHost:           "localhost",
		DBPort:           "5432",
		DBName:           "travora_test",
		DBUser:           "admin_user",
		DBPassword:       "Super$ecret#Password",
		DBSSLMode:        "disable",
		DBPoolMaxConns:   20,
		DBPoolMinConns:   5,
		DBConnectTimeout: 5 * time.Second,
	}

	dsn := cfg.DSN()
	if !strings.Contains(dsn, "Super$ecret%23Password") {
		t.Errorf("DSN harus memuat password yang di-encode: %s", dsn)
	}

	sanitized := cfg.SanitizedDSN()
	if strings.Contains(sanitized, "Super$ecret") || strings.Contains(sanitized, "Password") {
		t.Errorf("SanitizedDSN TIDAK BOLEH memuat password asli: %s", sanitized)
	}
	if !strings.Contains(sanitized, "******") {
		t.Errorf("SanitizedDSN harus memuat sensor password '******': %s", sanitized)
	}
}
