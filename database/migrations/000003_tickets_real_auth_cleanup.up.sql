-- ============================================================================
-- TRAVORA POSTGRESQL MIGRATION (UP)
-- Version: 000003_tickets_real_auth_cleanup.up.sql
-- Scope: Hapus baris tiket dummy, hapus DEFAULT 1, dan pastikan FK member(id_member)
-- ============================================================================

DELETE FROM tickets WHERE order_code LIKE 'TKT-DUMMY-%';

ALTER TABLE tickets ALTER COLUMN user_id DROP DEFAULT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_tickets_member'
    ) THEN
        ALTER TABLE tickets
            ADD CONSTRAINT fk_tickets_member
            FOREIGN KEY (user_id) REFERENCES member(id_member) ON DELETE CASCADE;
    END IF;
END $$;
