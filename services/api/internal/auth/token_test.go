package auth

import (
	"testing"
	"time"
)

func TestTokenManager_Lifecycle(t *testing.T) {
	secret := "test-secret-key-32characters-long!"
	mgr := NewTokenManager(secret)

	now := time.Now()
	claims := SessionClaims{
		UserID:     101,
		Role:       RoleAdmin,
		Identifier: "admin@travora.id",
		Name:       "Test Admin",
		IssuedAt:   now.Unix(),
		ExpiresAt:  now.Add(1 * time.Hour).Unix(),
	}

	token, err := mgr.CreateToken(claims)
	if err != nil {
		t.Fatalf("CreateToken gagal: %v", err)
	}
	if token == "" {
		t.Fatal("token tidak boleh kosong")
	}

	// 1. Valid token verification
	parsed, err := mgr.ParseToken(token)
	if err != nil {
		t.Fatalf("ParseToken gagal: %v", err)
	}

	if parsed.UserID != claims.UserID || parsed.Role != claims.Role || parsed.Identifier != claims.Identifier {
		t.Errorf("Claims tidak cocok: %+v vs %+v", parsed, claims)
	}

	// 2. Tampered token verification
	tamperedToken := token + "tamper"
	_, err = mgr.ParseToken(tamperedToken)
	if err == nil {
		t.Error("Token yang diubah harus menghasilkan error signature")
	}

	// 3. Different secret verification
	otherMgr := NewTokenManager("different-secret-key-32characters!")
	_, err = otherMgr.ParseToken(token)
	if err == nil {
		t.Error("Token dengan secret berbeda harus ditolak")
	}

	// 4. Expired token verification
	expiredClaims := claims
	expiredClaims.ExpiresAt = now.Add(-10 * time.Minute).Unix()
	expiredToken, err := mgr.CreateToken(expiredClaims)
	if err != nil {
		t.Fatalf("CreateToken expired gagal: %v", err)
	}

	_, err = mgr.ParseToken(expiredToken)
	if err != ErrSessionExpired {
		t.Errorf("Diharapkan ErrSessionExpired, didapat: %v", err)
	}
}

