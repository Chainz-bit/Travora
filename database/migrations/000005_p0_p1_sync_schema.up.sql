-- ============================================================================
-- TRAVORA POSTGRESQL MIGRATION (UP)
-- Version: 000005_p0_p1_sync_schema.up.sql
-- Scope: Sinkronisasi kolom keluhan & partial unique index kursi aktif pada pesan
-- ============================================================================

ALTER TABLE keluhan ADD COLUMN IF NOT EXISTS order_code VARCHAR(50) NULL;
ALTER TABLE keluhan ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE keluhan ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS uq_pesan_active_seat
    ON pesan (id_jadwal, nomor_kursi)
    WHERE status <> 'dibatalkan';
