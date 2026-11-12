package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"travora/api/internal/auth"
	"travora/api/internal/config"
	"travora/api/internal/database"
	"travora/api/internal/health"
	"travora/api/internal/masterdata"
	"travora/api/internal/router"
	"travora/api/internal/schedule"
)

func main() {
	log.Println("Memulai Travora API server...")

	// 1. Muat konfigurasi terpusat
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Konfigurasi tidak valid: %v", err)
	}

	// 2. Buat context dengan penanganan sinyal OS untuk graceful shutdown
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	// 3. Inisialisasi Database Connection Pool
	log.Printf("Menghubungkan ke PostgreSQL di %s:%s (Database: %s, User: %s)...",
		cfg.DBHost, cfg.DBPort, cfg.DBName, cfg.DBUser)

	db, err := database.NewPool(ctx, cfg)
	if err != nil {
		// Laporkan kegagalan startup tanpa membocorkan password
		log.Fatalf("Koneksi database gagal diinisialisasi: %v", err)
	}
	defer func() {
		log.Println("Menutup database connection pool...")
		db.Close()
		log.Println("Database connection pool berhasil ditutup.")
	}()

	log.Printf("Database connection pool berhasil dibuat (MaxConns: %d, MinConns: %d)",
		cfg.DBPoolMaxConns, cfg.DBPoolMinConns)

	// 4. Inisialisasi Repository, Service, dan Handler
	authRepo := auth.NewRepository(db.Pool())
	tokenManager := auth.NewTokenManager(cfg.SessionSecret)
	authService := auth.NewService(authRepo, tokenManager, cfg.SessionDuration)
	authHandler := auth.NewHandler(authService, auth.CookieConfig{
		Secure:   cfg.CookieSecure,
		Duration: cfg.SessionDuration,
	})

	masterDataRepo := masterdata.NewRepository(db.Pool())
	masterDataService := masterdata.NewService(masterDataRepo)
	masterDataHandler := masterdata.NewHandler(masterDataService)

	scheduleRepo := schedule.NewRepository(db.Pool())
	scheduleService := schedule.NewService(scheduleRepo)
	scheduleHandler := schedule.NewHandler(scheduleService)

	healthHandler := health.NewHandler(db)

	appHandler := router.New(router.Config{
		AuthHandler:       authHandler,
		HealthHandler:     healthHandler,
		MasterDataHandler: masterDataHandler,
		ScheduleHandler:   scheduleHandler,
	})

	// 5. Konfigurasi HTTP Server dengan timeout terukur
	addr := ":" + cfg.AppPort
	srv := &http.Server{
		Addr:         addr,
		Handler:      appHandler,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// 6. Jalankan HTTP Server dalam goroutine terpisah
	serverErrors := make(chan error, 1)
	go func() {
		log.Printf("Travora API aktif mendengarkan pada %s (Env: %s)", addr, cfg.AppEnv)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			serverErrors <- err
		}
	}()

	// 7. Tunggu sinyal terminasi OS atau error startup server
	select {
	case err := <-serverErrors:
		log.Fatalf("Kesalahan runtime HTTP server: %v", err)
	case <-ctx.Done():
		log.Println("Sinyal shutdown diterima, memulai pembersihan resources (graceful shutdown)...")
	}

	// 8. Berikan waktu tenggang (grace period) bagi server untuk menyelesaikan request aktif
	shutdownCtx, cancelShutdown := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancelShutdown()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Printf("Shutdown paksa HTTP server karena timeout: %v", err)
	} else {
		log.Println("HTTP server berhasil dihentikan secara normal.")
	}

	log.Println("Travora API shutdown selesai.")
}
