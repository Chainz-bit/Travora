-- ============================================================================
-- TRAVORA POSTGRESQL MIGRATION 000002 (DOWN)
-- ============================================================================

DROP INDEX IF EXISTS uq_pesan_active_seat;
DROP INDEX IF EXISTS uq_pesan_midtrans_order_id;

ALTER TABLE pesan
    DROP COLUMN IF EXISTS qris_expires_at,
    DROP COLUMN IF EXISTS qris_url,
    DROP COLUMN IF EXISTS midtrans_order_id,
    DROP COLUMN IF EXISTS payment_method,
    DROP COLUMN IF EXISTS created_at;
