package masterdata

import (
	"context"
	"errors"
	"testing"

	"github.com/jackc/pgx/v5"
	"travora/api/internal/testutil"
)

func TestListOriginCities_Success(t *testing.T) {
	ctx := context.Background()

	mockData := [][]any{
		{int64(1), "Bandung"},
		{int64(2), "Jakarta"},
	}

	mockDB := &testutil.MockDBTX{
		QueryFunc: func(ctx context.Context, sql string, args ...any) (pgx.Rows, error) {
			return testutil.NewMockRows(mockData), nil
		},
	}

	repo := NewRepository(mockDB)
	cities, err := repo.ListOriginCities(ctx)
	if err != nil {
		t.Fatalf("ekspektasi tidak ada error, didapat: %v", err)
	}

	if len(cities) != 2 {
		t.Fatalf("ekspektasi 2 kota asal, didapat: %d", len(cities))
	}
	if cities[0].ID != 1 || cities[0].Name != "Bandung" {
		t.Errorf("kota asal pertama tidak sesuai: %+v", cities[0])
	}
	if cities[1].ID != 2 || cities[1].Name != "Jakarta" {
		t.Errorf("kota asal kedua tidak sesuai: %+v", cities[1])
	}
}

func TestListOriginCities_Empty(t *testing.T) {
	ctx := context.Background()

	mockDB := &testutil.MockDBTX{
		QueryFunc: func(ctx context.Context, sql string, args ...any) (pgx.Rows, error) {
			return testutil.NewMockRows([][]any{}), nil
		},
	}

	repo := NewRepository(mockDB)
	cities, err := repo.ListOriginCities(ctx)
	if err != nil {
		t.Fatalf("ekspektasi tidak ada error, didapat: %v", err)
	}

	if cities == nil {
		t.Fatal("ekspektasi slice tidak nil saat hasil kosong")
	}
	if len(cities) != 0 {
		t.Fatalf("ekspektasi slice kosong (panjang 0), didapat: %d", len(cities))
	}
}

func TestListOriginCities_QueryError(t *testing.T) {
	ctx := context.Background()
	expectedErr := errors.New("koneksi database terputus")

	mockDB := &testutil.MockDBTX{
		QueryFunc: func(ctx context.Context, sql string, args ...any) (pgx.Rows, error) {
			return nil, expectedErr
		},
	}

	repo := NewRepository(mockDB)
	cities, err := repo.ListOriginCities(ctx)
	if err == nil {
		t.Fatal("ekspektasi error dikembalikan, namun bernilai nil")
	}
	if cities != nil {
		t.Errorf("ekspektasi hasil nil saat terjadi error, didapat: %+v", cities)
	}
}

func TestListOriginCities_RowsError(t *testing.T) {
	ctx := context.Background()
	iterErr := errors.New("kegagalan jaringan saat iterasi baris")

	mockDB := &testutil.MockDBTX{
		QueryFunc: func(ctx context.Context, sql string, args ...any) (pgx.Rows, error) {
			rows := testutil.NewMockRows([][]any{{int64(1), "Bandung"}})
			rows.SetError(iterErr)
			return rows, nil
		},
	}

	repo := NewRepository(mockDB)
	_, err := repo.ListOriginCities(ctx)
	if err == nil {
		t.Fatal("ekspektasi error saat rows.Err() tidak nil")
	}
}

func TestListDestinationCities_Success(t *testing.T) {
	ctx := context.Background()

	mockData := [][]any{
		{int64(10), "Semarang"},
		{int64(20), "Surabaya"},
		{int64(30), "Yogyakarta"},
	}

	mockDB := &testutil.MockDBTX{
		QueryFunc: func(ctx context.Context, sql string, args ...any) (pgx.Rows, error) {
			return testutil.NewMockRows(mockData), nil
		},
	}

	repo := NewRepository(mockDB)
	cities, err := repo.ListDestinationCities(ctx)
	if err != nil {
		t.Fatalf("ekspektasi tidak ada error, didapat: %v", err)
	}

	if len(cities) != 3 {
		t.Fatalf("ekspektasi 3 kota tujuan, didapat: %d", len(cities))
	}
	if cities[0].ID != 10 || cities[0].Name != "Semarang" {
		t.Errorf("data kota tujuan pertama tidak cocok: %+v", cities[0])
	}
}

func TestListDestinationCities_Empty(t *testing.T) {
	ctx := context.Background()

	mockDB := &testutil.MockDBTX{
		QueryFunc: func(ctx context.Context, sql string, args ...any) (pgx.Rows, error) {
			return testutil.NewMockRows([][]any{}), nil
		},
	}

	repo := NewRepository(mockDB)
	cities, err := repo.ListDestinationCities(ctx)
	if err != nil {
		t.Fatalf("ekspektasi tidak ada error, didapat: %v", err)
	}

	if cities == nil || len(cities) != 0 {
		t.Fatalf("ekspektasi slice kosong non-nil, didapat: %+v", cities)
	}
}

func TestListVehicles_Success(t *testing.T) {
	ctx := context.Background()

	mockData := [][]any{
		{int64(1), "Toyota HiAce Premio", "D 1234 TRV", "Putih Metalik"},
		{int64(2), "Isuzu Elf Executive", "B 5678 TRV", "Silver"},
	}

	mockDB := &testutil.MockDBTX{
		QueryFunc: func(ctx context.Context, sql string, args ...any) (pgx.Rows, error) {
			return testutil.NewMockRows(mockData), nil
		},
	}

	repo := NewRepository(mockDB)
	vehicles, err := repo.ListVehicles(ctx)
	if err != nil {
		t.Fatalf("ekspektasi tidak ada error, didapat: %v", err)
	}

	if len(vehicles) != 2 {
		t.Fatalf("ekspektasi 2 kendaraan, didapat: %d", len(vehicles))
	}

	v1 := vehicles[0]
	if v1.ID != 1 || v1.VehicleType != "Toyota HiAce Premio" || v1.PoliceNumber != "D 1234 TRV" || v1.Color != "Putih Metalik" {
		t.Errorf("data kendaraan pertama tidak cocok: %+v", v1)
	}
}

func TestListVehicles_Empty(t *testing.T) {
	ctx := context.Background()

	mockDB := &testutil.MockDBTX{
		QueryFunc: func(ctx context.Context, sql string, args ...any) (pgx.Rows, error) {
			return testutil.NewMockRows([][]any{}), nil
		},
	}

	repo := NewRepository(mockDB)
	vehicles, err := repo.ListVehicles(ctx)
	if err != nil {
		t.Fatalf("ekspektasi tidak ada error, didapat: %v", err)
	}

	if vehicles == nil || len(vehicles) != 0 {
		t.Fatalf("ekspektasi slice kosong non-nil, didapat: %+v", vehicles)
	}
}

func TestMasterDataService(t *testing.T) {
	// 1. Uji pembatalan context
	t.Run("ContextCanceled", func(t *testing.T) {
		ctx, cancel := context.WithCancel(context.Background())
		cancel()

		svc := NewService(&mockRepo{})
		if _, err := svc.GetOriginCities(ctx); err == nil {
			t.Error("GetOriginCities: ekspektasi error saat context dibatalkan")
		}
		if _, err := svc.GetDestinationCities(ctx); err == nil {
			t.Error("GetDestinationCities: ekspektasi error saat context dibatalkan")
		}
		if _, err := svc.GetVehicles(ctx); err == nil {
			t.Error("GetVehicles: ekspektasi error saat context dibatalkan")
		}
	})

	// 2. Uji delegasi sukses
	t.Run("SuccessDelegation", func(t *testing.T) {
		ctx := context.Background()
		expectedCities := []OriginCity{{ID: 1, Name: "Bandung"}}
		expectedDest := []DestinationCity{{ID: 2, Name: "Surabaya"}}
		expectedVehicles := []Vehicle{{ID: 3, VehicleType: "HiAce", PoliceNumber: "B 1234 AA", Color: "Putih"}}

		mock := &mockRepo{
			origins:      expectedCities,
			destinations: expectedDest,
			vehicles:     expectedVehicles,
		}

		svc := NewService(mock)

		origins, err := svc.GetOriginCities(ctx)
		if err != nil || len(origins) != 1 || origins[0].Name != "Bandung" {
			t.Errorf("GetOriginCities gagal mendelegasikan hasil: %v", err)
		}

		destinations, err := svc.GetDestinationCities(ctx)
		if err != nil || len(destinations) != 1 || destinations[0].Name != "Surabaya" {
			t.Errorf("GetDestinationCities gagal mendelegasikan hasil: %v", err)
		}

		vehicles, err := svc.GetVehicles(ctx)
		if err != nil || len(vehicles) != 1 || vehicles[0].VehicleType != "HiAce" {
			t.Errorf("GetVehicles gagal mendelegasikan hasil: %v", err)
		}
	})

	// 3. Uji propagasi error dari repository
	t.Run("RepoErrorPropagation", func(t *testing.T) {
		ctx := context.Background()
		repoErr := errors.New("database down")
		mock := &mockRepo{err: repoErr}
		svc := NewService(mock)

		if _, err := svc.GetOriginCities(ctx); !errors.Is(err, repoErr) {
			t.Errorf("GetOriginCities tidak mempropagasi error dengan benar: %v", err)
		}
		if _, err := svc.GetDestinationCities(ctx); !errors.Is(err, repoErr) {
			t.Errorf("GetDestinationCities tidak mempropagasi error dengan benar: %v", err)
		}
		if _, err := svc.GetVehicles(ctx); !errors.Is(err, repoErr) {
			t.Errorf("GetVehicles tidak mempropagasi error dengan benar: %v", err)
		}
	})
}

type mockRepo struct {
	origins      []OriginCity
	destinations []DestinationCity
	vehicles     []Vehicle
	err          error
}

func (m *mockRepo) ListOriginCities(ctx context.Context) ([]OriginCity, error) {
	if m.err != nil {
		return nil, m.err
	}
	return m.origins, nil
}

func (m *mockRepo) ListDestinationCities(ctx context.Context) ([]DestinationCity, error) {
	if m.err != nil {
		return nil, m.err
	}
	return m.destinations, nil
}

func (m *mockRepo) ListVehicles(ctx context.Context) ([]Vehicle, error) {
	if m.err != nil {
		return nil, m.err
	}
	return m.vehicles, nil
}

