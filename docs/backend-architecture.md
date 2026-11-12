# ARSITEKTUR BACKEND, REPOSITORY & HTTP REST API (PHASE 4C.1, 4C.2 & 4C.3)
## Proyek: TRAVORA — Sistem Informasi Pemesanan Tiket Travel Antar-Kota
**Dokumen:** `docs/backend-architecture.md`  
**Fase:** Phase 4C.1, 4C.2 & 4C.3 — Go Backend, Repository, Data Access & HTTP REST Handlers  
**Penyusun:** Backend Architect & Lead Go Engineer  
**Teknologi:** Go 1.22+ (Toolchain 1.25.0) & PostgreSQL 18  
**Status:** COMPLETED & VERIFIED (Health Probes, Master Data & Public Schedule Endpoints, Response Envelopes, Strict CORS, Full Test Suite PASS)  

---

## 1. STRUKTUR PAKET BACKEND (`services/api`)

Arsitektur backend Travora menggunakan struktur standar idiomatik Go (*Standard Go Project Layout*) dengan pemisahan tegas antara entry point, konfigurasi, konektivitas database, domain bisnis, middleware, response formatting, dan router HTTP:

```
services/api/
├── cmd/
│   └── api/
│       └── main.go                 # Entry point: Server lifecycle, DI, router & graceful shutdown
├── internal/
│   ├── config/                     # Konfigurasi terpusat & validasi environment
│   │   ├── config.go
│   │   └── config_test.go
│   ├── database/                   # Connection pool PostgreSQL (pgxpool)
│   │   ├── database.go
│   │   └── database_test.go
│   ├── health/                     # HTTP Health check handlers (live & ready probes)
│   │   ├── health.go
│   │   └── health_test.go
│   ├── masterdata/                 # Master Data: kota_asal, kota_tujuan, kendaraan
│   │   ├── model.go
│   │   ├── repository.go
│   │   ├── service.go
│   │   ├── handler.go              # HTTP REST Handler master data
│   │   ├── handler_test.go
│   │   ├── masterdata_test.go
│   │   └── masterdata_integration_test.go
│   ├── middleware/                 # HTTP Middlewares (CORS, Request Logging, Auth Guard)
│   │   ├── cors.go                 # Strict CORS whitelist middleware
│   │   └── cors_test.go
│   ├── response/                   # Standar amplop respons JSON API
│   │   ├── response.go             # JSON, Paginated, Error response helpers
│   │   └── response_test.go
│   ├── router/                     # Router terpusat menggunakan Go 1.22+ ServeMux
│   │   ├── router.go               # Factory builder router & route registration
│   │   └── router_test.go
│   ├── schedule/                   # Domain Jadwal Perjalanan
│   │   ├── model.go
│   │   ├── repository.go
│   │   ├── service.go
│   │   ├── handler.go              # HTTP REST Handler public schedule
│   │   ├── handler_test.go
│   │   ├── schedule_test.go
│   │   └── schedule_integration_test.go
│   ├── testutil/                   # Mocking helpers untuk pengujian unit
│   │   └── mock_db.go
│   ├── admin/                      # [Phase 4D] Manajemen rute, armada, jadwal oleh admin
│   ├── auth/                       # [Phase 4D] Layanan autentikasi & hashing bcrypt
│   ├── booking/                    # [Phase 4D] Transaksi pemesanan tiket
│   ├── complaints/                 # [Phase 4D] Penanganan keluhan penumpang
│   ├── member/                     # [Phase 4D] Manajemen profil penumpang
│   └── operator/                   # [Phase 4D] Verifikasi tiket & konfirmasi loket
├── .env.example                    # Template konfigurasi lokal aman
├── go.mod                          # Definisi module (travora/api)
└── go.sum                          # Checksum verifikasi dependensi
```

---

## 2. MANAJEMEN KONFIGURASI TERPUSAT (`internal/config`)

Konfigurasi dikelola secara terpusat melalui struct `Config` bertipe kuat (*strongly-typed*).

### Hierarki Pembacaan Konfigurasi:
1. **OS Environment Variables:** Memiliki prioritas tertinggi (misal diatur oleh container runtime atau CI/CD).
2. **File `.env` Lokal:** Dibaca secara otomatis saat startup lokal untuk variabel yang belum ada di OS (tanpa menimpa environment variable yang sudah diset).
3. **Nilai Default Aman:** Diterapkan secara otomatis apabila variabel tidak disediakan.

### Parameter Konfigurasi:
| Variabel | Tipe Data | Nilai Default | Deskripsi |
| :--- | :---: | :---: | :--- |
| `APP_ENV` | `string` | `development` | Lingkungan runtime (`development`, `test`, `production`). |
| `APP_PORT` | `string` | `8080` | Port listener web server HTTP (1–65535). |
| `DB_HOST` | `string` | `localhost` | Hostname / IP server PostgreSQL. |
| `DB_PORT` | `string` | `5432` | Port server PostgreSQL. |
| `DB_NAME` | `string` | `travora_db` | Nama database operasional. |
| `DB_USER` | `string` | `postgres` | User database PostgreSQL. |
| `DB_PASSWORD` | `string` | *(kosong)* | Password user database (**tidak boleh di-hardcode**). |
| `DB_SSLMODE` | `string` | `disable` | Mode SSL PostgreSQL (`disable`, `require`, `verify-full`). |
| `DB_POOL_MAX_CONNS` | `int` | `25` | Batas maksimum koneksi aktif dan idle dalam pool. |
| `DB_POOL_MIN_CONNS` | `int` | `5` | Jumlah minimum koneksi idle yang selalu dipertahankan. |
| `DB_POOL_MAX_CONN_LIFETIME` | `duration` | `1h` | Batas usia maksimum suatu koneksi sebelum disegarkan. |
| `DB_POOL_MAX_CONN_IDLE_TIME` | `duration` | `30m` | Batas waktu idle suatu koneksi sebelum dipangkas ke `MinConns`. |
| `DB_CONNECT_TIMEOUT` | `duration` | `5s` | Timeout inisialisasi pool dan ping awal saat startup. |

*Catatan Frontend:* Variabel `VITE_API_BASE_URL` dikelola khusus pada konfigurasi antarmuka frontend (`apps/web/.env`), bukan pada backend API.

### Fitur Keamanan Masking DSN:
Paket `config` menyediakan fungsi `SanitizedDSN()` yang secara otomatis menyensor password menjadi `******` (misal: `postgres://postgres:******@localhost:5432/travora_db?sslmode=disable`) sehingga aman untuk pencatatan log diagnostik tanpa risiko kebocoran kredensial (*Zero Credential Leak*).

---

## 3. DESAIN CONNECTION POOL POSTGRESQL (`internal/database`)

Backend menggunakan pustaka resmi performa tinggi **`github.com/jackc/pgx/v5`** dengan pengelola pool **`pgxpool`**.

### Karakteristik & Jaminan Teknis:
1. **Validasi Sebelum Koneksi:** Konfigurasi divalidasi terlebih dahulu sebelum memanggil driver TCP.
2. **Context Timeout:** Pembentukan pool dan verifikasi ping awal dibatasi oleh `DB_CONNECT_TIMEOUT` (default: 5 detik), mencegah aplikasi hanging saat database tidak dapat dijangkau.
3. **Pembersihan Bersih (Clean Teardown):** Jika ping awal gagal, pool langsung ditutup (`pool.Close()`) sebelum error dikembalikan.
4. **Abstraksi Antarmuka (Interface):** Struktur dibungkus dalam interface `database.DB` untuk mempermudah mocking pada pengujian unit (unit testing) tanpa ketergantungan database fisik aktif.

---

## 4. ENDPOINT HEALTH CHECK & PEMANTAUAN

API menyediakan tiga endpoint pemantauan standar:

### A. Liveness Probe (`GET /health/live`)
* **Tujuan:** Memeriksa apakah proses aplikasi web server menyala dan merespons request.
* **Database Contact:** Tidak menghubungi database (Zero DB Dependency).
* **Respons HTTP 200:**
  ```json
  {
    "status": "UP",
    "service": "travora-api"
  }
  ```

### B. Readiness Probe (`GET /health/ready`)
* **Tujuan:** Memeriksa apakah API siap menerima traffic bisnis dengan memverifikasi koneksi fisik ke PostgreSQL.
* **Database Contact:** Menjalankan `Ping(ctx)` dengan timeout 2 detik.
* **Respons HTTP 200 (Database Terhubung):**
  ```json
  {
    "status": "UP",
    "service": "travora-api",
    "database": "CONNECTED"
  }
  ```
* **Respons HTTP 503 (Database Terputus / Gangguan):**
  ```json
  {
    "status": "DOWN",
    "service": "travora-api",
    "database": "DISCONNECTED",
    "error": "database unreachable"
  }
  ```
  *(Respons tidak membocorkan host, port, user, maupun detail internal database).*

### C. Root Status (`GET /`)
* **Tujuan:** Kompatibilitas dengan health check awal.
* **Respons HTTP 200:**
  ```json
  {
    "status": "ok",
    "service": "travora-api"
  }
  ```

---

## 5. SIKLUS HIDUP SERVER & GRACEFUL SHUTDOWN (`cmd/api/main.go`)

HTTP Server dikonfigurasi dengan perlindungan resource sistem:
* **`ReadTimeout: 10s`**: Mencegah serangan Slowloris HTTP.
* **`WriteTimeout: 15s`**: Menjamin respons yang macet tidak menahan koneksi selamanya.
* **`IdleTimeout: 60s`**: Menjaga efisiensi resource keep-alive connections.

### Alur Graceful Shutdown:
1. Aplikasi mendengarkan sinyal terminasi OS (`os.Interrupt`, `syscall.SIGTERM`) melalui `signal.NotifyContext`.
2. Saat sinyal diterima, server berhenti menerima koneksi baru (`server.Shutdown`) dan memberikan waktu tenggang (*grace period*) 10 detik untuk menyelesaikan request yang sedang berjalan.
3. Setelah HTTP server berhenti, database connection pool ditutup secara rapi (`db.Close()`).
4. Seluruh resource dibebaskan tanpa terjadi *dangling socket* atau *corrupted connection*.

---

## 6. CARA MENJALANKAN API SECARA LOKAL

### Langkah 1: Persiapan File `.env`
Salin template konfigurasi pada folder `services/api`:
```powershell
Set-Location services/api
Copy-Item .env.example .env
```
Edit file `.env` dan masukkan password PostgreSQL lokal Anda:
```env
DB_PASSWORD=your_actual_postgres_password
```

### Langkah 2: Menjalankan Pengujian (Testing)
Jalankan seluruh test suite unit backend:
```powershell
go test -v ./...
```

### Langkah 3: Menjalankan Server API
Jalankan server secara langsung:
```powershell
go run ./cmd/api
```
Atau kompilasi menjadi biner executable:
```powershell
go build -o bin/api.exe ./cmd/api
.\bin\api.exe
```

### Langkah 4: Verifikasi Melalui Browser / Curl
```powershell
# Uji Liveness
curl http://localhost:8080/health/live

# Uji Readiness (Database Connection)
curl http://localhost:8080/health/ready
```

---

## 7. ABSTRAKSI EKSEKUSI DATA (`database.DBTX`)

Untuk mendukung fleksibilitas eksekusi query baik dalam mode *connection pool* bersama (`*pgxpool.Pool`) maupun transaksi atomik ACID (`pgx.Tx`), diperkenalkan antarmuka `database.DBTX`:

```go
type DBTX interface {
    Exec(ctx context.Context, sql string, arguments ...any) (commandTag pgconn.CommandTag, err error)
    Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
    QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}
```

### Keunggulan Desain:
1. **Dukungan Transaksi Mulus:** Repository tidak terikat secara kaku pada `*pgxpool.Pool`. Lapisan transaksi dapat menginisiasi `tx, err := pool.Begin(ctx)` dan menyuntikkan `tx` ke dalam repository tanpa perlu menduplikasi kode kueri.
2. **Kemudahan Unit Testing (Testability):** Memungkinkan pembuatan mock database di level interface tanpa memerlukan instansiasi driver PostgreSQL asli saat pengujian unit.
3. **Pemberantasan Koneksi Global Mutable:** Seluruh dependensi database diinjeksi secara eksplisit melalui konstruktor (*Dependency Injection*), menghilangkan variabel global database yang rentan *data race*.

---

## 8. MASTER DATA REPOSITORY & SERVICE (`internal/masterdata`)

Paket `internal/masterdata` mengelola entitas data master operasional travel:

### A. Model Entitas:
- **`OriginCity` (`kota_asal`):**
  - `id_kota_asal` (`BIGINT`) -> `ID int64`
  - `nm_kota_asal` (`VARCHAR(100)`) -> `Name string`
- **`DestinationCity` (`kota_tujuan`):**
  - `id_kota_tujuan` (`BIGINT`) -> `ID int64`
  - `nm_kota_tujuan` (`VARCHAR(100)`) -> `Name string`
- **`Vehicle` (`kendaraan`):**
  - `id_kendaraan` (`BIGINT`) -> `ID int64`
  - `jenis_mobil` (`VARCHAR(100)`) -> `VehicleType string`
  - `nomor_polisi` (`VARCHAR(20)`) -> `PoliceNumber string`
  - `warna_mobil` (`VARCHAR(30)`) -> `Color string`
  - *Catatan Integritas Skema:* Kolom `is_active` sengaja tidak disertakan sesuai dengan DDL resmi tabel kendaraan.

### B. Kueri SQL Terindeks:
1. **`ListOriginCities`:**
   ```sql
   SELECT id_kota_asal, nm_kota_asal FROM kota_asal ORDER BY nm_kota_asal ASC;
   ```
2. **`ListDestinationCities`:**
   ```sql
   SELECT id_kota_tujuan, nm_kota_tujuan FROM kota_tujuan ORDER BY nm_kota_tujuan ASC;
   ```
3. **`ListVehicles`:**
   ```sql
   SELECT id_kendaraan, jenis_mobil, nomor_polisi, warna_mobil
   FROM kendaraan ORDER BY jenis_mobil ASC, id_kendaraan ASC;
   ```

### C. Pemisahan Tanggung Jawab:
- **`Repository`:** Bertanggung jawab atas eksekusi parameterized SQL, pemetaan data baris (`rows.Scan`), error wrapping, serta jaminan `defer rows.Close()` dan `rows.Err()`.
- **`Service`:** Bertanggung jawab memvalidasi sinyal pembatalan `context.Context` dan membungkus hasil ke dalam struktur respon domain tanpa mencampurkan HTTP handler.

---

## 9. SCHEDULE REPOSITORY & SERVICE (`internal/schedule`)

Paket `internal/schedule` melayani pencarian dan pengambilan detail jadwal perjalanan bagi publik.

### A. Model Data Publik (`PublicSchedule`):
Menyediakan data lengkap hasil `JOIN` antara `jadwal`, `kendaraan`, `kota_asal`, dan `kota_tujuan` tanpa membocorkan identitas internal admin (`id_admin`):
- `id_jadwal` (`int64`), `harga` (`int64`), `tgl_berangkat` (`YYYY-MM-DD`), `jam_berangkat` (`HH:MM:SS`), `is_active` (`bool`).
- Detail armada: `id_kendaraan`, `jenis_mobil`, `nomor_polisi`.
- Detail rute: `id_kota_asal`, `nm_kota_asal`, `id_kota_tujuan`, `nm_kota_tujuan`.

### B. Aturan Bisnis & Filter Pencarian (`PublicScheduleFilter`):
1. **Keaktifan Jadwal (Active Only):** Semua kueri publik secara mutlak menerapkan `j.is_active = TRUE`.
2. **Filter Independen:** Filter `origin_city_id` dan `destination_city_id` dapat digunakan bersamaan atau mandiri tanpa saling mengunci.
3. **Filter Tanggal Keberangkatan:** Menggunakan tipe PostgreSQL `DATE` dengan casting `$N::date` (`j.tgl_berangkat = $N::date`).
4. **Validasi Rute pada Service Layer:** Jika kota asal dan kota tujuan diisi sama, Service Layer menolak request dengan `ErrInvalidRoute` ("kota asal dan kota tujuan tidak boleh sama").
5. **Kebijakan Pagination Terukur:**
   - Default Limit: `20` baris.
   - Maksimum Limit: `100` baris.
   - Offset Negatif: Dinormalisasi secara otomatis menjadi `0`.
6. **Pengurutan Kronologis:** `ORDER BY j.tgl_berangkat ASC, j.jam_berangkat ASC, j.id_jadwal ASC`.

### C. Detail Jadwal Aktif (`GetPublicScheduleByID`):
Mengambil data detail jadwal berdasarkan ID dengan klausul `WHERE j.id_jadwal = $1 AND j.is_active = TRUE`. Jadwal dengan status non-aktif (`is_active = FALSE`) atau tidak terdaftar secara konsisten menghasilkan `ErrScheduleNotFound`.

---

## 10. PROTOKOL TESTING (UNIT & INTEGRATION TESTS)

### A. Menjalankan Unit Test (100% Offline & Cepat)
Unit test menggunakan mock database in-memory (`internal/testutil`) untuk memverifikasi pemetaan kolom, batas pagination, penanganan error jaringan, dan logika validasi rute tanpa memerlukan PostgreSQL fisik:
```powershell
Set-Location services/api
go test -v ./...
```

### B. Menjalankan Integration Test (PostgreSQL 18 Aktual)
Integration test menguji eksekusi kueri langsung terhadap instance PostgreSQL 18.
- **Isolasi Mutlak (Zero Residue):** Seluruh mutasi dijalankan dalam transaksi atomik (`tx.Begin`) dan **selalu diakhiri dengan `ROLLBACK`**. Database pengujian tidak akan mengalami perubahan data permanen.
- **Kredensial Aman:** Diaktifkan hanya jika environment variable `RUN_INTEGRATION_TESTS=true` dan `DB_PASSWORD` disetel:
```powershell
$env:RUN_INTEGRATION_TESTS = "true"
$env:DB_NAME = "travora_migration_cycle_d431b3933a67"
$env:DB_PASSWORD = "your_postgres_password"
go test -v -run "TestMasterData_Integration|TestSchedule_Integration" ./...
$env:RUN_INTEGRATION_TESTS = $null
$env:DB_PASSWORD = $null
```
Jika variabel di atas tidak disediakan, Go testing runner secara otomatis melaporkan status **`SKIPPED`** (bukan PASS palsu), menjaga integritas hasil uji pada lingkungan CI/CD standar.

---

## 11. BUKTI EMPIRIS VALIDASI RUNTIME POSTGRESQL 18 (PHASE 4C.2 COMPLETED & VERIFIED)

Pada tanggal **12 November 2026**, validasi runtime integrasi penuh antara Go API backend dengan instance PostgreSQL 18 lokal berhasil diselesaikan menggunakan runner isolasi dinamis pada database:

```text
Target Database: travora_repository_it_81c8d65e8232
```

### Hasil Rinci Pengujian Empiris:
1. **Migration UP Awal:** **PASS**
   - Skema DDL `000001_initial_schema.up.sql` berhasil diterapkan tanpa error, memuat 10 tabel inti, 9 identity sequences, 10 primary keys, 14 foreign keys, 5 unique constraints, 3 check constraints, dan 13 index performa.
2. **`TestMasterData_Integration`:** **PASS**
   - Pengambilan kota asal (`ListOriginCities`) terbukti mengembalikan entitas terurut alfabetis.
   - Pengambilan kota tujuan (`ListDestinationCities`) terbukti mengembalikan entitas terurut alfabetis.
   - Pengambilan armada (`ListVehicles`) terbukti memetakan kolom `id_kendaraan`, `jenis_mobil`, `nomor_polisi`, dan `warna_mobil` tanpa kolom `is_active` (sesuai DDL).
3. **`TestSchedule_Integration`:** **PASS**
   - Menggunakan ID eksplisit yang berbeda untuk kota asal (`101` - Bandung) dan kota tujuan (`202` - Jakarta).
   - Berhasil memvalidasi pemisahan jadwal aktif vs non-aktif: `ListPublicSchedules` hanya mengembalikan jadwal dengan `is_active = TRUE`.
   - Filter tanggal terindeks PostgreSQL `DATE` terbukti akurat (`2026-12-05` menemukan jadwal, `2026-12-06` menghasilkan 0 jadwal).
   - Pengambilan detail jadwal (`GetPublicScheduleByID`) terbukti mengembalikan jadwal aktif dan menolak jadwal non-aktif dengan `ErrScheduleNotFound`.
4. **Seluruh Unit Test Suite:** **PASS**
   - 100% unit tests pada paket `config`, `database`, `health`, `masterdata`, dan `schedule` lulus verifikasi lokal.
5. **Verifikasi Rollback & Isolasi Data (Zero Residue):** **PASS**
   - Pemeriksaan kueri pasca-pengujian terhadap tabel fisik membuktikan bahwa seluruh data pengujian sintetis telah dibatalkan secara bersih:
     ```text
      table_name  | cnt 
     -------------+-----
      admin       |   0
      kota_asal   |   0
      kota_tujuan |   0
      kendaraan   |   0
      jadwal      |   0
     (5 rows)
     ```
6. **Retensi Database untuk Audit:**
   - Database `travora_repository_it_81c8d65e8232` dan database referensi sebelumnya (`travora_repository_it_a6527bf226bd`) **dipertahankan utuh dan tidak di-drop** demi transparansi jejak audit teknis.

---

## 12. TECHNICAL DEBT: MASALAH SEMANTIK `chk_jadwal_rute` (ADR CANDIDATE)

Selama pengujian runtime ditemukan anomali desain konstrain database pada tabel `jadwal`:
```sql
CONSTRAINT chk_jadwal_rute CHECK (id_kota_asal <> id_kota_tujuan)
```

### Analisis Masalah Semantik:
1. Kolom `id_kota_asal` adalah foreign key ke tabel `kota_asal(id_kota_asal)` yang memiliki sequence numerik independen (`1, 2, 3...`).
2. Kolom `id_kota_tujuan` adalah foreign key ke tabel `kota_tujuan(id_kota_tujuan)` yang juga memiliki sequence numerik independen (`1, 2, 3...`).
3. Membandingkan dua *surrogate keys* dari dua namespace independen menimbulkan cacat semantik:
   - **False Positive:** Jika rute sah adalah Bandung (id_kota_asal = 1) ke Jakarta (id_kota_tujuan = 1), database menolak rute tersebut karena `1 <> 1` bernilai `FALSE`.
   - **False Negative:** Jika rute tidak sah adalah Surabaya (id_kota_asal = 1) ke Surabaya (id_kota_tujuan = 2), database mengizinkan rute tersebut karena `1 <> 2` bernilai `TRUE`.

### Rekomendasi Arsitektural / Usulan ADR Berikutnya:
- **Opsi Solusi Utama (Jangka Panjang):** Menggabungkan tabel `kota_asal` dan `kota_tujuan` menjadi satu tabel kanonikal `kota (id_kota, nm_kota)`, sehingga kedua FK di tabel `jadwal` merujuk ke domain kunci yang identik. Pada rancangan ini, `CHECK (id_kota_asal <> id_kota_tujuan)` bekerja 100% akurat.
- **Mitigasi Saat Ini:** Validasi rute ditegakkan secara ketat pada Service Layer (`schedule.Service`) dengan memeriksa kesamaan nama kota sebelum kueri diteruskan ke database.
- Masalah ini dicatat sebagai **Technical Debt Resmi** yang akan ditinjau pada sesi *Architectural Decision Record (ADR)* khusus tanpa mengubah baseline migrasi saat ini.

---

## 13. DESAIN HTTP REST HANDLERS & PUBLIC API (PHASE 4C.3)

Phase 4C.3 mengimplementasikan lapisan HTTP REST Handler dan router terpusat untuk mengekspos endpoint publik bagi frontend Travora (Vite React), mengintegrasikan Service Layer dan Repository Layer yang telah divalidasi pada Phase 4C.2.

### A. Matriks Endpoint HTTP API
Seluruh rute didaftarkan menggunakan fitur modern **Go 1.22+ `http.ServeMux`** yang mendukung spesifikasi HTTP method dan path parameter natively:

| Method | Endpoint | Handler | Deskripsi & Validasi | Status Kode |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/` | `health.Handler.Root` | Root health ping dasar | `200 OK` |
| `GET` | `/health/live` | `health.Handler.Live` | Liveness probe (Zero DB dependency) | `200 OK` |
| `GET` | `/health/ready` | `health.Handler.Ready` | Readiness probe (Memverifikasi `db.Ping()`) | `200 OK` / `503 Unavailable` |
| `GET` | `/api/v1/master-data/origin-cities` | `masterdata.Handler.ListOriginCities` | Mengambil seluruh kota asal terurut A-Z | `200 OK`, `500 Internal Error` |
| `GET` | `/api/v1/master-data/destination-cities` | `masterdata.Handler.ListDestinationCities` | Mengambil seluruh kota tujuan terurut A-Z | `200 OK`, `500 Internal Error` |
| `GET` | `/api/v1/master-data/vehicles` | `masterdata.Handler.ListVehicles` | Mengambil armada kendaraan aktif | `200 OK`, `500 Internal Error` |
| `GET` | `/api/v1/schedules` | `schedule.Handler.ListSchedules` | Pencarian jadwal aktif (`is_active = TRUE`) dengan filter query params & pagination | `200 OK`, `400 Bad Request`, `500 Internal Error` |
| `GET` | `/api/v1/schedules/{id}` | `schedule.Handler.GetScheduleByID` | Detail jadwal tunggal berdasarkan ID numerik | `200 OK`, `400 Bad Request`, `404 Not Found`, `500 Internal Error` |

*Catatan Routing:* Go 1.22+ `ServeMux` secara otomatis menghasilkan **HTTP 405 Method Not Allowed** jika client memanggil endpoint dengan HTTP method yang tidak terdaftar (misal `POST /api/v1/schedules`), dan **HTTP 404 Not Found** jika endpoint tidak terdaftar.

### B. Format Amplop Respons Standar (`internal/response`)
Seluruh respons API dibungkus dalam format amplop terstruktur yang konsisten (*Envelope Pattern*) dengan header `Content-Type: application/json`:

1. **Respons Sukses Standar:**
   ```json
   {
     "success": true,
     "data": [
       {
         "id_kota_asal": 1,
         "nm_kota_asal": "Bandung"
       }
     ]
   }
   ```

2. **Respons Sukses Terpaginasi (Paginated Envelope):**
   ```json
   {
     "success": true,
     "data": [
       {
         "id_jadwal": 10,
         "harga": 150000,
         "tgl_berangkat": "2026-12-05",
         "jam_berangkat": "08:00:00",
         "is_active": true,
         "id_kendaraan": 1,
         "jenis_mobil": "Toyota HiAce Commuter",
         "nomor_polisi": "D 1234 ABC",
         "id_kota_asal": 101,
         "nm_kota_asal": "Bandung",
         "id_kota_tujuan": 202,
         "nm_kota_tujuan": "Jakarta"
       }
     ],
     "meta": {
       "limit": 20,
       "offset": 0,
       "count": 1
     }
   }
   ```

3. **Respons Error Standar:**
   ```json
   {
     "success": false,
     "error": {
       "code": "INVALID_DATE_FORMAT",
       "message": "format parameter departure_date tidak valid (harus YYYY-MM-DD)"
     }
   }
   ```

### C. Penanganan Konsisten 404 & 405 pada Router (`internal/router/router.go`)
Secara bawaan, `http.ServeMux` Go menghasilkan respons `text/plain` saat rute tidak ditemukan (404) atau method tidak cocok (405). Untuk mematuhi kontrak JSON API Travora:
1. Router dilengkapi middleware `jsonErrorHandler` berbasis `statusRecorder` yang menyadap respons non-JSON pada status 404 dan 405.
2. **404 Not Found:** Mengembalikan amplop JSON berstatus HTTP 404 dengan kode `"NOT_FOUND"` dan pesan `"endpoint tidak ditemukan"`.
3. **405 Method Not Allowed:** Mengembalikan amplop JSON berstatus HTTP 405 dengan kode `"METHOD_NOT_ALLOWED"` dan pesan `"metode HTTP tidak diizinkan"`.
4. Header standar HTTP `Allow: GET, HEAD` yang dihasilkan oleh Go 1.22 `ServeMux` tetap dipertahankan utuh pada respons 405 demi kepatuhan spesifikasi HTTP RFC 9110.

### D. Mekanisme Keamanan Sanitasi Error (*Zero Information Leak*)
1. Seluruh error database dan kegagalan internal dipetakan secara aman ke HTTP 500 dengan pesan generik:
   `"terjadi kesalahan internal pada server"` dan kode `"INTERNAL_ERROR"`.
2. Detail query SQL, nama tabel, credential database, dan stack trace internal sistem **tidak pernah dikirim ke HTTP response**, menjaga kepatuhan OWASP ASVS.
3. Validasi parameter input dilakukan di handler sebelum kueri diteruskan ke service:
   - `BAD_REQUEST` (HTTP 400) bila ID jadwal pada URL bukan integer positif (`/api/v1/schedules/abc` atau `/api/v1/schedules/-5`).
   - `BAD_REQUEST` (HTTP 400) bila query param `limit` bukan integer atau `offset` bernilai negatif.
   - `BAD_REQUEST` (HTTP 400) bila `departure_date` tidak mengikuti format `YYYY-MM-DD`.
   - `BAD_REQUEST` (HTTP 400) bila `origin_city_id` atau `destination_city_id` bukan integer positif, atau keduanya merujuk pada kota yang sama.
   - `NOT_FOUND` (HTTP 404) bila jadwal tidak ada atau berstatus tidak aktif (`is_active = FALSE`).

### E. Middleware CORS Terarah & Evaluasi Metode HTTP (`internal/middleware/cors.go`)
Frontend Vite berjalan pada port terpisah saat pengembangan lokal. Middleware CORS dikonfigurasi dengan whitelist terarah:
- **Allowed Origins:** `http://localhost:5173`, `http://127.0.0.1:5173`, `http://localhost:3000`.
- **Allowed Methods:** `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`.
  - *Evaluasi Arsitektural:* Meskipun Phase 4C.3 hanya mengekspos endpoint publik `GET`, metode `POST`, `PUT`, `PATCH`, dan `DELETE` dipertahankan dalam CORS allowlist agar client mendapatkan respons semantik **HTTP 405 Method Not Allowed** (berformat amplop JSON Travora) saat mencoba endpoint yang belum tersedia, bukan kegagalan level browser (*CORS Network Drop*). Selain itu, ini memfasilitasi kelanjutan fase berikutnya (Phase 4D - Pemesanan Tiket & Autentikasi) tanpa breaking change pada layer CORS.
- **Allowed Headers:** `Content-Type`, `Authorization`, `Accept`, `X-Requested-With`.
- **Preflight Handling:** Request `OPTIONS` segera dijawab dengan **HTTP 204 No Content** tanpa meneruskan request ke handler berikutnya.
- **Strict Isolation:** Origin asing di luar whitelist (misal `https://example.invalid`) tidak mendapatkan header `Access-Control-Allow-Origin`.

### F. Pemisahan Layer Pengujian (Testing Strategy)
Arsitektur pengujian Travora membagi validasi ke dalam 4 lapisan terpisah:
1. **Layer 1 — Unit Testing:** Menggunakan in-memory mock repository/db untuk menguji logika bisnis handler, parsing query, validasi input, status code, dan serialisasi JSON secara terisolasi tanpa ketergantungan jaringan.
2. **Layer 2 — PostgreSQL Integration Testing:** Menjalankan operasi DDL dan kueri aktual terhadap database PostgreSQL 18 (`travora_repository_it_81c8d65e8232`) di dalam transaksi atomik dengan verifikasi rollback 100% (*Zero Residue*).
3. **Layer 3 — Live HTTP Smoke Testing:** Mengompilasi binary API independen, menjalankan proses server pada port terpisah (misal `8085`), dan menguji seluruh HTTP request aktual via jaringan TCP lokal untuk membuktikan ketersediaan endpoint, Content-Type, dan amplop respons.
4. **Layer 4 — Graceful Shutdown Lifecycle:** Menguji kemampuan web server menangani sinyal terminasi OS (`os.Interrupt`, `CTRL_C_EVENT`, `SIGTERM`), menghentikan penerimaan request baru, menuntaskan request aktif (draining), dan menutup connection pool PostgreSQL secara rapi tanpa proses tertinggal (*Zombie Process*).

### G. Ringkasan Verifikasi Mutu & Regression Suite
Seluruh paket backend telah divalidasi dengan rangkaian uji otomatis lokal:
1. **Unit Testing:** `go test -count=1 ./...`
   - `travora/api/internal/config`: **PASS** (1.37s)
   - `travora/api/internal/database`: **PASS** (3.32s)
   - `travora/api/internal/health`: **PASS** (3.59s)
   - `travora/api/internal/masterdata`: **PASS** (0.58s)
   - `travora/api/internal/middleware`: **PASS** (1.75s)
   - `travora/api/internal/response`: **PASS** (3.75s)
   - `travora/api/internal/router`: **PASS** (1.85s)
   - `travora/api/internal/schedule`: **PASS** (0.46s)
   - Total Unit Tests: **100% PASS** di seluruh modul internal.
2. **Static Analysis:** `go vet ./...` -> **PASS** (Nol temuan / zero warnings).
3. **Application Build:** `go build ./...` -> **PASS** (Binary terkompilasi bersih).
4. **Frontend Regression Build:** `npm run build` (`apps/web`) -> **PASS** (`built in 656ms`).

---

**Travora Engineering Team — Phase 4C.1, 4C.2 & 4C.3 COMPLETED & VERIFIED.**

