-- ============================================================================
-- TRAVORA POSTGRESQL MIGRATION (UP)
-- Version: 000004_sync_bookings_tickets.up.sql
-- Scope: Menambahkan kolom order_code & metadata sinkronisasi pada pesan dan konfirmasi_pesanan
-- ============================================================================

ALTER TABLE pesan ADD COLUMN IF NOT EXISTS order_code VARCHAR(50);
ALTER TABLE pesan ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE pesan
SET order_code = 'TRV-' || to_char(COALESCE(created_at, NOW()), 'YYYYMMDD') || '-' || LPAD(id_pesan::text, 4, '0')
WHERE order_code IS NULL OR order_code = '';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_pesan_order_code'
    ) THEN
        ALTER TABLE pesan ADD CONSTRAINT uq_pesan_order_code UNIQUE (order_code);
    END IF;
END $$;

ALTER TABLE konfirmasi_pesanan ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100) NOT NULL DEFAULT '';
ALTER TABLE konfirmasi_pesanan ADD COLUMN IF NOT EXISTS account_holder VARCHAR(120) NOT NULL DEFAULT '';
ALTER TABLE konfirmasi_pesanan ADD COLUMN IF NOT EXISTS transfer_amount BIGINT NOT NULL DEFAULT 0;
ALTER TABLE konfirmasi_pesanan ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'menunggu_verifikasi';
ALTER TABLE konfirmasi_pesanan ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
