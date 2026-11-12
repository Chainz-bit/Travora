package auth

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"golang.org/x/crypto/bcrypt"
)

// mockRepository implements Repository in-memory for testing.
type mockRepository struct {
	admins    map[string]*AdminRecord
	members   map[string]*MemberRecord
	operators map[string]*OperatorRecord
}

func newMockRepository() *mockRepository {
	return &mockRepository{
		admins:    make(map[string]*AdminRecord),
		members:   make(map[string]*MemberRecord),
		operators: make(map[string]*OperatorRecord),
	}
}

func (m *mockRepository) FindAdminByEmail(ctx context.Context, email string) (*AdminRecord, error) {
	if a, ok := m.admins[email]; ok {
		return a, nil
	}
	return nil, ErrUserNotFound
}

func (m *mockRepository) FindMemberByUsername(ctx context.Context, username string) (*MemberRecord, error) {
	if mem, ok := m.members[username]; ok {
		return mem, nil
	}
	return nil, ErrUserNotFound
}

func (m *mockRepository) FindOperatorByUsername(ctx context.Context, username string) (*OperatorRecord, error) {
	if o, ok := m.operators[username]; ok {
		return o, nil
	}
	return nil, ErrUserNotFound
}

func (m *mockRepository) FindAdminByID(ctx context.Context, id int64) (*AdminRecord, error) {
	for _, a := range m.admins {
		if a.ID == id {
			return a, nil
		}
	}
	return nil, ErrUserNotFound
}

func (m *mockRepository) FindMemberByID(ctx context.Context, id int64) (*MemberRecord, error) {
	for _, mem := range m.members {
		if mem.ID == id {
			return mem, nil
		}
	}
	return nil, ErrUserNotFound
}

func (m *mockRepository) FindOperatorByID(ctx context.Context, id int64) (*OperatorRecord, error) {
	for _, o := range m.operators {
		if o.ID == id {
			return o, nil
		}
	}
	return nil, ErrUserNotFound
}

func (m *mockRepository) UpdateAdminPassword(ctx context.Context, id int64, passwordHash string) error {
	for _, a := range m.admins {
		if a.ID == id {
			a.PasswordHash = passwordHash
			return nil
		}
	}
	return ErrUserNotFound
}

func (m *mockRepository) UpdateMemberPassword(ctx context.Context, id int64, passwordHash string) error {
	for _, mem := range m.members {
		if mem.ID == id {
			mem.PasswordHash = passwordHash
			return nil
		}
	}
	return ErrUserNotFound
}

func (m *mockRepository) UpdateOperatorPassword(ctx context.Context, id int64, passwordHash string) error {
	for _, o := range m.operators {
		if o.ID == id {
			o.PasswordHash = passwordHash
			return nil
		}
	}
	return ErrUserNotFound
}

func (m *mockRepository) CreateMember(ctx context.Context, member *MemberRecord) (*MemberRecord, error) {
	member.ID = int64(len(m.members) + 100)
	m.members[member.Username] = member
	return member, nil
}

func setupTestAuth(t *testing.T) (*Handler, *mockRepository) {
	repo := newMockRepository()

	// Seed test accounts with valid bcrypt hashes
	adminHash, _ := bcrypt.GenerateFromPassword([]byte("adminpass123"), bcrypt.MinCost)
	repo.admins["admin@travora.id"] = &AdminRecord{
		ID:           1,
		Email:        "admin@travora.id",
		PasswordHash: string(adminHash),
		NamaLengkap:  "Admin Travora",
		NoTelp:       "081200000001",
	}

	memberHash, _ := bcrypt.GenerateFromPassword([]byte("memberpass123"), bcrypt.MinCost)
	repo.members["budi_santoso"] = &MemberRecord{
		ID:           2,
		Nama:         "Budi Santoso",
		Alamat:       "Bandung",
		Telepon:      "081200000002",
		JenKelamin:   "L",
		Username:     "budi_santoso",
		PasswordHash: string(memberHash),
	}

	operatorHash, _ := bcrypt.GenerateFromPassword([]byte("operatorpass123"), bcrypt.MinCost)
	repo.operators["operator_bandung"] = &OperatorRecord{
		ID:           3,
		Username:     "operator_bandung",
		PasswordHash: string(operatorHash),
		Nama:         "Ahmad Operator",
	}

	tokenManager := NewTokenManager("test-secret-32-chars-long-secure!!")
	service := NewService(repo, tokenManager, 2*time.Hour)
	handler := NewHandler(service, CookieConfig{Secure: false, Duration: 2 * time.Hour})

	return handler, repo
}

func TestAuth_LoginSuccess(t *testing.T) {
	handler, _ := setupTestAuth(t)

	tests := []struct {
		name       string
		reqBody    LoginRequest
		expectedID int64
		expRole    string
	}{
		{
			name: "Admin login sukses",
			reqBody: LoginRequest{
				Role:       RoleAdmin,
				Identifier: "admin@travora.id",
				Password:   "adminpass123",
			},
			expectedID: 1,
			expRole:    RoleAdmin,
		},
		{
			name: "Member login sukses",
			reqBody: LoginRequest{
				Role:       RoleMember,
				Identifier: "budi_santoso",
				Password:   "memberpass123",
			},
			expectedID: 2,
			expRole:    RoleMember,
		},
		{
			name: "Operator login sukses",
			reqBody: LoginRequest{
				Role:       RoleOperator,
				Identifier: "operator_bandung",
				Password:   "operatorpass123",
			},
			expectedID: 3,
			expRole:    RoleOperator,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			b, _ := json.Marshal(tt.reqBody)
			req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewReader(b))
			w := httptest.NewRecorder()

			handler.Login(w, req)

			if w.Code != http.StatusOK {
				t.Fatalf("Status expected 200, got %d: %s", w.Code, w.Body.String())
			}

			// Periksa Set-Cookie header
			cookies := w.Result().Cookies()
			var sessionCookie *http.Cookie
			for _, c := range cookies {
				if c.Name == SessionCookieName {
					sessionCookie = c
					break
				}
			}
			if sessionCookie == nil || sessionCookie.Value == "" {
				t.Fatal("Cookie travora_session tidak ditemukan atau kosong")
			}
			if !sessionCookie.HttpOnly {
				t.Error("Cookie harus HttpOnly")
			}

			// Periksa bahwa body response tidak memuat password_hash
			bodyStr := w.Body.String()
			if bytes.Contains([]byte(bodyStr), []byte("password")) {
				t.Errorf("Response body tidak boleh memuat kata 'password': %s", bodyStr)
			}
		})
	}
}

func TestAuth_LoginFailures(t *testing.T) {
	handler, _ := setupTestAuth(t)

	tests := []struct {
		name           string
		reqBody        LoginRequest
		expectedStatus int
		expectedCode   string
	}{
		{
			name: "Password salah",
			reqBody: LoginRequest{
				Role:       RoleAdmin,
				Identifier: "admin@travora.id",
				Password:   "wrongpassword",
			},
			expectedStatus: http.StatusUnauthorized,
			expectedCode:   "INVALID_CREDENTIALS",
		},
		{
			name: "Akun tidak terdaftar",
			reqBody: LoginRequest{
				Role:       RoleAdmin,
				Identifier: "nonexistent@travora.id",
				Password:   "somepassword",
			},
			expectedStatus: http.StatusUnauthorized,
			expectedCode:   "INVALID_CREDENTIALS",
		},
		{
			name: "Role tidak cocok",
			reqBody: LoginRequest{
				Role:       RoleAdmin,
				Identifier: "budi_santoso", // member dicoba di admin
				Password:   "memberpass123",
			},
			expectedStatus: http.StatusUnauthorized,
			expectedCode:   "INVALID_CREDENTIALS",
		},
		{
			name: "Field kosong (invalid input)",
			reqBody: LoginRequest{
				Role:       "",
				Identifier: "",
				Password:   "",
			},
			expectedStatus: http.StatusBadRequest,
			expectedCode:   "INVALID_INPUT",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			b, _ := json.Marshal(tt.reqBody)
			req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewReader(b))
			w := httptest.NewRecorder()

			handler.Login(w, req)

			if w.Code != tt.expectedStatus {
				t.Errorf("Status code expected %d, got %d", tt.expectedStatus, w.Code)
			}

			var errResp struct {
				Success bool `json:"success"`
				Error   struct {
					Code    string `json:"code"`
					Message string `json:"message"`
				} `json:"error"`
			}
			_ = json.Unmarshal(w.Body.Bytes(), &errResp)

			if errResp.Error.Code != tt.expectedCode {
				t.Errorf("Error code expected %s, got %s", tt.expectedCode, errResp.Error.Code)
			}
		})
	}
}

func TestAuth_MeAndLogout(t *testing.T) {
	handler, _ := setupTestAuth(t)

	// 1. Login dulu untuk mendapatkan cookie sesi
	loginPayload, _ := json.Marshal(LoginRequest{
		Role:       RoleMember,
		Identifier: "budi_santoso",
		Password:   "memberpass123",
	})
	loginReq := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewReader(loginPayload))
	loginRes := httptest.NewRecorder()
	handler.Login(loginRes, loginReq)

	sessionCookie := loginRes.Result().Cookies()[0]

	// 2. Request GET /api/v1/auth/me dengan cookie yang valid
	meReq := httptest.NewRequest(http.MethodGet, "/api/v1/auth/me", nil)
	meReq.AddCookie(sessionCookie)
	meRes := httptest.NewRecorder()
	handler.Me(meRes, meReq)

	if meRes.Code != http.StatusOK {
		t.Fatalf("GET /auth/me expected 200, got %d: %s", meRes.Code, meRes.Body.String())
	}

	var meData struct {
		Success bool `json:"success"`
		Data    User `json:"data"`
	}
	_ = json.Unmarshal(meRes.Body.Bytes(), &meData)
	if meData.Data.Role != RoleMember || meData.Data.Identifier != "budi_santoso" {
		t.Errorf("User data /auth/me tidak cocok: %+v", meData.Data)
	}

	// 3. Request POST /api/v1/auth/logout
	logoutReq := httptest.NewRequest(http.MethodPost, "/api/v1/auth/logout", nil)
	logoutRes := httptest.NewRecorder()
	handler.Logout(logoutRes, logoutReq)

	if logoutRes.Code != http.StatusOK {
		t.Fatalf("POST /auth/logout expected 200, got %d", logoutRes.Code)
	}

	// Pastikan cookie dihapus (MaxAge < 0)
	logoutCookies := logoutRes.Result().Cookies()
	var clearedCookie *http.Cookie
	for _, c := range logoutCookies {
		if c.Name == SessionCookieName {
			clearedCookie = c
			break
		}
	}
	if clearedCookie == nil || clearedCookie.MaxAge >= 0 {
		t.Errorf("Logout harus menghapus cookie dengan MaxAge < 0")
	}

	// 4. Request GET /api/v1/auth/me tanpa cookie
	unauthReq := httptest.NewRequest(http.MethodGet, "/api/v1/auth/me", nil)
	unauthRes := httptest.NewRecorder()
	handler.Me(unauthRes, unauthReq)

	if unauthRes.Code != http.StatusUnauthorized {
		t.Errorf("GET /auth/me tanpa cookie expected 401, got %d", unauthRes.Code)
	}
}

func TestAuth_RegisterSuccessAndLogin(t *testing.T) {
	handler, repo := setupTestAuth(t)

	// 1. Registrasi member baru
	regPayload, _ := json.Marshal(RegisterRequest{
		Name:     "Kyoto Traveler",
		Username: "kyoto@gmail.com",
		Email:    "kyoto@gmail.com",
		Phone:    "081299998888",
		Password: "securepassword123",
	})
	regReq := httptest.NewRequest(http.MethodPost, "/api/v1/auth/register", bytes.NewReader(regPayload))
	regRes := httptest.NewRecorder()
	handler.Register(regRes, regReq)

	if regRes.Code != http.StatusCreated {
		t.Fatalf("POST /auth/register expected 201 Created, got %d: %s", regRes.Code, regRes.Body.String())
	}

	// 2. Verifikasi data tersimpan di repository dengan password_hash bcrypt yang valid
	savedMember, err := repo.FindMemberByUsername(context.Background(), "kyoto@gmail.com")
	if err != nil {
		t.Fatalf("Member baru tidak ditemukan di repository: %v", err)
	}
	if savedMember.Nama != "Kyoto Traveler" {
		t.Errorf("Nama member baru tidak cocok: got %s", savedMember.Nama)
	}
	if err := bcrypt.CompareHashAndPassword([]byte(savedMember.PasswordHash), []byte("securepassword123")); err != nil {
		t.Errorf("Bcrypt verification failed for newly registered member: %v", err)
	}

	// 3. Login dengan akun member baru
	loginPayload, _ := json.Marshal(LoginRequest{
		Role:       RoleMember,
		Identifier: "kyoto@gmail.com",
		Password:   "securepassword123",
	})
	loginReq := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewReader(loginPayload))
	loginRes := httptest.NewRecorder()
	handler.Login(loginRes, loginReq)

	if loginRes.Code != http.StatusOK {
		t.Fatalf("Login member baru expected 200, got %d: %s", loginRes.Code, loginRes.Body.String())
	}

	// Pastikan cookie sesi terbentuk
	var sessionCookie *http.Cookie
	for _, c := range loginRes.Result().Cookies() {
		if c.Name == SessionCookieName {
			sessionCookie = c
			break
		}
	}
	if sessionCookie == nil || sessionCookie.Value == "" {
		t.Fatal("Sesi cookie untuk member baru tidak ditemukan")
	}

	// 4. Verifikasi sesi aktif via /me
	meReq := httptest.NewRequest(http.MethodGet, "/api/v1/auth/me", nil)
	meReq.AddCookie(sessionCookie)
	meRes := httptest.NewRecorder()
	handler.Me(meRes, meReq)

	if meRes.Code != http.StatusOK {
		t.Fatalf("GET /auth/me member baru expected 200, got %d: %s", meRes.Code, meRes.Body.String())
	}

	var meData struct {
		Success bool `json:"success"`
		Data    User `json:"data"`
	}
	_ = json.Unmarshal(meRes.Body.Bytes(), &meData)
	if meData.Data.Role != RoleMember || meData.Data.Identifier != "kyoto@gmail.com" {
		t.Errorf("Profil /me member baru tidak cocok: %+v", meData.Data)
	}
}


