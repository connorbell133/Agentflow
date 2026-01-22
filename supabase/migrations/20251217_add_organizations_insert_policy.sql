-- ============================================
-- Add INSERT policy for organizations table
-- Allows authenticated users to create organizations where they are the owner
-- ============================================

-- Drop existing policy if it exists (idempotent)
DROP POLICY IF EXISTS "Users can create organizations" ON organizations;

-- Allow authenticated users to create organizations
-- They can only create orgs where they are the owner
CREATE POLICY "Users can create organizations"
ON organizations FOR INSERT
TO authenticated
WITH CHECK (
  -- User can only create org if they are the owner
  (SELECT auth.jwt()->>'sub') = owner
);
