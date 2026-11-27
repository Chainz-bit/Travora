package adminoperators

import "errors"

var (
	ErrInvalidInput      = errors.New("nama, email, dan kata sandi (minimal 6 karakter) wajib diisi")
	ErrDuplicateOperator = errors.New("email atau username operator sudah terdaftar")
	ErrOperatorNotFound  = errors.New("akun operator tidak ditemukan")
	ErrOperatorInUse     = errors.New("akun operator tidak dapat dihapus karena masih memiliki riwayat transaksi terkait")
)

// OperatorSummary merepresentasikan data publik akun operator yang aman (tanpa password_hash).
type OperatorSummary struct {
	ID       int64  `json:"id"`
	Name     string `json:"name"`
	Email    string `json:"email"`
	Username string `json:"username"`
	Role     string `json:"role"`
}

// CreateOperatorRequest merepresentasikan payload POST /api/admin/operators.
type CreateOperatorRequest struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Username string `json:"username,omitempty"`
	Password string `json:"password"`
}
