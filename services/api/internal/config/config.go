package config

import (
	"bufio"
	"errors"
	"fmt"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"
)

// Config menyimpan seluruh konfigurasi aplikasi backend Travora.
type Config struct {
	AppEnv  string
	AppPort string

	DBHost                string
	DBPort                string
	DBName                string
	DBUser                string
	DBPassword            string
	DBSSLMode             string
	DBPoolMaxConns        int
	DBPoolMinConns        int
	DBPoolMaxConnLifetime time.Duration
	DBPoolMaxConnIdleTime time.Duration
	DBConnectTimeout      time.Duration

	SessionSecret   string
	SessionDuration time.Duration
	CookieSecure    bool
}

// Load membaca konfigurasi dari environment variables dengan nilai default yang aman.
// Jika file .env ditemukan, variabel yang belum terpasang di OS akan diisi dari file tersebut.
func Load() (*Config, error) {
	// 1. Muat .env jika ada (opsional untuk lingkungan lokal)
	loadDotEnv(".env")
	loadDotEnv("services/api/.env")
	loadDotEnv("../../.env")

	return LoadFromEnv(os.Getenv)
}

// LoadFromEnv membaca konfigurasi menggunakan fungsi lookup tertentu (memudahkan unit testing).
func LoadFromEnv(lookup func(string) string) (*Config, error) {
	if lookup == nil {
		lookup = os.Getenv
	}

	cfg := &Config{
		AppEnv:  getEnv(lookup, "APP_ENV", "development"),
		AppPort: getEnv(lookup, "APP_PORT", "8080"),

		DBHost:     getEnv(lookup, "DB_HOST", "localhost"),
		DBPort:     getEnv(lookup, "DB_PORT", "5432"),
		DBName:     getEnv(lookup, "DB_NAME", "travora_db"),
		DBUser:     getEnv(lookup, "DB_USER", "postgres"),
		DBPassword: getEnv(lookup, "DB_PASSWORD", lookup("PGPASSWORD")),
		DBSSLMode:  getEnv(lookup, "DB_SSLMODE", "disable"),

		DBPoolMaxConns:        getEnvAsInt(lookup, "DB_POOL_MAX_CONNS", 25),
		DBPoolMinConns:        getEnvAsInt(lookup, "DB_POOL_MIN_CONNS", 5),
		DBPoolMaxConnLifetime: getEnvAsDuration(lookup, "DB_POOL_MAX_CONN_LIFETIME", 1*time.Hour),
		DBPoolMaxConnIdleTime: getEnvAsDuration(lookup, "DB_POOL_MAX_CONN_IDLE_TIME", 30*time.Minute),
		DBConnectTimeout:      getEnvAsDuration(lookup, "DB_CONNECT_TIMEOUT", 5*time.Second),

		SessionSecret:   getEnv(lookup, "SESSION_SECRET", "travora-dev-session-secret-key-32chars!!"),
		SessionDuration: getEnvAsDuration(lookup, "SESSION_DURATION", 24*time.Hour),
		CookieSecure:    getEnvAsBool(lookup, "COOKIE_SECURE", getEnv(lookup, "APP_ENV", "development") == "production"),
	}

	if err := cfg.Validate(); err != nil {
		return nil, fmt.Errorf("validasi konfigurasi gagal: %w", err)
	}

	return cfg, nil
}

// Validate memeriksa kelayakan seluruh parameter konfigurasi.
func (c *Config) Validate() error {
	if c.AppPort == "" {
		return errors.New("APP_PORT tidak boleh kosong")
	}
	portNum, err := strconv.Atoi(c.AppPort)
	if err != nil || portNum < 1 || portNum > 65535 {
		return fmt.Errorf("APP_PORT tidak valid (%s): harus berupa angka port antara 1 dan 65535", c.AppPort)
	}

	if strings.TrimSpace(c.DBHost) == "" {
		return errors.New("DB_HOST tidak boleh kosong")
	}

	if strings.TrimSpace(c.DBPort) == "" {
		return errors.New("DB_PORT tidak boleh kosong")
	}
	dbPortNum, err := strconv.Atoi(c.DBPort)
	if err != nil || dbPortNum < 1 || dbPortNum > 65535 {
		return fmt.Errorf("DB_PORT tidak valid (%s): harus berupa angka port antara 1 dan 65535", c.DBPort)
	}

	if strings.TrimSpace(c.DBName) == "" {
		return errors.New("DB_NAME tidak boleh kosong")
	}

	if strings.TrimSpace(c.DBUser) == "" {
		return errors.New("DB_USER tidak boleh kosong")
	}

	if c.DBPoolMaxConns <= 0 {
		return fmt.Errorf("DB_POOL_MAX_CONNS (%d) harus lebih besar dari 0", c.DBPoolMaxConns)
	}

	if c.DBPoolMinConns < 0 {
		return fmt.Errorf("DB_POOL_MIN_CONNS (%d) tidak boleh negatif", c.DBPoolMinConns)
	}

	if c.DBPoolMinConns > c.DBPoolMaxConns {
		return fmt.Errorf("DB_POOL_MIN_CONNS (%d) tidak boleh melebihi DB_POOL_MAX_CONNS (%d)", c.DBPoolMinConns, c.DBPoolMaxConns)
	}

	if c.DBConnectTimeout <= 0 {
		return errors.New("DB_CONNECT_TIMEOUT harus lebih besar dari 0")
	}

	if strings.TrimSpace(c.SessionSecret) == "" {
		return errors.New("SESSION_SECRET tidak boleh kosong")
	}
	if c.SessionDuration <= 0 {
		return errors.New("SESSION_DURATION harus lebih besar dari 0")
	}

	return nil
}

// DSN menghasilkan connection string PostgreSQL lengkap dalam format URL standar.
func (c *Config) DSN() string {
	u := &url.URL{
		Scheme: "postgres",
		User:   url.UserPassword(c.DBUser, c.DBPassword),
		Host:   fmt.Sprintf("%s:%s", c.DBHost, c.DBPort),
		Path:   c.DBName,
	}

	q := u.Query()
	if c.DBSSLMode != "" {
		q.Set("sslmode", c.DBSSLMode)
	}
	u.RawQuery = q.Encode()

	return u.String()
}

// SanitizedDSN menghasilkan connection string dengan password yang disensor (aman untuk log).
func (c *Config) SanitizedDSN() string {
	sslParam := ""
	if c.DBSSLMode != "" {
		sslParam = "?sslmode=" + c.DBSSLMode
	}
	return fmt.Sprintf("postgres://%s:******@%s:%s/%s%s",
		url.PathEscape(c.DBUser), c.DBHost, c.DBPort, c.DBName, sslParam)
}

// loadDotEnv membaca file .env secara ringan tanpa menimpa environment variable yang sudah ada.
func loadDotEnv(filepath string) {
	f, err := os.Open(filepath)
	if err != nil {
		return
	}
	defer f.Close()

	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		parts := strings.SplitN(line, "=", 2)
		if len(parts) != 2 {
			continue
		}

		key := strings.TrimSpace(parts[0])
		val := strings.TrimSpace(parts[1])

		// Hapus tanda kutip jika ada
		val = strings.Trim(val, `"'`)

		// Jangan timpa environment variable OS yang sudah ada
		if _, exists := os.LookupEnv(key); !exists && key != "" {
			_ = os.Setenv(key, val)
		}
	}
}

func getEnv(lookup func(string) string, key, defaultVal string) string {
	if val := lookup(key); val != "" {
		return val
	}
	return defaultVal
}

func getEnvAsInt(lookup func(string) string, key string, defaultVal int) int {
	valStr := lookup(key)
	if valStr == "" {
		return defaultVal
	}
	val, err := strconv.Atoi(valStr)
	if err != nil {
		return defaultVal
	}
	return val
}

func getEnvAsDuration(lookup func(string) string, key string, defaultVal time.Duration) time.Duration {
	valStr := lookup(key)
	if valStr == "" {
		return defaultVal
	}
	val, err := time.ParseDuration(valStr)
	if err != nil {
		return defaultVal
	}
	return val
}

func getEnvAsBool(lookup func(string) string, key string, defaultVal bool) bool {
	valStr := strings.ToLower(strings.TrimSpace(lookup(key)))
	if valStr == "" {
		return defaultVal
	}
	return valStr == "true" || valStr == "1" || valStr == "yes"
}

