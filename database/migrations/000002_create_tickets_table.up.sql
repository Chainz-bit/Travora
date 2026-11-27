-- ============================================================================
-- TRAVORA POSTGRESQL MIGRATION (UP)
-- Version: 000002_create_tickets_table.up.sql
-- Scope: E-Tiket QR Code & Operator Scan Check-in Table (Real Member FK)
-- ============================================================================

CREATE TABLE IF NOT EXISTS tickets (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    order_code VARCHAR(50) NOT NULL UNIQUE,
    event_name VARCHAR(255) NOT NULL,
    amount BIGINT NOT NULL,
    payment_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    ticket_status VARCHAR(20) NOT NULL DEFAULT 'unused',
    scanned_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_tickets_member FOREIGN KEY (user_id)
        REFERENCES member(id_member) ON DELETE CASCADE,
    CONSTRAINT chk_tickets_payment_status CHECK (payment_status IN ('pending', 'paid', 'expired')),
    CONSTRAINT chk_tickets_ticket_status CHECK (ticket_status IN ('unused', 'used'))
);

CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON tickets (user_id);
