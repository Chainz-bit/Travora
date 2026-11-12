# TRAVORA — Final Design System & UI/UX Guidelines

**Dokumen Desain Resmi & Panduan Sistem Desain Digital Product**
**Role:** UI/UX Designer & Technical Documentation Reviewer
**Proyek:** TRAVORA — Sistem Informasi Pemesanan Tiket Travel Antar-Kota Berbasis Web
**Tanggal Rilis:** 11 November 2026
**Versi Dokumen:** 2.3.0 (Final Review & Non-Text Contrast Alignment)
**Status Dokumen:**
- **Keputusan Visual:** Disetujui (*Approved Visual Direction*)
- **Pemetaan Teknis & Database:** Menunggu Konfirmasi (*Pending Technical/Database Confirmation*)

---

## 01. Status Dokumen & Acuan ERD Final

Dokumen ini merupakan pedoman antarmuka resmi bagi sistem pemesanan tiket travel antar-kota **TRAVORA**. Seluruh arsitektur informasi, alur interaksi pengguna, spesifikasi komponen, dan penyajian data diselaraskan dengan batasan **10 entitas ERD final**:

1. `Admin`
2. `Member`
3. `Operator_Loket`
4. `Kota_Asal`
5. `Kota_Tujuan`
6. `Kendaraan`
7. `Jadwal`
8. `Pesan`
9. `Konfirmasi_Pesanan`
10. `Keluhan`

### Batasan Arsitektur & Database:
- **Tanpa Entitas Fiktif:** Dilarang mengasumsikan keberadaan entitas di luar ERD seperti `users`, `routes`, `payments`, `bookings`, `drivers`, `facilities`, atau `audit_logs`.
- **Rute Perjalanan:** Hubungan antara kota keberangkatan dan kedatangan direpresentasikan secara langsung melalui relasi `Jadwal` ke `Kota_Asal` dan `Kota_Tujuan`. Tidak ada entitas atau modul pengelolaan rute terpisah.
- **Pemesanan Tiket:** Seluruh transaksi pemesanan dicatat pada entitas `Pesan`.
- **Pembayaran:** Menggunakan formulir konfirmasi transfer bank manual pada entitas `Konfirmasi_Pesanan` yang diverifikasi oleh `Operator_Loket`. Tidak menggunakan payment gateway otomatis, kartu kredit, e-wallet, atau virtual account.
- **Status Database di Repository:** Saat ini file migrasi DDL fisik belum di-commit ke repositori (`database/migrations/` dan `docs/reference/` masih berupa placeholder `.gitkeep`). Oleh karena itu, dokumen ini membedakan secara tegas antara:
  1. *Kebutuhan Informasi UI* (informasi yang ingin dilihat pengguna).
  2. *Atribut Terkonfirmasi* (entitas dan relasi resmi).
  3. *Atribut yang Menunggu Konfirmasi Backend/DDL* (nama kolom spesifik, tipe data, dan enum status).

---

## 02. Kelompok Pengguna & Lingkup Fitur

Sistem Travora melayani 4 kelompok pengguna dengan tanggung jawab operasional yang terdefinisi:

### A. Public Visitor (Pengunjung Umum)
1. **Homepage:** Memadukan gaya *Editorial Modern* dengan informasi layanan travel terpercaya.
2. **Form Pencarian Tiket Sederhana:** Pencarian jadwal berbasis 3 parameter:
   - `Kota_Asal` (Kota Keberangkatan)
   - `Kota_Tujuan` (Kota Kedatangan)
   - `Tgl_Berangkat` (Tanggal Keberangkatan)
3. **Hasil Pencarian Jadwal:** Menampilkan daftar entitas `Jadwal` dan relasi `Kendaraan` yang tersedia.
   - *Kebutuhan Informasi UI:* Jam Keberangkatan, Kota Asal, Kota Tujuan, Kendaraan, dan Harga/Tarif Tiket.
   - *Dibatasi:* Tidak menampilkan estimasi jam tiba, durasi perjalanan, jarak kilometer, atau fasilitas armada karena datanya tidak tersedia di database.
4. **Autentikasi:** Halaman Masuk (*Login*) dan Registrasi (*Register*) bagi Member.

### B. Member (Penumpang Terdaftar)
1. **Dashboard Member:** Ringkasan tiket perjalanan aktif dan status pesanan.
2. **Melihat Jadwal:** Menjelajahi jadwal perjalanan yang tersedia untuk dipesan.
3. **Pemesanan Tiket (`Pesan`):** Membuat data pemesanan baru berdasarkan jadwal yang dipilih.
4. **Pemilihan Nomor Kursi:** Memilih nomor kursi menggunakan selector sederhana berdasarkan daftar kursi yang disediakan sistem backend.
5. **Status Pemesanan:** Memantau perkembangan status `Pesan`.
6. **Konfirmasi Pembayaran (`Konfirmasi_Pesanan`):** Mengisi formulir data transfer manual (Nama Bank, Nama Rekening, Nomor Rekening, Jumlah Transfer, Tanggal Transfer).
7. **Riwayat Perjalanan:** Melihat daftar riwayat `Pesan` masa lalu.
8. **Pengajuan Keluhan (`Keluhan`):** Mengirim formulir pengaduan kendala perjalanan.

### C. Admin (Pengelola Sistem)
1. **Dashboard Admin:** Ringkasan operasional faktual berdasarkan data riil yang tersedia.
2. **Manajemen Kota Asal (`Kota_Asal`):** CRUD data master kota keberangkatan.
3. **Manajemen Kota Tujuan (`Kota_Tujuan`):** CRUD data master kota kedatangan.
4. **Manajemen Kendaraan (`Kendaraan`):** CRUD data armada travel.
5. **Manajemen Jadwal (`Jadwal`):** Menetapkan jadwal keberangkatan yang menghubungkan `Kota_Asal`, `Kota_Tujuan`, `Kendaraan`, tanggal, jam berangkat, dan harga/tarif tiket.
6. **Manajemen Keluhan (`Keluhan`):** Meninjau keluhan member dan memberikan tanggapan resmi.

### D. Operator Loket (Petugas Loket Cabang)
1. **Dashboard Operator:** Memantau daftar pesanan per jadwal perjalanan hari ini.
2. **Validasi Keberangkatan:** Memvalidasi kehadiran penumpang saat boarding dengan memperbarui status pada entitas `Pesan`.
3. **Verifikasi Konfirmasi Pesanan:** Meninjau data transfer pada entitas `Konfirmasi_Pesanan` untuk disetujui atau ditolak sesuai alur operasional.

---

## 03. Keputusan Desain Resmi yang Disetujui

Empat keputusan desain berikut telah disetujui secara resmi dan tidak boleh diubah:

### 1. Primary Accent: Terracotta Ember (`#C2410C`)
- Nilai HEX: `#C2410C` (Tailwind: `orange-700`).
- Digunakan untuk tombol aksi utama (*Primary CTA*), penanda nomor kursi terpilih, navigasi aktif, dan sorotan utama.
- Memiliki rasio kontras 5.18:1 terhadap putih `#FFFFFF`, memenuhi standar aksesibilitas WCAG 2.2 AA.

### 2. Aturan Typography Final yang Konsisten

| Font Family | Kategori | Penggunaan Spesifik |
|---|---|---|
| **Playfair Display** | Serif Editorial | Heading editorial, Hero Display Heading, dan Judul Utama Section Publik. |
| **Plus Jakarta Sans** | Sans-Serif | UI, teks bodi, formulir input, navigasi, tabel data, label, tanggal, serta **seluruh angka dan harga tiket** (wajib menggunakan OpenType `tabular-nums` untuk perataan angka). |
| **JetBrains Mono** | Monospace | Kode pemesanan unik (`Pesan`), nomor transaksi/referensi, plat nomor kendaraan, dan identifier teknis. |

> **Catatan Konsistensi:** Tidak ada ketentuan ganda untuk harga. Seluruh harga tiket, tarif, dan angka kuantitatif pada UI menggunakan **Plus Jakarta Sans** dengan fitur `tabular-nums`. **JetBrains Mono** dikhususkan murni untuk kode identifier teknis.

### 3. Homepage Layout: Split-Editorial Hero
- **Desktop (`>= 1024px`):** Sisi kiri (55%) memuat headline editorial Playfair Display, pengantar nilai layanan, dan formulir pencarian tiket sederhana; sisi kanan (45%) memuat galeri fotografi perjalanan darat terkurasi.
- **Mobile (`< 768px`):** Transformasi vertikal yang bersih: headline di atas, formulir pencarian tiket di tengah (fokus konversi), dan gambar terkurasi di bawah.

### 4. Dashboard Layout: Minimal Modern
- Antarmuka berbasis utilitas kerja dan efisiensi operasional, sidebar navigasi ramping (lebar 256px), tabel data lapang bergaris tipis 1px, tanpa grafik analitik palsu, dan tanpa glassmorphism.

### 5. Aturan Seat Selector Sederhana
- Pemilihan nomor kursi dirancang menggunakan **Selector Nomor Kursi Sederhana** (misal daftar tombol pilihan nomor kursi).
- **Ketentuan Teknis Wajib:**
  - Atribut `Pesan.Nomor_Kursi` mencatat nomor kursi yang dipilih oleh member.
  - Atribut tersebut **belum otomatis menentukan kapasitas kendaraan atau daftar kursi yang ada**.
  - Sumber daftar kursi yang tersedia, kapasitas armada, aturan ketersediaan, dan mekanisme pencegahan pemesanan ganda (*double booking*) wajib ditentukan dan divalidasi oleh backend.
  - JANGAN menetapkan kapasitas tetap (misal mengunci 1–5).
  - JANGAN mengasumsikan seluruh armada memiliki jumlah atau susunan kursi yang seragam.
  - JANGAN membuat denah kendaraan, layout bus 2-2, atau denah kursi kompleks yang mengarang data.

---

## 04. Alur Bisnis Transaksi & Status (Menunggu Konfirmasi Backend)

Sistem alur transaksi dirancang berdasarkan entitas riil dengan pemetaan teknis yang menunggu konfirmasi DDL backend:

### A. Alur Pemesanan & Pemilihan Kursi
1. Member memilih jadwal keberangkatan (`Jadwal`).
2. Sistem menampilkan nomor kursi yang berstatus tersedia untuk jadwal tersebut (aturan ketersediaan disediakan oleh backend).
3. Member memilih satu nomor kursi, sistem mencatatnya pada atribut `Nomor_Kursi` di entitas `Pesan`.
4. Entitas `Pesan` diterbitkan dengan status awal transaksi.

### B. Alur Konfirmasi Pembayaran
1. Member melakukan transfer bank manual ke rekening resmi travel.
2. Member membuka menu konfirmasi dan mengisi data transfer pada entitas `Konfirmasi_Pesanan`.
3. Status pemesanan beralih menandakan konfirmasi pembayaran telah dikirim dan menunggu verifikasi loket.

### C. Alur Verifikasi Operator Loket
1. Operator Loket memeriksa data transfer pada entitas `Konfirmasi_Pesanan`.
2. Jika data valid: Operator menyetujui konfirmasi, status `Pesan` diperbarui (misal menjadi lunas/terkonfirmasi).
3. Jika data tidak valid: Operator menolak konfirmasi.
   - *Catatan Database:* Kolom catatan/alasan penolakan belum ditemukan dalam ERD resmi. Kebutuhan alasan penolakan dicatat sebagai kebutuhan alur bisnis yang memerlukan konfirmasi field backend sebelum diimplementasikan.

### D. Alur Validasi Boarding / Keberangkatan
1. Saat penumpang hadir di loket/titik kumpul, Operator mencari kode `Pesan`.
2. Operator memvalidasi kehadiran penumpang, memperbarui status keberangkatan pada `Pesan`.

### E. Alur Pengaduan Layanan (`Keluhan`)
1. Member mengirimkan pesan keluhan perjalanan melalui entitas `Keluhan`.
2. Admin membaca keluhan dan memberikan tanggapan resmi.
   - *Catatan Database:* Kolom status penanganan keluhan dan teks tanggapan admin menunggu konfirmasi struktur kolom resmi dari backend.

---

## 05. Sistem Warna & Validasi Aksesibilitas WCAG 2.2 AA

Pengujian kontras warna dilakukan menggunakan rumus matematis standar WCAG 2.2:
- Teks Normal (`< 18pt` atau `< 14pt bold`): minimal **4.5:1** (Level AA).
- Teks Besar (`>= 18pt` atau `>= 14pt bold`): minimal **3.0:1** (Level AA).
- Komponen Antarmuka & Grafis Non-Teks (Batas kontrol interaktif dan ikon): minimal **3.0:1** (Level AA, SC 1.4.11).

### A. Tabel Validasi Kontras Warna Teks

| Elemen UI / Peran | Warna Foreground | Warna Background | Rasio Kontras Aktual | Status WCAG 2.2 | Tindakan & Rekomendasi |
|---|---|---|:---:|:---:|---|
| **Primary Text (Aksen)** | Terracotta `#C2410C` | Putih `#FFFFFF` | **5.18:1** | **PASS (AA)** | Memenuhi syarat teks normal (>= 4.5:1). |
| **Primary Button Text** | Putih `#FFFFFF` | Terracotta `#C2410C` | **5.18:1** | **PASS (AA)** | Memenuhi syarat teks tombol normal. |
| **Primary on Warm Ivory** | Terracotta `#C2410C` | Warm Ivory `#FBF9F5` | **4.92:1** | **PASS (AA)** | Memenuhi syarat teks pada kanvas publik. |
| **Text Primary (Bodi/Judul)** | Deep Stone `#1C1917` | Putih `#FFFFFF` | **17.49:1** | **PASS (AAA)** | Sangat tajam dan mudah dibaca. |
| **Text Primary on Ivory** | Deep Stone `#1C1917` | Warm Ivory `#FBF9F5` | **16.63:1** | **PASS (AAA)** | Kontras optimal kanvas publik. |
| **Text Primary on Slate** | Deep Stone `#1C1917` | Soft Slate `#F8FAFC` | **16.71:1** | **PASS (AAA)** | Kontras optimal kanvas dashboard. |
| **Text Secondary (Muted)** | Muted Stone `#57534E` | Putih `#FFFFFF` | **7.63:1** | **PASS (AAA)** | Memenuhi teks pembantu dan sub-label. |
| **Badge Success Text** | Emerald Tua `#047857` | Hijau Lembut `#ECFDF5` | **5.21:1** | **PASS (AA)** | *Koreksi:* Mengganti `#059669` (3.58:1 / Gagal) menjadi `#047857` agar teks normal lolos. |
| **Badge Warning Text** | Amber Tua `#B45309` | Kuning Lembut `#FFFBEB` | **4.84:1** | **PASS (AA)** | *Koreksi:* Mengganti `#D97706` (3.07:1 / Gagal) menjadi `#B45309` agar teks normal lolos. |
| **Badge Error Text** | Merah Tua `#B91C1C` | Merah Lembut `#FEF2F2` | **5.91:1** | **PASS (AA)** | *Koreksi:* Mengganti `#DC2626` (4.41:1 / Gagal) menjadi `#B91C1C` agar teks normal lolos. |
| **Badge Info Text** | Sky Tua `#0369A1` | Biru Lembut `#F0F9FF` | **5.57:1** | **PASS (AA)** | *Koreksi:* Mengganti `#0284C7` (3.84:1 / Gagal) menjadi `#0369A1` agar teks normal lolos. |

### B. Tabel Validasi Kontras Elemen Non-Teks (WCAG SC 1.4.11)

Berdasarkan WCAG 2.2 SC 1.4.11, batas visual yang diperlukan pengguna untuk mengidentifikasi komponen antarmuka atau statusnya harus memiliki rasio kontras minimal **3.0:1** terhadap warna di sekitarnya:

| Komponen Non-Teks | Warna Indikator | Warna Sekitar | Rasio Kontras | Status SC 1.4.11 | Tindakan Teknis Desain |
|---|---|---|:---:|:---:|---|
| **Border Garis Hairline** | `#E7E5E4` | Putih `#FFFFFF` | **1.26:1** | *Pengecualian / Netral* | Hanya untuk pemisah kartu/tabel dekoratif (bukan batas kontrol tunggal). |
| **Border Input & Select Default** | `#78716C` (stone-500) | Putih `#FFFFFF` | **4.80:1** | **PASS (>= 3:1)** | Ditetapkan sebagai **border default input dan select** yang memerlukan batas visual jelas. |
| **Focus Ring Aktif** | Solid Stone `#1C1917` | Putih `#FFFFFF` | **17.49:1** | **PASS (>= 3:1)** | Indikator fokus keyboard terpisah (outline ring 2px), bukan pengganti border default. |
| **Checkbox / Radio Aktif**| Terracotta `#C2410C` | Putih `#FFFFFF` | **5.18:1** | **PASS (>= 3:1)** | Batas dan isian kontrol aktif memenuhi ambang batas 3:1. |
| **Seat Button (Tersedia)** | Border `#78716C` | Putih `#FFFFFF` | **4.80:1** | **PASS (>= 3:1)** | Tombol kursi yang dapat dipilih memiliki batas kontras >= 3:1. |
| **Seat Button (Terpilih)** | Solid `#C2410C` | Putih `#FFFFFF` | **5.18:1** | **PASS (>= 3:1)** | Latar kursi terpilih kontras tinggi terhadap kanvas. |
| **Seat Button (Disabled)** | Netral `#E7E5E4` | Putih `#FFFFFF` | **1.26:1** | *Pengecualian Disabled*| Elemen non-aktif dikecualikan dari syarat kontras SC 1.4.11. |
| **Ikon Status Sukses** | Emerald `#047857` | Hijau Lembut `#ECFDF5` | **5.21:1** | **PASS (>= 3:1)** | Ikon grafis centang memenuhi syarat non-teks >= 3:1. |
| **Ikon Status Peringatan**| Amber Tua `#B45309` | Kuning Lembut `#FFFBEB` | **4.84:1** | **PASS (>= 3:1)** | *Koreksi:* Mengganti `#D97706` (3.07:1 pada `#FFFBEB`) menjadi `#B45309` (4.84:1) agar konsisten dengan teks Warning. |
| **Ikon Status Error** | Red `#B91C1C` | Merah Lembut `#FEF2F2` | **5.91:1** | **PASS (>= 3:1)** | Ikon grafis silang memenuhi syarat non-teks >= 3:1. |
| **Ikon Status Info** | Sky `#0369A1` | Biru Lembut `#F0F9FF` | **5.57:1** | **PASS (>= 3:1)** | Ikon grafis informasi memenuhi syarat non-teks >= 3:1. |

> **Prinsip Non-Color Reliance:** Status tidak boleh hanya disampaikan lewat warna. Setiap badge status wajib memuat **teks label eksplisit** dan **ikon grafis pendukung**.

---

## 06. Skala Tipografi Terpadu

| Token Gaya | Font Family | Size (px / rem) | Weight | Line Height | Tracking | Aplikasi Antarmuka |
|---|---|---|---|---|---|---|
| `type-display` | Playfair Display | 52px / 3.25rem | Medium (500) | 1.15 | -0.02em | Hero headline landing page publik. |
| `type-h1` | Playfair (Publik) / PJS (Dash) | 36px / 2.25rem | SemiBold (600) | 1.25 | -0.02em | Judul utama halaman & modul. |
| `type-h2` | Playfair (Publik) / PJS (Dash) | 28px / 1.75rem | SemiBold (600) | 1.3 | -0.015em| Judul section & kartu ringkasan. |
| `type-h3` | Plus Jakarta Sans | 20px / 1.25rem | SemiBold (600) | 1.35 | -0.01em | Judul kartu jadwal, header modal dialog. |
| `type-body-md` | Plus Jakarta Sans | 16px / 1.0rem | Regular (400) | 1.5 | 0 | Teks isi bodi, input formulir, paragraf. |
| `type-body-sm` | Plus Jakarta Sans | 14px / 0.875rem | Regular (400) | 1.5 | 0 | Sel tabel data, deskripsi bantuan form. |
| `type-label` | Plus Jakarta Sans | 13px / 0.8125rem | Medium (500) | 1.4 | 0 | Label input form, header ringkasan. |
| `type-table-head`| Plus Jakarta Sans | 11px / 0.6875rem | SemiBold (600) | 1.4 | +0.05em | Header kolom tabel (Uppercase). |
| `type-price` | Plus Jakarta Sans | 18px / 1.125rem | Bold (700) | 1.2 | 0 | Tarif/harga tiket (`tabular-nums`). |
| `type-code` | JetBrains Mono | 13px / 0.8125rem | Medium (500) | 1.4 | +0.02em | Kode `Pesan`, plat nomor kendaraan. |

---

## 07. Spesifikasi Halaman Berdasarkan Data Riil

### A. Public Website
- **Homepage (`/`):**
  - Hero Split: Sisi kiri memuat display title dan form pencarian tiket; sisi kanan memuat galeri foto perjalanan darat terkurasi.
  - Form Pencarian Tiket Sederhana: Dropdown `Kota_Asal`, Dropdown `Kota_Tujuan`, Input Date `Tgl_Berangkat`, dan Tombol "Cari Jadwal".
  - Informasi Layanan Faktual: Deskripsi layanan transportasi darat terpercaya dan informasi titik loket resmi tanpa metrik atau klaim fiktif.
  - Footer Editorial: Tautan informasi operasional dan kontak bantuan pelanggan.
- **Hasil Pencarian Jadwal (`/schedules`):**
  - Menampilkan daftar jadwal perjalanan berdasarkan hasil kueri pencarian.
  - Informasi faktual: Jam Keberangkatan, Kota Asal, Kota Tujuan, Kendaraan, dan Harga/Tarif Tiket.
  - *Dibatasi:* Tidak menampilkan estimasi jam tiba, jarak kilometer, atau durasi perjalanan.
- **Autentikasi (`/login`, `/register`):**
  - Form autentikasi bagi Member, Admin, dan Operator Loket.

### B. Member Area
- **Dashboard Member (`/member`):** Menampilkan tiket aktif yang sedang berlangsung berdasarkan entitas `Pesan`.
- **Pemesanan Tiket (`/member/booking`):** Menampilkan jadwal keberangkatan yang tersedia dan selector nomor kursi sederhana.
- **Form Konfirmasi Transfer (`/member/payment-confirmation`):** Form pengisian data transfer manual (Nama Bank, Rekening, Nominal, Tanggal).
- **Riwayat Pemesanan (`/member/history`):** Tabel daftar riwayat pemesanan masa lalu.
- **Pengaduan Layanan (`/member/complaints`):** Form pengiriman keluhan perjalanan.

### C. Admin Panel
- **Dashboard Admin (`/admin`):** Menampilkan ringkasan operasional berdasarkan data riil dari tabel database.
- **Manajemen Kota Asal (`/admin/origin-cities`):** CRUD data master `Kota_Asal`.
- **Manajemen Kota Tujuan (`/admin/destination-cities`):** CRUD data master `Kota_Tujuan`.
- **Manajemen Kendaraan (`/admin/vehicles`):** CRUD data master `Kendaraan`.
- **Manajemen Jadwal (`/admin/schedules`):** Pengaturan jadwal perjalanan menghubungkan `Kota_Asal`, `Kota_Tujuan`, `Kendaraan`, tanggal, jam berangkat, dan harga/tarif tiket.
- **Manajemen Keluhan (`/admin/complaints`):** Meninjau keluhan member dan memberikan tanggapan resmi.

### D. Operator Loket Panel
- **Dashboard Operator (`/operator`):** Daftar pesanan jadwal perjalanan hari ini.
- **Validasi Keberangkatan (`/operator/validation`):** Pencarian kode `Pesan` dan validasi kehadiran penumpang saat boarding.
- **Verifikasi Konfirmasi Transfer (`/operator/confirmations`):** Meninjau data transfer pada `Konfirmasi_Pesanan` untuk disetujui atau ditolak.

---

## 08. Sistem Komponen Desain & Prioritas Implementasi

### A. Komponen Prioritas Utama (Tier 1 — Fondasi Wajib)
1. **Button:** Varian Primary (Terracotta `#C2410C`), Secondary (Midnight Slate `#1E293B`), Outline, Danger (`#B91C1C`). Ukuran: Small (32px), Medium (40px), Large (48px).
2. **Input Field:** Tinggi 40px, border kontrol default tegas `#78716C` (stone-500, kontras 4.80:1), focus ring terpisah solid `#1C1917` (2px), teks error merah tua `#B91C1C`.
3. **Select Dropdown:** Pilihan kota asal, kota tujuan, dan kendaraan dengan border kontrol default `#78716C`.
4. **Date Picker:** Pemilih tanggal keberangkatan dan tanggal transfer.
5. **Navbar:** Navigasi publik berlatar putih dengan pembatas garis tipis 1px.
6. **Sidebar:** Navigasi vertikal kiri dashboard (lebar 256px) dengan menu aktif kontras.
7. **Data Table:** Tabel data terstruktur dengan baris 52px, header uppercase tipis, dan angka tabular.
8. **Modal Dialog:** Dialog overlay terpusat untuk aksi konfirmasi atau formulir cepat.
9. **Status Badge:** Lencana status berlatar lembut dengan teks kontras tinggi lolos WCAG, teks label eksplisit, dan ikon grafis.
10. **Empty State:** Tampilan komunikatif saat tabel belum memuat data.
11. **Loading State:** Kerangka abu-abu berdenyut halus (*skeleton loader*) tanpa pergeseran tata letak.
12. **Seat Selector Sederhana:** Selector nomor kursi berbasis daftar tombol yang disediakan backend, dengan border tombol tersedia `#78716C` (4.80:1) dan latar terpilih `#C2410C`.

### B. Komponen Sekunder (Tier 2 — Diimplementasikan Sesuai Kebutuhan)
- Search Input, Textarea, Checkbox, Radio Button, Search Form Hero, Breadcrumb, Pagination, Confirmation Dialog, Dropdown Menu, Toast Notification, Tabs, Error State.

---

## 09. Konvensi Implementasi Tailwind CSS v4

Seluruh token desain dipetakan ke dalam direktif `@theme` pada `apps/web/src/index.css`:

```css
@import "tailwindcss";

@theme {
  /* Typography */
  --font-serif: "Playfair Display", Georgia, serif;
  --font-sans: "Plus Jakarta Sans", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", monospace;

  /* Accent Colors */
  --color-primary: #C2410C;
  --color-primary-hover: #9A3412;
  --color-primary-active: #7C2D12;
  --color-secondary: #1E293B;

  /* Surfaces & Canvases */
  --color-canvas-public: #FBF9F5;
  --color-canvas-dashboard: #F8FAFC;
  --color-surface: #FFFFFF;
  --color-border-line: #E7E5E4;        /* Border dekoratif kartu & tabel */
  --color-border-control: #78716C;     /* Border default input, select, & selector */

  /* Text Tokens */
  --color-text-main: #1C1917;
  --color-text-sub: #57534E;

  /* WCAG-Compliant Status Colors */
  --color-status-success: #047857;
  --color-status-success-bg: #ECFDF5;
  --color-status-warning: #B45309;
  --color-status-warning-bg: #FFFBEB;
  --color-status-error: #B91C1C;
  --color-status-error-bg: #FEF2F2;
  --color-status-info: #0369A1;
  --color-status-info-bg: #F0F9FF;
}
```

---

## 10. Validasi Atribut ERD & Hal yang Perlu Dikonfirmasi

### A. Kebutuhan Informasi UI (Ditampilkan ke Pengguna):
- Kota Keberangkatan dan Kedatangan.
- Tanggal dan Jam Keberangkatan.
- Identitas Kendaraan dan Plat Nomor.
- Harga/Tarif Tiket.
- Nomor Kursi yang Dipilih.
- Status Pemesanan Tiket.
- Data Konfirmasi Transfer Bank.
- Pesan Keluhan dan Balasan Tanggapan.

### B. Atribut Database Terkonfirmasi:
- 10 Entitas resmi: `Admin`, `Member`, `Operator_Loket`, `Kota_Asal`, `Kota_Tujuan`, `Kendaraan`, `Jadwal`, `Pesan`, `Konfirmasi_Pesanan`, dan `Keluhan`.
- Relasi `Jadwal` ke `Kota_Asal`, `Kota_Tujuan`, dan `Kendaraan`.
- Atribut `Pesan.Nomor_Kursi` (mencatat pilihan nomor kursi penumpang).
- Parameter tanggal keberangkatan `Tgl_Berangkat`.

### C. Atribut yang Menunggu Konfirmasi Backend / DDL:
1. **Harga vs Tarif Tiket:** Diperlukan konfirmasi nama kolom biaya perjalanan pada `Jadwal` (apakah bernama `Harga`, `Tarif`, atau `Harga_Tiket`). Kedua istilah tidak diasumsikan sama.
2. **Format Jam Keberangkatan:** Diperlukan konfirmasi apakah berupa kolom waktu terpisah (misal `Jam_Berangkat` tipe TIME) atau timestamp (misal `Waktu_Berangkat`).
3. **Format Identitas Kendaraan:** Diperlukan konfirmasi nama kolom nama armada dan plat nomor pada entitas `Kendaraan` (misal `Nama_Kendaraan`, `Plat_Nomor` / `No_Polisi`).
4. **Enum Status Pemesanan:** Diperlukan konfirmasi nama kolom status pada `Pesan` dan daftar enum nilainya.
5. **Kolom Konfirmasi Transfer:** Diperlukan konfirmasi kolom detail transfer pada `Konfirmasi_Pesanan` (`Nama_Bank`, `Nama_Rekening`, `No_Rekening`, `Jumlah_Transfer`, `Tgl_Transfer`).
6. **Alasan Penolakan Pembayaran:** Diperlukan konfirmasi apakah terdapat kolom catatan penolakan pada skema database.
7. **Kolom Keluhan & Tanggapan:** Diperlukan konfirmasi nama kolom pesan keluhan dan balasan admin pada entitas `Keluhan`.

---

## 11. Fitur yang Memerlukan Keputusan Teknis Lanjutan

Fitur-fitur berikut **tidak didukung oleh ERD 10 entitas saat ini** dan **tidak disertakan pada rancangan final**:
1. **Upload File Gambar Bukti Transfer:** ERD saat ini berbasis formulir data teks transfer manual.
2. **QR Code / Barcode E-Tiket:** Memerlukan generator QR dan scanner kamera di loket.
3. **Live Tracking Kendaraan:** Memerlukan integrasi perangkat GPS realtime.
4. **Notifikasi WhatsApp Otomatis:** Memerlukan gateway API pihak ketiga.
5. **Sistem Refund Otomatis:** Memerlukan kebijakan keuangan dan mutasi saldo.
6. **Payment Gateway Otomatis:** Memerlukan aggregator pembayaran (VA, QRIS, e-wallet).
7. **Tabel Riwayat Audit Khusus Loket:** Memerlukan tabel log aktivitas operator tersendiri.
8. **Data Pengemudi / Sopir:** Entitas sopir belum tersedia pada ERD.
9. **Data Fasilitas Kendaraan:** Belum ada data fasilitas detail pada entitas `Kendaraan`.
10. **Jarak (KM) dan Durasi Rute:** Belum terdapat kolom jarak kilometer dan durasi tempuh pada ERD.
