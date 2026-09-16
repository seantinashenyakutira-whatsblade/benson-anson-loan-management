-- Phase 1, Migration 001: Extensions
-- Enable required PostgreSQL extensions
-- Note: gen_random_uuid() is built into PostgreSQL 13+ (no extension needed)

CREATE EXTENSION IF NOT EXISTS "pg_trgm";
