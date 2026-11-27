package bookings

import "errors"

var (
	ErrInvalidInput         = errors.New("input pemesanan tidak valid")
	ErrScheduleNotFound     = errors.New("jadwal perjalanan tidak ditemukan atau tidak aktif")
	ErrSeatAlreadyBooked    = errors.New("nomor kursi sudah dipesan penumpang lain")
	ErrBookingNotFound      = errors.New("pesanan tidak ditemukan")
	ErrConfirmationNotFound = errors.New("data konfirmasi transfer tidak ditemukan")
	ErrBookingNotConfirmed  = errors.New("pesanan belum berstatus terkonfirmasi lunas")
	ErrInvalidBookingStatus = errors.New("status pesanan tidak mengizinkan konfirmasi pembayaran ulang")
	ErrInvalidSeatNumber    = errors.New("nomor kursi melebihi kapasitas kendaraan atau tidak valid")
	ErrBookingCannotCancel  = errors.New("hanya pesanan berstatus menunggu pembayaran yang dapat dibatalkan")
)

type ScheduleView struct {
	ID              string `json:"id"`
	OriginCityID    string `json:"originCityId"`
	OriginCityName  string `json:"originCityName"`
	DestCityID      string `json:"destinationCityId"`
	DestCityName    string `json:"destinationCityName"`
	DepartureDate   string `json:"departureDate"`
	DepartureTime   string `json:"departureTime"`
	VehicleName     string `json:"vehicleName"`
	VehiclePlate    string `json:"vehiclePlate"`
	Price           int64  `json:"price"`
	AvailableSeats  int    `json:"availableSeats"`
}

type BookingView struct {
	ID                    string       `json:"id"`
	DBID                  int64        `json:"dbId"`
	ScheduleID            string       `json:"scheduleId"`
	Schedule              ScheduleView `json:"schedule"`
	MemberID              string       `json:"memberId"`
	MemberName            string       `json:"memberName"`
	MemberPhone           string       `json:"memberPhone"`
	SeatNumber            string       `json:"seatNumber"`
	TotalPrice            int64        `json:"totalPrice"`
	BookingDate           string       `json:"bookingDate"`
	Status                string       `json:"status"`
	PaymentConfirmationID string       `json:"paymentConfirmationId,omitempty"`
}

type PaymentConfirmationView struct {
	ID             string `json:"id"`
	BookingID      string `json:"bookingId"`
	BankName       string `json:"bankName"`
	AccountHolder  string `json:"accountHolder"`
	AccountNumber  string `json:"accountNumber"`
	TransferAmount int64  `json:"transferAmount"`
	TransferDate   string `json:"transferDate"`
	Status         string `json:"status"`
	SubmittedAt    string `json:"submittedAt"`
}

type CreateBookingRequest struct {
	ScheduleID int64  `json:"schedule_id"`
	SeatNumber string `json:"seat_number"`
}

type SubmitPaymentRequest struct {
	BankName       string `json:"bank_name"`
	AccountHolder  string `json:"account_holder"`
	AccountNumber  string `json:"account_number"`
	TransferAmount int64  `json:"transfer_amount"`
	TransferDate   string `json:"transfer_date"`
}

type VerifyConfirmationRequest struct {
	Approved bool `json:"approved"`
}
