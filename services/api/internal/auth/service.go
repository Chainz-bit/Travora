package auth

import (
	"context"
	"errors"
	"fmt"
	"log"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
)

// Service menangani business logic autentikasi multi-role Travora.
type Service struct {
	repo            Repository
	tokenManager    *TokenManager
	sessionDuration time.Duration
}

// NewService membuat instance Service autentikasi.
func NewService(repo Repository, tokenManager *TokenManager, sessionDuration time.Duration) *Service {
	if sessionDuration <= 0 {
		sessionDuration = 24 * time.Hour
	}
	return &Service{
		repo:            repo,
		tokenManager:    tokenManager,
		sessionDuration: sessionDuration,
	}
}

// Login memverifikasi kredensial pengguna terhadap PostgreSQL dan menghasilkan token sesi.
func (s *Service) Login(ctx context.Context, req LoginRequest) (*User, string, error) {
	identifier := strings.TrimSpace(req.Identifier)
	if identifier == "" {
		if req.Email != "" {
			identifier = strings.TrimSpace(req.Email)
		} else if req.Username != "" {
			identifier = strings.TrimSpace(req.Username)
		}
	}
	role := strings.ToLower(strings.TrimSpace(req.Role))
	password := req.Password

	if role == "" || identifier == "" || password == "" {
		return nil, "", ErrInvalidInput
	}

	if role == "operator_loket" {
		role = RoleOperator
	}

	var authenticatedUser *User

	switch role {
	case RoleAdmin:
		admin, err := s.repo.FindAdminByEmail(ctx, identifier)
		if err != nil {
			if errors.Is(err, ErrUserNotFound) {
				log.Printf("[AUTH] Login failed: Admin with email %q not found in database", identifier)
				return nil, "", ErrInvalidCredentials
			}
			log.Printf("[AUTH] Database error querying Admin %q: %v", identifier, err)
			return nil, "", fmt.Errorf("auth.Service.Login admin: %w", err)
		}

		if err := bcrypt.CompareHashAndPassword([]byte(admin.PasswordHash), []byte(password)); err != nil {
			if errors.Is(err, bcrypt.ErrMismatchedHashAndPassword) {
				log.Printf("[AUTH] Login failed: incorrect password for Admin %q", identifier)
			} else {
				log.Printf("[AUTH] Login error: invalid password_hash in database for Admin %q: %v (hash length: %d)",
					identifier, err, len(admin.PasswordHash))
			}
			return nil, "", ErrInvalidCredentials
		}

		authenticatedUser = &User{
			ID:         admin.ID,
			Role:       RoleAdmin,
			Identifier: admin.Email,
			Name:       admin.NamaLengkap,
			Email:      admin.Email,
			Phone:      admin.NoTelp,
		}

	case RoleMember:
		member, err := s.repo.FindMemberByUsername(ctx, identifier)
		if err != nil {
			if errors.Is(err, ErrUserNotFound) {
				log.Printf("[AUTH] Login failed: Member with username %q not found in database", identifier)
				return nil, "", ErrInvalidCredentials
			}
			log.Printf("[AUTH] Database error querying Member %q: %v", identifier, err)
			return nil, "", fmt.Errorf("auth.Service.Login member: %w", err)
		}

		if err := bcrypt.CompareHashAndPassword([]byte(member.PasswordHash), []byte(password)); err != nil {
			if errors.Is(err, bcrypt.ErrMismatchedHashAndPassword) {
				log.Printf("[AUTH] Login failed: incorrect password for Member %q", identifier)
			} else {
				log.Printf("[AUTH] Login error: invalid password_hash in database for Member %q: %v (hash length: %d)",
					identifier, err, len(member.PasswordHash))
			}
			return nil, "", ErrInvalidCredentials
		}

		authenticatedUser = &User{
			ID:         member.ID,
			Role:       RoleMember,
			Identifier: member.Username,
			Name:       member.Nama,
			Username:   member.Username,
			Phone:      member.Telepon,
		}

	case RoleOperator:
		op, err := s.repo.FindOperatorByUsername(ctx, identifier)
		if err != nil {
			if errors.Is(err, ErrUserNotFound) {
				log.Printf("[AUTH] Login failed: Operator with username %q not found in database", identifier)
				return nil, "", ErrInvalidCredentials
			}
			log.Printf("[AUTH] Database error querying Operator %q: %v", identifier, err)
			return nil, "", fmt.Errorf("auth.Service.Login operator: %w", err)
		}

		if err := bcrypt.CompareHashAndPassword([]byte(op.PasswordHash), []byte(password)); err != nil {
			if errors.Is(err, bcrypt.ErrMismatchedHashAndPassword) {
				log.Printf("[AUTH] Login failed: incorrect password for Operator %q", identifier)
			} else {
				log.Printf("[AUTH] Login error: invalid password_hash in database for Operator %q: %v (hash length: %d)",
					identifier, err, len(op.PasswordHash))
			}
			return nil, "", ErrInvalidCredentials
		}

		authenticatedUser = &User{
			ID:         op.ID,
			Role:       RoleOperator,
			Identifier: op.Username,
			Name:       op.Nama,
			Username:   op.Username,
		}

	default:
		log.Printf("[AUTH] Login rejected: unrecognized role %q", role)
		return nil, "", ErrInvalidInput
	}

	// Buat token sesi aman bertanda tangan kriptografis
	now := time.Now()
	claims := SessionClaims{
		UserID:     authenticatedUser.ID,
		Role:       authenticatedUser.Role,
		Identifier: authenticatedUser.Identifier,
		Name:       authenticatedUser.Name,
		IssuedAt:   now.Unix(),
		ExpiresAt:  now.Add(s.sessionDuration).Unix(),
	}

	token, err := s.tokenManager.CreateToken(claims)
	if err != nil {
		return nil, "", fmt.Errorf("gagal membuat token sesi: %w", err)
	}

	return authenticatedUser, token, nil
}

// ValidateSession memverifikasi token sesi dan memvalidasi keberadaan pengguna di database.
func (s *Service) ValidateSession(ctx context.Context, tokenString string) (*User, error) {
	if strings.TrimSpace(tokenString) == "" {
		return nil, ErrUnauthorized
	}

	claims, err := s.tokenManager.ParseToken(tokenString)
	if err != nil {
		return nil, ErrUnauthorized
	}

	switch claims.Role {
	case RoleAdmin:
		admin, err := s.repo.FindAdminByID(ctx, claims.UserID)
		if err != nil {
			return nil, ErrUnauthorized
		}
		return &User{
			ID:         admin.ID,
			Role:       RoleAdmin,
			Identifier: admin.Email,
			Name:       admin.NamaLengkap,
			Email:      admin.Email,
			Phone:      admin.NoTelp,
		}, nil

	case RoleMember:
		member, err := s.repo.FindMemberByID(ctx, claims.UserID)
		if err != nil {
			return nil, ErrUnauthorized
		}
		return &User{
			ID:         member.ID,
			Role:       RoleMember,
			Identifier: member.Username,
			Name:       member.Nama,
			Username:   member.Username,
			Phone:      member.Telepon,
		}, nil

	case RoleOperator:
		op, err := s.repo.FindOperatorByID(ctx, claims.UserID)
		if err != nil {
			return nil, ErrUnauthorized
		}
		return &User{
			ID:         op.ID,
			Role:       RoleOperator,
			Identifier: op.Username,
			Name:       op.Nama,
			Username:   op.Username,
		}, nil

	default:
		return nil, ErrUnauthorized
	}
}

// SetPassword memperbarui kata sandi akun dengan hashing bcrypt standar (digunakan oleh utilitas setup lokal).
func (s *Service) SetPassword(ctx context.Context, role, identifier, newPassword string) error {
	role = strings.ToLower(strings.TrimSpace(role))
	identifier = strings.TrimSpace(identifier)

	if len(newPassword) < 6 {
		return errors.New("kata sandi baru minimal 6 karakter")
	}

	hashedBytes, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("gagal menghasilkan hash password: %w", err)
	}
	newHash := string(hashedBytes)

	if role == "operator_loket" {
		role = RoleOperator
	}

	switch role {
	case RoleAdmin:
		admin, err := s.repo.FindAdminByEmail(ctx, identifier)
		if err != nil {
			return fmt.Errorf("admin %s tidak ditemukan: %w", identifier, err)
		}
		return s.repo.UpdateAdminPassword(ctx, admin.ID, newHash)

	case RoleMember:
		member, err := s.repo.FindMemberByUsername(ctx, identifier)
		if err != nil {
			return fmt.Errorf("member %s tidak ditemukan: %w", identifier, err)
		}
		return s.repo.UpdateMemberPassword(ctx, member.ID, newHash)

	case RoleOperator:
		op, err := s.repo.FindOperatorByUsername(ctx, identifier)
		if err != nil {
			return fmt.Errorf("operator %s tidak ditemukan: %w", identifier, err)
		}
		return s.repo.UpdateOperatorPassword(ctx, op.ID, newHash)

	default:
		return ErrInvalidInput
	}
}

// RegisterMember mendaftarkan pengguna baru sebagai Member di sistem Travora.
func (s *Service) RegisterMember(ctx context.Context, req RegisterRequest) (*User, error) {
	name := strings.TrimSpace(req.Name)
	phone := strings.TrimSpace(req.Phone)
	password := req.Password

	username := strings.TrimSpace(req.Username)
	if username == "" && req.Email != "" {
		username = strings.TrimSpace(req.Email)
	}

	if name == "" || username == "" || phone == "" || password == "" {
		return nil, ErrInvalidInput
	}
	if len(password) < 6 {
		return nil, errors.New("kata sandi minimal 6 karakter")
	}

	// Jika akun sudah ada, perbarui kata sandi agar pengguna dapat segera login dengan kata sandi barunya
	existing, err := s.repo.FindMemberByUsername(ctx, username)
	if err == nil && existing != nil {
		hashedBytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
		if err != nil {
			return nil, fmt.Errorf("gagal menghasilkan hash password: %w", err)
		}
		if updateErr := s.repo.UpdateMemberPassword(ctx, existing.ID, string(hashedBytes)); updateErr != nil {
			return nil, fmt.Errorf("gagal memperbarui akun member: %w", updateErr)
		}
		return &User{
			ID:         existing.ID,
			Role:       RoleMember,
			Identifier: existing.Username,
			Name:       name,
			Username:   existing.Username,
			Phone:      phone,
		}, nil
	}

	hashedBytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("gagal menghasilkan hash password: %w", err)
	}

	address := strings.TrimSpace(req.Address)
	if address == "" {
		address = "Indonesia"
	}

	gender := strings.ToUpper(strings.TrimSpace(req.Gender))
	if gender != "L" && gender != "P" {
		gender = "L"
	}

	record := &MemberRecord{
		Nama:         name,
		Alamat:       address,
		Telepon:      phone,
		JenKelamin:   gender,
		Username:     username,
		PasswordHash: string(hashedBytes),
	}

	created, err := s.repo.CreateMember(ctx, record)
	if err != nil {
		return nil, fmt.Errorf("gagal mendaftarkan member: %w", err)
	}

	return &User{
		ID:         created.ID,
		Role:       RoleMember,
		Identifier: created.Username,
		Name:       created.Nama,
		Username:   created.Username,
		Phone:      created.Telepon,
	}, nil
}

