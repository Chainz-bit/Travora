-- ============================================================================
-- TRAVORA POSTGRESQL MIGRATION (DOWN)
-- Version: 000004_sync_bookings_tickets.down.sql
-- ============================================================================

ALTER TABLE pesan DROP CONSTRAINT IF EXISTS uq_pesan_order_code;
ALTER TABLE pesan DROP COLUMN IF EXISTS order_code;
ALTER TABLE pesan DROP COLUMN IF EXISTS created_at;

ALTER TABLE konfirmasi_pesanan DROP COLUMN IF EXISTS bank_name;
ALTER TABLE konfirmasi_pesanan DROP COLUMN IF EXISTS account_holder;
ALTER TABLE konfirmasi_pesanan DROP COLUMN IF EXISTS transfer_amount;
ALTER TABLE konfirmasi_pesanan DROP COLUMN IF EXISTS status;
ALTER TABLE konfirmasi_pesanan DROP COLUMN IF EXISTS created_at;
