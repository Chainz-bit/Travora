package auth

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"
)

var (
	ErrMalformedToken = errors.New("format token sesi tidak valid")
	ErrInvalidSignature = errors.New("tanda tangan token sesi tidak cocok")
	ErrSessionExpired = errors.New("sesi telah kedaluwarsa")
)

// TokenManager menangani pembuatan dan verifikasi token sesi berbasis HMAC-SHA256.
type TokenManager struct {
	secret []byte
}

// NewTokenManager membuat instance TokenManager dengan secret key yang ditentukan.
func NewTokenManager(secret string) *TokenManager {
	return &TokenManager{secret: []byte(secret)}
}

// CreateToken membentuk string token terenkapsulasi dengan tanda tangan kriptografis HMAC.
func (m *TokenManager) CreateToken(claims SessionClaims) (string, error) {
	payloadBytes, err := json.Marshal(claims)
	if err != nil {
		return "", fmt.Errorf("gagal serialisasi claims: %w", err)
	}

	payloadEncoded := base64.RawURLEncoding.EncodeToString(payloadBytes)

	mac := hmac.New(sha256.New, m.secret)
	mac.Write([]byte(payloadEncoded))
	signature := mac.Sum(nil)
	sigEncoded := base64.RawURLEncoding.EncodeToString(signature)

	return payloadEncoded + "." + sigEncoded, nil
}

// ParseToken memvalidasi tanda tangan dan integritas payload token sesi.
func (m *TokenManager) ParseToken(tokenStr string) (*SessionClaims, error) {
	parts := strings.Split(tokenStr, ".")
	if len(parts) != 2 {
		return nil, ErrMalformedToken
	}

	payloadEncoded := parts[0]
	sigEncoded := parts[1]

	sigBytes, err := base64.RawURLEncoding.DecodeString(sigEncoded)
	if err != nil {
		return nil, ErrMalformedToken
	}

	mac := hmac.New(sha256.New, m.secret)
	mac.Write([]byte(payloadEncoded))
	expectedSig := mac.Sum(nil)

	if !hmac.Equal(sigBytes, expectedSig) {
		return nil, ErrInvalidSignature
	}

	payloadBytes, err := base64.RawURLEncoding.DecodeString(payloadEncoded)
	if err != nil {
		return nil, ErrMalformedToken
	}

	var claims SessionClaims
	if err := json.Unmarshal(payloadBytes, &claims); err != nil {
		return nil, ErrMalformedToken
	}

	if claims.ExpiresAt > 0 && time.Now().Unix() > claims.ExpiresAt {
		return nil, ErrSessionExpired
	}

	return &claims, nil
}

