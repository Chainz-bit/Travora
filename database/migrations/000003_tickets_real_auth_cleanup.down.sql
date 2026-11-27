-- ============================================================================
-- TRAVORA POSTGRESQL MIGRATION (DOWN)
-- Version: 000003_tickets_real_auth_cleanup.down.sql
-- ============================================================================

ALTER TABLE tickets DROP CONSTRAINT IF EXISTS fk_tickets_member;
