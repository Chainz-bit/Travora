# TRAVORA — Design Research & Visual Direction

**Dokumen Riset & Arahan Visual Desain Digital Product**
**Role:** UI/UX Designer & Technical Documentation Reviewer
**Proyek:** TRAVORA — Sistem Informasi Pemesanan Tiket Travel Antar-Kota Berbasis Web
**Tanggal:** 11 November 2026
**Status Dokumen:**
- **Keputusan Visual:** Disetujui (*Approved Visual Direction*)
- **Pemetaan Teknis & Database:** Menunggu Konfirmasi (*Pending Technical/Database Confirmation*)

---

## 1. Executive Summary & Status Dokumen

Dokumen ini merangkum hasil riset desain, acuan visual, dan arahan antarmuka untuk **TRAVORA**, sistem informasi pemesanan tiket travel antar-kota berbasis web. Riset ini dirancang untuk mewujudkan antarmuka yang bersahaja, berkarakter kuat, dan taat pada batasan **10 entitas ERD final**:
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

### Status Resmi Dokumen:
- **Keputusan Visual Telah Disetujui:** Arah estetika *Editorial Modern* untuk Public Website, *Minimal Modern* untuk Dashboard, palet warna primer *Terracotta Ember (`#C2410C`)*, dan kombinasi tipografi *Playfair Display + Plus Jakarta Sans + JetBrains Mono* telah berstatus final.
- **Pemetaan Teknis Menunggu Konfirmasi:** Rincian nama kolom database, format tipe data waktu, enum status, dan aturan bisnis backend (seperti penentuan kapasitas kursi) masih berstatus menunggu ketersediaan file DDL/skema fisik di repositori.

---

## 2. Koleksi Referensi Dribbble & Hasil Verifikasi Faktual

Riset visual mengkaji **9 karya referensi** pada platform Dribbble. Berikut adalah hasil audit faktual terhadap referensi yang dievaluasi:

### A. Referensi Terverifikasi (5 Karya)

#### 1. VITA — Travel Landing Page Design
- **Kreator / Studio:** Phenomenon Labs untuk Phenomenon Studio
- **URL Terverifikasi:** [dribbble.com/shots/27499795-Travel-Landing-Page-Design-VITA](https://dribbble.com/shots/27499795-Travel-Landing-Page-Design-VITA)
- **Status:** **Verified**
- **Fakta pada Halaman Referensi:** Konsep landing page travel berbasis kurasi personal dengan tata letak editorial asimetris, tipografi serif ekspresif, palet warna bumi (*warm ivory, charcoal, terracotta*), dan komposisi gambar lanskap yang tenang.
- **Interpretasi Desain untuk Travora:** Menginspirasi tata letak *Split-Editorial Hero* pada Public Homepage untuk menghadirkan kesan layanan travel antar-kota yang tenang, terpercaya, dan profesional.

#### 2. Travaura — Travel Booking Website Page
- **Kreator / Studio:** Caliber Design
- **URL Terverifikasi:** [dribbble.com/shots/25914241-Travaura-Travel-Booking-Website-Page](https://dribbble.com/shots/25914241-Travaura-Travel-Booking-Website-Page)
- **Status:** **Verified**
- **Fakta pada Halaman Referensi:** Antarmuka pemesanan perjalanan modern yang memadukan formulir pencarian horizontal (*search bar*) terintegrasi di area hero serta kartu informasi destinasi.
- **Interpretasi Desain untuk Travora:** Menjadi rujukan peletakan formulir pencarian tiket sederhana di area hero: `Kota_Asal`, `Kota_Tujuan`, dan `Tgl_Berangkat`.

#### 3. Here & Away Website
- **Kreator / Studio:** Duo Studio, berkolaborasi dengan Andrea Jelić
- **URL Terverifikasi:** [dribbble.com/shots/27399750-Here-Away-Website](https://dribbble.com/shots/27399750-Here-Away-Website)
- **Status:** **Verified**
- **Fakta pada Halaman Referensi:** Desain web travel & hospitality dengan estetika majalah murni, garis pembatas tipis 1px (*hairline borders*), tanpa bayangan tebal (*zero drop-shadows*), penataan tipografi kontras tinggi, dan *whitespace* lapang.
- **Interpretasi Desain untuk Travora:** Rujukan utama panduan Anti AI-Slop — membuktikan bahwa antarmuka tanpa gradasi neon dan tanpa bayangan tebal menghasilkan keterbacaan data yang bersih dan kredibel.

#### 4. Here & Away Web Design
- **Kreator:** Andrea Jelić
- **URL Terverifikasi:** [dribbble.com/shots/27327681-Here-Away-Web-Design](https://dribbble.com/shots/27327681-Here-Away-Web-Design)
- **Status:** **Verified**
- **Fakta pada Halaman Referensi:** Eksplorasi tipografi editorial dan penataan konten visual majalah independen berdensitas tinggi dengan hierarki teks yang sangat terstruktur.
- **Interpretasi Desain untuk Travora:** Panduan penerapan tipografi Playfair Display pada display heading bersanding dengan sans-serif fungsional.

#### 5. Bus Ticketing System Route Schedules Dashboard - Exploration
- **Kreator:** Fitra Arie Budiawan
- **URL Terverifikasi:** [dribbble.com/shots/22958259-Bus-Ticketing-System-Route-Schedules-Dashboard-Exploration](https://dribbble.com/shots/22958259-Bus-Ticketing-System-Route-Schedules-Dashboard-Exploration)
- **Status:** **Verified**
- **Fakta pada Halaman Referensi:** Eksplorasi dashboard operasional dan antarmuka pemesanan tiket bus antar-kota di Indonesia yang memuat daftar jadwal perjalanan, perbandingan rute, dan denah kursi bus 2-2.
- **Interpretasi Desain untuk Travora:** Menginspirasi penyajian baris jadwal perjalanan pada hasil pencarian publik dan dashboard operasional loket.
- **Catatan Eliminasi Denah Bus:** Denah bus 2-2 pada karya referensi asli **dieliminasi secara tegas / tidak digunakan** pada Travora. Travora menggunakan selector nomor kursi sederhana sesuai ketersediaan data di sistem tanpa membuat denah grafis bus rumit.

---

### B. Referensi Unverified & URL Mismatch (4 Karya)

#### 6. Boking – Travel Ticket Booking Landing Page
- **Judul yang Diklaim:** Boking – Travel Ticket Booking Landing Page (Kreator diklaim: Orionix Studio)
- **Judul Karya Sebenarnya pada URL:** GolfSpace logo design
- **Kreator Sebenarnya:** pixivect
- **URL:** `https://dribbble.com/shots/21808031-Boking-Travel-Ticket-Booking-Landing-Page` (Shot ID `21808031`)
- **Status:** **URL Mismatch / Unverified**
- **Catatan Evaluasi:** Terjadi ketidaksesuaian data URL; halaman asli menampilkan karya logo GolfSpace. Meskipun konsep daftar baris jadwal vertikal berguna sebagai inspirasi konseptual, status URL dicatat *URL Mismatch*.

#### 7. Travel Web Booking Platform
- **Judul yang Diklaim:** Travel Web Booking Platform (Kreator diklaim: Ronas IT)
- **Judul Karya Sebenarnya pada URL:** Plumber Door Hanger Canva Layout Design
- **Kreator Sebenarnya:** Graphic Reserve
- **URL:** `https://dribbble.com/shots/22421941-Travel-Web-Booking-Platform` (Shot ID `22421941`)
- **Status:** **URL Mismatch / Unverified**
- **Catatan Evaluasi:** Terjadi ketidaksesuaian data URL; halaman asli menampilkan materi cetak plumber door hanger. Selain itu, alur payment gateway multi-step dan upload foto pada deskripsi awal tidak relevan dengan alur transfer bank manual `Konfirmasi_Pesanan`.

#### 8. Aware — Modern Travel Admin Dashboard UI
- **Kreator Terdaftar:** MD SAKIB
- **URL:** `https://dribbble.com/shots/22883491-Aware-Modern-Travel-Admin-Dashboard-UI` (Shot ID `22883491`)
- **Status:** **Unverified**
- **Catatan Evaluasi:** Shot ID `22883491` belum berhasil diverifikasi pada indeks publik Dribbble. Konsep tabel data lapang dan sidebar ramping tetap relevan sebagai panduan layout umum.

#### 9. SaaS Web Admin Dashboard & Task Operations
- **Kreator Terdaftar:** Ronas IT
- **URL:** `https://dribbble.com/shots/21431872-SaaS-Web-Admin-Dashboard` (Shot ID `21431872`)
- **Status:** **Unverified**
- **Catatan Evaluasi:** Shot ID `21431872` belum berhasil diverifikasi pada indeks publik Dribbble. Konsep antrean tugas operasional dijadikan inspirasi alur kerja loket, namun status URL dicatat *Unverified*.

---

## 3. Analisis Antarmuka Publik & Dashboard

### A. Public Website (Editorial Modern)
- **Split-Editorial Hero:**
  - Sisi kiri (desktop): Judul editorial (Playfair Display), teks deskripsi nilai layanan, dan formulir pencarian tiket sederhana.
  - Sisi kanan (desktop): Komposisi foto perjalanan darat otentik.
  - Mobile: Tata letak bertumpuk vertikal dengan form pencarian tiket di posisi utama.
- **Form Pencarian Tiket Sederhana:**
  - Dropdown `Kota_Asal`.
  - Dropdown `Kota_Tujuan`.
  - Input Tanggal Keberangkatan `Tgl_Berangkat`.
  - Tombol aksi "Cari Jadwal" (Terracotta Ember).
- **Hasil Pencarian Jadwal:**
  - Menampilkan daftar entitas `Jadwal` dan relasi `Kendaraan`.
  - Informasi faktual yang disajikan: Jam Keberangkatan, Kota Asal, Kota Tujuan, Kendaraan, dan Harga/Tarif Tiket.
  - **Dibatasi:** Tidak menampilkan estimasi waktu tiba, durasi perjalanan, jarak kilometer, atau fasilitas armada karena tidak tersedia dalam skema database.
- **Fokus Konten Faktual:** Menghilangkan klaim ketepatan waktu absolut atau metrik rute favorit buatan yang tidak memiliki sumber data operasional riil. Konten difokuskan pada kejelasan jadwal faktual.

### B. Dashboard Portal (Minimal Modern)
- **Member Area:**
  - Memantau tiket perjalanan aktif dan status pesanan (`Pesan`).
  - Pemesanan tiket dengan memilih jadwal keberangkatan yang tersedia.
  - Pemilihan nomor kursi sederhana (selector berbasis nomor kursi riil dari sistem).
  - Pengisian formulir data konfirmasi transfer (`Konfirmasi_Pesanan`).
  - Riwayat pemesanan masa lalu dan formulir pengaduan (`Keluhan`).
- **Admin Panel:**
  - Manajemen master data: `Kota_Asal`, `Kota_Tujuan`, `Kendaraan`, dan `Jadwal`.
  - Pengelolaan dan respon terhadap `Keluhan` member.
  - Tidak ada modul rute terpisah (relasi asal-tujuan dikelola langsung dalam `Jadwal`).
- **Operator Loket Panel:**
  - Melihat daftar pesanan perjalanan hari ini.
  - Validasi keberangkatan penumpang (memperbarui status kehadiran pada `Pesan`).
  - Verifikasi data transfer bank pada `Konfirmasi_Pesanan`.

---

## 4. Panduan Anti AI-Slop

Prinsip tegas untuk menjaga antarmuka tetap bersih, profesional, dan berakar pada fungsi nyata:

| Pola AI-Slop (Dilarang) | Alasan Penolakan | Solusi Resmi Travora |
|---|---|---|
| **Gradasi Neon (Ungu/Pink/Cyan)** | Terlihat generik dan tidak mencerminkan sistem tiket yang terpercaya. | Palet bersahaja: Terracotta Ember, Deep Charcoal, Warm Ivory, dan Soft Slate. |
| **Glassmorphism & Background Blur Acak** | Mengorbankan keterbacaan teks dan memberatkan rendering browser. | Kontainer berlatar solid putih dengan border tipis 1px (`border border-stone-200`). |
| **Banyak Kartu Berserakan (*Carditis*)** | Memecah konsentrasi pengguna dalam membaca data tabel. | Tata letak berkesinambungan dengan tabel data lapang dan form terstruktur. |
| **Grafik Statistik Analitik Palsu** | Menghabiskan ruang dashboard tanpa nilai operasional riil. | Data operasional faktual sesuai tabel dan entitas yang tersedia. |
| **Denah Bus Fantasi / Matriks 2-2 Rumit** | Mengarang kapasitas dan formasi kursi yang tidak ada dalam ERD. | **Selector Nomor Kursi Sederhana** yang membaca data kursi dari sistem backend. |
| **Bayangan Tebal / Berwarna (*Glow*)** | Menimbulkan kesan antarmuka kotor dan tidak rapi. | Bayangan netral sangat halus (`shadow-xs` / `shadow-sm`) atau batas garis 1px (*flat border*). |
| **Animasi Berat / Parallax Mengganggu** | Memperlambat transaksi pemesanan tiket. | Transisi CSS mikro fungsional (150ms) pada hover tombol dan tab aktif. |

---

## 5. Keputusan Desain Resmi yang Dipertahankan

### A. Primary Accent: Terracotta Ember (`#C2410C`)
- Aksen hangat berakar pada perjalanan darat nusantara.
- Digunakan untuk tombol aksi utama (*Primary CTA*), penanda nomor kursi terpilih, navigasi aktif, dan sorotan utama.
- Rasio kontras 5.18:1 terhadap putih `#FFFFFF`, memenuhi standar WCAG 2.2 AA.

### B. Typography Stack yang Konsisten
- **Playfair Display (Serif):** Khusus untuk heading editorial (Hero Display Heading dan Judul Section Utama pada Public Website).
- **Plus Jakarta Sans (Sans-Serif):** Font kerja utama untuk UI, bodi teks, formulir, navigasi, tabel data, label, tanggal, serta **seluruh angka dan harga tiket** dengan dukungan OpenType `tabular-nums`.
- **JetBrains Mono (Monospace):** Khusus untuk kode pemesanan unik (`Pesan`), nomor transaksi/referensi, plat nomor kendaraan, dan identifier teknis.

### C. Homepage Layout: Split-Editorial Hero
- Menyeimbangkan narasi editorial di sisi kiri dengan kurasi visual di sisi kanan pada desktop, dan bertransformasi vertikal di layar mobile.

### D. Dashboard Layout: Minimal Modern
- Tata letak berorientasi utilitas murni dengan navigasi sidebar ramping dan tabel data lapang.

### E. Seat Selector Sederhana
- Pemilihan nomor kursi berbasis selector sederhana (daftar tombol nomor kursi).
- **Ketentuan Teknis:**
  - Atribut `Pesan.Nomor_Kursi` mencatat nomor kursi yang dipilih.
  - Atribut tersebut tidak otomatis menentukan kapasitas armada. Kapasitas dan daftar ketersediaan kursi ditentukan oleh data/aturan backend.
  - Tidak menetapkan kapasitas tetap (misal 1–5).
  - Tidak mengarang denah bus atau denah kursi kompleks.

---

## 6. Validasi ERD & Catatan Terbuka

### A. 10 Entitas Resmi ERD
Struktur data Travora berpusat pada 10 entitas: `Admin`, `Member`, `Operator_Loket`, `Kota_Asal`, `Kota_Tujuan`, `Kendaraan`, `Jadwal`, `Pesan`, `Konfirmasi_Pesanan`, dan `Keluhan`.

### B. Status Atribut & Pemisahan Konfirmasi:
1. **Atribut Terkonfirmasi Sesuai Kebutuhan Sistem:**
   - `Kota_Asal`: Representasi kota keberangkatan.
   - `Kota_Tujuan`: Representasi kota kedatangan.
   - `Tgl_Berangkat`: Tanggal keberangkatan jadwal.
   - `Nomor_Kursi`: Nomor kursi pada entitas `Pesan`.
2. **Atribut yang Menunggu Konfirmasi DDL Backend:**
   - **Harga vs Tarif:** Diperlukan konfirmasi nama kolom resmi pada entitas `Jadwal` (apakah bernama `Harga`, `Tarif`, atau `Harga_Tiket`). Kedua istilah tidak boleh diasumsikan sama.
   - **Waktu Keberangkatan:** Diperlukan konfirmasi apakah berupa kolom waktu terpisah (misal `Jam_Berangkat`) atau timestamp lengkap `Waktu_Berangkat`.
   - **Identitas Kendaraan:** Diperlukan konfirmasi nama kolom pada entitas `Kendaraan` (misal `Nama_Kendaraan`, `Plat_Nomor` / `No_Polisi`).
   - **Status Pemesanan:** Diperlukan konfirmasi nama kolom status pada `Pesan` dan daftar nilai enum resminya.
   - **Data Konfirmasi Transfer:** Diperlukan konfirmasi kolom pada `Konfirmasi_Pesanan` (misal `Nama_Bank`, `Nama_Rekening`, `No_Rekening`, `Jumlah_Transfer`, `Tgl_Transfer`).
   - **Alasan Penolakan:** Kolom alasan penolakan konfirmasi pembayaran belum dipastikan ada di DDL, sehingga tidak boleh diasumsikan sebagai kolom tersendiri sebelum ada konfirmasi backend.
   - **Keluhan & Tanggapan:** Diperlukan konfirmasi nama kolom pesan keluhan dan tanggapan admin pada entitas `Keluhan`.

---

## 7. Fitur yang Memerlukan Keputusan Teknis Lanjutan

Fitur-fitur berikut **tidak didukung oleh ERD 10 entitas saat ini** dan **tidak dimasukkan ke dalam alur utama desain**:
1. **Upload File Gambar Bukti Transfer:** ERD saat ini memuat `Konfirmasi_Pesanan` berbasis data teks transfer bank manual.
2. **QR Code / Barcode E-Tiket:** Memerlukan generator QR dan pemindai kamera di loket.
3. **Live Tracking Kendaraan:** Memerlukan perangkat GPS dan telemetri posisi realtime.
4. **Notifikasi WhatsApp Otomatis:** Memerlukan integrasi gateway perpesanan pihak ketiga.
5. **Sistem Refund Otomatis:** Memerlukan kebijakan keuangan dan penyesuaian status transaksi.
6. **Payment Gateway Otomatis:** Memerlukan kontrak aggregator pembayaran (VA, QRIS, e-wallet).
7. **Tabel Riwayat Audit Khusus:** Di luar pencatatan status `Pesan`.
8. **Data Pengemudi / Sopir:** Entitas sopir belum ada di ERD.
9. **Data Fasilitas Kendaraan:** Belum ada data fasilitas detail di `Kendaraan`.
10. **Jarak dan Durasi Rute:** Belum terdapat kolom jarak kilometer dan durasi pada ERD.
