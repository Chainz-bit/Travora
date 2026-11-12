package schedule

import (
	"context"
	"errors"
	"fmt"
	"os"
	"testing"
	"time"

	"travora/api/internal/config"
	"travora/api/internal/database"
)

// TestSchedule_Integration menguji integrasi aktual kueri jadwal dengan PostgreSQL 18.
// Menguji pemisahan jadwal aktif vs tidak aktif, filter pencarian terindeks, dan pembatalan transaksi (ROLLBACK).
func TestSchedule_Integration(t *testing.T) {
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

	// 1. Awali transaksi atomik pengujian
	tx, err := pool.Begin(ctx)
	if err != nil {
		t.Fatalf("Gagal memulai transaksi pengujian: %v", err)
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	// 2. Siapkan relasi master data sintetis
	var adminID int64
	adminEmail := fmt.Sprintf("sch_admin_%d@travora.test", time.Now().UnixNano())
	err = tx.QueryRow(ctx, `
		INSERT INTO admin (email, password_hash, nama_lengkap, no_telp)
		VALUES ($1, 'hash_test', 'Admin Jadwal Integrasi', '081299990002')
		RETURNING id_admin;
	`, adminEmail).Scan(&adminID)
	if err != nil {
		t.Fatalf("Gagal membuat fixture admin: %v", err)
	}

	uniqueSuffix := time.Now().UnixNano()
	// Gunakan ID eksplisit yang berbeda untuk kota asal (101) dan kota tujuan (202)
	// guna memenuhi constraint chk_jadwal_rute (id_kota_asal <> id_kota_tujuan).
	var originID int64 = 101
	var destID int64 = 202
	originName := fmt.Sprintf("Bandung_%d", uniqueSuffix)
	destName := fmt.Sprintf("Jakarta_%d", uniqueSuffix)
	plateNo := fmt.Sprintf("SCH %d TRV", uniqueSuffix%10000)

	var vehID int64
	err = tx.QueryRow(ctx, `
		INSERT INTO kota_asal (id_kota_asal, nm_kota_asal, id_admin)
		VALUES ($1, $2, $3)
		RETURNING id_kota_asal;
	`, originID, originName, adminID).Scan(&originID)
	if err != nil {
		t.Fatalf("Gagal insert fixture kota_asal: %v", err)
	}

	err = tx.QueryRow(ctx, `
		INSERT INTO kota_tujuan (id_kota_tujuan, nm_kota_tujuan, id_admin)
		VALUES ($1, $2, $3)
		RETURNING id_kota_tujuan;
	`, destID, destName, adminID).Scan(&destID)
	if err != nil {
		t.Fatalf("Gagal insert fixture kota_tujuan: %v", err)
	}

	err = tx.QueryRow(ctx, "INSERT INTO kendaraan (jenis_mobil, nomor_polisi, warna_mobil, id_admin) VALUES ($1, $2, $3, $4) RETURNING id_kendaraan",
		"Executive Shuttle Integrasi", plateNo, "Putih Mutiara", adminID).Scan(&vehID)
	if err != nil {
		t.Fatalf("Gagal insert fixture kendaraan: %v", err)
	}

	// 3. Masukkan 1 Jadwal AKTIF (is_active = TRUE)
	// originID (101) <> destID (202) menjamin chk_jadwal_rute valid
	var activeScheduleID int64
	err = tx.QueryRow(ctx, `
		INSERT INTO jadwal (id_kendaraan, id_kota_asal, id_kota_tujuan, id_admin, harga, tgl_berangkat, jam_berangkat, is_active)
		VALUES ($1, $2, $3, $4, 160000, '2026-12-05', '08:00:00', TRUE)
		RETURNING id_jadwal;
	`, vehID, originID, destID, adminID).Scan(&activeScheduleID)
	if err != nil {
		t.Fatalf("Gagal insert fixture jadwal aktif: %v", err)
	}

	// 4. Masukkan 1 Jadwal NON-AKTIF (is_active = FALSE)
	var inactiveScheduleID int64
	err = tx.QueryRow(ctx, `
		INSERT INTO jadwal (id_kendaraan, id_kota_asal, id_kota_tujuan, id_admin, harga, tgl_berangkat, jam_berangkat, is_active)
		VALUES ($1, $2, $3, $4, 220000, '2026-12-05', '14:00:00', FALSE)
		RETURNING id_jadwal;
	`, vehID, originID, destID, adminID).Scan(&inactiveScheduleID)
	if err != nil {
		t.Fatalf("Gagal insert fixture jadwal non-aktif: %v", err)
	}

	repo := NewRepository(tx)

	// 5. Uji ListPublicSchedules: Hanya jadwal aktif yang boleh muncul
	t.Run("PublicListing_OnlyActive", func(t *testing.T) {
		schedules, err := repo.ListPublicSchedules(ctx, PublicScheduleFilter{
			OriginCityID:      &originID,
			DestinationCityID: &destID,
		})
		if err != nil {
			t.Fatalf("ListPublicSchedules gagal: %v", err)
		}

		if len(schedules) != 1 {
			t.Fatalf("Ekspektasi tepat 1 jadwal aktif, didapat: %d", len(schedules))
		}
		if schedules[0].ID != activeScheduleID {
			t.Errorf("Jadwal yang dikembalikan bukan jadwal aktif: %+v", schedules[0])
		}
		if !schedules[0].IsActive {
			t.Errorf("Jadwal publik wajib memiliki is_active = true")
		}
	})

	// 6. Uji Filter Tanggal PostgreSQL DATE
	t.Run("DateFilter_ExactMatch", func(t *testing.T) {
		targetDate := time.Date(2026, 12, 5, 0, 0, 0, 0, time.UTC)
		schedules, err := repo.ListPublicSchedules(ctx, PublicScheduleFilter{
			OriginCityID:      &originID,
			DestinationCityID: &destID,
			DepartureDate:     &targetDate,
		})
		if err != nil {
			t.Fatalf("ListPublicSchedules dengan filter tanggal gagal: %v", err)
		}
		if len(schedules) != 1 || schedules[0].ID != activeScheduleID {
			t.Errorf("Filter tanggal tepat harus menemukan jadwal: %v", schedules)
		}

		// Filter tanggal yang berbeda harus mengembalikan 0 jadwal
		diffDate := time.Date(2026, 12, 6, 0, 0, 0, 0, time.UTC)
		noSchedules, err := repo.ListPublicSchedules(ctx, PublicScheduleFilter{
			OriginCityID:      &originID,
			DestinationCityID: &destID,
			DepartureDate:     &diffDate,
		})
		if err != nil {
			t.Fatalf("ListPublicSchedules tanggal berbeda gagal: %v", err)
		}
		if len(noSchedules) != 0 {
			t.Errorf("Ekspektasi 0 jadwal untuk tanggal berbeda, didapat: %d", len(noSchedules))
		}
	})

	// 7. Uji GetPublicScheduleByID: Aktif vs Non-Aktif
	t.Run("GetByID_ActiveVsInactive", func(t *testing.T) {
		// Jadwal aktif harus berhasil diambil
		sch, err := repo.GetPublicScheduleByID(ctx, activeScheduleID)
		if err != nil {
			t.Fatalf("GetPublicScheduleByID untuk jadwal aktif gagal: %v", err)
		}
		if sch.ID != activeScheduleID || sch.Price != 160000 {
			t.Errorf("Detail jadwal aktif tidak cocok: %+v", sch)
		}

		// Jadwal non-aktif harus ditolak dengan ErrScheduleNotFound
		inactiveSch, err := repo.GetPublicScheduleByID(ctx, inactiveScheduleID)
		if !errors.Is(err, ErrScheduleNotFound) {
			t.Errorf("Jadwal non-aktif harus menghasilkan ErrScheduleNotFound, didapat: %v", err)
		}
		if inactiveSch != nil {
			t.Errorf("Jadwal non-aktif tidak boleh mengembalikan objek: %+v", inactiveSch)
		}
	})
}

