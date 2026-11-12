package masterdata

// OriginCity merepresentasikan entitas kota asal (tabel kota_asal).
type OriginCity struct {
	ID   int64  `json:"id_kota_asal"`
	Name string `json:"nm_kota_asal"`
}

// DestinationCity merepresentasikan entitas kota tujuan (tabel kota_tujuan).
type DestinationCity struct {
	ID   int64  `json:"id_kota_tujuan"`
	Name string `json:"nm_kota_tujuan"`
}

// Vehicle merepresentasikan armada kendaraan travel (tabel kendaraan).
// Catatan: Kolom is_active sengaja tidak disertakan karena tidak terdapat pada rancangan DDL tabel kendaraan.
type Vehicle struct {
	ID           int64  `json:"id_kendaraan"`
	VehicleType  string `json:"jenis_mobil"`
	PoliceNumber string `json:"nomor_polisi"`
	Color        string `json:"warna_mobil"`
}

