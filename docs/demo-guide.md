# PANDUAN EKSEKUSI DEMONSTRASI TRAVORA (LIVE MVP)
**Target Demonstrasi:** 13 November 2026  
**Arsitektur:** React 19 (Frontend) + Go 1.24 REST API (Backend) + PostgreSQL 18 (Database)  
**Status Proyek:** **APPLICATION FREEZE (SIAP DEMO)**

---

## 1. Ringkasan Ekosistem & Komponen Demonstrasi

| Komponen | Teknologi | Port Default | Status Integrasi |
|---|---|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS | `http://localhost:5173` | Terhubung langsung ke Go API untuk Autentikasi, Pencarian & Detail Jadwal |
| **Backend** | Go 1.24, `net/http`, `pgxpool/v5` | `http://localhost:8080` | Terhubung ke PostgreSQL 18, CORS `http://localhost:5173`, Cookie HttpOnly |
| **Database** | PostgreSQL 18 (Native Service) | `localhost:5432` | Database demonstrasi: `travora_demo_20261113` |

---

## 2. Prasyarat Lingkungan (Environment Prerequisites)

Pastikan lingkungan lokal memenuhi versi perangkat lunak berikut:
1. **Node.js:** Versi 20+ atau 22+ LTS (`node -v`) & `npm` / `pnpm`.
2. **Go:** Versi 1.24+ (`go version`).
3. **PostgreSQL:** Versi 18 aktif pada `localhost:5432` (`psql -V`).

---

## 3. Persiapan Database Demonstrasi (`travora_demo_20261113`)

Database demonstrasi terpisah telah disiapkan untuk memastikan data audit integritas sebelumnya tetap terlindungi.

### Menjalankan Inisialisasi & Seeding Database (Hanya Sekali)
Buka terminal PowerShell dan jalankan:

```powershell
powershell -ExecutionPolicy Bypass -File "scratch\setup_demo_database.ps1"
```

Skrip ini akan secara otomatis:
1. Membuat database `travora_demo_20261113` jika belum ada.
2. Menerapkan 10 tabel resmi dari skema migrasi `database/migrations/000001_initial_schema.up.sql`.
3. Memasukkan seed data demonstrasi realistis dari `database/seeds/demo_seed.sql`:
   - **5 Kota Asal:** Bandung (101), Jakarta (102), Yogyakarta (103), Surabaya (104), Semarang (105).
   - **5 Kota Tujuan:** Jakarta (201), Bandung (202), Surabaya (203), Yogyakarta (204), Semarang (205).
   - **5 Armada Kendaraan:** Toyota HiAce Premio, Toyota HiAce Commuter, Isuzu Elf, Mercedes-Benz Sprinter VIP, Toyota Innova Zenix.
   - **24 Jadwal Perjalanan Terjadwal:** untuk tanggal **13 November 2026**, 14 November 2026, dan masa depan.

---

## 4. Menjalankan Aplikasi (Langkah per Langkah)

### Terminal 1 — Menjalankan Go API Server (Backend)

```powershell
cd d:\PPL\travora\services\api

# Pasang target database ke travora_demo_20261113
$env:DB_NAME = "travora_demo_20261113"
$env:APP_PORT = "8080"
$env:DB_USER = "postgres"
$env:DB_PASSWORD = "PASSWORD_POSTGRES_ANDA"   # ganti sesuai password lokal Anda

# Jalankan Go API
go run ./cmd/api
```

*Indikator Berhasil:*
```text
Memulai Travora API server...
Menghubungkan ke PostgreSQL di localhost:5432 (Database: travora_demo_20261113, User: postgres)...
Database connection pool berhasil dibuat (MaxConns: 25, MinConns: 5)
Travora API aktif mendengarkan pada :8080 (Env: development)
```

---

### Terminal 2 — Menjalankan React Frontend

```powershell
cd d:\PPL\travora\apps\web

# Jalankan development server Vite
npm run dev
```

*Indikator Berhasil:*
```text
  VITE v8.3.8  ready in 180 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

Buka peramban (*browser*) Anda ke: **`http://localhost:5173`**

---

## 5. Autentikasi Multi-Role & Akun Demonstrasi (Real Database Auth)

Halaman `/login` kini mendukung pergantian peran secara terpadu melalui tiga tab yang terhubung langsung ke backend PostgreSQL:

| Role | Tabel Database | Kolom Identifier | Akun Demo Seed | Tujuan Redirect | Cakupan Akses |
|---|---|---|---|---|---|
| **Member** | `member` | `username` | `budi_santoso` / `siti_nurhaliza` | `/member` | Pemesanan tiket, riwayat pesanan, konfirmasi transfer, pengajuan keluhan |
| **Admin** | `admin` | `email` | `admin@travora.id` | `/admin` | Manajemen kota asal, kota tujuan, armada kendaraan, jadwal perjalanan, review keluhan |
| **Pengelola Loket** | `operator_loket` | `username` | `operator_bandung` / `operator_jakarta` | `/operator` | Verifikasi bukti transfer pembayaran manual, validasi manifest keberangkatan penumpang |

### Menyetel Kata Sandi Baru pada Database (CLI Tool SetPassword)
Untuk menyetel kata sandi akun demo ke database PostgreSQL dengan enkripsi bcrypt yang aman tanpa menampilkan password ke disk atau log:

```powershell
cd d:\PPL\travora\services\api

# Set password untuk Member budi_santoso
go run ./cmd/setpassword -role member -id budi_santoso -password "PasswordBaru123"

# Set password untuk Admin admin@travora.id
go run ./cmd/setpassword -role admin -id admin@travora.id -password "PasswordBaru123"

# Set password untuk Operator operator_bandung
go run ./cmd/setpassword -role operator -id operator_bandung -password "PasswordBaru123"
```

---

## 6. Skenario Alur Demonstrasi Live (End-to-End Walkthrough)

### Skenario A: Pencarian Jadwal Terjadwal dari Homepage (100% Live PostgreSQL)
1. **Buka Beranda:** Kunjungi `http://localhost:5173`. Dropdown *Kota Asal* dan *Kota Tujuan* diambil langsung secara dinamis dari API (`/api/v1/master-data/...`).
2. **Pilih Rute Cepat:** Klik kartu *"Bandung — Jakarta"* pada bagian *Contoh Rute Perjalanan*.
   - Kota Asal otomatis terpilih **Bandung**.
   - Kota Tujuan otomatis terpilih **Jakarta**.
   - Tanggal otomatis terisi **13 November 2026**.
3. **Klik "Cari Jadwal Perjalanan":**
   - Frontend mengirimkan request ke `http://localhost:8080/api/v1/schedules?origin_city_id=101&destination_city_id=201&departure_date=2026-11-13`.
   - Go API memproses query dengan SQL parameterized ke PostgreSQL 18.
   - Halaman `/schedules` menampilkan **5 jadwal perjalanan aktif** dengan tarif transparan:
     * 07:00 WIB — Toyota HiAce Premio (Rp 150.000)
     * 09:30 WIB — Toyota HiAce Commuter (Rp 135.000)
     * 13:00 WIB — Mercedes-Benz Sprinter VIP (Rp 220.000)
     * 16:30 WIB — Toyota HiAce Premio (Rp 150.000)
     * 19:30 WIB — Toyota Innova Zenix (Rp 175.000)

### Skenario B: Detail Jadwal Individual (REST API Verification)
1. Pada salah satu kartu jadwal (misalnya keberangkatan 13:00 WIB), klik tombol **"Pilih Tiket"**.
2. Modal dialog muncul dan menampilkan rincian perjalanan yang diambil secara individual melalui endpoint `GET /api/v1/schedules/{id}`.
3. Menunjukkan verifikasi identitas armada (Nomor Polisi: `B 3456 TRV`, Tipe: `Mercedes-Benz Sprinter VIP (8 Kursi)`).

### Skenario C: Empty State (Kondisi Tidak Ada Jadwal)
1. Buka kembali form pencarian via *"Ubah Kriteria Pencarian"*.
2. Ubah tanggal keberangkatan ke tanggal di masa depan yang sengaja tidak memiliki jadwal (misal: `2026-11-25`).
3. Klik *"Cari Jadwal Perjalanan"*.
4. Sistem menampilkan **Empty State** yang informatif dan ramah pengguna, bukan halaman rusak atau crash.
5. Klik tombol *"Lihat Rute Bandung — Jakarta (13 Nov 2026)"* untuk kembali ke jadwal demonstrasi.

### Skenario D: Error Handling Nyata (Tanpa Silent Mock Fallback)
1. Matikan proses Go API di Terminal 1 (tekan `Ctrl+C`).
2. Lakukan pencarian kembali di frontend.
3. Frontend menampilkan **Error State** eksplisit:
   > *"Gagal terhubung ke API backend (http://localhost:8080/api/v1/schedules...). Pastikan Go API Server menyala pada port yang sesuai."*
4. Membuktikan kepatuhan bahwa sistem **tidak melakukan fallback diam-diam ke data mock**.
5. Nyalakan kembali Go API di Terminal 1, lalu klik *"Coba Lagi"* pada frontend untuk membuktikan pemulihan otomatis.

### Skenario E: Login Multi-Role, Session Cookie & Route Guard
1. **Buka Halaman Login:** Akses `http://localhost:5173/login`.
2. **Pilih Tab Role:** Klik tab **Member**, **Admin**, atau **Pengelola Loket**. Form otomatis menyesuaikan input identifier (Email untuk Admin, Username untuk Member/Operator).
3. **Ketik Kredensial & Masuk:** Ketik identifier dan kata sandi, lalu klik tombol **"Masuk ke Akun"**.
4. **Verifikasi Route Guard:**
   - Saat masuk sebagai **Member**, coba ketik URL `http://localhost:5173/admin` pada address bar browser. Sistem otomatis memblokir akses dan mengembalikan ke login.
   - Saat masuk sebagai **Admin**, coba ketik URL `http://localhost:5173/operator`. Sistem memblokir akses lintas role.
5. **Verifikasi Session Persistence:** Tekan tombol **Refresh (F5)** browser pada dashboard mana pun; session tetap aktif melalui pemulihan sesi `/api/v1/auth/me`.
6. **Verifikasi Logout:** Klik tombol *"Keluar"* pada sidebar atau header dashboard. Session dibersihkan di browser dan backend.

### Skenario F: Alur Transaksi Pemesanan & Operasional (Mock UI Demo)
1. **Member Pemesanan Kursi:** Akses `/member/booking`, pilih jadwal, pilih nomor kursi pada denah interaktif, klik "Lanjut ke Pembayaran".
2. **Member Konfirmasi Pembayaran:** Masuk ke form konfirmasi transfer, isi nama pengirim, nomor rekening, bank asal, dan jumlah transfer.
3. **Operator Verifikasi:** Login sebagai Operator Loket (`/operator`), buka menu *Verifikasi Pembayaran*, verifikasi data transfer dan klik "Setujui Pembayaran".
4. **Operator Validasi Boarding:** Buka menu *Validasi Tiket*, masukkan nomor tiket / kode booking, klik "Validasi Keberangkatan" untuk menandai penumpang hadir.
5. **Admin Review & Keluhan:** Login sebagai Admin (`/admin`), buka menu *Keluhan Pelanggan*, balas keluhan penumpang dengan tanggapan resmi.

---

## 7. Klasifikasi Status Fitur Transaksi (Audit Transparan)

Untuk integritas teknis, berikut klasifikasi transparan dari seluruh fitur transaksi Travora:

| Fitur / Modul | Status Implementasi | Penyimpanan / Driver | Catatan Teknis |
|---|:---:|:---:|---|
| **Pencarian Jadwal Publik** | **PostgreSQL-backed** | PostgreSQL 18 (`jadwal`, `kota_asal`, `kota_tujuan`, `kendaraan`) | Endpoint `GET /api/v1/schedules` & detail `GET /api/v1/schedules/{id}` |
| **Master Data Kota & Kendaraan** | **PostgreSQL-backed** | PostgreSQL 18 (`kota_asal`, `kota_tujuan`, `kendaraan`) | Endpoint `GET /api/v1/master-data/...` |
| **Autentikasi Multi-Role** | **PostgreSQL-backed** | PostgreSQL 18 (`admin`, `member`, `operator_loket`) | Bcrypt hash, HttpOnly secure cookie, endpoints `/api/v1/auth/...` |
| **Pemilihan Kursi (Seat Layout)** | **Mock / LocalStorage** | `sharedStore` (Browser Storage) | Visual interactive UI denah kursi sesuai tipe armada |
| **Pemesanan Tiket (Pesan)** | **Mock / LocalStorage** | `sharedStore` (Browser Storage) | Simulasi pembuatan pesanan dan penomoran tiket |
| **Konfirmasi Transfer Manual** | **Mock / LocalStorage** | `sharedStore` (Browser Storage) | Form pengisian bukti transfer untuk review loket |
| **Verifikasi Pembayaran Loket** | **Mock / LocalStorage** | `sharedStore` (Browser Storage) | Dashboard operator untuk approval bukti transfer |
| **Validasi Boarding Penumpang** | **Mock / LocalStorage** | `sharedStore` (Browser Storage) | Dashboard operator untuk checklist keberangkatan |
| **Pengajuan & Respon Keluhan** | **Mock / LocalStorage** | `sharedStore` (Browser Storage) | Alur keluhan member dan balasan tanggapan admin |
| **CRUD Admin Kota, Armada, Jadwal** | **Mock / LocalStorage** | `sharedStore` (Browser Storage) | Antarmuka manajemen data operasional staf admin |
| **Payment Gateway Otomatis (VA/QRIS)**| **Not Yet Implemented**| - | Direncanakan pada roadmap fase produksi mendatang |
| **Live GPS Tracking Armada** | **Not Yet Implemented**| - | Fitur lanjutan pasca-MVP |
| **Pengembalian Dana Otomatis (Refund)**| **Not Yet Implemented**| - | Fitur lanjutan pasca-MVP |

---

## 8. Prosedur Disaster Recovery (Penanganan Kendala Saat Demo)

Apabila terjadi kendala teknis tak terduga selama demonstrasi, lakukan langkah pemulihan cepat berikut:

### Skenario 1: Backend Go Tidak Merespon / Port Bentrok
1. Buka PowerShell dan hentikan proses lama pada port 8080:
   ```powershell
   Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
   ```
2. Jalankan kembali backend API:
   ```powershell
   cd d:\PPL\travora\services\api
   go run ./cmd/api
   ```

### Skenario 2: Frontend Vite Error atau Crash
1. Hentikan Vite (`Ctrl+C`).
2. Jalankan kembali dengan:
   ```powershell
   cd d:\PPL\travora\apps\web
   npm run dev
   ```

### Skenario 3: Data Simulasi Browser Rusak atau Perlu Reset
1. Buka Developer Tools browser (tekan `F12` atau `Ctrl+Shift+I`).
2. Buka tab **Console**, ketik:
   ```javascript
   localStorage.clear(); location.reload();
   ```
3. Browser akan kembali bersih dengan data default awal.

---

## 9. Prosedur Graceful Shutdown

1. **Menghentikan Frontend:** Tekan `Ctrl+C` pada terminal frontend.
2. **Menghentikan Backend:** Tekan `Ctrl+C` pada terminal Go API. Server Go akan menangani graceful shutdown secara otomatis dan menutup database connection pool:
   ```text
   Sinyal shutdown diterima, memulai pembersihan resources (graceful shutdown)...
   HTTP server berhasil dihentikan secara normal.
   Menutup database connection pool...
   Database connection pool berhasil ditutup.
   Travora API shutdown selesai.
   ```
3. Database `travora_demo_20261113` tetap tersimpan utuh dan siap digunakan kembali kapan saja.
