package main

import (
	"bufio"
	"context"
	"flag"
	"fmt"
	"log"
	"os"
	"strings"
	"syscall"
	"unsafe"

	"golang.org/x/crypto/bcrypt"

	"travora/api/internal/config"
	"travora/api/internal/database"
)

type accountAuditResult struct {
	Role        string
	Identifier  string
	Name        string
	Found       bool
	HashLength  int
	BcryptValid bool
	BcryptCost  int
	Error       string
}

func main() {
	roleFlag := flag.String("role", "", "Peran akun (admin, member, operator)")
	idFlag := flag.String("id", "", "Identifier akun (email untuk admin, username untuk member/operator)")
	auditFlag := flag.Bool("audit", false, "Audit seluruh akun demonstrasi di database (tanpa mengubah atau mencetak password)")
	flag.Parse()

	// Pastikan konfigurasi dimuat
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Konfigurasi database tidak valid: %v", err)
	}

	ctx := context.Background()
	db, err := database.NewPool(ctx, cfg)
	if err != nil {
		// Jika password kosong atau autentikasi SASL gagal, minta password interaktif dengan aman
		errStr := err.Error()
		if cfg.DBPassword == "" || strings.Contains(errStr, "password authentication failed") || strings.Contains(errStr, "SASL") {
			fmt.Printf("[INFO] Memerlukan kata sandi koneksi PostgreSQL untuk user '%s'.\n", cfg.DBUser)
			cfg.DBPassword = readPasswordSecurely(fmt.Sprintf("Masukkan Password PostgreSQL untuk user '%s': ", cfg.DBUser))
			db, err = database.NewPool(ctx, cfg)
			if err != nil {
				log.Fatalf("Gagal terhubung ke database %s: %v", cfg.DBName, err)
			}
		} else {
			log.Fatalf("Gagal terhubung ke database %s: %v", cfg.DBName, err)
		}
	}
	defer db.Close()

	if *auditFlag {
		runAudit(ctx, db, cfg.DBName)
		return
	}

	reader := bufio.NewReader(os.Stdin)

	role := strings.ToLower(strings.TrimSpace(*roleFlag))
	if role == "" {
		fmt.Println("====================================================")
		fmt.Println(" TRAVORA - PENGATURAN KATA SANDI AMAN (POSTGRESQL)  ")
		fmt.Printf(" Target Database: %s\n", cfg.DBName)
		fmt.Println("====================================================")
		fmt.Print("Pilih Peran Akun (1. admin / 2. member / 3. operator) [admin]: ")
		input, _ := reader.ReadString('\n')
		input = strings.TrimSpace(input)
		switch input {
		case "2", "member":
			role = "member"
		case "3", "operator", "operator_loket":
			role = "operator"
		default:
			role = "admin"
		}
	} else if role == "operator_loket" {
		role = "operator"
	}

	identifier := strings.TrimSpace(*idFlag)
	if identifier == "" {
		prompt := "Masukkan Email Admin (contoh: admin@travora.id): "
		if role == "member" {
			prompt = "Masukkan Username Member (contoh: budi_santoso): "
		} else if role == "operator" {
			prompt = "Masukkan Username Operator (contoh: operator_bandung): "
		}
		fmt.Print(prompt)
		identifier, _ = reader.ReadString('\n')
		identifier = strings.TrimSpace(identifier)
	}

	if identifier == "" {
		log.Fatal("Identifier akun tidak boleh kosong")
	}

	// 1. Baca kata sandi dengan aman (Prompt Tersembunyi tanpa Echo)
	password := readPasswordSecurely("Masukkan Kata Sandi Baru (minimal 6 karakter): ")
	if len(password) < 6 {
		log.Fatal("Kata sandi harus minimal 6 karakter")
	}

	// 2. Generate bcrypt hash menggunakan Go standar
	hashBytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		log.Fatalf("Gagal melakukan hashing kata sandi dengan bcrypt: %v", err)
	}
	passwordHash := string(hashBytes)

	// Bersihkan variabel kata sandi dari memori segera
	password = ""

	// 3. Simpan hanya hash ke PostgreSQL
	var updateQuery string
	switch role {
	case "admin":
		updateQuery = `UPDATE admin SET password_hash = $1 WHERE LOWER(email) = LOWER($2);`
	case "member":
		updateQuery = `UPDATE member SET password_hash = $1 WHERE LOWER(username) = LOWER($2);`
	case "operator":
		updateQuery = `UPDATE operator_loket SET password_hash = $1 WHERE LOWER(username) = LOWER($2);`
	default:
		log.Fatalf("Peran tidak dikenali: %s", role)
	}

	tag, err := db.Pool().Exec(ctx, updateQuery, passwordHash, identifier)
	if err != nil {
		log.Fatalf("Gagal memperbarui password_hash di database: %v", err)
	}

	if tag.RowsAffected() == 0 {
		// Jika akun belum ada di database, daftarkan secara otomatis
		switch role {
		case "admin":
			insertQuery := `INSERT INTO admin (email, password_hash, nama_lengkap, no_telp)
			                VALUES ($1, $2, $3, $4);`
			_, err = db.Pool().Exec(ctx, insertQuery, identifier, passwordHash, identifier, "081234567890")
		case "member":
			insertQuery := `INSERT INTO member (nama, alamat, telepon, jen_kelamin, username, password_hash)
			                VALUES ($1, $2, $3, $4, $5, $6);`
			_, err = db.Pool().Exec(ctx, insertQuery, identifier, "Bandung", "081234567890", "L", identifier, passwordHash)
		case "operator":
			insertQuery := `INSERT INTO operator_loket (username, password_hash, nama)
			                VALUES ($1, $2, $3);`
			_, err = db.Pool().Exec(ctx, insertQuery, identifier, passwordHash, identifier)
		}
		if err != nil {
			log.Fatalf("Akun %q belum terdaftar dan gagal dibuat otomatis: %v", identifier, err)
		}
		fmt.Printf("[INFO] Akun baru %q (%s) berhasil didaftarkan ke database!\n", identifier, role)
	}

	// Konfirmasikan keberhasilan tanpa mencetak isi kata sandi ataupun isi hash
	cost, _ := bcrypt.Cost([]byte(passwordHash))
	fmt.Println("====================================================")
	fmt.Printf("[SUKSES] Kata sandi untuk %s (%s) berhasil diperbarui!\n", identifier, role)
	fmt.Printf("Status Hash: VALID (Panjang: %d karakter, Algoritma: Bcrypt Cost %d)\n", len(passwordHash), cost)
	fmt.Printf("Database: %s (Kredensial tersimpan dalam bentuk hash kriptografis aman)\n", cfg.DBName)
	fmt.Println("====================================================")
}

var (
	kernel32           = syscall.NewLazyDLL("kernel32.dll")
	procGetConsoleMode = kernel32.NewProc("GetConsoleMode")
	procSetConsoleMode = kernel32.NewProc("SetConsoleMode")
)

// readPasswordSecurely membaca kata sandi dari terminal tanpa echo menggunakan Win32 Console Mode
func readPasswordSecurely(prompt string) string {
	// Jika ada variabel lingkungan in-memory yang dipasang oleh runner
	if envPass := os.Getenv("TRAVORA_NEW_PASSWORD"); envPass != "" {
		_ = os.Unsetenv("TRAVORA_NEW_PASSWORD")
		return strings.TrimSpace(envPass)
	}
	if envPass := os.Getenv("TRAVORA_ACCOUNT_PASSWORD"); envPass != "" {
		_ = os.Unsetenv("TRAVORA_ACCOUNT_PASSWORD")
		return strings.TrimSpace(envPass)
	}

	fmt.Print(prompt)
	h := os.Stdin.Fd()
	var mode uint32

	// Coba ambil console mode Win32
	r1, _, _ := procGetConsoleMode.Call(h, uintptr(unsafe.Pointer(&mode)))
	isConsole := r1 != 0

	if isConsole {
		// Nonaktifkan echo input (ENABLE_ECHO_INPUT = 0x0004)
		newMode := mode &^ 0x0004
		procSetConsoleMode.Call(h, uintptr(newMode))
		defer procSetConsoleMode.Call(h, uintptr(mode))
	}

	reader := bufio.NewReader(os.Stdin)
	line, err := reader.ReadString('\n')
	if isConsole {
		fmt.Println() // Baris baru setelah prompt tersembunyi
	}
	if err != nil && len(line) == 0 {
		log.Fatalf("Gagal membaca kata sandi: %v", err)
	}
	return strings.TrimSpace(line)
}

// runAudit memeriksa kelima akun demonstrasi tanpa pernah mencetak plaintext password ataupun isi hash
func runAudit(ctx context.Context, db database.DB, dbName string) {
	fmt.Println("================================================================================")
	fmt.Printf(" TRAVORA - AUDIT KEBERADAAN & VALIDITAS HASH AKUN DEMO (%s)\n", dbName)
	fmt.Println("================================================================================")

	targets := []struct {
		role  string
		ident string
	}{
		{"member", "budi_santoso"},
		{"member", "siti_nurhaliza"},
		{"admin", "admin@travora.id"},
		{"operator", "operator_bandung"},
		{"operator", "operator_jakarta"},
	}

	fmt.Printf("%-10s | %-20s | %-8s | %-12s | %-14s | %-5s\n",
		"Peran", "Identifier", "Ditemukan", "Panjang Hash", "Format Bcrypt", "Cost")
	fmt.Println(strings.Repeat("-", 80))

	for _, t := range targets {
		res := accountAuditResult{
			Role:       t.role,
			Identifier: t.ident,
		}

		var rawHash string
		switch t.role {
		case "admin":
			err := db.Pool().QueryRow(ctx,
				`SELECT password_hash, nama_lengkap FROM admin WHERE LOWER(email) = LOWER($1);`,
				t.ident).Scan(&rawHash, &res.Name)
			if err == nil {
				res.Found = true
			}
		case "member":
			err := db.Pool().QueryRow(ctx,
				`SELECT password_hash, nama FROM member WHERE LOWER(username) = LOWER($1);`,
				t.ident).Scan(&rawHash, &res.Name)
			if err == nil {
				res.Found = true
			}
		case "operator":
			err := db.Pool().QueryRow(ctx,
				`SELECT password_hash, nama FROM operator_loket WHERE LOWER(username) = LOWER($1);`,
				t.ident).Scan(&rawHash, &res.Name)
			if err == nil {
				res.Found = true
			}
		}

		if res.Found {
			res.HashLength = len(rawHash)
			cost, err := bcrypt.Cost([]byte(rawHash))
			if err == nil {
				res.BcryptValid = true
				res.BcryptCost = cost
			} else {
				res.BcryptValid = false
				res.Error = err.Error()
			}
		}

		foundStr := "TIDAK"
		if res.Found {
			foundStr = "YA"
		}

		bcryptStr := "TIDAK VALID"
		if res.BcryptValid {
			bcryptStr = "VALID"
		}

		costStr := "-"
		if res.BcryptCost > 0 {
			costStr = fmt.Sprintf("%d", res.BcryptCost)
		}

		fmt.Printf("%-10s | %-20s | %-8s | %-12s | %-14s | %-5s\n",
			res.Role, res.Identifier, foundStr, fmt.Sprintf("%d char", res.HashLength), bcryptStr, costStr)
	}

	fmt.Println(strings.Repeat("-", 80))
	fmt.Println("CATATAN KEAMANAN: Hash dan password tidak pernah dicetak demi mematuhi standar kerahasiaan.")
	fmt.Println("================================================================================")
}
