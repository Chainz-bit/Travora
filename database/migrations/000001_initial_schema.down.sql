-- ============================================================================
-- TRAVORA POSTGRESQL INITIAL MIGRATION (DOWN)
-- Version: 000001_initial_schema.down.sql
-- Phase: 4B - PostgreSQL Schema Implementation & Initial Migration
-- Scope: Exactly 10 Official Tables Dropped in Reverse Dependency Order
-- ============================================================================

DROP TABLE IF EXISTS keluhan;
DROP TABLE IF EXISTS konfirmasi_pesanan;
DROP TABLE IF EXISTS pesan;
DROP TABLE IF EXISTS jadwal;
DROP TABLE IF EXISTS kendaraan;
DROP TABLE IF EXISTS kota_tujuan;
DROP TABLE IF EXISTS kota_asal;
DROP TABLE IF EXISTS operator_loket;
DROP TABLE IF EXISTS member;
DROP TABLE IF EXISTS admin;

