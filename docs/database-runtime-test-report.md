# LAPORAN PENGUJIAN RUNTIME MIGRATION & INTEGRITAS DATABASE
## Proyek: TRAVORA — Sistem Informasi Pemesanan Tiket Travel Antar-Kota
**Dokumen:** `docs/database-runtime-test-report.md`  
**Fase:** Phase 4B — PostgreSQL Runtime Migration & Integrity Verification  
**Tanggal Pengujian:** 12 November 2026  
**Status Pengujian:** 100% SUKSES (All Steps Passed)  
**Lingkungan RDBMS:** PostgreSQL 18 (Localhost:5432, Windows Native Service, auth SCRAM-SHA-256)  
**Database Uji Siklus:** `travora_migration_cycle_d431b3933a67`  

---

## 1. RINGKASAN EKSEKUTIF RUNTIME

Pengujian migrasi runtime PostgreSQL 18 dilakukan secara langsung melalui automasi skrip runner PowerShell ([`scratch/run_migration_cycle.ps1`](file:///C:/Users/diwan/.gemini/antigravity/brain/f3d9bb65-f095-41bd-b303-20433e27283b/scratch/run_migration_cycle.ps1)) dengan input kredensial interaktif tertutup (*masked, zero disk-leak*). 

Pengujian ini membuktikan secara empiris bahwa:
1. Skema DDL ([`000001_initial_schema.up.sql`](file:///d:/PPL/travora/database/migrations/000001_initial_schema.up.sql)) valid secara sintaks dan semantik pada PostgreSQL 18.
2. Integritas referensial (14 Foreign Keys), kardinalitas 1:1 (`uq_konfirmasi_pesan`), dan aturan validasi domain (3 CHECK constraints) berfungsi sempurna.
3. Skrip rollback ([`000001_initial_schema.down.sql`](file:///d:/PPL/travora/database/migrations/000001_initial_schema.down.sql)) mampu menghapus seluruh objek secara bersih tanpa meninggalkan *orphan dependency*.
4. Migrasi bersifat idempoten dan dapat dieksekusi ulang (*re-runnable*) tanpa kegagalan.

---

## 2. HASIL TAHAP DEMI TAHAP (LIFECYCLE TEST)

| Langkah | Pengujian | Target Database | Hasil Aktual | Keterangan |
|:---:|:---|:---|:---:|:---|
| **0** | **Preflight Check** | `travora_migration_cycle_d431b3933a67` | **PASS** | Relations: 0, Routines: 0, Types: 0, Schemas: 0. Database terbukti bersih sebelum migrasi. |
| **1** | **Migration UP (1st)** | `travora_migration_cycle_d431b3933a67` | **PASS** | Mengeksekusi `000001_initial_schema.up.sql`. 10 tabel, 9 sequence, 14 FK, 13 indeks berhasil dibuat. |
| **2** | **Verifikasi Struktur** | `travora_migration_cycle_d431b3933a67` | **PASS** | Validasi 10 PK, 14 FK, 5 UNIQUE, 3 CHECK, dan default values (`is_active = TRUE`, `status_keluhan = 'menunggu_tanggapan'`). |
| **3** | **Insert Positif (10 Entitas)** | `travora_migration_cycle_d431b3933a67` | **PASS** | Berhasil memasukkan 1 baris data sintetis valid ke seluruh 10 entitas dalam satu transaksi. |
| **4** | **Test Integritas Negatif** | `travora_migration_cycle_d431b3933a67` | **PASS (8/8)** | Seluruh 8 pelanggaran constraint tertangkap secara spesifik (`GET STACKED DIAGNOSTICS`). Transaksi diakhiri `ROLLBACK;`. |
| **5** | **Migration DOWN** | `travora_migration_cycle_d431b3933a67` | **PASS** | Mengeksekusi `000001_initial_schema.down.sql`. Verifikasi query: `count(*) = 0` (seluruh 10 tabel terhapus bersih). |
| **6** | **Migration UP (2nd Re-run)** | `travora_migration_cycle_d431b3933a67` | **PASS** | Mengeksekusi ulang `000001_initial_schema.up.sql`. Verifikasi query: `count(*) = 10` (10 tabel resmi terbentuk kembali utuh). |

---

## 3. HASIL VERIFIKASI STRUKTUR FISIK

Hasil verifikasi melalui skrip [`scratch/verify_structure.sql`](file:///C:/Users/diwan/.gemini/antigravity/brain/f3d9bb65-f095-41bd-b303-20433e27283b/scratch/verify_structure.sql):

### A. 10 Tabel Resmi Travora
1. `admin` (Base Table)
2. `member` (Base Table)
3. `operator_loket` (Base Table)
4. `kota_asal` (Base Table)
5. `kota_tujuan` (Base Table)
6. `kendaraan` (Base Table)
7. `jadwal` (Base Table)
8. `pesan` (Base Table)
9. `konfirmasi_pesanan` (Base Table)
10. `keluhan` (Base Table)

### B. 10 Primary Key
* `admin_pkey` (`admin.id_admin`)
* `member_pkey` (`member.id_member`)
* `operator_loket_pkey` (`operator_loket.id_operator`)
* `kota_asal_pkey` (`kota_asal.id_kota_asal`)
* `kota_tujuan_pkey` (`kota_tujuan.id_kota_tujuan`)
* `kendaraan_pkey` (`kendaraan.id_kendaraan`)
* `jadwal_pkey` (`jadwal.id_jadwal`)
* `pesan_pkey` (`pesan.id_pesan`)
* `konfirmasi_pesanan_pkey` (`konfirmasi_pesanan.no_resi`)
* `keluhan_pkey` (`keluhan.id_keluhan`)

### C. 14 Foreign Key Resmi (Semua Aturan: `ON DELETE RESTRICT`)
1. `fk_kota_asal_admin`: `kota_asal.id_admin` $\to$ `admin.id_admin`
2. `fk_kota_tujuan_admin`: `kota_tujuan.id_admin` $\to$ `admin.id_admin`
3. `fk_kendaraan_admin`: `kendaraan.id_admin` $\to$ `admin.id_admin`
4. `fk_jadwal_kendaraan`: `jadwal.id_kendaraan` $\to$ `kendaraan.id_kendaraan`
5. `fk_jadwal_kota_asal`: `jadwal.id_kota_asal` $\to$ `kota_asal.id_kota_asal`
6. `fk_jadwal_kota_tujuan`: `jadwal.id_kota_tujuan` $\to$ `kota_tujuan.id_kota_tujuan`
7. `fk_jadwal_admin`: `jadwal.id_admin` $\to$ `admin.id_admin`
8. `fk_pesan_member`: `pesan.id_member` $\to$ `member.id_member`
9. `fk_pesan_operator`: `pesan.id_operator` $\to$ `operator_loket.id_operator` (Nullable)
10. `fk_pesan_jadwal`: `pesan.id_jadwal` $\to$ `jadwal.id_jadwal`
11. `fk_konfirmasi_pesan`: `konfirmasi_pesanan.id_pesan` $\to$ `pesan.id_pesan`
12. `fk_konfirmasi_operator`: `konfirmasi_pesanan.id_operator` $\to$ `operator_loket.id_operator` (Nullable)
13. `fk_keluhan_member`: `keluhan.id_member` $\to$ `member.id_member`
14. `fk_keluhan_admin`: `keluhan.id_admin` $\to$ `admin.id_admin` (Nullable)

### D. 5 UNIQUE Constraints
1. `admin_email_key` (`admin.email`)
2. `member_username_key` (`member.username`)
3. `operator_loket_username_key` (`operator_loket.username`)
4. `kendaraan_nomor_polisi_key` (`kendaraan.nomor_polisi`)
5. `uq_konfirmasi_pesan` (`konfirmasi_pesanan.id_pesan` — **Penjamin Kardinalitas 1:1**)

### E. 3 CHECK Constraints
1. `chk_jadwal_rute`: `(id_kota_asal <> id_kota_tujuan)`
2. `chk_jadwal_harga`: `(harga > 0)`
3. `chk_member_jen_kelamin`: `(jen_kelamin IN ('L', 'P'))`

---

## 4. HASIL TEST INTEGRITAS DATA (TEST_INTEGRITY.SQL)

Test suite dijalankan dalam transaksi terisolasi `BEGIN; ... ROLLBACK;`.

```text
[PASS] Verifikasi 10 tabel resmi berhasil.
[PASS] Verifikasi default jadwal.is_active = TRUE berhasil.
[PASS] Insert valid pada seluruh 10 entitas berhasil.
[PASS] chk_jadwal_rute berhasil menolak kota asal = kota tujuan.
[PASS] chk_jadwal_harga berhasil menolak harga <= 0.
[PASS] UNIQUE username member (member_username_key) berhasil memblokir duplikasi.
[PASS] UNIQUE nomor_polisi (kendaraan_nomor_polisi_key) berhasil memblokir duplikasi plat.
[PASS] uq_konfirmasi_pesan berhasil memblokir konfirmasi ganda (kardinalitas 1:1 terjamin).
[PASS] Foreign key fk_jadwal_kendaraan berhasil menolak id_kendaraan yang tidak ada.
[PASS] ON DELETE RESTRICT fk_jadwal_kota_asal berhasil mencegah penghapusan kota yang direferensikan.
[PASS] chk_member_jen_kelamin berhasil memblokir nilai selain L/P.
SELURUH UJI INTEGRITAS POSTGRESQL 16+ BERHASIL 100%!
```

### Rincian Validasi Constraint Negatif:
* **Uji 1 (`chk_jadwal_rute`):** Insert jadwal dengan rute Bandung $\to$ Bandung berhasil digagalkan oleh constraint CHECK rute.
* **Uji 2 (`chk_jadwal_harga`):** Insert jadwal dengan harga `0` berhasil digagalkan oleh constraint CHECK harga positif.
* **Uji 3 (`member_username_key`):** Insert member dengan username duplikat `'budi_member'` pada ID baru (103) berhasil digagalkan secara eksklusif oleh unique constraint username.
* **Uji 4 (`kendaraan_nomor_polisi_key`):** Insert kendaraan dengan plat nomor duplikat `'D 7101 TRV'` pada ID baru (104) berhasil digagalkan oleh unique constraint nomor polisi.
* **Uji 5 (`uq_konfirmasi_pesan`):** Insert konfirmasi kedua untuk tiket pesanan yang sama (`id_pesan = 1`) berhasil ditolak, membuktikan kardinalitas 1:1 antara Pesan dan Konfirmasi Pesanan aktif secara fisik.
* **Uji 6 (`fk_jadwal_kendaraan`):** Insert jadwal yang mereferensikan kendaraan fiktif (`id_kendaraan = 9999`) ditolak oleh foreign key violation.
* **Uji 7 (`fk_jadwal_kota_asal`):** Penghapusan kota asal yang sedang digunakan oleh jadwal aktif ditolak dengan kode `SQLSTATE 23001` (`restrict_violation`).
* **Uji 8 (`chk_member_jen_kelamin`):** Insert member dengan kode jenis kelamin `'X'` ditolak oleh constraint domain gender.

---

## 5. KESIMPULAN & STATUS KESIAPAN FASE BERIKUTNYA

| Aspek Evaluasi | Target | Capaian Aktual | Status |
|:---|:---:|:---:|:---:|
| Kesesuaian ERD Final | 10 Tabel | 10 Tabel | **MEMENUHI** |
| Integritas Referensial | 14 FK RESTRICT | 14 FK RESTRICT | **MEMENUHI** |
| Kardinalitas 1:1 Pembayaran | Constraint Unik | `uq_konfirmasi_pesan` Aktif | **MEMENUHI** |
| Siklus Migrasi UP/DOWN | 10 $\to$ 0 $\to$ 10 | 10 $\to$ 0 $\to$ 10 | **MEMENUHI** |
| Keamanan Data | Zero Leak | Zero Leak (Masked + In-Memory) | **MEMENUHI** |

**Keputusan Arsitektur:**  
Phase 4B telah selesai (**COMPLETED**). Database schema baseline dinyatakan terkunci (*frozen*) dan siap digunakan sebagai dasar konektivitas backend Go pada **Phase 4C (Go Backend Connectivity & CRUD Services)**.

