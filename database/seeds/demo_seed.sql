-- ============================================================================
-- TRAVORA - DEMONSTRATION SEED DATA
-- Target Database: travora_demo_20261113
-- Scope: Master Data, Kendaraan, dan Jadwal Masa Depan untuk Demonstrasi Live
-- ============================================================================

BEGIN;

-- 1. DATA MASTER ADMIN
INSERT INTO admin (id_admin, email, password_hash, nama_lengkap, no_telp)
VALUES 
    (1, 'admin@travora.id', '$2a$10$demo.hash.not.real.travora.admin.account', 'Admin Pusat Travora', '081234567890')
ON CONFLICT (id_admin) DO NOTHING;

-- 2. DATA MASTER MEMBER
INSERT INTO member (id_member, nama, alamat, telepon, jen_kelamin, username, password_hash)
VALUES
    (1, 'Budi Santoso', 'Jl. Dago No. 10, Bandung', '081234567891', 'L', 'budi_santoso', '$2a$10$demo.hash.member.budi'),
    (2, 'Siti Nurhaliza', 'Jl. Sudirman No. 45, Jakarta', '081234567892', 'P', 'siti_nurhaliza', '$2a$10$demo.hash.member.siti')
ON CONFLICT (id_member) DO NOTHING;

-- 3. DATA MASTER OPERATOR LOKET
INSERT INTO operator_loket (id_operator, username, password_hash, nama)
VALUES
    (1, 'operator_bandung', '$2a$10$demo.hash.operator.bandung', 'Ahmad Loket Bandung'),
    (2, 'operator_jakarta', '$2a$10$demo.hash.operator.jakarta', 'Dewi Loket Jakarta')
ON CONFLICT (id_operator) DO NOTHING;

-- 4. DATA MASTER KOTA ASAL (ID rentang 100 untuk menghindari collision)
INSERT INTO kota_asal (id_kota_asal, nm_kota_asal, id_admin)
VALUES
    (101, 'Bandung', 1),
    (102, 'Jakarta', 1),
    (103, 'Yogyakarta', 1),
    (104, 'Surabaya', 1),
    (105, 'Semarang', 1)
ON CONFLICT (id_kota_asal) DO NOTHING;

-- 5. DATA MASTER KOTA TUJUAN (ID rentang 200 untuk memenuhi chk_jadwal_rute)
INSERT INTO kota_tujuan (id_kota_tujuan, nm_kota_tujuan, id_admin)
VALUES
    (201, 'Jakarta', 1),
    (202, 'Bandung', 1),
    (203, 'Surabaya', 1),
    (204, 'Yogyakarta', 1),
    (205, 'Semarang', 1)
ON CONFLICT (id_kota_tujuan) DO NOTHING;

-- 6. DATA MASTER KENDARAAN
INSERT INTO kendaraan (id_kendaraan, jenis_mobil, nomor_polisi, warna_mobil, id_admin)
VALUES
    (1, 'Toyota HiAce Premio (11 Kursi)', 'D 1234 TRV', 'Putih Mutiara', 1),
    (2, 'Toyota HiAce Commuter (14 Kursi)', 'B 5678 TRV', 'Hitam Metalik', 1),
    (3, 'Isuzu Elf Executive (12 Kursi)', 'D 9012 TRV', 'Silver Metalik', 1),
    (4, 'Mercedes-Benz Sprinter VIP (8 Kursi)', 'B 3456 TRV', 'Abu-abu Metalik', 1),
    (5, 'Toyota Innova Zenix (6 Kursi)', 'AB 7890 TRV', 'Putih Diamond', 1)
ON CONFLICT (id_kendaraan) DO NOTHING;

-- 7. DATA JADWAL PERJALANAN (Jadwal Demo: 13-15 November 2026 & Future)
INSERT INTO jadwal (id_jadwal, id_kendaraan, id_kota_asal, id_kota_tujuan, id_admin, harga, tgl_berangkat, jam_berangkat, is_active)
VALUES
    -- Rute Bandung -> Jakarta (13 Nov 2026)
    (1, 1, 101, 201, 1, 150000, '2026-11-13', '07:00:00', TRUE),
    (2, 2, 101, 201, 1, 135000, '2026-11-13', '09:30:00', TRUE),
    (3, 4, 101, 201, 1, 220000, '2026-11-13', '13:00:00', TRUE),
    (4, 1, 101, 201, 1, 150000, '2026-11-13', '16:30:00', TRUE),
    (5, 5, 101, 201, 1, 175000, '2026-11-13', '19:30:00', TRUE),

    -- Rute Jakarta -> Bandung (13 Nov 2026)
    (6, 1, 102, 202, 1, 150000, '2026-11-13', '08:00:00', TRUE),
    (7, 2, 102, 202, 1, 135000, '2026-11-13', '11:00:00', TRUE),
    (8, 4, 102, 202, 1, 220000, '2026-11-13', '14:30:00', TRUE),
    (9, 1, 102, 202, 1, 150000, '2026-11-13', '18:00:00', TRUE),

    -- Rute Antarkota Lainnya (13 Nov 2026)
    (10, 3, 101, 204, 1, 250000, '2026-11-13', '08:00:00', TRUE), -- Bandung -> Yogya
    (11, 1, 101, 204, 1, 280000, '2026-11-13', '19:00:00', TRUE), -- Bandung -> Yogya
    (12, 1, 103, 203, 1, 200000, '2026-11-13', '09:00:00', TRUE), -- Yogya -> Surabaya
    (13, 5, 103, 203, 1, 225000, '2026-11-13', '15:30:00', TRUE), -- Yogya -> Surabaya
    (14, 3, 102, 205, 1, 230000, '2026-11-13', '07:30:00', TRUE), -- Jakarta -> Semarang
    (15, 1, 102, 205, 1, 260000, '2026-11-13', '16:00:00', TRUE), -- Jakarta -> Semarang

    -- Jadwal Tambahan (14 Nov 2026)
    (16, 1, 101, 201, 1, 150000, '2026-11-14', '07:00:00', TRUE),
    (17, 2, 101, 201, 1, 135000, '2026-11-14', '10:00:00', TRUE),
    (18, 1, 101, 201, 1, 150000, '2026-11-14', '14:00:00', TRUE),
    (19, 4, 101, 201, 1, 220000, '2026-11-14', '18:00:00', TRUE),
    (20, 1, 102, 202, 1, 150000, '2026-11-14', '08:00:00', TRUE),
    (21, 2, 102, 202, 1, 135000, '2026-11-14', '12:00:00', TRUE),

    -- Jadwal Tambahan (15 Nov 2026 & Tanggal Uji 05 Des 2026)
    (22, 1, 101, 201, 1, 150000, '2026-11-15', '09:00:00', TRUE),
    (23, 1, 101, 201, 1, 150000, '2026-12-05', '08:30:00', TRUE),
    (24, 2, 101, 201, 1, 140000, '2026-12-05', '14:00:00', TRUE)
ON CONFLICT (id_jadwal) DO NOTHING;

-- 8. UPDATE SEQUENCE AGAR TIDAK CONFLICT SAAT INSERT BARU
SELECT setval(pg_get_serial_sequence('admin', 'id_admin'), COALESCE((SELECT MAX(id_admin) FROM admin), 1));
SELECT setval(pg_get_serial_sequence('member', 'id_member'), COALESCE((SELECT MAX(id_member) FROM member), 1));
SELECT setval(pg_get_serial_sequence('operator_loket', 'id_operator'), COALESCE((SELECT MAX(id_operator) FROM operator_loket), 1));
SELECT setval(pg_get_serial_sequence('kota_asal', 'id_kota_asal'), COALESCE((SELECT MAX(id_kota_asal) FROM kota_asal), 1));
SELECT setval(pg_get_serial_sequence('kota_tujuan', 'id_kota_tujuan'), COALESCE((SELECT MAX(id_kota_tujuan) FROM kota_tujuan), 1));
SELECT setval(pg_get_serial_sequence('kendaraan', 'id_kendaraan'), COALESCE((SELECT MAX(id_kendaraan) FROM kendaraan), 1));
SELECT setval(pg_get_serial_sequence('jadwal', 'id_jadwal'), COALESCE((SELECT MAX(id_jadwal) FROM jadwal), 1));

COMMIT;

