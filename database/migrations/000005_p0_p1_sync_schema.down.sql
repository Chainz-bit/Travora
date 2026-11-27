-- ============================================================================
-- TRAVORA POSTGRESQL MIGRATION (DOWN)
-- Version: 000005_p0_p1_sync_schema.down.sql
-- ============================================================================

DROP INDEX IF EXISTS uq_pesan_active_seat;

ALTER TABLE keluhan DROP COLUMN IF EXISTS updated_at;
ALTER TABLE keluhan DROP COLUMN IF EXISTS created_at;
ALTER TABLE keluhan DROP COLUMN IF EXISTS order_code;
