package adminmaster

import "errors"

var (
	ErrInvalidInput    = errors.New("input data master tidak valid")
	ErrNotFound        = errors.New("data tidak ditemukan")
	ErrDuplicateData   = errors.New("data sudah terdaftar (duplikat)")
	ErrInUse           = errors.New("data masih digunakan pada jadwal atau transaksi aktif")
	ErrInvalidRoute    = errors.New("kota asal dan kota tujuan tidak boleh sama")
	ErrInvalidDateTime = errors.New("format tanggal atau jam keberangkatan tidak valid")
)

type CityView struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Code string `json:"code"`
}

type VehicleView struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	PlateNumber string `json:"plateNumber"`
	Color       string `json:"color"`
	Status      string `json:"status"`
}

type ScheduleView struct {
	ID                  string `json:"id"`
	OriginCityID        string `json:"originCityId"`
	OriginCityName      string `json:"originCityName"`
	DestinationCityID   string `json:"destinationCityId"`
	DestinationCityName string `json:"destinationCityName"`
	VehicleID           string `json:"vehicleId"`
	VehicleName         string `json:"vehicleName"`
	VehiclePlate        string `json:"vehiclePlate"`
	DepartureDate       string `json:"departureDate"`
	DepartureTime       string `json:"departureTime"`
	Price               int64  `json:"price"`
	IsActive            bool   `json:"isActive"`
}

type CityRequest struct {
	Name string `json:"name"`
}

type VehicleRequest struct {
	Name        string `json:"name"`
	PlateNumber string `json:"plateNumber"`
	Color       string `json:"color"`
}

type ScheduleRequest struct {
	OriginCityID      int64  `json:"originCityId"`
	DestinationCityID int64  `json:"destinationCityId"`
	VehicleID         int64  `json:"vehicleId"`
	DepartureDate     string `json:"departureDate"`
	DepartureTime     string `json:"departureTime"`
	Price             int64  `json:"price"`
	IsActive          bool   `json:"isActive"`
}

type DeleteScheduleResult struct {
	Deactivated bool   `json:"deactivated"`
	Message     string `json:"message"`
}
