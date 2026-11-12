package response

import (
	"encoding/json"
	"net/http"
)

// SuccessEnvelope merepresentasikan struktur respons sukses standar API Travora.
type SuccessEnvelope struct {
	Success bool `json:"success"`
	Data    any  `json:"data"`
}

// PaginatedEnvelope merepresentasikan respons sukses dengan metadata pagination.
type PaginatedEnvelope struct {
	Success bool `json:"success"`
	Data    any  `json:"data"`
	Meta    Meta `json:"meta"`
}

// Meta menyimpan informasi pagination pencarian.
type Meta struct {
	Limit  int `json:"limit"`
	Offset int `json:"offset"`
	Count  int `json:"count"`
}

// ErrorDetail menyimpan kode dan pesan deskriptif error.
type ErrorDetail struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

// ErrorEnvelope merepresentasikan struktur respons error standar API Travora.
type ErrorEnvelope struct {
	Success bool        `json:"success"`
	Error   ErrorDetail `json:"error"`
}

// JSON menulis respons sukses berformat JSON dengan status code tertentu.
func JSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(SuccessEnvelope{
		Success: true,
		Data:    data,
	})
}

// Paginated menulis respons sukses berformat JSON dengan metadata pagination.
func Paginated(w http.ResponseWriter, status int, data any, limit, offset, count int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(PaginatedEnvelope{
		Success: true,
		Data:    data,
		Meta: Meta{
			Limit:  limit,
			Offset: offset,
			Count:  count,
		},
	})
}

// Error menulis respons error berformat JSON dengan kode status dan pesan aman.
func Error(w http.ResponseWriter, status int, code, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(ErrorEnvelope{
		Success: false,
		Error: ErrorDetail{
			Code:    code,
			Message: message,
		},
	})
}

