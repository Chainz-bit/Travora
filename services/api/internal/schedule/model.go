package schedule

import (
	"encoding/json"
	"errors"
	"time"
)

// Sentinel error untuk domain jadwal perjalanan.
var (
	ErrScheduleNotFound  = errors.New("jadwal tidak ditemukan atau tidak aktif")
	ErrInvalidScheduleID = errors.New("ID jadwal harus berupa bilangan bulat positif")
	ErrInvalidPagination = errors.New("parameter pagination tidak valid")
	ErrInvalidRoute      = errors.New("kota asal dan kota tujuan tidak boleh sama")
	ErrInvalidDateFormat = errors.New("format tanggal keberangkatan tidak valid (harus YYYY-MM-DD)")
)

// Batas default dan maksimum pagination pencarian jadwal.
const (
	DefaultLimit = 20
	MaxLimit     = 100
)

// PublicSchedule merepresentasikan informasi jadwal keberangkatan untuk konsumsi publik/penumpang.
// Informasi sensitif internal admin (seperti id_admin) sengaja tidak diikutsertakan.
type PublicSchedule struct {
	ID            int64     `json:"id_jadwal"`
	Price         int64     `json:"harga"`
	DepartureDate time.Time `json:"-"`
	DepartureTime string    `json:"jam_berangkat"`
	IsActive      bool      `json:"is_active"`
	VehicleID     int64     `json:"id_kendaraan"`
	VehicleName   string    `json:"jenis_mobil"`
	PoliceNumber  string    `json:"nomor_polisi"`
	OriginCityID  int64     `json:"id_kota_asal"`
	OriginCity    string    `json:"nm_kota_asal"`
	DestCityID    int64     `json:"id_kota_tujuan"`
	DestCity      string    `json:"nm_kota_tujuan"`
}

// MarshalJSON memastikan format tanggal diserialisasikan sebagai string YYYY-MM-DD.
func (s PublicSchedule) MarshalJSON() ([]byte, error) {
	type Alias PublicSchedule
	return json.Marshal(&struct {
		Alias
		DepartureDate string `json:"tgl_berangkat"`
	}{
		Alias:         Alias(s),
		DepartureDate: s.DepartureDate.Format("2006-01-02"),
	})
}

// UnmarshalJSON mendukung deserialisasi format tanggal YYYY-MM-DD maupun RFC3339.
func (s *PublicSchedule) UnmarshalJSON(data []byte) error {
	type Alias PublicSchedule
	aux := &struct {
		DepartureDate string `json:"tgl_berangkat"`
		*Alias
	}{
		Alias: (*Alias)(s),
	}
	if err := json.Unmarshal(data, &aux); err != nil {
		return err
	}
	if aux.DepartureDate != "" {
		t, err := time.Parse("2006-01-02", aux.DepartureDate)
		if err != nil {
			t, err = time.Parse(time.RFC3339, aux.DepartureDate)
			if err != nil {
				return err
			}
		}
		s.DepartureDate = t
	}
	return nil
}

// PublicScheduleFilter menyimpan parameter filter pencarian jadwal perjalanan.
type PublicScheduleFilter struct {
	OriginCityID      *int64     `json:"origin_city_id,omitempty"`
	DestinationCityID *int64     `json:"destination_city_id,omitempty"`
	DepartureDate     *time.Time `json:"departure_date,omitempty"`
	Limit             int        `json:"limit"`
	Offset            int        `json:"offset"`
}

// Normalize memastikan nilai pagination valid dan berada dalam batas operasional yang aman.
func (f *PublicScheduleFilter) Normalize() {
	if f.Limit <= 0 {
		f.Limit = DefaultLimit
	} else if f.Limit > MaxLimit {
		f.Limit = MaxLimit
	}

	if f.Offset < 0 {
		f.Offset = 0
	}
}

