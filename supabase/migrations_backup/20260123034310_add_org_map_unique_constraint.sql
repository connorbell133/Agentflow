-- ============================================
-- Migration: Add unique constraint to org_map
-- ============================================
-- This migration adds a unique constraint on (user_id, org_id)
-- to ensure users can only have one role per organization.
-- This is required for the ON CONFLICT clause in the
-- auto_add_org_owner_to_org_map trigger.
-- Created: 2026-01-23
-- ============================================

-- Add unique constraint to ensure one user can only have one role per org
ALTER TABLE org_map
ADD CONSTRAINT org_map_user_org_unique UNIQUE (user_id, org_id);

-- Add comment
COMMENT ON CONSTRAINT org_map_user_org_unique ON org_map IS
  'Ensures each user has only one role per organization';
