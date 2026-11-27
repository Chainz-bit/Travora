package database

import (
	"context"
	"strings"
	"testing"
	"time"

	"travora/api/internal/config"
)

func TestNewPoolWithNilConfig(t *testing.T) {
	ctx := context.Background()
	db, err := NewPool(ctx, nil)
	if err == nil {
		t.Fatalf("Diharapkan error ketika cfg nil, tetapi sukses")
	}
	if db != nil {
		t.Errorf("DB harus nil ketika inisialisasi gagal")
	}
	if !strings.Contains(err.Error(), "tidak boleh nil") {
		t.Errorf("Pesan error tidak sesuai: %v", err)
	}
}

func TestNewPoolWithInvalidConfig(t *testing.T) {
	ctx := context.Background()
	invalidCfg := &config.Config{
		AppPort:        "8080",
		DBHost:         "", // Host kosong
		DBPort:         "5432",
		DBName:         "travora_db",
		DBUser:         "postgres",
		DBPoolMaxConns: 10,
	}

	db, err := NewPool(ctx, invalidCfg)
	if err == nil {
		t.Fatalf("Diharapkan error validasi konfigurasi, tetapi sukses")
	}
	if db != nil {
		t.Errorf("DB harus nil ketika validasi gagal")
	}
}

func TestNewPoolWithUnreachableDB(t *testing.T) {
	ctx := context.Background()
	unreachableCfg := &config.Config{
		AppPort:          "8080",
		DBHost:           "127.0.0.1",
		DBPort:           "59999", // Port yang tidak ada PostgreSQL aktif
		DBName:           "travora_unreachable",
		DBUser:           "test_user",
		DBPassword:       "Super$ecret#Password!",
		DBSSLMode:        "disable",
		DBPoolMaxConns:   5,
		DBPoolMinConns:   1,
		DBConnectTimeout: 500 * time.Millisecond,
	}

	start := time.Now()
	db, err := NewPool(ctx, unreachableCfg)
	elapsed := time.Since(start)

	if err == nil {
		t.Fatalf("Diharapkan error ketika database tidak dapat dijangkau, tetapi sukses")
	}
	if db != nil {
		t.Errorf("DB harus nil ketika ping awal gagal")
	}

	// Pastikan timeout berfungsi dengan wajar (tidak hanging lama)
	if elapsed > 3*time.Second {
		t.Errorf("Koneksi memakan waktu terlalu lama: %v (melebihi batas timeout)", elapsed)
	}

	// CRITICAL SECURITY: Pastikan password TIDAK bocor dalam pesan error
	if strings.Contains(err.Error(), "Super$ecret#Password!") {
		t.Errorf("KEBOCORAN KREDENSIAL: Pesan error memuat password plaintext: %v", err)
	}
}
