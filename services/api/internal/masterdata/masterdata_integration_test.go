package masterdata

import (
	"context"
	"fmt"
	"os"
	"testing"
	"time"

	"travora/api/internal/config"
	"travora/api/internal/database"
)

// TestMasterData_Integration menguji integrasi aktual dengan basis data PostgreSQL 18.
// Seluruh fixture pengujian berjalan di dalam transaksi terisolasi dan selalu diakhiri dengan ROLLBACK.
func TestMasterData_Integration(t *testing.T) {
	if os.Getenv("RUN_INTEGRATION_TESTS") != "true" || os.Getenv("DB_PASSWORD") == "" {
		t.Skip("SKIPPED: Integration test PostgreSQL 18 dilewati karena RUN_INTEGRATION_TESTS != 'true' atau DB_PASSWORD belum disediakan.")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	cfg, err := config.Load()
	if err != nil {
		t.Fatalf("Gagal memuat konfigurasi: %v", err)
	}

	// Dukung override eksplisit TEST_DB_NAME jika disediakan
	if testDB := os.Getenv("TEST_DB_NAME"); testDB != "" {
		cfg.DBName = testDB
	}

	db, err := database.NewPool(ctx, cfg)
	if err != nil {
		t.Fatalf("Gagal membuka koneksi database pengujian %s: %v", cfg.DBName, err)
	}
	defer db.Close()

	pool := db.Pool()

	// 1. Awali transaksi atomik (seluruh mutasi akan di-ROLLBACK)
	tx, err := pool.Begin(ctx)
	if err != nil {
		t.Fatalf("Gagal memulai transaksi pengujian: %v", err)
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	// 2. Siapkan fixture admin sintetis
	var adminID int64
	adminEmail := fmt.Sprintf("it_admin_%d@travora.test", time.Now().UnixNano())
	err = tx.QueryRow(ctx, `
		INSERT INTO admin (email, password_hash, nama_lengkap, no_telp)
		VALUES ($1, 'hash_test', 'Admin Integrasi', '081299990001')
		RETURNING id_admin;
	`, adminEmail).Scan(&adminID)
	if err != nil {
		t.Fatalf("Gagal membuat fixture admin: %v", err)
	}

	// 3. Siapkan fixture kota asal, kota tujuan, dan kendaraan
	uniqueSuffix := time.Now().UnixNano()
	originName := fmt.Sprintf("ZZ_Asal_%d", uniqueSuffix)
	destName := fmt.Sprintf("ZZ_Tujuan_%d", uniqueSuffix)
	plateNo := fmt.Sprintf("ZZ %d TRV", uniqueSuffix%10000)

	_, err = tx.Exec(ctx, "INSERT INTO kota_asal (nm_kota_asal, id_admin) VALUES ($1, $2)", originName, adminID)
	if err != nil {
		t.Fatalf("Gagal insert fixture kota_asal: %v", err)
	}

	_, err = tx.Exec(ctx, "INSERT INTO kota_tujuan (nm_kota_tujuan, id_admin) VALUES ($1, $2)", destName, adminID)
	if err != nil {
		t.Fatalf("Gagal insert fixture kota_tujuan: %v", err)
	}

	_, err = tx.Exec(ctx, "INSERT INTO kendaraan (jenis_mobil, nomor_polisi, warna_mobil, id_admin) VALUES ($1, $2, $3, $4)",
		"Microbus Integrasi", plateNo, "Silver Metalik", adminID)
	if err != nil {
		t.Fatalf("Gagal insert fixture kendaraan: %v", err)
	}

	// 4. Verifikasi repository membaca data di dalam transaksi
	repo := NewRepository(tx)

	origins, err := repo.ListOriginCities(ctx)
	if err != nil {
		t.Fatalf("ListOriginCities gagal: %v", err)
	}
	foundOrigin := false
	for _, o := range origins {
		if o.Name == originName {
			foundOrigin = true
			break
		}
	}
	if !foundOrigin {
		t.Errorf("Fixture kota asal %s tidak ditemukan dalam hasil query", originName)
	}

	dests, err := repo.ListDestinationCities(ctx)
	if err != nil {
		t.Fatalf("ListDestinationCities gagal: %v", err)
	}
	foundDest := false
	for _, d := range dests {
		if d.Name == destName {
			foundDest = true
			break
		}
	}
	if !foundDest {
		t.Errorf("Fixture kota tujuan %s tidak ditemukan dalam hasil query", destName)
	}

	vehicles, err := repo.ListVehicles(ctx)
	if err != nil {
		t.Fatalf("ListVehicles gagal: %v", err)
	}
	foundVeh := false
	for _, v := range vehicles {
		if v.PoliceNumber == plateNo {
			foundVeh = true
			break
		}
	}
	if !foundVeh {
		t.Errorf("Fixture kendaraan dengan nomor polisi %s tidak ditemukan", plateNo)
	}
}

