package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"log"
	"strings"

	"github.com/jackc/pgx/v5"
	"golang.org/x/crypto/bcrypt"

	"travora/api/internal/config"
	"travora/api/internal/database"
)

func main() {
	emailFlag := flag.String("email", "", "Alamat email admin (wajib diisi)")
	nameFlag := flag.String("name", "Super Admin", "Nama lengkap admin")
	passwordFlag := flag.String("password", "", "Kata sandi admin (minimal 6 karakter, wajib diisi)")
	phoneFlag := flag.String("phone", "081234567890", "Nomor telepon admin")
	forceFlag := flag.Bool("force", false, "Perbarui nama dan kata sandi jika email admin sudah terdaftar")
	flag.Parse()

	email := strings.TrimSpace(*emailFlag)
	name := strings.TrimSpace(*nameFlag)
	password := *passwordFlag
	phone := strings.TrimSpace(*phoneFlag)

	if email == "" || !strings.Contains(email, "@") {
		log.Fatal("Parameter -email wajib diisi dengan format email yang valid (contoh: -email=\"admin@travora.id\")")
	}
	if name == "" {
		log.Fatal("Parameter -name tidak boleh kosong")
	}
	if len(password) < 6 {
		log.Fatal("Parameter -password wajib diisi minimal 6 karakter")
	}
	if phone == "" {
		phone = "081234567890"
	}

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Gagal memuat konfigurasi database: %v", err)
	}

	ctx := context.Background()
	db, err := database.NewPool(ctx, cfg)
	if err != nil {
		log.Fatalf("Gagal terhubung ke database PostgreSQL (%s): %v", cfg.DBName, err)
	}
	defer db.Close()

	hashBytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		log.Fatalf("Gagal melakukan hashing kata sandi dengan bcrypt: %v", err)
	}
	passwordHash := string(hashBytes)
	password = ""

	var existingID int64
	err = db.Pool().QueryRow(ctx,
		`SELECT id_admin FROM admin WHERE LOWER(email) = LOWER($1) LIMIT 1;`,
		email,
	).Scan(&existingID)

	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		log.Fatalf("Gagal memeriksa keberadaan admin di database: %v", err)
	}

	if err == nil {
		// Email admin sudah terdaftar
		if !*forceFlag {
			log.Fatalf("Akun admin dengan email %q sudah terdaftar (id_admin=%d). Jalankan ulang dengan flag -force untuk memperbarui kata sandi dan profilnya.", email, existingID)
		}

		_, updateErr := db.Pool().Exec(ctx,
			`UPDATE admin SET nama_lengkap = $1, no_telp = $2, password_hash = $3 WHERE id_admin = $4;`,
			name, phone, passwordHash, existingID,
		)
		if updateErr != nil {
			log.Fatalf("Gagal memperbarui akun admin %q: %v", email, updateErr)
		}

		fmt.Println("====================================================")
		fmt.Println(" [SUKSES] Akun Admin Berhasil Diperbarui (-force)")
		fmt.Printf(" ID Admin : %d\n", existingID)
		fmt.Printf(" Email    : %s\n", email)
		fmt.Printf(" Nama     : %s\n", name)
		fmt.Println(" Role     : admin")
		fmt.Printf(" Database : %s\n", cfg.DBName)
		fmt.Println("====================================================")
		return
	}

	var createdID int64
	insertErr := db.Pool().QueryRow(ctx,
		`INSERT INTO admin (email, password_hash, nama_lengkap, no_telp)
		 VALUES ($1, $2, $3, $4)
		 RETURNING id_admin;`,
		email, passwordHash, name, phone,
	).Scan(&createdID)
	if insertErr != nil {
		log.Fatalf("Gagal membuat akun admin baru: %v", insertErr)
	}

	fmt.Println("====================================================")
	fmt.Println(" [SUKSES] Akun Admin Baru Berhasil Dibuat")
	fmt.Printf(" ID Admin : %d\n", createdID)
	fmt.Printf(" Email    : %s\n", email)
	fmt.Printf(" Nama     : %s\n", name)
	fmt.Println(" Role     : admin")
	fmt.Printf(" Database : %s\n", cfg.DBName)
	fmt.Println("====================================================")
}
