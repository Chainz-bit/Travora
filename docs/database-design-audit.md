# DOKUMEN REKONSILIASI ERD, AUDIT ARSITEKTUR & SPESIFIKASI DDL POSTGRESQL
## Proyek: TRAVORA — Sistem Informasi Pemesanan Tiket Travel Antar-Kota
**Dokumen:** `docs/database-design-audit.md`  
**Fase:** Phase 4A, 4B & Phase 4C.2 (COMPLETED & VERIFIED)  
**Penyusun:** Senior Database Engineer & Backend Architect  
**Target RDBMS:** PostgreSQL 16+ (Terverifikasi di PostgreSQL 18)  
**Status Dokumen:** COMPLETED & DISETUJUI (Runtime Verified Baseline & Repository Integration PASS)  

---

> [!IMPORTANT]
> **Status Dokumen & Kesepakatan Final:**  
> Dokumen ini merupakan hasil audit teknis mendalam dan rekonsiliasi menyeluruh antara **ERD Konseptual Final Travora**, **Database Fisik MySQL Legacy (`db_tiket.sql`)**, dan **Spesifikasi Antarmuka Phase 1–3**.  
> Seluruh rekomendasi arsitektur dan 13 Architectural Decision Records (ADR) telah diselaraskan dengan keputusan resmi pemilik proyek, diimplementasikan pada `database/migrations/000001_initial_schema.up.sql` dan `database/migrations/000001_initial_schema.down.sql`, serta **telah terbukti 100% lulus pengujian siklus runtime migration pada PostgreSQL 18**.  
> Rincian pembuktian empiris terdokumentasi resmi pada [`docs/database-runtime-test-report.md`](database-runtime-test-report.md).

---

## 1. INVENTARIS DOKUMEN SUMBER & HIERARKI KEBENARAN

Dalam perancangan database produksi Travora, diterapkan tata kelola sumber data dengan urutan prioritas kebenaran (*Single Source of Truth Hierarchy*) sebagai berikut:

```
┌────────────────────────────────────────────────────────┐
│ 1. ERD Konseptual Final Travora                        │ ← Acuan Konseptual & Relasi Bisnis Utama
├────────────────────────────────────────────────────────┤
│ 2. Skrip SQL Legacy (db_tiket.sql / MySQL 5.6.26)      │ ← Bukti Implementasi Fisik Masa Lalu
├────────────────────────────────────────────────────────┤
│ 3. Spesifikasi Desain Antarmuka (docs/design.md)        │ ← Kebutuhan Visual & Pengalaman Pengguna
├────────────────────────────────────────────────────────┤
│ 4. Mock Service Frontend Phase 1–3 (apps/web)          │ ← Rujukan Alur Kerja Interaktif UI
└────────────────────────────────────────────────────────┘
```

### Inventaris Berkas Sumber yang Dianalisis:
1. **ERD Konseptual Final Travora:**
   - Mendefinisikan tepat **10 entitas bisnis utama**: `Admin`, `Member`, `Operator_Loket`, `Kota_Asal`, `Kota_Tujuan`, `Kendaraan`, `Jadwal`, `Pesan`, `Konfirmasi_Pesanan`, dan `Keluhan`.
   - Menghubungkan peran operasional `Admin` sebagai pengelola data master dan `Operator_Loket` sebagai verifikator transaksi & keberangkatan penumpang.
2. **Skrip SQL Legacy (`D:\Latihan PPL\LAtihan\db_tiket.sql`):**
   - Lingkungan asal: MySQL Server 5.6.26 (InnoDB, PHP Version 5.6.12, Charset latin1, phpMyAdmin 4.4.14, dump bertanggal 11 Oktober 2017).
   - Skema memuat 10 tabel: `admin`, `jadwal`, `keluhan`, `kendaraan`, `konfirmasi_pesan`, `kota_asal`, `kota_tujuan`, `member`, `operator_loket`, dan `pesan`.
   - Menggunakan identifier `INT(11) AUTO_INCREMENT` untuk primary key.
3. **Dokumentasi UI/UX & Desain Sistem (`docs/design.md` & `docs/design-research.md`):**
   - Mendefinisikan gaya *Editorial Modern* dengan batasan kapasitas kursi armada travel (Toyota HiAce / Isuzu Elf) dan alur konfirmasi transfer manual antar-rekening bank Indonesia.
4. **Implementasi Frontend Phase 1–3 (`apps/web/src/types/index.ts`, `sharedStore.ts`, dll.):**
   - Menggunakan *frontend view model* dengan beberapa metadata tampilan UI (seperti `code` kota, `status` armada, toggle keaktifan jadwal, dll.) yang diselaraskan secara bersih tanpa membebani skema database fisik.

---

## 2. KOREKSI FAKTA HISTORIS SQL LEGACY (`db_tiket.sql`)

Berdasarkan audit ulang baris-per-baris terhadap berkas asli `D:\Latihan PPL\LAtihan\db_tiket.sql`, ditetapkan pemisahan tegas antara fakta sumber lama, analisis arsitektur, dan rekomendasi target:

| No | Topik / Aspek | Fakta SQL Legacy (`db_tiket.sql`) | Analisis Masalah Legacy | Rekomendasi Target PostgreSQL 16+ |
|:---:|:---|:---|:---|:---|
| **1** | **Nama Tabel Kendaraan** | Nama tabel adalah **`kendaraan`** (bukan `mobil`). Kolom PK adalah `id_mobil int(11)`. | Terjadi ketidaksinkronan antara nama tabel (`kendaraan`) dengan nama kolom primary key (`id_mobil`). | Standardisasi nama tabel menjadi `kendaraan` dan primary key menjadi `id_kendaraan BIGINT`. |
| **2** | **Nama Tabel Operator** | Nama tabel adalah **`operator_loket`** (bukan `operator`). Kolom PK adalah `id_opr int(11)`. | Terjadi singkatan pada PK (`id_opr`), kolom username dinamai `user` (reserved keyword SQL). | Standardisasi nama tabel `operator_loket`, PK `id_operator BIGINT`, dan kolom username dinormalisasi menjadi `username`. |
| **3** | **Status Pemesanan Tiket** | Tabel `pesan` **sudah memiliki kolom `status varchar(100)`** sejak skrip legacy. | Nilai aktual pada dump: `'Lunas'`, `'Dalam Proses'`. Status tidak boleh dihilangkan dari skema fisik. | Pertahankan kolom `status VARCHAR(100) NOT NULL` pada tabel `pesan` sebagai sumber kebenaran status workflow. |
| **4** | **Kolom Entitas Keluhan** | Tabel `keluhan` memiliki kolom: `id_keluhan`, `id_member`, **`j_keluhan varchar(20)`**, dan **`d_keluhan varchar(200)`**. | Kolom menggunakan singkatan (`j_keluhan` = jenis/judul, `d_keluhan` = detail), dan panjang 200 karakter terlalu sempit. | Normalisasi menjadi `jenis_keluhan VARCHAR(100)` dan `detail_keluhan TEXT`. |
| **5** | **Kolom Konfirmasi Pesanan** | Tabel `konfirmasi_pesan` memiliki kolom: `no_resi varchar(20)`, `no_rek int(20)`, `tgl_transfer date`, `jam_transfer time`, dan `id_pesan int(11)`. | Kolom `no_rek int(20)` mengalami integer overflow 32-bit (terpotong ke `2147483647` atau `0`). | Ganti `no_rek` menjadi `VARCHAR(50)`, standardisasi nama tabel menjadi `konfirmasi_pesanan`. |
| **6** | **Kapasitas Password Legacy** | `admin.password`: `varchar(50)`<br>`operator_loket.password`: `varchar(50)`<br>`member.password`: **`varchar(20)`** | Seluruh kredensial tersimpan dalam plaintext tanpa enkripsi (mis. `'admin'`, `'qwerty'`, `'126sg1'`). Kapasitas tidak muat hash modern. | Perlebar seluruh kolom password fisik menjadi `password_hash VARCHAR(255) NOT NULL`. Larang impor password legacy. |
| **7** | **Constraint Foreign Key Fisik** | SQL legacy **sama sekali tidak mendefinisikan foreign key fisik** (`ALTER TABLE ... ADD CONSTRAINT FOREIGN KEY` bernilai nol). | Integritas referensial tidak terjamin di level database fisik pada sistem lama. | Wajibkan penerapan 14 Foreign Key fisik formal di PostgreSQL dengan aturan `ON DELETE RESTRICT`. |

---

## 3. DUA KEPUTUSAN RESMI PEMILIK PROYEK (APPROVED BASELINE)

Dua keputusan arsitektur berikut telah disetujui secara resmi oleh pemilik proyek dan wajib diterapkan dalam rancangan skema serta berkas migration aktif:

### Keputusan Resmi A: Atribut Workflow pada Entitas `Keluhan` (APPROVED)
- **Atribut Tambahan yang Disetujui:**
  1. `status_keluhan VARCHAR(30) NOT NULL DEFAULT 'menunggu_tanggapan'`
  2. `tanggapan_admin TEXT NULL`
- **Ketentuan Implementasi:**
  - `status_keluhan` mengontrol alur penyelesaian kendala member (nilai awal: `menunggu_tanggapan`).
  - `tanggapan_admin` bernilai `NULL` sebelum admin loket menindaklanjuti keluhan tersebut.
  - Foreign key `id_admin BIGINT NULL` tetap merujuk ke tabel `admin` sebagai penanggung jawab tanggapan.
  - **Batasan Ketat:** Tetap berada pada tabel `keluhan`. Dilarang membuat tabel baru seperti `complaint_replies` atau tabel riwayat keluhan.

### Keputusan Resmi B: Mekanisme Penonaktifan pada Entitas `Jadwal` (APPROVED)
- **Atribut Tambahan yang Disetujui:**
  `is_active BOOLEAN NOT NULL DEFAULT TRUE`
- **Ketentuan Implementasi:**
  - Jadwal yang baru dibuat secara default bernilai aktif (`TRUE`).
  - Jadwal lama yang sudah memiliki relasi historis ke tabel `pesan` dapat dinonaktifkan (`FALSE`) tanpa harus dihapus dari database.
  - Jadwal dengan `is_active = FALSE` tidak akan ditampilkan pada antarmuka pencarian tiket penumpang untuk reservasi baru.
  - **Batasan Ketat:** Tetap menggunakan relasi `ON DELETE RESTRICT`. Dilarang menghapus jadwal yang telah memiliki transaksi pemesanan. Dilarang menambahkan status operasional `aktif/perawatan` pada entitas kendaraan.

---

## 4. FINALISASI MATRIKS 13 ARCHITECTURAL DECISION RECORDS (ADR)

Berikut adalah status final dan justifikasi teknis dari ke-13 keputusan arsitektural Travora:

| ADR | Topik & Entitas | Keputusan Resmi Baseline | Status Keputusan | Justifikasi & Batasan Teknis |
|:---:|:---|:---|:---:|:---|
| **ADR-01** | Primary Key `Pesan` | Gunakan **`id_pesan BIGINT IDENTITY PRIMARY KEY`**. | **FINAL** | Selaras dengan SQL legacy dan referensi FK `konfirmasi_pesan.id_pesan`. Label `Id_Resi*` pada ERD dicatat sebagai kerancuan visual yang perlu dikoreksi. Tidak menambah kolom fisik `kode_pesan`; format display `TRV-...` dihasilkan oleh backend. |
| **ADR-02** | Identitas Autentikasi `Member` | Gunakan **`username VARCHAR(50) UNIQUE NOT NULL`**. | **FINAL** | Patuh 100% pada ERD resmi (Member tidak memiliki kolom email). Form login dan registrasi frontend akan diselaraskan pada Phase 4E. Tidak menambah email ke tabel Member saat ini. |
| **ADR-03** | Snapshot Finansial Nilai Pesanan | **Tidak menambahkan kolom `total_harga`** pada tabel `pesan`. | **FINAL** | Untuk baseline awal, perubahan tarif jadwal yang telah memiliki pesanan dibatasi oleh backend. Jadwal bertransaksi tidak boleh diubah tarifnya secara langsung; tarif baru dibuat melalui jadwal baru. Transaksi lama merujuk ke jadwal asal. |
| **ADR-04** | Foreign Key Pengelola (`id_admin`) | **Pertahankan relasi FK `id_admin`** pada 5 entitas master. | **FINAL** | Mewujudkan relasi ERD pada `kota_asal`, `kota_tujuan`, `kendaraan`, `jadwal`, dan `keluhan` yang hilang pada SQL legacy. Seluruhnya merujuk ke `admin(id_admin)`. |
| **ADR-05** | Foreign Key Operator (`id_operator`) | **Gunakan `id_operator` nullable** pada `pesan` dan `konfirmasi_pesanan`. | **FINAL** | Mengakomodasi peran operator sebagai verifikator gate/keberangkatan pada `pesan` dan verifikator transfer pada `konfirmasi_pesanan`. Bernilai NULL sebelum petugas memvalidasi. |
| **ADR-06** | Tipe Data Nomor Kursi | Gunakan **`nomor_kursi VARCHAR(10) NOT NULL`**. | **FINAL** | Menghilangkan ENUM statis legacy `'1'..'5'` agar mendukung armada minibus modern (HiAce/Elf kapasitas 8–14 kursi). Validasi ketersediaan kursi ditangani oleh service backend. |
| **ADR-07** | Tipe Data Nomor Rekening Bank | Gunakan **`no_rek VARCHAR(50) NOT NULL`**. | **FINAL** | Memperbaiki bug fatal `int(20)` MySQL legacy yang menyebabkan integer overflow. Nomor rekening adalah identifier alfanumerik yang dapat diawali angka nol. |
| **ADR-08** | Sumber Status Workflow Konfirmasi | Gunakan **`pesan.status`** sebagai sumber kebenaran status workflow. | **FINAL** | Tidak membuat kolom `status_verifikasi` kedua pada tabel konfirmasi untuk baseline. Tidak menambah kolom catatan penolakan terpisah tanpa perubahan ERD. |
| **ADR-09** | Mekanisme Validasi Keberangkatan | Gunakan **`pesan.status`** dan **`pesan.id_operator`**. | **FINAL** | Tidak menambah kolom timestamp validasi atau kolom operator kedua. Validasi check-in memperbarui `pesan.status` (misal 'keberangkatan_tervalidasi') dan mencatat `id_operator`. |
| **ADR-10** | Atribut Workflow Pengaduan Layanan | Tambahkan **`status_keluhan`** dan **`tanggapan_admin`** pada tabel `keluhan`. | **APPROVED** | **Disetujui Resmi Pemilik Proyek.** Memungkinkan admin merespons pengaduan secara interaktif tanpa membuat tabel baru. |
| **ADR-11** | Kode Singkatan Kota | **Tidak menambahkan kolom `kode_kota`** di database. | **FINAL** | Label singkatan kota (seperti BDG, JKT) cukup diturunkan atau ditampilkan oleh komponen visual frontend tanpa membebani skema database. |
| **ADR-12** | Kesiapan Operasional Jadwal & Armada | Tambahkan **`is_active BOOLEAN DEFAULT TRUE`** hanya pada `jadwal`. | **APPROVED** | **Disetujui Resmi Pemilik Proyek.** Tidak menambah status kendaraan `aktif/perawatan`. Armada yang sudah terpakai dilindungi oleh `ON DELETE RESTRICT`. |
| **ADR-13** | Penanda Waktu Universal (Timestamps) | **Tidak menambahkan `created_at` dan `updated_at` universal** pada semua tabel. | **FINAL** | Baseline hanya menggunakan kolom temporal yang sudah tercantum pada ERD (`tgl_berangkat`, `jam_berangkat`, `tgl_transfer`, `jam_transfer`). Kebutuhan audit timestamp tambahan akan ditinjau pada fase lanjutan jika disetujui. |

---

## 5. AUDIT KARDINALITAS DAN INTEGRITAS REFERENSIAL

Berdasarkan telaah mendalam terhadap diagram ERD resmi dan implementasi fisik legacy:

### 5.1. Analisis Kardinalitas Relasi Kunci:
1. **`Pesan` dan `Konfirmasi_Pesanan` (Kardinalitas 1:1 Resmi):**
   - *Fakta Konseptual ERD:* Diagram ERD mendefinisikan hubungan antara `Pesan` dan `Konfirmasi_Pesanan` sebagai kardinalitas **1:1** (setiap tiket pesanan memiliki tepat satu entitas konfirmasi transfer).
   - *Audit Implementasi Retry Transfer:*
     - Untuk memenuhi persyaratan kardinalitas 1:1 ERD sekaligus mencegah anomali data ganda, kolom `konfirmasi_pesanan.id_pesan` diproteksi dengan constraint **`CONSTRAINT uq_konfirmasi_pesan UNIQUE (id_pesan)`**.
     - **Mekanisme Pengiriman Ulang (Retry):** Apabila konfirmasi ditolak oleh Operator Loket karena kekeliruan data rekening/jam transfer, Member memperbaiki konfirmasi dengan memperbarui (*UPDATE*) baris data konfirmasi yang sama pada pesanan tersebut (`UPDATE konfirmasi_pesanan SET no_rek = ..., tgl_transfer = ..., jam_transfer = ... WHERE id_pesan = ...`).
     - **Keuntungan Integritas:**
       1. Secara fisik dijamin oleh database tidak akan ada data konfirmasi aktif ganda untuk pesanan yang sama.
       2. Menghindari kebocoran data di mana konfirmasi lama yang telah ditolak dapat disetujui kembali oleh operator lain.
       3. Tidak memerlukan penambahan kolom audit/status non-ERD pada tabel `konfirmasi_pesanan`.
       4. Sepenuhnya selaras dengan prinsip Travora: tanpa fitur upload file/gambar bukti transfer dan tanpa gateway pembayaran otomatis.
2. **`Operator_Loket` dan `Pesan` (1:N):**
   - Satu petugas operator loket dapat memvalidasi banyak keberangkatan tiket penumpang (`pesan.id_operator BIGINT NULL`).
3. **`Operator_Loket` dan `Konfirmasi_Pesanan` (1:N):**
   - Satu petugas operator loket dapat memverifikasi banyak mutasi transfer bank penumpang (`konfirmasi_pesanan.id_operator BIGINT NULL`).
4. **`Admin` dan `Keluhan` (1:N):**
   - Satu admin dapat menangani dan memberikan tanggapan pada banyak keluhan member (`keluhan.id_admin BIGINT NULL`).
5. **`Admin` dan Data Master (`Kota_Asal`, `Kota_Tujuan`, `Kendaraan`, `Jadwal`) (1:N):**
   - Satu admin bertanggung jawab atas pencatatan banyak data master wilayah, armada, dan rute jadwal perjalanan.
6. **`Member` dan `Pesan` / `Keluhan` (1:N):**
   - Satu member dapat melakukan banyak pemesanan tiket perjalanan dan dapat mengajukan banyak laporan keluhan layanan.

### 5.2. Matriks 14 Foreign Key Resmi:

| No | Tabel Sumber | Kolom FK | Tabel Target | Kolom Target | Aturan ON DELETE | Nullability |
|:---:|:---|:---|:---|:---|:---|:---:|
| **1** | `kota_asal` | `id_admin` | `admin` | `id_admin` | `RESTRICT` | `NOT NULL` |
| **2** | `kota_tujuan` | `id_admin` | `admin` | `id_admin` | `RESTRICT` | `NOT NULL` |
| **3** | `kendaraan` | `id_admin` | `admin` | `id_admin` | `RESTRICT` | `NOT NULL` |
| **4** | `jadwal` | `id_kendaraan` | `kendaraan` | `id_kendaraan` | `RESTRICT` | `NOT NULL` |
| **5** | `jadwal` | `id_kota_asal` | `kota_asal` | `id_kota_asal` | `RESTRICT` | `NOT NULL` |
| **6** | `jadwal` | `id_kota_tujuan` | `kota_tujuan` | `id_kota_tujuan` | `RESTRICT` | `NOT NULL` |
| **7** | `jadwal` | `id_admin` | `admin` | `id_admin` | `RESTRICT` | `NOT NULL` |
| **8** | `pesan` | `id_member` | `member` | `id_member` | `RESTRICT` | `NOT NULL` |
| **9** | `pesan` | `id_operator` | `operator_loket` | `id_operator` | `RESTRICT` | `NULL` |
| **10** | `pesan` | `id_jadwal` | `jadwal` | `id_jadwal` | `RESTRICT` | `NOT NULL` |
| **11** | `konfirmasi_pesanan` | `id_pesan` | `pesan` | `id_pesan` | `RESTRICT` | `NOT NULL` |
| **12** | `konfirmasi_pesanan` | `id_operator` | `operator_loket` | `id_operator` | `RESTRICT` | `NULL` |
| **13** | `keluhan` | `id_member` | `member` | `id_member` | `RESTRICT` | `NOT NULL` |
| **14** | `keluhan` | `id_admin` | `admin` | `id_admin` | `RESTRICT` | `NULL` |

---

## 6. ATURAN PENOMORAN KURSI & PENCEGAHAN DOUBLE BOOKING

1. **Fleksibilitas Kapasitas Kursi:**
   - Database tidak membatasi nomor kursi menggunakan ENUM statis 1–5 legacy. Kolom `nomor_kursi VARCHAR(10) NOT NULL` mendukung format penomoran armada modern (misal: '1', '2', '1A', '1B', hingga '14' pada Toyota HiAce Commuter / Isuzu Elf).
2. **Pencegahan Double Booking di Produksi:**
   - Batasan `UNIQUE (id_jadwal, nomor_kursi)` **TIDAK DITERAPKAN SECARA STATIS DI DATABASE** karena akan memblokir kursi yang sama dari pemesanan ulang apabila pesanan sebelumnya telah dibatalkan (`status = 'dibatalkan'`).
   - Pencegahan double booking pada sistem produksi Travora wajib ditangani pada lapisan transaksi backend Go (Phase 5) melalui:
     - *Pessimistic locking* (`SELECT ... FOR UPDATE`) saat proses reservasi berlangsung.
     - Pengecekan status aktif (kursi dianggap terisi hanya jika `status` pesanan pada jadwal tersebut berada pada status aktif seperti `menunggu_konfirmasi`, `menunggu_verifikasi`, `terkonfirmasi`, atau `keberangkatan_tervalidasi`).

---

## 7. STRUKTUR 10 TABEL RESMI POSTGRESQL 16+

Berikut adalah struktur DDL aktif yang telah diimplementasikan dalam berkas migration `database/migrations/000001_initial_schema.up.sql`:

```sql
-- 1. TABEL ADMIN
CREATE TABLE admin (
    id_admin BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    nama_lengkap VARCHAR(100) NOT NULL,
    no_telp VARCHAR(20) NOT NULL
);

-- 2. TABEL MEMBER
CREATE TABLE member (
    id_member BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    nama VARCHAR(100) NOT NULL,
    alamat VARCHAR(255) NOT NULL,
    telepon VARCHAR(20) NOT NULL,
    jen_kelamin CHAR(1) NOT NULL,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    CONSTRAINT chk_member_jen_kelamin CHECK (jen_kelamin IN ('L', 'P'))
);

-- 3. TABEL OPERATOR LOKET
CREATE TABLE operator_loket (
    id_operator BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    nama VARCHAR(100) NOT NULL
);

-- 4. TABEL KOTA ASAL
CREATE TABLE kota_asal (
    id_kota_asal BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    nm_kota_asal VARCHAR(100) NOT NULL,
    id_admin BIGINT NOT NULL,
    CONSTRAINT fk_kota_asal_admin FOREIGN KEY (id_admin)
        REFERENCES admin(id_admin) ON DELETE RESTRICT
);

-- 5. TABEL KOTA TUJUAN
CREATE TABLE kota_tujuan (
    id_kota_tujuan BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    nm_kota_tujuan VARCHAR(100) NOT NULL,
    id_admin BIGINT NOT NULL,
    CONSTRAINT fk_kota_tujuan_admin FOREIGN KEY (id_admin)
        REFERENCES admin(id_admin) ON DELETE RESTRICT
);

-- 6. TABEL KENDARAAN
CREATE TABLE kendaraan (
    id_kendaraan BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    jenis_mobil VARCHAR(100) NOT NULL,
    nomor_polisi VARCHAR(20) NOT NULL UNIQUE,
    warna_mobil VARCHAR(30) NOT NULL,
    id_admin BIGINT NOT NULL,
    CONSTRAINT fk_kendaraan_admin FOREIGN KEY (id_admin)
        REFERENCES admin(id_admin) ON DELETE RESTRICT
);

-- 7. TABEL JADWAL
CREATE TABLE jadwal (
    id_jadwal BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    id_kendaraan BIGINT NOT NULL,
    id_kota_asal BIGINT NOT NULL,
    id_kota_tujuan BIGINT NOT NULL,
    id_admin BIGINT NOT NULL,
    harga BIGINT NOT NULL,
    tgl_berangkat DATE NOT NULL,
    jam_berangkat TIME NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT chk_jadwal_harga CHECK (harga > 0),
    CONSTRAINT chk_jadwal_rute CHECK (id_kota_asal <> id_kota_tujuan),
    CONSTRAINT fk_jadwal_kendaraan FOREIGN KEY (id_kendaraan)
        REFERENCES kendaraan(id_kendaraan) ON DELETE RESTRICT,
    CONSTRAINT fk_jadwal_kota_asal FOREIGN KEY (id_kota_asal)
        REFERENCES kota_asal(id_kota_asal) ON DELETE RESTRICT,
    CONSTRAINT fk_jadwal_kota_tujuan FOREIGN KEY (id_kota_tujuan)
        REFERENCES kota_tujuan(id_kota_tujuan) ON DELETE RESTRICT,
    CONSTRAINT fk_jadwal_admin FOREIGN KEY (id_admin)
        REFERENCES admin(id_admin) ON DELETE RESTRICT
);

-- 8. TABEL PESAN
CREATE TABLE pesan (
    id_pesan BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    nomor_kursi VARCHAR(10) NOT NULL,
    status VARCHAR(100) NOT NULL,
    id_member BIGINT NOT NULL,
    id_operator BIGINT NULL,
    id_jadwal BIGINT NOT NULL,
    CONSTRAINT fk_pesan_member FOREIGN KEY (id_member)
        REFERENCES member(id_member) ON DELETE RESTRICT,
    CONSTRAINT fk_pesan_operator FOREIGN KEY (id_operator)
        REFERENCES operator_loket(id_operator) ON DELETE RESTRICT,
    CONSTRAINT fk_pesan_jadwal FOREIGN KEY (id_jadwal)
        REFERENCES jadwal(id_jadwal) ON DELETE RESTRICT
);

-- 9. TABEL KONFIRMASI PESANAN
CREATE TABLE konfirmasi_pesanan (
    no_resi VARCHAR(20) PRIMARY KEY,
    no_rek VARCHAR(50) NOT NULL,
    tgl_transfer DATE NOT NULL,
    jam_transfer TIME NOT NULL,
    id_pesan BIGINT NOT NULL,
    id_operator BIGINT NULL,
    CONSTRAINT uq_konfirmasi_pesan UNIQUE (id_pesan),
    CONSTRAINT fk_konfirmasi_pesan FOREIGN KEY (id_pesan)
        REFERENCES pesan(id_pesan) ON DELETE RESTRICT,
    CONSTRAINT fk_konfirmasi_operator FOREIGN KEY (id_operator)
        REFERENCES operator_loket(id_operator) ON DELETE RESTRICT
);

-- 10. TABEL KELUHAN
CREATE TABLE keluhan (
    id_keluhan BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    id_member BIGINT NOT NULL,
    id_admin BIGINT NULL,
    jenis_keluhan VARCHAR(100) NOT NULL,
    detail_keluhan TEXT NOT NULL,
    status_keluhan VARCHAR(30) NOT NULL DEFAULT 'menunggu_tanggapan',
    tanggapan_admin TEXT NULL,
    CONSTRAINT fk_keluhan_member FOREIGN KEY (id_member)
        REFERENCES member(id_member) ON DELETE RESTRICT,
    CONSTRAINT fk_keluhan_admin FOREIGN KEY (id_admin)
        REFERENCES admin(id_admin) ON DELETE RESTRICT
);
```

---

## 8. STRATEGI INDEKS DATABASE & AUDIT REDUNDANSI

Seluruh indeks dievaluasi ketat untuk menghindari redundansi B-Tree prefix sekaligus menjamin seluruh foreign key dan pola query terlayani secara optimal:

```sql
-- Indeks Foreign Key untuk Optimasi JOIN
CREATE INDEX idx_kota_asal_admin ON kota_asal(id_admin);
CREATE INDEX idx_kota_tujuan_admin ON kota_tujuan(id_admin);
CREATE INDEX idx_kendaraan_admin ON kendaraan(id_admin);

CREATE INDEX idx_jadwal_kendaraan ON jadwal(id_kendaraan);
CREATE INDEX idx_jadwal_kota_tujuan ON jadwal(id_kota_tujuan);
CREATE INDEX idx_jadwal_admin ON jadwal(id_admin);

CREATE INDEX idx_pesan_member ON pesan(id_member);
CREATE INDEX idx_pesan_operator ON pesan(id_operator);
CREATE INDEX idx_pesan_jadwal ON pesan(id_jadwal);

CREATE INDEX idx_konfirmasi_pesanan_operator ON konfirmasi_pesanan(id_operator);

CREATE INDEX idx_keluhan_admin ON keluhan(id_admin);

-- Indeks Fungsional Query & Deduplikasi Leftmost Prefix
-- 1. idx_jadwal_pencarian melayani pencarian (id_kota_asal, id_kota_tujuan, tgl_berangkat)
--    sekaligus meng-cover lookup/FK id_kota_asal sebagai leftmost prefix (idx_jadwal_kota_asal redundant & dihilangkan).
-- 2. idx_keluhan_member_status melayani filter keluhan per member sekaligus meng-cover FK id_member
--    sebagai leftmost prefix (idx_keluhan_member redundant & dihilangkan).
-- 3. FK id_pesan pada konfirmasi_pesanan otomatis memiliki B-tree index dari constraint uq_konfirmasi_pesan (idx_konfirmasi_pesanan_pesan redundant & dihilangkan).
CREATE INDEX idx_jadwal_pencarian ON jadwal(id_kota_asal, id_kota_tujuan, tgl_berangkat);
CREATE INDEX idx_keluhan_member_status ON keluhan(id_member, status_keluhan);
```

---

## 9. CATATAN KOREKSI UNTUK DIAGRAM ERD MASA DEPAN

Agar dokumentasi visual selaras sempurna dengan skema fisik resmi hasil rekonsiliasi Phase 4A & 4B, dicatat beberapa rekomendasi pembaruan diagram ERD (untuk dikerjakan saat sesi revisi dokumentasi):

1. **Koreksi Kunci Utama `Pesan`:**
   Diagram menampilkan label `Id_Resi*` dengan tanda kerancuan. Seharusnya diperbarui menjadi `Id_Pesan` agar selaras dengan relasi fisik dan kunci asing pada `Konfirmasi_Pesanan`.
2. **Pencatatan Atribut Disetujui Pemilik Proyek:**
   - Menambahkan atribut `Status_Keluhan` dan `Tanggapan_Admin` pada entitas `Keluhan`.
   - Menambahkan atribut `Is_Active` pada entitas `Jadwal`.
3. **Standardisasi Penamaan Foreign Key:**
   - Memastikan nama FK pada diagram mencerminkan `Id_Admin` di 5 entitas master, `Id_Operator` di `Pesan` dan `Konfirmasi_Pesanan`, serta `Id_Kendaraan` di `Jadwal`.

---

## 10. STATUS VALIDASI RUNTIME POSTGRESQL 18 (PHASE 4B COMPLETED)

Pada tanggal **12 November 2026**, pengujian siklus migrasi runtime PostgreSQL 18 berhasil diselesaikan secara penuh menggunakan runner terisolasi pada database `travora_migration_cycle_d431b3933a67`.

### Ringkasan Capaian Validasi Empiris:
1. **Preflight Objek Non-System:** PASS (Database baru terbukti 100% bersih dengan hitungan relasi, prosedur, tipe data kustom, dan skema bernilai 0).
2. **Migration UP Pertama:** PASS (Mengeksekusi `000001_initial_schema.up.sql`, menghasilkan tepat 10 tabel resmi, 9 identity sequences, 10 primary keys, 14 foreign keys, 5 unique constraints, 3 check constraints, dan 13 indeks performa).
3. **Verifikasi Integritas Data & Kardinalitas (10 Kasus):**
   - Insert Positif: PASS (Berhasil menyimpan data valid pada ke-10 entitas).
   - 8 Negative Tests: 8/8 PASS (Seluruh pelanggaran constraint terbukti dicegah oleh constraint spesifik database: `chk_jadwal_rute`, `chk_jadwal_harga`, `member_username_key`, `kendaraan_nomor_polisi_key`, `uq_konfirmasi_pesan`, `fk_jadwal_kendaraan`, `fk_jadwal_kota_asal` via `SQLSTATE 23001`, dan `chk_member_jen_kelamin`).
   - Transaksi diakhiri dengan `ROLLBACK` (Database kembali bersih tanpa sampah pengujian sintetis).
4. **Migration DOWN:** PASS (Mengeksekusi `000001_initial_schema.down.sql`, seluruh 10 tabel terhapus bersih dengan `count = 0`).
5. **Migration UP Kedua (Idempotensi):** PASS (Mengeksekusi ulang migration UP, tepat 10 tabel resmi terbentuk kembali dengan `count = 10`).

> Laporan lengkap pembuktian empiris, hasil query catalog, dan metrik pengujian tersedia pada:  
> **[`docs/database-runtime-test-report.md`](database-runtime-test-report.md)**

---

## 11. VALIDASI REPOSITORY INTEGRATION RUNTIME (PHASE 4C.2 COMPLETED & VERIFIED)

Pada tanggal **12 November 2026**, validasi runtime integrasi Go API Repository terhadap database PostgreSQL 18 diselesaikan menggunakan database terisolasi:

```text
Database: travora_repository_it_81c8d65e8232
```

### Capaian & Hasil Empiris:
1. **Migration UP:** Berhasil memuat 10 tabel inti Travora.
2. **`TestMasterData_Integration`:** **PASS** (Mengambil data kota asal, kota tujuan, dan kendaraan secara benar dan konsisten).
3. **`TestSchedule_Integration`:** **PASS** (Mengambil jadwal aktif `is_active = TRUE`, filter kota dan tanggal `DATE`, serta penolakan jadwal non-aktif dengan `ErrScheduleNotFound`).
4. **Verifikasi Rollback:** **PASS** (Seluruh mutasi berada dalam transaksi atomik dan di-rollback; verifikasi read-only pasca-test membuktikan 0 baris pada seluruh tabel).
5. **Retensi Database:** Database `travora_repository_it_81c8d65e8232` dan database referensi `travora_repository_it_a6527bf226bd` dipertahankan utuh untuk audit.

### Catatan Technical Debt Semantik: `chk_jadwal_rute`
Ditemukan bahwa konstrain `CHECK (id_kota_asal <> id_kota_tujuan)` membandingkan *surrogate key* numerik dari dua tabel independen (`kota_asal` dan `kota_tujuan`). Hal ini menimbulkan risiko *false positive* (rute berbeda ditolak jika nomor sequence kebetulan sama) dan *false negative* (rute kota sama diizinkan jika ID berbeda). Masalah ini dicatat sebagai **Technical Debt Resmi** untuk ditinjau pada sesi ADR mendatang (misal dengan mempertimbangkan Opsi Penyatuan Master Kota `kota` atau penegakan ketat di Service Layer/Trigger).

---
**Travora Engineering Team — Phase 4A, 4B & Phase 4C.2 COMPLETED & VERIFIED.**
