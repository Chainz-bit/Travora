-- ============================================================================
-- TRAVORA POSTGRESQL MIGRATION 000002 (UP)
-- Scope: Dukungan Booking Real & Pembayaran QRIS Midtrans pada tabel pesan
-- Tetap menjaga 10 tabel resmi ERD Travora.
-- ============================================================================

ALTER TABLE pesan
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS payment_method VARCHAR(30) NOT NULL DEFAULT 'qris',
    ADD COLUMN IF NOT EXISTS midtrans_order_id VARCHAR(64) NULL,
    ADD COLUMN IF NOT EXISTS qris_url TEXT NULL,
    ADD COLUMN IF NOT EXISTS qris_expires_at TIMESTAMPTZ NULL;

-- Pastikan order_id Midtrans unik jika terisi
CREATE UNIQUE INDEX IF NOT EXISTS uq_pesan_midtrans_order_id
    ON pesan(midtrans_order_id)
    WHERE midtrans_order_id IS NOT NULL;

-- Cegah double-booking pada jadwal & kursi yang sama untuk pesanan aktif
CREATE UNIQUE INDEX IF NOT EXISTS uq_pesan_active_seat
    ON pesan(id_jadwal, nomor_kursi)
    WHERE status NOT IN ('dibatalkan');
