package schedule

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"
	"travora/api/internal/testutil"
)

func TestPublicScheduleFilter_Normalize(t *testing.T) {
	tests := []struct {
		name           string
		input          PublicScheduleFilter
		expectedLimit  int
		expectedOffset int
	}{
		{
			name:           "Default Limit saat 0",
			input:          PublicScheduleFilter{Limit: 0, Offset: 0},
			expectedLimit:  20,
			expectedOffset: 0,
		},
		{
			name:           "Default Limit saat negatif",
			input:          PublicScheduleFilter{Limit: -5, Offset: -2},
			expectedLimit:  20,
			expectedOffset: 0,
		},
		{
			name:           "Capping Maximum Limit",
			input:          PublicScheduleFilter{Limit: 150, Offset: 10},
			expectedLimit:  100,
			expectedOffset: 10,
		},
		{
			name:           "Nilai Valid Dipertahankan",
			input:          PublicScheduleFilter{Limit: 50, Offset: 25},
			expectedLimit:  50,
			expectedOffset: 25,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := tt.input
			f.Normalize()
			if f.Limit != tt.expectedLimit {
				t.Errorf("Limit tidak sesuai: ekspektasi %d, didapat %d", tt.expectedLimit, f.Limit)
			}
			if f.Offset != tt.expectedOffset {
				t.Errorf("Offset tidak sesuai: ekspektasi %d, didapat %d", tt.expectedOffset, f.Offset)
			}
		})
	}
}

func TestPublicSchedule_JSONMarshaling(t *testing.T) {
	fixedDate := time.Date(2026, 11, 15, 0, 0, 0, 0, time.UTC)
	sch := PublicSchedule{
		ID:            101,
		Price:         150000,
		DepartureDate: fixedDate,
		DepartureTime: "08:00:00",
		IsActive:      true,
		VehicleID:     1,
		VehicleName:   "Toyota HiAce Premio",
		PoliceNumber:  "D 1234 TRV",
		OriginCityID:  1,
		OriginCity:    "Bandung",
		DestCityID:    2,
		DestCity:      "Jakarta",
	}

	data, err := json.Marshal(sch)
	if err != nil {
		t.Fatalf("Marshal gagal: %v", err)
	}

	jsonStr := string(data)
	if !strings.Contains(jsonStr, `"tgl_berangkat":"2026-11-15"`) {
		t.Errorf("Format tanggal tidak sesuai YYYY-MM-DD: %s", jsonStr)
	}
	if strings.Contains(jsonStr, "id_admin") {
		t.Errorf("id_admin internal tidak boleh bocor ke payload publik: %s", jsonStr)
	}

	// Uji unmarshal kembali
	var decoded PublicSchedule
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("Unmarshal gagal: %v", err)
	}
	if decoded.DepartureDate.Format("2006-01-02") != "2026-11-15" {
		t.Errorf("Tanggal hasil decode tidak cocok: %v", decoded.DepartureDate)
	}
}

func TestRepository_ListPublicSchedules_QueryAndArgBinding(t *testing.T) {
	ctx := context.Background()
	dateVal := time.Date(2026, 11, 20, 0, 0, 0, 0, time.UTC)
	originID := int64(1)
	destID := int64(2)

	tests := []struct {
		name               string
		filter             PublicScheduleFilter
		expectedConditions []string
		expectedArgs       []any
	}{
		{
			name:   "Tanpa filter opsional (hanya jadwal aktif + default pagination)",
			filter: PublicScheduleFilter{},
			expectedConditions: []string{
				"j.is_active = TRUE",
			},
			expectedArgs: []any{20, 0},
		},
		{
			name:   "Hanya filter kota asal",
			filter: PublicScheduleFilter{OriginCityID: &originID},
			expectedConditions: []string{
				"j.is_active = TRUE",
				"j.id_kota_asal = $1",
			},
			expectedArgs: []any{int64(1), 20, 0},
		},
		{
			name:   "Hanya filter kota tujuan",
			filter: PublicScheduleFilter{DestinationCityID: &destID},
			expectedConditions: []string{
				"j.is_active = TRUE",
				"j.id_kota_tujuan = $1",
			},
			expectedArgs: []any{int64(2), 20, 0},
		},
		{
			name:   "Filter kota asal dan kota tujuan secara independen",
			filter: PublicScheduleFilter{OriginCityID: &originID, DestinationCityID: &destID},
			expectedConditions: []string{
				"j.is_active = TRUE",
				"j.id_kota_asal = $1",
				"j.id_kota_tujuan = $2",
			},
			expectedArgs: []any{int64(1), int64(2), 20, 0},
		},
		{
			name:   "Hanya filter tanggal keberangkatan (PostgreSQL DATE)",
			filter: PublicScheduleFilter{DepartureDate: &dateVal},
			expectedConditions: []string{
				"j.is_active = TRUE",
				"j.tgl_berangkat = $1::date",
			},
			expectedArgs: []any{"2026-11-20", 20, 0},
		},
		{
			name: "Semua filter digabungkan dengan pagination kustom",
			filter: PublicScheduleFilter{
				OriginCityID:      &originID,
				DestinationCityID: &destID,
				DepartureDate:     &dateVal,
				Limit:             50,
				Offset:            10,
			},
			expectedConditions: []string{
				"j.is_active = TRUE",
				"j.id_kota_asal = $1",
				"j.id_kota_tujuan = $2",
				"j.tgl_berangkat = $3::date",
			},
			expectedArgs: []any{int64(1), int64(2), "2026-11-20", 50, 10},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var capturedSQL string
			var capturedArgs []any

			mockDB := &testutil.MockDBTX{
				QueryFunc: func(ctx context.Context, sql string, args ...any) (pgx.Rows, error) {
					capturedSQL = sql
					capturedArgs = args
					return testutil.NewMockRows(nil), nil
				},
			}

			repo := NewRepository(mockDB)
			_, err := repo.ListPublicSchedules(ctx, tt.filter)
			if err != nil {
				t.Fatalf("ListPublicSchedules error tidak terduga: %v", err)
			}

			// Validasi kondisi SQL
			for _, cond := range tt.expectedConditions {
				if !strings.Contains(capturedSQL, cond) {
					t.Errorf("Kondisi SQL tidak ditemukan: %q dalam kueri:\n%s", cond, capturedSQL)
				}
			}

			// Validasi urutan keberangkatan
			if !strings.Contains(capturedSQL, "ORDER BY j.tgl_berangkat ASC, j.jam_berangkat ASC, j.id_jadwal ASC") {
				t.Errorf("Klausul pengurutan jadwal tidak sesuai: %s", capturedSQL)
			}

			// Validasi argumen parameterized
			if len(capturedArgs) != len(tt.expectedArgs) {
				t.Fatalf("Panjang argumen tidak cocok: ekspektasi %d (%v), didapat %d (%v)",
					len(tt.expectedArgs), tt.expectedArgs, len(capturedArgs), capturedArgs)
			}

			for i := range capturedArgs {
				if capturedArgs[i] != tt.expectedArgs[i] {
					t.Errorf("Argumen ke-%d tidak cocok: ekspektasi %v, didapat %v", i, tt.expectedArgs[i], capturedArgs[i])
				}
			}
		})
	}
}

func TestRepository_ListPublicSchedules_RowMapping(t *testing.T) {
	ctx := context.Background()
	depDate := time.Date(2026, 11, 15, 0, 0, 0, 0, time.UTC)

	mockRow := []any{
		int64(10),
		int64(175000),
		depDate,
		"07:30:00",
		true,
		int64(3),
		"Toyota HiAce Commuter",
		"B 9999 TRV",
		int64(1),
		"Bandung",
		int64(2),
		"Jakarta",
	}

	mockDB := &testutil.MockDBTX{
		QueryFunc: func(ctx context.Context, sql string, args ...any) (pgx.Rows, error) {
			return testutil.NewMockRows([][]any{mockRow}), nil
		},
	}

	repo := NewRepository(mockDB)
	res, err := repo.ListPublicSchedules(ctx, PublicScheduleFilter{})
	if err != nil {
		t.Fatalf("error tidak terduga: %v", err)
	}

	if len(res) != 1 {
		t.Fatalf("ekspektasi 1 jadwal, didapat: %d", len(res))
	}

	s := res[0]
	if s.ID != 10 || s.Price != 175000 || s.DepartureTime != "07:30:00" || !s.IsActive {
		t.Errorf("pemetaan data utama jadwal tidak tepat: %+v", s)
	}
	if s.VehicleID != 3 || s.VehicleName != "Toyota HiAce Commuter" || s.PoliceNumber != "B 9999 TRV" {
		t.Errorf("pemetaan kendaraan tidak tepat: %+v", s)
	}
	if s.OriginCityID != 1 || s.OriginCity != "Bandung" || s.DestCityID != 2 || s.DestCity != "Jakarta" {
		t.Errorf("pemetaan rute kota tidak tepat: %+v", s)
	}
}

func TestRepository_GetPublicScheduleByID(t *testing.T) {
	ctx := context.Background()
	depDate := time.Date(2026, 11, 16, 0, 0, 0, 0, time.UTC)

	t.Run("JadwalAktifDitemukan", func(t *testing.T) {
		mockDB := &testutil.MockDBTX{
			QueryRowFunc: func(ctx context.Context, sql string, args ...any) pgx.Row {
				if !strings.Contains(sql, "j.is_active = TRUE") {
					t.Errorf("Kueri detail harus memfilter is_active = TRUE: %s", sql)
				}
				return &testutil.MockRow{
					Values: []any{
						int64(25),
						int64(200000),
						depDate,
						"14:00:00",
						true,
						int64(2),
						"Isuzu Elf",
						"D 5555 TRV",
						int64(1),
						"Bandung",
						int64(3),
						"Yogyakarta",
					},
				}
			},
		}

		repo := NewRepository(mockDB)
		s, err := repo.GetPublicScheduleByID(ctx, 25)
		if err != nil {
			t.Fatalf("error tidak terduga: %v", err)
		}
		if s.ID != 25 || s.Price != 200000 || s.OriginCity != "Bandung" || s.DestCity != "Yogyakarta" {
			t.Errorf("data jadwal tidak cocok: %+v", s)
		}
	})

	t.Run("JadwalTidakDitemukanAtauTidakAktif", func(t *testing.T) {
		mockDB := &testutil.MockDBTX{
			QueryRowFunc: func(ctx context.Context, sql string, args ...any) pgx.Row {
				return &testutil.MockRow{ErrVal: pgx.ErrNoRows}
			},
		}

		repo := NewRepository(mockDB)
		s, err := repo.GetPublicScheduleByID(ctx, 999)
		if !errors.Is(err, ErrScheduleNotFound) {
			t.Errorf("ekspektasi ErrScheduleNotFound, didapat: %v", err)
		}
		if s != nil {
			t.Errorf("ekspektasi result nil, didapat: %+v", s)
		}
	})

	t.Run("IDTidakValid", func(t *testing.T) {
		repo := NewRepository(&testutil.MockDBTX{})
		_, err := repo.GetPublicScheduleByID(ctx, 0)
		if !errors.Is(err, ErrInvalidScheduleID) {
			t.Errorf("ekspektasi ErrInvalidScheduleID untuk id=0, didapat: %v", err)
		}
		_, err = repo.GetPublicScheduleByID(ctx, -10)
		if !errors.Is(err, ErrInvalidScheduleID) {
			t.Errorf("ekspektasi ErrInvalidScheduleID untuk id=-10, didapat: %v", err)
		}
	})
}

func TestScheduleService(t *testing.T) {
	ctx := context.Background()

	t.Run("ValidasiRuteKotaAsalDanTujuanSama", func(t *testing.T) {
		cityID := int64(5)
		svc := NewService(&mockScheduleRepo{})

		filter := PublicScheduleFilter{
			OriginCityID:      &cityID,
			DestinationCityID: &cityID,
		}

		_, err := svc.ListPublicSchedules(ctx, filter)
		if !errors.Is(err, ErrInvalidRoute) {
			t.Errorf("ekspektasi ErrInvalidRoute ketika kota asal == tujuan, didapat: %v", err)
		}
	})

	t.Run("ContextDibatalkan", func(t *testing.T) {
		canceledCtx, cancel := context.WithCancel(context.Background())
		cancel()

		svc := NewService(&mockScheduleRepo{})
		if _, err := svc.ListPublicSchedules(canceledCtx, PublicScheduleFilter{}); err == nil {
			t.Error("ListPublicSchedules: ekspektasi error saat context dibatalkan")
		}
		if _, err := svc.GetPublicScheduleByID(canceledCtx, 1); err == nil {
			t.Error("GetPublicScheduleByID: ekspektasi error saat context dibatalkan")
		}
	})

	t.Run("GetPublicScheduleByID_ValidasiID", func(t *testing.T) {
		svc := NewService(&mockScheduleRepo{})
		if _, err := svc.GetPublicScheduleByID(ctx, 0); !errors.Is(err, ErrInvalidScheduleID) {
			t.Errorf("ekspektasi ErrInvalidScheduleID, didapat: %v", err)
		}
	})

	t.Run("DelegasiSukses", func(t *testing.T) {
		expected := []PublicSchedule{{ID: 1, Price: 100000, IsActive: true}}
		mock := &mockScheduleRepo{
			schedules: expected,
			single:    &expected[0],
		}
		svc := NewService(mock)

		list, err := svc.ListPublicSchedules(ctx, PublicScheduleFilter{})
		if err != nil || len(list) != 1 || list[0].ID != 1 {
			t.Errorf("ListPublicSchedules gagal mendelegasikan: %v", err)
		}

		single, err := svc.GetPublicScheduleByID(ctx, 1)
		if err != nil || single.ID != 1 {
			t.Errorf("GetPublicScheduleByID gagal mendelegasikan: %v", err)
		}
	})
}

type mockScheduleRepo struct {
	schedules []PublicSchedule
	single    *PublicSchedule
	err       error
}

func (m *mockScheduleRepo) ListPublicSchedules(ctx context.Context, filter PublicScheduleFilter) ([]PublicSchedule, error) {
	if m.err != nil {
		return nil, m.err
	}
	return m.schedules, nil
}

func (m *mockScheduleRepo) GetPublicScheduleByID(ctx context.Context, id int64) (*PublicSchedule, error) {
	if m.err != nil {
		return nil, m.err
	}
	if m.single == nil {
		return nil, ErrScheduleNotFound
	}
	return m.single, nil
}

