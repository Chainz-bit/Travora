package auth

import "errors"

// Role constants
const (
	RoleAdmin    = "admin"
	RoleMember   = "member"
	RoleOperator = "operator"
)

var (
	ErrInvalidInput       = errors.New("role, identifier, dan kata sandi wajib diisi")
	ErrInvalidCredentials = errors.New("kredensial login tidak valid")
	ErrUnauthorized       = errors.New("sesi tidak valid atau telah kedaluwarsa")
	ErrUserNotFound       = errors.New("pengguna tidak ditemukan")
)

// User merepresentasikan profil pengguna terautentikasi (aman tanpa password hash).
type User struct {
	ID         int64  `json:"id"`
	Role       string `json:"role"`
	Identifier string `json:"identifier"`
	Name       string `json:"name"`
	Email      string `json:"email,omitempty"`
	Username   string `json:"username,omitempty"`
	Phone      string `json:"phone,omitempty"`
}

// LoginRequest merepresentasikan payload request POST /api/v1/auth/login.
type LoginRequest struct {
	Role       string `json:"role"`
	Identifier string `json:"identifier"`
	Email      string `json:"email,omitempty"`
	Username   string `json:"username,omitempty"`
	Password   string `json:"password"`
}

// RegisterRequest merepresentasikan payload request POST /api/v1/auth/register.
type RegisterRequest struct {
	Name     string `json:"name"`
	Username string `json:"username,omitempty"`
	Email    string `json:"email,omitempty"`
	Phone    string `json:"phone"`
	Password string `json:"password"`
	Address  string `json:"address,omitempty"`
	Gender   string `json:"gender,omitempty"`
}

// SessionClaims menyimpan data sesi terenkripsi/tertanda tangan HMAC.
type SessionClaims struct {
	UserID     int64  `json:"uid"`
	Role       string `json:"rol"`
	Identifier string `json:"idn"`
	Name       string `json:"nam"`
	IssuedAt   int64  `json:"iat"`
	ExpiresAt  int64  `json:"exp"`
}

// Record internal database (memuat password_hash untuk verifikasi bcrypt)
type AdminRecord struct {
	ID           int64
	Email        string
	PasswordHash string
	NamaLengkap  string
	NoTelp       string
}

type MemberRecord struct {
	ID           int64
	Nama         string
	Alamat       string
	Telepon      string
	JenKelamin   string
	Username     string
	PasswordHash string
}

type OperatorRecord struct {
	ID           int64
	Username     string
	PasswordHash string
	Nama         string
}

