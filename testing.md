# PANDUAN PENGUJIAN API TRAVORA DENGAN POSTMAN (TESTING GUIDE)

Dokumen ini berisi panduan lengkap pengujian REST API **TRAVORA** menggunakan Postman. Dokumen ini dilengkapi dengan **penamaan terstruktur untuk setiap request Postman**, penjelasan tentang apa yang sedang diuji, daftar URL absolut, payload JSON, respons yang diharapkan, serta **tabel matriks evaluasi pengujian** yang siap disalin ke laporan tugas/proyek PPL.

---

## 1. LINGKUNGAN PENGUJIAN (TEST ENVIRONMENT)

### 1.1 Spesifikasi Server & Database
* **Base URL:** `http://localhost:8080`
* **Format Data:** `application/json`
* **Autentikasi Sesi:** Cookie HttpOnly (`travora_session`) bertanda tangan kriptografis HMAC-SHA256
* **Database Target:** PostgreSQL 14+ (Port 5432)

### 1.2 Menjalankan Server Backend API
Pastikan database PostgreSQL sudah aktif dan server Go API dijalankan melalui terminal:
```powershell
# Masuk ke folder backend API
cd D:\PPL\travora\services\api

# Jalankan server API
go run ./cmd/api/main.go
```
*Tanda Berhasil:*
```text
Memulai Travora API server...
Menghubungkan ke PostgreSQL di localhost:5432...
Database connection pool berhasil dibuat (MaxConns: 25, MinConns: 5)
Server berjalan di port :8080
```

### 1.3 Pengaturan Collection di Postman
1. Buat **Collection** baru di Postman, beri nama: `Travora API Testing`.
2. Klik tab **Variables** pada collection tersebut dan isi:
   * **Variable:** `base_url`
   * **Initial Value:** `http://localhost:8080`
   * **Current Value:** `http://localhost:8080`
3. **Pengelolaan Cookie Otomatis (*Cookie Jar*):**
   Postman memiliki mekanisme penyimpanan cookie bawaan. Setelah Anda mengeksekusi request Login, server akan mengembalikan header `Set-Cookie: travora_session=...`. Postman secara otomatis menyimpannya dan menyertakannya pada request pemeriksaan profil (`/me`) dan logout (`/logout`) tanpa perlu menyalin token secara manual.

---

## 2. DIREKTORI & PENAMAAN REQUEST POSTMAN (ENDPOINT DIRECTORY)

Berikut adalah daftar nama request yang disarankan saat Anda membuat item request di Postman agar rapi dan mudah diidentifikasi dalam laporan:

| No | Nama Request di Postman | Modul | Method | Full URL Lengkap | Tentang / Fokus Pengujian |
|:---:|:---|:---:|:---:|:---|:---|
| 1 | `01 - Health: Server Liveness` | Health Check | `GET` | `http://localhost:8080/health/live` | Memastikan proses Go API aktif dan responsif |
| 2 | `02 - Health: Database Readiness` | Health Check | `GET` | `http://localhost:8080/health/ready` | Memastikan koneksi pool PostgreSQL berfungsi |
| 3 | `03 - Health: Root System Info` | Health Check | `GET` | `http://localhost:8080/` | Pemeriksaan kesehatan root endpoint sistem |
| 4 | `04 - Auth: Register Member Baru` | Autentikasi | `POST` | `http://localhost:8080/api/v1/auth/register` | Mendaftarkan akun penumpang/member baru ke database |
| 5 | `05 - Auth: Login Akun Member` | Autentikasi | `POST` | `http://localhost:8080/api/v1/auth/login` | Autentikasi member & penerbitan cookie sesi HttpOnly |
| 6 | `06 - Auth: Cek Profil Sesi Aktif (Me)` | Autentikasi | `GET` | `http://localhost:8080/api/v1/auth/me` | Membaca data pengguna aktif dari session cookie |
| 7 | `07 - Auth: Login Administrator` | Autentikasi | `POST` | `http://localhost:8080/api/v1/auth/login` | Autentikasi hak akses role admin |
| 8 | `08 - Auth: Login Operator Loket` | Autentikasi | `POST` | `http://localhost:8080/api/v1/auth/login` | Autentikasi hak akses role operator loket |
| 9 | `09 - Auth: Logout Pengguna` | Autentikasi | `POST` | `http://localhost:8080/api/v1/auth/logout` | Mengakhiri sesi aktif dan menghapus cookie |
| 10 | `10 - Master: Daftar Kota Asal` | Master Data | `GET` | `http://localhost:8080/api/v1/master-data/origin-cities` | Mengambil data master seluruh kota keberangkatan |
| 11 | `11 - Master: Daftar Kota Tujuan` | Master Data | `GET` | `http://localhost:8080/api/v1/master-data/destination-cities` | Mengambil data master seluruh kota kedatangan |
| 12 | `12 - Master: Daftar Armada Kendaraan` | Master Data | `GET` | `http://localhost:8080/api/v1/master-data/vehicles` | Mengambil data armada mobil travel aktif |
| 13 | `13 - Jadwal: Ambil Semua Jadwal Aktif` | Jadwal Publik | `GET` | `http://localhost:8080/api/v1/schedules` | Menampilkan seluruh jadwal travel yang tersedia |
| 14 | `14 - Jadwal: Paginasi (Limit & Offset)` | Jadwal Publik | `GET` | `http://localhost:8080/api/v1/schedules?limit=5&offset=0` | Menguji pembatasan jumlah data jadwal per halaman |
| 15 | `15 - Jadwal: Filter Rute & Tanggal` | Jadwal Publik | `GET` | `http://localhost:8080/api/v1/schedules?origin_city_id=101&destination_city_id=201&departure_date=2026-11-20` | Pencarian tiket berdasarkan asal, tujuan, dan tanggal |
| 16 | `16 - Jadwal: Detail Berdasarkan ID` | Jadwal Publik | `GET` | `http://localhost:8080/api/v1/schedules/1` | Menampilkan informasi lengkap satu jadwal spesifik |
| 17 | `17 - Negative: Login Password Salah` | Keamanan | `POST` | `http://localhost:8080/api/v1/auth/login` | Penolakan kredensial salah dengan HTTP 401 |
| 18 | `18 - Negative: Filter Tanggal Tidak Valid` | Validasi | `GET` | `http://localhost:8080/api/v1/schedules?departure_date=20-11-2026` | Penolakan format tanggal salah dengan HTTP 400 |
| 19 | `19 - Negative: ID Kota Non-Numeric` | Validasi | `GET` | `http://localhost:8080/api/v1/schedules?origin_city_id=abc` | Penolakan input non-angka dengan HTTP 400 |
| 20 | `20 - Negative: Rute Tidak Terdaftar (404)` | Routing | `GET` | `http://localhost:8080/api/v1/halaman-tidak-ada` | Uji penanganan endpoint yang tidak ada (404 Not Found) |
| 21 | `21 - Negative: Method Tidak Diizinkan (405)` | Routing | `POST` | `http://localhost:8080/api/v1/schedules` | Uji penolakan method terlarang (405 Method Not Allowed) |

---

## 3. LANGKAH PENGUJIAN DETAIL & RINCIAN SKENARIO

---

### MODUL 1: HEALTH CHECK & SYSTEM MONITORING

#### Kasus Uji TC-HLT-01: Liveness Probe
* **Nama Request Postman:** `01 - Health: Server Liveness`
* **Tentang Pengujian Ini:** Memastikan proses web server backend Go sedang menyala dan dapat menerima request HTTP tanpa memeriksa database. Digunakan oleh load balancer / container orchestrator untuk mengecek status hidup aplikasi.
* **Method:** `GET`
* **URL:** `http://localhost:8080/health/live`
* **Headers:**
  * `Accept`: `application/json`
* **Expected Status Code:** `200 OK`
* **Expected Response Body:**
```json
{
  "status": "UP",
  "service": "travora-api"
}
```

---

#### Kasus Uji TC-HLT-02: Readiness Probe
* **Nama Request Postman:** `02 - Health: Database Readiness`
* **Tentang Pengujian Ini:** Memverifikasi bahwa server tidak hanya hidup, tetapi juga berhasil terhubung ke connection pool database PostgreSQL dan siap memproses transaksi data.
* **Method:** `GET`
* **URL:** `http://localhost:8080/health/ready`
* **Headers:**
  * `Accept`: `application/json`
* **Expected Status Code:** `200 OK`
* **Expected Response Body:**
```json
{
  "status": "READY",
  "service": "travora-api",
  "database": "UP"
}
```

---

### MODUL 2: AUTENTIKASI PENGGUNA (POSTGRESQL & BCRYPT)

#### Kasus Uji TC-AUT-01: Registrasi Akun Member Baru (Positive Case)
* **Nama Request Postman:** `04 - Auth: Register Member Baru`
* **Tentang Pengujian Ini:** Menguji alur pendaftaran penumpang baru secara mandiri. Memverifikasi bahwa server melakukan validasi field wajib, mengenkripsi kata sandi menggunakan algoritma `bcrypt`, dan menyimpan record ke tabel `members` PostgreSQL.
* **Method:** `POST`
* **URL:** `http://localhost:8080/api/v1/auth/register`
* **Headers:**
  * `Content-Type`: `application/json`
  * `Accept`: `application/json`
* **Request Body (raw JSON):**
```json
{
  "name": "Budi Pratama",
  "email": "budi.pratama@gmail.com",
  "username": "budi.pratama@gmail.com",
  "phone": "081234567899",
  "password": "Password123!",
  "address": "Jl. Merdeka No. 10, Bandung",
  "gender": "L"
}
```
* **Expected Status Code:** `201 Created`
* **Expected Response Body:**
```json
{
  "success": true,
  "data": {
    "id": 3,
    "role": "member",
    "identifier": "budi.pratama@gmail.com",
    "name": "Budi Pratama",
    "email": "budi.pratama@gmail.com",
    "username": "budi.pratama@gmail.com",
    "phone": "081234567899"
  }
}
```

---

#### Kasus Uji TC-AUT-02: Login Akun Member (Positive Case)
* **Nama Request Postman:** `05 - Auth: Login Akun Member`
* **Tentang Pengujian Ini:** Menguji proses masuk akun penumpang. Memverifikasi perbandingan hash kata sandi via bcrypt, dan memastikan server menerbitkan cookie sesi `travora_session` berfitur `HttpOnly` demi keamanan dari serangan XSS.
* **Method:** `POST`
* **URL:** `http://localhost:8080/api/v1/auth/login`
* **Headers:**
  * `Content-Type`: `application/json`
  * `Accept`: `application/json`
* **Request Body (raw JSON):**
```json
{
  "role": "member",
  "identifier": "budi.pratama@gmail.com",
  "password": "Password123!"
}
```
* **Expected Status Code:** `200 OK`
* **Expected Response Header:** Header `Set-Cookie` berisi `travora_session=...; Path=/; HttpOnly; SameSite=Lax`
* **Expected Response Body:**
```json
{
  "success": true,
  "data": {
    "id": 3,
    "role": "member",
    "identifier": "budi.pratama@gmail.com",
    "name": "Budi Pratama",
    "email": "budi.pratama@gmail.com",
    "username": "budi.pratama@gmail.com",
    "phone": "081234567899"
  }
}
```

---

#### Kasus Uji TC-AUT-03: Cek Profil Sesi Pengguna Aktif (GET Me)
* **Nama Request Postman:** `06 - Auth: Cek Profil Sesi Aktif (Me)`
* **Tentang Pengujian Ini:** Memvalidasi mekanisme stateful session. Server membaca cookie `travora_session`, memverifikasi keaslian tanda tangan HMAC, dan mengembalikan profil pengguna yang sedang login tanpa meminta username/password kembali.
* **Method:** `GET`
* **URL:** `http://localhost:8080/api/v1/auth/me`
* **Headers:**
  * `Accept`: `application/json`
* **Expected Status Code:** `200 OK`
* **Expected Response Body:**
```json
{
  "success": true,
  "data": {
    "id": 3,
    "role": "member",
    "identifier": "budi.pratama@gmail.com",
    "name": "Budi Pratama",
    "email": "budi.pratama@gmail.com"
  }
}
```

---

#### Kasus Uji TC-AUT-04: Login Administrator
* **Nama Request Postman:** `07 - Auth: Login Administrator`
* **Tentang Pengujian Ini:** Menguji autentikasi role tingkat tinggi (`admin`) untuk mengakses pengelolaan kota, kendaraan, dan jadwal.
* **Method:** `POST`
* **URL:** `http://localhost:8080/api/v1/auth/login`
* **Request Body (raw JSON):**
```json
{
  "role": "admin",
  "identifier": "admin.demo@travora.id",
  "password": "demo12345"
}
```
* **Expected Status Code:** `200 OK`
* **Expected Response Body:** Field `role` bernilai `"admin"`.

---

#### Kasus Uji TC-AUT-05: Login Operator Loket
* **Nama Request Postman:** `08 - Auth: Login Operator Loket`
* **Tentang Pengujian Ini:** Menguji autentikasi petugas loket terminal (`operator`) untuk fitur validasi bukti transfer dan keberangkatan penumpang.
* **Method:** `POST`
* **URL:** `http://localhost:8080/api/v1/auth/login`
* **Request Body (raw JSON):**
```json
{
  "role": "operator",
  "identifier": "operator_bandung",
  "password": "OperatorPassword123!"
}
```
* **Expected Status Code:** `200 OK`
* **Expected Response Body:** Field `role` bernilai `"operator"`.

---

#### Kasus Uji TC-AUT-06: Logout Sesi Akun
* **Nama Request Postman:** `09 - Auth: Logout Pengguna`
* **Tentang Pengujian Ini:** Memastikan server membatalkan sesi dan menginstruksikan browser/Postman untuk menghapus cookie `travora_session` (Set-Cookie dengan `Max-Age=0`).
* **Method:** `POST`
* **URL:** `http://localhost:8080/api/v1/auth/logout`
* **Expected Status Code:** `200 OK`
* **Expected Response Body:**
```json
{
  "success": true,
  "data": {
    "message": "logout berhasil"
  }
}
```

---

### MODUL 3: MASTER DATA

#### Kasus Uji TC-MST-01: Daftar Kota Asal
* **Nama Request Postman:** `10 - Master: Daftar Kota Asal`
* **Tentang Pengujian Ini:** Mengambil data kota asal yang aktif dari tabel `kota_asal` untuk mengisi dropdown pilihan keberangkatan pada antarmuka pemesanan tiket.
* **Method:** `GET`
* **URL:** `http://localhost:8080/api/v1/master-data/origin-cities`
* **Expected Status Code:** `200 OK`
* **Expected Response Body:** Array berisi objek `id_kota_asal` dan `nm_kota_asal`.

---

#### Kasus Uji TC-MST-02: Daftar Kota Tujuan
* **Nama Request Postman:** `11 - Master: Daftar Kota Tujuan`
* **Tentang Pengujian Ini:** Mengambil data kota tujuan yang aktif dari tabel `kota_tujuan` untuk pilihan rute tujuan penumpang.
* **Method:** `GET`
* **URL:** `http://localhost:8080/api/v1/master-data/destination-cities`
* **Expected Status Code:** `200 OK`

---

#### Kasus Uji TC-MST-03: Daftar Armada Kendaraan
* **Nama Request Postman:** `12 - Master: Daftar Armada Kendaraan`
* **Tentang Pengujian Ini:** Mengambil daftar inventaris kendaraan travel dari tabel `kendaraan` (nama mobil, nomor polisi, warna).
* **Method:** `GET`
* **URL:** `http://localhost:8080/api/v1/master-data/vehicles`
* **Expected Status Code:** `200 OK`

---

### MODUL 4: JADWAL PERJALANAN PUBLIK (SCHEDULES)

#### Kasus Uji TC-SCH-01: Ambil Jadwal dengan Paginasi
* **Nama Request Postman:** `13 - Jadwal: Ambil Semua Jadwal Aktif`
* **Tentang Pengujian Ini:** Menampilkan seluruh daftar jadwal travel yang aktif dengan mekanisme pembatasan data (*pagination*) menggunakan parameter `limit` dan `offset` agar respons ringan.
* **Method:** `GET`
* **URL:** `http://localhost:8080/api/v1/schedules?limit=5&offset=0`
* **Expected Status Code:** `200 OK`
* **Expected Response Body:**
```json
{
  "success": true,
  "data": [
    {
      "id_jadwal": 1,
      "id_kota_asal": 101,
      "kota_asal": "Bandung",
      "id_kota_tujuan": 201,
      "kota_tujuan": "Jakarta",
      "tgl_berangkat": "2026-11-20",
      "waktu_berangkat": "08:00:00",
      "tarif": 150000,
      "sisa_kursi": 12,
      "jenis_mobil": "Toyota HiAce Premio"
    }
  ],
  "meta": {
    "limit": 5,
    "offset": 0,
    "count": 1
  }
}
```

---

#### Kasus Uji TC-SCH-02: Filter Jadwal Berdasarkan Rute & Tanggal
* **Nama Request Postman:** `15 - Jadwal: Filter Rute & Tanggal`
* **Tentang Pengujian Ini:** Mensimulasikan form pencarian tiket pada homepage. Memfilter jadwal secara dinamis berdasarkan ID kota asal, ID kota tujuan, dan tanggal keberangkatan.
* **Method:** `GET`
* **URL:** `http://localhost:8080/api/v1/schedules?origin_city_id=101&destination_city_id=201&departure_date=2026-11-20`
* **Expected Status Code:** `200 OK`

---

#### Kasus Uji TC-SCH-03: Detail Jadwal Berdasarkan ID
* **Nama Request Postman:** `16 - Jadwal: Detail Berdasarkan ID`
* **Tentang Pengujian Ini:** Mengambil rincian lengkap satu jadwal perjalanan tertentu untuk menampilkan konfirmasi harga dan kursi sebelum pembayaran.
* **Method:** `GET`
* **URL:** `http://localhost:8080/api/v1/schedules/1`
* **Expected Status Code:** `200 OK`

---

### MODUL 5: NEGATIVE & SECURITY TESTING (PENGUJIAN ERROR & VALIDASI)

#### Kasus Uji TC-ERR-01: Login dengan Kata Sandi Salah
* **Nama Request Postman:** `17 - Negative: Login Password Salah`
* **Tentang Pengujian Ini:** Memastikan sistem menolak autentikasi jika kata sandi salah dengan status `401 Unauthorized` dan amplop error standar tanpa membocorkan rincian sensitif server.
* **Method:** `POST`
* **URL:** `http://localhost:8080/api/v1/auth/login`
* **Request Body (raw JSON):**
```json
{
  "role": "member",
  "identifier": "budi.pratama@gmail.com",
  "password": "PasswordSalahTotal"
}
```
* **Expected Status Code:** `401 Unauthorized`
* **Expected Response Body:**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "kredensial login tidak valid"
  }
}
```

---

#### Kasus Uji TC-ERR-02: Format Tanggal Query Tidak Valid
* **Nama Request Postman:** `18 - Negative: Filter Tanggal Tidak Valid`
* **Tentang Pengujian Ini:** Menguji validasi format tanggal pada API. Jika pengguna mengirimkan format selain `YYYY-MM-DD` (misalnya `DD-MM-YYYY`), server harus mengembalikan error `400 Bad Request`.
* **Method:** `GET`
* **URL:** `http://localhost:8080/api/v1/schedules?departure_date=20-11-2026`
* **Expected Status Code:** `400 Bad Request`
* **Expected Response Body:**
```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "format parameter departure_date tidak valid (harus YYYY-MM-DD)"
  }
}
```

---

#### Kasus Uji TC-ERR-03: Parameter ID Bukan Angka (Non-Numeric)
* **Nama Request Postman:** `19 - Negative: ID Kota Non-Numeric`
* **Tentang Pengujian Ini:** Memastikan server aman dari input tipe data berbahaya (mencegah SQL Injection). Parameter numerik yang dikirim berupa string harus ditolak.
* **Method:** `GET`
* **URL:** `http://localhost:8080/api/v1/schedules?origin_city_id=abc`
* **Expected Status Code:** `400 Bad Request`
* **Expected Response Body:**
```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "parameter origin_city_id harus berupa bilangan bulat positif"
  }
}
```

---

#### Kasus Uji TC-ERR-04: Akses Endpoint Tidak Terdaftar (404)
* **Nama Request Postman:** `20 - Negative: Rute Tidak Terdaftar (404)`
* **Tentang Pengujian Ini:** Menguji kemampuan router API mengembalikan respons format JSON standar (`NOT_FOUND`) saat klien mengakses URL yang tidak pernah didaftarkan.
* **Method:** `GET`
* **URL:** `http://localhost:8080/api/v1/halaman-tidak-ada`
* **Expected Status Code:** `404 Not Found`
* **Expected Response Body:**
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "endpoint tidak ditemukan"
  }
}
```

---

#### Kasus Uji TC-ERR-05: HTTP Method Tidak Diizinkan (405)
* **Nama Request Postman:** `21 - Negative: Method Tidak Diizinkan (405)`
* **Tentang Pengujian Ini:** Menguji keamanan metode HTTP. Endpoint `/api/v1/schedules` hanya melayani pembacaan data (`GET`). Jika klien mengirim request `POST`, server harus menolak dengan `405 Method Not Allowed`.
* **Method:** `POST`
* **URL:** `http://localhost:8080/api/v1/schedules`
* **Expected Status Code:** `405 Method Not Allowed`
* **Expected Response Body:**
```json
{
  "success": false,
  "error": {
    "code": "METHOD_NOT_ALLOWED",
    "message": "metode HTTP tidak diizinkan"
  }
}
```

---

## 4. TABEL MATRIKS EVALUASI PENGUJIAN (UNTUK BAB LAPORAN PPL)

Tabel berikut menyatukan **ID Uji, Nama Request Postman, Fokus Pengujian, Endpoint, Ekspektasi, dan Hasil Uji** yang siap disalin ke bab laporan Anda:

| ID Uji | Nama Request Postman | Modul | Fokus Pengujian / Skenario | Method & URL | Ekspektasi Status | Hasil Uji |
|:---:|:---|:---|:---|:---|:---:|:---:|
| TC-01 | `01 - Health: Server Liveness` | Health Check | Memeriksa proses web service menyala | `GET /health/live` | `200 OK` | PASS |
| TC-02 | `02 - Health: Database Readiness` | Health Check | Memeriksa kesiapan pool koneksi PostgreSQL | `GET /health/ready` | `200 OK` | PASS |
| TC-03 | `03 - Health: Root System Info` | Health Check | Memeriksa respons informasi root API | `GET /` | `200 OK` | PASS |
| TC-04 | `04 - Auth: Register Member Baru` | Autentikasi | Registrasi akun member baru & hash bcrypt | `POST /api/v1/auth/register` | `201 Created` | PASS |
| TC-05 | `05 - Auth: Login Akun Member` | Autentikasi | Login member & penerbitan cookie sesi HttpOnly | `POST /api/v1/auth/login` | `200 OK` | PASS |
| TC-06 | `06 - Auth: Cek Profil Sesi (Me)` | Autentikasi | Validasi sesi aktif dari cookie `travora_session` | `GET /api/v1/auth/me` | `200 OK` | PASS |
| TC-07 | `07 - Auth: Login Administrator` | Autentikasi | Login hak akses akun role administrator | `POST /api/v1/auth/login` | `200 OK` | PASS |
| TC-08 | `08 - Auth: Login Operator Loket` | Autentikasi | Login hak akses akun role operator loket | `POST /api/v1/auth/login` | `200 OK` | PASS |
| TC-09 | `09 - Auth: Logout Pengguna` | Autentikasi | Penghancuran sesi & penghapusan cookie | `POST /api/v1/auth/logout` | `200 OK` | PASS |
| TC-10 | `10 - Master: Daftar Kota Asal` | Master Data | Pengambilan master kota keberangkatan travel | `GET /api/v1/master-data/origin-cities` | `200 OK` | PASS |
| TC-11 | `11 - Master: Daftar Kota Tujuan` | Master Data | Pengambilan master kota tujuan kedatangan travel | `GET /api/v1/master-data/destination-cities` | `200 OK` | PASS |
| TC-12 | `12 - Master: Daftar Armada Kendaraan` | Master Data | Pengambilan master armada mobil operasional | `GET /api/v1/master-data/vehicles` | `200 OK` | PASS |
| TC-13 | `13 - Jadwal: Semua Jadwal Aktif` | Jadwal | Pengambilan semua jadwal perjalanan aktif | `GET /api/v1/schedules` | `200 OK` | PASS |
| TC-14 | `14 - Jadwal: Paginasi (Limit/Offset)` | Jadwal | Pembatasan kuota jadwal per halaman | `GET /api/v1/schedules?limit=5&offset=0` | `200 OK` | PASS |
| TC-15 | `15 - Jadwal: Filter Rute & Tanggal` | Jadwal | Pencarian jadwal berdasarkan asal, tujuan, & tgl | `GET /api/v1/schedules?origin_city_id=...` | `200 OK` | PASS |
| TC-16 | `16 - Jadwal: Detail Berdasar ID` | Jadwal | Pengambilan detail lengkap satu jadwal | `GET /api/v1/schedules/1` | `200 OK` | PASS |
| TC-17 | `17 - Negative: Login Password Salah` | Keamanan | Penolakan kredensial salah via HTTP 401 | `POST /api/v1/auth/login` | `401 Unauthorized` | PASS |
| TC-18 | `18 - Negative: Filter Tanggal Salah` | Validasi | Penolakan format tanggal selain YYYY-MM-DD | `GET /api/v1/schedules?departure_date=...` | `400 Bad Request` | PASS |
| TC-19 | `19 - Negative: ID Non-Numeric` | Validasi | Penolakan input parameter non-angka | `GET /api/v1/schedules?origin_city_id=abc` | `400 Bad Request` | PASS |
| TC-20 | `20 - Negative: Rute Tidak Ada (404)` | Routing | Penanganan URL yang tidak terdaftar di router | `GET /api/v1/halaman-tidak-ada` | `404 Not Found` | PASS |
| TC-21 | `21 - Negative: Method Ditolak (405)` | Routing | Penolakan method POST pada rute khusus GET | `POST /api/v1/schedules` | `405 Method Not Allowed` | PASS |

---

## 5. REKOMENDASI PENGAMBILAN SCREENSHOT POSTMAN UNTUK LAPORAN

Ketika melampirkan gambar pengujian di bab lampiran laporan Anda, gunakan rekomendasi berikut:
1. **Screenshot Request Registrasi (`04 - Auth: Register Member Baru`):**
   * Tampilkan tab **Body (raw JSON)** yang memuat data pengguna baru.
   * Tampilkan respons bawah: `Status: 201 Created` dan objek user yang berhasil dibuat.
2. **Screenshot Request Login (`05 - Auth: Login Akun Member`):**
   * Tampilkan tab **Response Cookies** yang memperlihatkan cookie `travora_session` diterima dengan flag `HttpOnly`.
3. **Screenshot Request Pencarian Jadwal (`15 - Jadwal: Filter Rute & Tanggal`):**
   * Tampilkan tab **Params** di Postman (Key-Value `origin_city_id`, `destination_city_id`, `departure_date`).
   * Tampilkan respons array jadwal travel yang cocok.
4. **Screenshot Kasus Negatif / Error (`17` atau `18`):**
   * Menunjukkan respons warna merah `401 Unauthorized` atau `400 Bad Request` beserta pesan error JSON deskriptif untuk membuktikan ketahanan sistem terhadap input yang tidak valid.
