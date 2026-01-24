-- ============================================
-- Migration: Convert organizations.owner from text to uuid
-- ============================================
-- This migration completes the user ID conversion by changing
-- organizations.owner to uuid type, matching org_map.user_id
-- and other user identifier columns.
-- Created: 2026-01-23
-- ============================================

-- Convert organizations.owner from text to uuid
ALTER TABLE organizations
ALTER COLUMN owner TYPE uuid USING owner::uuid;

-- Add comment
COMMENT ON COLUMN organizations.owner IS
  'Organization owner user ID (uuid type matching Supabase Auth)';
