-- ============================================
-- CONSOLIDATED MIGRATION: Organizations RLS Policies
-- ============================================
-- This migration consolidates the following migrations:
--   - 20251228235726_add_organizations_insert_policy.sql
--   - 20251229000000_fix_organizations_insert_policy.sql
--   - 20251229002504_allow_organization_creation.sql
--   - 20251229002949_fix_organizations_insert_final.sql
--
-- Final state: Allows authenticated users to create organizations
-- The application code ensures the owner field is set correctly
-- ============================================

-- ============================================
-- SECURITY DEFINER function to get current user ID from JWT
-- This function extracts the 'sub' claim from the JWT token
-- Created for Clerk integration compatibility
-- ============================================
CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(
    (SELECT auth.jwt()->>'sub'),
    (SELECT current_setting('request.jwt.claims', true)::json->>'sub')
  );
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_current_user_id() TO authenticated;

-- ============================================
-- Organizations INSERT policy
-- ============================================
-- Drop any existing INSERT policies (cleanup from iterative development)
DROP POLICY IF EXISTS "Users can create organizations" ON organizations;
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON organizations;
DROP POLICY IF EXISTS "Authenticated users can insert organizations" ON organizations;

-- Create the final INSERT policy for authenticated users
-- The application code ensures the owner field is set to the current user
CREATE POLICY "Authenticated users can insert organizations"
ON organizations
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Keep existing policies:
-- - "Users can view their organizations" (SELECT)
-- - "Owners can update their organizations" (UPDATE)
-- - "Service role full access to organizations" (ALL for service_role)
