package bookings

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"travora/api/internal/auth"
)

type mockBookingsRepo struct {
	bookings      map[string]*BookingView
	confirmations map[string]*PaymentConfirmationView
	ticketsPaid   map[string]bool
	nextID        int64
}

func newMockBookingsRepo() *mockBookingsRepo {
	return &mockBookingsRepo{
		bookings:      make(map[string]*BookingView),
		confirmations: make(map[string]*PaymentConfirmationView),
		ticketsPaid:   make(map[string]bool),
		nextID:        1,
	}
}

func (m *mockBookingsRepo) EnsureSchema(ctx context.Context) error { return nil }

func (m *mockBookingsRepo) GetBookedSeats(ctx context.Context, scheduleID int64) ([]string, error) {
	seats := make([]string, 0)
	for _, b := range m.bookings {
		if b.ScheduleID == fmt.Sprintf("%d", scheduleID) && b.Status != "dibatalkan" {
			seats = append(seats, b.SeatNumber)
		}
	}
	return seats, nil
}

func (m *mockBookingsRepo) CreateBooking(ctx context.Context, memberID int64, scheduleID int64, seatNumber string) (*BookingView, error) {
	for _, b := range m.bookings {
		if b.ScheduleID == fmt.Sprintf("%d", scheduleID) && b.SeatNumber == seatNumber && b.Status != "dibatalkan" {
			return nil, ErrSeatAlreadyBooked
		}
	}
	id := m.nextID
	m.nextID++
	code := fmt.Sprintf("TRV-20261127-%04d", id)
	b := &BookingView{
		ID:         code,
		DBID:       id,
		ScheduleID: fmt.Sprintf("%d", scheduleID),
		MemberID:   fmt.Sprintf("%d", memberID),
		SeatNumber: seatNumber,
		TotalPrice: 150000,
		Status:     "menunggu_pembayaran",
	}
	m.bookings[code] = b
	m.ticketsPaid[code] = false
	return b, nil
}

func (m *mockBookingsRepo) ListMemberBookings(ctx context.Context, memberID int64) ([]BookingView, error) {
	res := make([]BookingView, 0)
	target := fmt.Sprintf("%d", memberID)
	for _, b := range m.bookings {
		if b.MemberID == target {
			res = append(res, *b)
		}
	}
	return res, nil
}

func (m *mockBookingsRepo) SubmitPaymentConfirmation(ctx context.Context, memberID int64, orderCode string, req SubmitPaymentRequest) (*PaymentConfirmationView, error) {
	b, ok := m.bookings[orderCode]
	if !ok || b.MemberID != fmt.Sprintf("%d", memberID) {
		return nil, ErrBookingNotFound
	}
	if b.Status != "menunggu_pembayaran" && b.Status != "menunggu_verifikasi" {
		return nil, ErrInvalidBookingStatus
	}
	resi := fmt.Sprintf("KNF-%06d", b.DBID)
	b.Status = "menunggu_verifikasi"
	b.PaymentConfirmationID = resi
	c := &PaymentConfirmationView{
		ID:             resi,
		BookingID:      orderCode,
		BankName:       req.BankName,
		AccountHolder:  req.AccountHolder,
		AccountNumber:  req.AccountNumber,
		TransferAmount: req.TransferAmount,
		TransferDate:   req.TransferDate,
		Status:         "menunggu_verifikasi",
	}
	m.confirmations[resi] = c
	return c, nil
}

func (m *mockBookingsRepo) ListOperatorConfirmations(ctx context.Context) ([]PaymentConfirmationView, error) {
	res := make([]PaymentConfirmationView, 0, len(m.confirmations))
	for _, c := range m.confirmations {
		res = append(res, *c)
	}
	return res, nil
}

func (m *mockBookingsRepo) VerifyConfirmation(ctx context.Context, noResi string, operatorID *int64, approved bool) (*PaymentConfirmationView, error) {
	c, ok := m.confirmations[noResi]
	if !ok {
		return nil, ErrConfirmationNotFound
	}
	if approved {
		c.Status = "terverifikasi"
		m.bookings[c.BookingID].Status = "terkonfirmasi"
		m.ticketsPaid[c.BookingID] = true
	} else {
		c.Status = "ditolak"
		m.bookings[c.BookingID].Status = "menunggu_pembayaran"
		m.ticketsPaid[c.BookingID] = false
	}
	return c, nil
}

func (m *mockBookingsRepo) ListOperatorBookings(ctx context.Context) ([]BookingView, error) {
	res := make([]BookingView, 0, len(m.bookings))
	for _, b := range m.bookings {
		res = append(res, *b)
	}
	return res, nil
}

func (m *mockBookingsRepo) ValidateDeparture(ctx context.Context, orderCode string, operatorID *int64) (*BookingView, error) {
	b, ok := m.bookings[orderCode]
	if !ok {
		return nil, ErrBookingNotFound
	}
	if b.Status != "terkonfirmasi" {
		return nil, ErrBookingNotConfirmed
	}
	b.Status = "selesai"
	return b, nil
}

func (m *mockBookingsRepo) CancelBooking(ctx context.Context, memberID int64, orderCode string) (*BookingView, error) {
	b, ok := m.bookings[orderCode]
	if !ok || b.MemberID != fmt.Sprintf("%d", memberID) {
		return nil, ErrBookingNotFound
	}
	if b.Status != "menunggu_pembayaran" {
		return nil, ErrBookingCannotCancel
	}
	b.Status = "dibatalkan"
	return b, nil
}

type mockSessionValidator struct{}

func (m *mockSessionValidator) ValidateSession(ctx context.Context, token string) (*auth.User, error) {
	switch token {
	case "member-1-token":
		return &auth.User{ID: 1, Role: auth.RoleMember, Name: "Budi Santoso"}, nil
	case "operator-token":
		return &auth.User{ID: 1, Role: auth.RoleOperator, Name: "Ahmad Loket"}, nil
	default:
		return nil, auth.ErrUnauthorized
	}
}

func TestBookings_EndToEndFlow(t *testing.T) {
	repo := newMockBookingsRepo()
	svc := NewService(repo)
	h := NewHandler(svc, &mockSessionValidator{})
	mux := http.NewServeMux()
	h.RegisterRoutes(mux)

	// 1. Member membuat pesanan
	createBody, _ := json.Marshal(CreateBookingRequest{ScheduleID: 1, SeatNumber: "03"})
	reqCreate := httptest.NewRequest(http.MethodPost, "/api/v1/bookings", bytes.NewReader(createBody))
	reqCreate.Header.Set("Authorization", "Bearer member-1-token")
	resCreate := httptest.NewRecorder()
	mux.ServeHTTP(resCreate, reqCreate)
	if resCreate.Code != http.StatusCreated {
		t.Fatalf("create booking expected 201, got %d (%s)", resCreate.Code, resCreate.Body.String())
	}

	var createEnvelope struct {
		Data BookingView `json:"data"`
	}
	_ = json.Unmarshal(resCreate.Body.Bytes(), &createEnvelope)
	orderCode := createEnvelope.Data.ID

	// 2. Kursi sama ditolak 409
	reqDup := httptest.NewRequest(http.MethodPost, "/api/v1/bookings", bytes.NewReader(createBody))
	reqDup.Header.Set("Authorization", "Bearer member-1-token")
	resDup := httptest.NewRecorder()
	mux.ServeHTTP(resDup, reqDup)
	if resDup.Code != http.StatusConflict {
		t.Fatalf("duplicate seat expected 409, got %d", resDup.Code)
	}

	// 3. Member kirim konfirmasi pembayaran
	confBody, _ := json.Marshal(SubmitPaymentRequest{
		BankName:       "BCA",
		AccountHolder:  "Budi Santoso",
		AccountNumber:  "8271092811",
		TransferAmount: 150000,
		TransferDate:   "2026-11-27",
	})
	reqConf := httptest.NewRequest(http.MethodPost, "/api/v1/bookings/"+orderCode+"/confirm-payment", bytes.NewReader(confBody))
	reqConf.Header.Set("Authorization", "Bearer member-1-token")
	resConf := httptest.NewRecorder()
	mux.ServeHTTP(resConf, reqConf)
	if resConf.Code != http.StatusCreated {
		t.Fatalf("confirm payment expected 201, got %d (%s)", resConf.Code, resConf.Body.String())
	}

	var confEnv struct {
		Data PaymentConfirmationView `json:"data"`
	}
	_ = json.Unmarshal(resConf.Body.Bytes(), &confEnv)
	noResi := confEnv.Data.ID

	// 4. Operator menyetujui pembayaran -> status booking menjadi terkonfirmasi & tiket menjadi paid
	verifyBody, _ := json.Marshal(VerifyConfirmationRequest{Approved: true})
	reqVerify := httptest.NewRequest(http.MethodPost, "/api/v1/operator/confirmations/"+noResi+"/verify", bytes.NewReader(verifyBody))
	reqVerify.Header.Set("Authorization", "Bearer operator-token")
	resVerify := httptest.NewRecorder()
	mux.ServeHTTP(resVerify, reqVerify)
	if resVerify.Code != http.StatusOK {
		t.Fatalf("verify expected 200, got %d (%s)", resVerify.Code, resVerify.Body.String())
	}

	if !repo.ticketsPaid[orderCode] {
		t.Fatalf("expected ticket %s to be marked paid after operator verification", orderCode)
	}
	if repo.bookings[orderCode].Status != "terkonfirmasi" {
		t.Fatalf("expected booking status terkonfirmasi, got %s", repo.bookings[orderCode].Status)
	}

	// 5. Konfirmasi ulang pada pesanan yang sudah terkonfirmasi ditolak 409
	reqReconf := httptest.NewRequest(http.MethodPost, "/api/v1/bookings/"+orderCode+"/confirm-payment", bytes.NewReader(confBody))
	reqReconf.Header.Set("Authorization", "Bearer member-1-token")
	resReconf := httptest.NewRecorder()
	mux.ServeHTTP(resReconf, reqReconf)
	if resReconf.Code != http.StatusConflict {
		t.Fatalf("reconfirm on paid booking expected 409, got %d (%s)", resReconf.Code, resReconf.Body.String())
	}

	// 6. Pesanan baru berstatus menunggu_pembayaran dapat dibatalkan dan membebaskan kursi
	createBody2, _ := json.Marshal(CreateBookingRequest{ScheduleID: 1, SeatNumber: "04"})
	reqCreate2 := httptest.NewRequest(http.MethodPost, "/api/v1/bookings", bytes.NewReader(createBody2))
	reqCreate2.Header.Set("Authorization", "Bearer member-1-token")
	resCreate2 := httptest.NewRecorder()
	mux.ServeHTTP(resCreate2, reqCreate2)
	if resCreate2.Code != http.StatusCreated {
		t.Fatalf("create booking 2 expected 201, got %d", resCreate2.Code)
	}
	var createEnv2 struct {
		Data BookingView `json:"data"`
	}
	_ = json.Unmarshal(resCreate2.Body.Bytes(), &createEnv2)

	reqCancel := httptest.NewRequest(http.MethodPost, "/api/v1/bookings/"+createEnv2.Data.ID+"/cancel", nil)
	reqCancel.Header.Set("Authorization", "Bearer member-1-token")
	resCancel := httptest.NewRecorder()
	mux.ServeHTTP(resCancel, reqCancel)
	if resCancel.Code != http.StatusOK {
		t.Fatalf("cancel booking expected 200, got %d (%s)", resCancel.Code, resCancel.Body.String())
	}
	if repo.bookings[createEnv2.Data.ID].Status != "dibatalkan" {
		t.Fatalf("expected dibatalkan, got %s", repo.bookings[createEnv2.Data.ID].Status)
	}
}
