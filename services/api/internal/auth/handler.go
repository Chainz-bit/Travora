package auth

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"time"

	"travora/api/internal/response"
)

const SessionCookieName = "travora_session"

// CookieConfig menyimpan konfigurasi keamanan cookie sesi HTTP.
type CookieConfig struct {
	Secure              bool
	Duration            time.Duration
	GoogleOAuthClientID string
}

// Handler menangani request HTTP untuk domain autentikasi pengguna.
type Handler struct {
	service      *Service
	cookieConfig CookieConfig
}

// NewHandler membuat instance Handler baru.
func NewHandler(service *Service, cookieConfig CookieConfig) *Handler {
	if cookieConfig.Duration <= 0 {
		cookieConfig.Duration = 24 * time.Hour
	}

	return &Handler{
		service:      service,
		cookieConfig: cookieConfig,
	}
}

// RegisterRoutes mendaftarkan seluruh endpoint autentikasi.
func (h *Handler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("POST /api/v1/auth/register", h.Register)
	mux.HandleFunc("POST /api/v1/auth/login", h.Login)
	mux.HandleFunc("POST /api/v1/auth/google-login", h.GoogleLogin)
	mux.HandleFunc("GET /api/v1/auth/me", h.Me)
	mux.HandleFunc("POST /api/v1/auth/logout", h.Logout)
}

// Register memproses pendaftaran akun member baru.
func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	var req RegisterRequest

	dec := json.NewDecoder(io.LimitReader(r.Body, 1048576))
	if err := dec.Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_INPUT", "payload request JSON tidak valid")
		return
	}

	user, err := h.service.RegisterMember(r.Context(), req)
	if err != nil {
		if errors.Is(err, ErrForbiddenRoleRegistration) {
			response.Error(w, http.StatusForbidden, "FORBIDDEN_ROLE", err.Error())
			return
		}
		if errors.Is(err, ErrUsernameExists) {
			response.Error(w, http.StatusConflict, "USERNAME_EXISTS", err.Error())
			return
		}
		if errors.Is(err, ErrInvalidInput) {
			response.Error(w, http.StatusBadRequest, "INVALID_INPUT", err.Error())
			return
		}

		response.Error(w, http.StatusBadRequest, "REGISTRATION_FAILED", err.Error())
		return
	}

	response.JSON(w, http.StatusCreated, user)
}

// Login memproses login biasa dan memasang cookie sesi HttpOnly.
func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest

	dec := json.NewDecoder(io.LimitReader(r.Body, 1048576))
	if err := dec.Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "INVALID_INPUT", "payload request JSON tidak valid")
		return
	}

	user, token, err := h.service.Login(r.Context(), req)
	if err != nil {
		if errors.Is(err, ErrInvalidInput) {
			response.Error(w, http.StatusBadRequest, "INVALID_INPUT", err.Error())
			return
		}
		if errors.Is(err, ErrInvalidCredentials) {
			response.Error(w, http.StatusUnauthorized, "INVALID_CREDENTIALS", "kredensial login tidak valid")
			return
		}

		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "terjadi kesalahan internal pada server")
		return
	}

	h.setSessionCookie(w, token)
	response.JSON(w, http.StatusOK, user)
}

// GoogleLogin memverifikasi Google ID Token dan membuat sesi member.
func (h *Handler) GoogleLogin(w http.ResponseWriter, r *http.Request) {
	var req struct {
		IDToken string `json:"id_token"`
	}

	dec := json.NewDecoder(io.LimitReader(r.Body, 1048576))
	if err := dec.Decode(&req); err != nil || req.IDToken == "" {
		response.Error(w, http.StatusBadRequest, "INVALID_INPUT", "Google ID Token wajib diisi")
		return
	}

	if h.cookieConfig.GoogleOAuthClientID == "" {
		response.Error(w, http.StatusServiceUnavailable, "GOOGLE_LOGIN_DISABLED", "Google Login belum dikonfigurasi")
		return
	}

	user, token, err := h.service.LoginWithGoogle(
		r.Context(),
		req.IDToken,
		h.cookieConfig.GoogleOAuthClientID,
	)
	if err != nil {
		if errors.Is(err, ErrInvalidCredentials) || errors.Is(err, ErrInvalidInput) {
			response.Error(w, http.StatusUnauthorized, "GOOGLE_LOGIN_FAILED", "verifikasi akun Google gagal")
			return
		}

		response.Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", "terjadi kesalahan saat login Google")
		return
	}

	h.setSessionCookie(w, token)
	response.JSON(w, http.StatusOK, user)
}

// setSessionCookie memasang cookie sesi HttpOnly.
func (h *Handler) setSessionCookie(w http.ResponseWriter, token string) {
	http.SetCookie(w, &http.Cookie{
		Name:     SessionCookieName,
		Value:    token,
		Path:     "/",
		HttpOnly: true,
		Secure:   h.cookieConfig.Secure,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   int(h.cookieConfig.Duration.Seconds()),
		Expires:  time.Now().Add(h.cookieConfig.Duration),
	})
}

// Me mengembalikan profil pengguna berdasarkan cookie sesi.
func (h *Handler) Me(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie(SessionCookieName)
	if err != nil || cookie.Value == "" {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "sesi tidak ditemukan atau belum login")
		return
	}

	user, err := h.service.ValidateSession(r.Context(), cookie.Value)
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "sesi tidak valid atau telah kedaluwarsa")
		return
	}

	response.JSON(w, http.StatusOK, user)
}

// Logout menghapus cookie sesi HttpOnly.
func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	http.SetCookie(w, &http.Cookie{
		Name:     SessionCookieName,
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		Secure:   h.cookieConfig.Secure,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   -1,
		Expires:  time.Unix(0, 0),
	})

	response.JSON(w, http.StatusOK, map[string]string{
		"message": "berhasil keluar dari sesi",
	})
}
