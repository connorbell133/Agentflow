-- ============================================
-- Add INSERT/UPDATE/DELETE policies for groups, invites, models, org_map, and profiles tables
-- These allow org members to manage these resources
-- Idempotent: drops policies first if they exist
-- ============================================

-- ============================================
-- SECURITY DEFINER function to check if user owns an org that another user belongs to
-- This bypasses RLS to avoid infinite recursion
-- ============================================
CREATE OR REPLACE FUNCTION public.user_owns_org_with_member(owner_id TEXT, member_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM organizations o
    JOIN org_map om ON o.id = om.org_id
    WHERE o.owner = owner_id
    AND om.user_id = member_id
  );
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.user_owns_org_with_member(TEXT, TEXT) TO authenticated;

-- ============================================
-- SECURITY DEFINER function to check if user is owner of a specific org
-- ============================================
CREATE OR REPLACE FUNCTION public.user_is_org_owner(check_user_id TEXT, check_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM organizations
    WHERE id = check_org_id
    AND owner = check_user_id
  );
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.user_is_org_owner(TEXT, UUID) TO authenticated;

-- ============================================
-- SECURITY DEFINER function to get user's email from their ID
-- Used to check if user is the invitee (since invitee stores email, not user ID)
-- ============================================
CREATE OR REPLACE FUNCTION public.get_user_email(user_id TEXT)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT email FROM profiles WHERE id = user_id LIMIT 1;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_email(TEXT) TO authenticated;

-- ============================================
-- SECURITY DEFINER function to check if user has a pending invite to a group
-- Used to allow invitees to view groups they're being invited to
-- ============================================
CREATE OR REPLACE FUNCTION public.user_has_invite_to_group(user_email TEXT, check_group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM invites
    WHERE invites.group_id = check_group_id
    AND invites.invitee = user_email
  );
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.user_has_invite_to_group(TEXT, UUID) TO authenticated;

-- ============================================
-- SECURITY DEFINER function to check if user has a pending invite to an org
-- Used to allow invitees to view organizations they're being invited to
-- ============================================
CREATE OR REPLACE FUNCTION public.user_has_invite_to_org(user_email TEXT, check_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM invites
    WHERE invites.org_id = check_org_id
    AND invites.invitee = user_email
  );
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.user_has_invite_to_org(TEXT, UUID) TO authenticated;

-- ============================================
-- SECURITY DEFINER function to check if user is member of an org
-- Used to avoid RLS recursion in invites/groups policies
-- ============================================
CREATE OR REPLACE FUNCTION public.user_is_org_member(check_user_id TEXT, check_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM org_map
    WHERE org_map.org_id = check_org_id
    AND org_map.user_id = check_user_id
  );
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.user_is_org_member(TEXT, UUID) TO authenticated;

-- ============================================
-- Organizations SELECT policy (allow org members AND invitees to see orgs)
-- ============================================
DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;

CREATE POLICY "Users can view their organizations"
ON organizations FOR SELECT
TO authenticated
USING (
  -- Can view if you're in the org (uses SECURITY DEFINER to avoid recursion)
  public.user_is_org_member((SELECT auth.jwt()->>'sub'), id)
  OR
  -- OR you have a pending invite to this org
  public.user_has_invite_to_org(public.get_user_email((SELECT auth.jwt()->>'sub')), id)
);

-- ============================================
-- Groups SELECT policy (allow org members AND invitees to see groups)
-- ============================================
DROP POLICY IF EXISTS "Users can view groups in their orgs" ON groups;

CREATE POLICY "Users can view groups in their orgs"
ON groups FOR SELECT
TO authenticated
USING (
  -- Can view if you're in the org (uses SECURITY DEFINER to avoid recursion)
  public.user_is_org_member((SELECT auth.jwt()->>'sub'), org_id)
  OR
  -- OR you have a pending invite to this group
  public.user_has_invite_to_group(public.get_user_email((SELECT auth.jwt()->>'sub')), id)
);

-- ============================================
-- Org_map SELECT policy (for org owners to see all members)
-- ============================================
DROP POLICY IF EXISTS "Users can view own org memberships" ON org_map;
DROP POLICY IF EXISTS "Users can view org_map in their orgs" ON org_map;

CREATE POLICY "Users can view org_map in their orgs"
ON org_map FOR SELECT
TO authenticated
USING (
  -- Can see own org memberships
  (SELECT auth.jwt()->>'sub') = user_id
  OR
  -- Org owners can see all members in their orgs
  public.user_is_org_owner((SELECT auth.jwt()->>'sub'), org_id)
);

-- ============================================
-- Profiles policies (org-scoped viewing for owners)
-- ============================================

-- Allow users to view their own profile, or org owners can view profiles of users in their org
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles in their orgs" ON profiles;
CREATE POLICY "Users can view profiles in their orgs"
ON profiles FOR SELECT
TO authenticated
USING (
  -- Can view own profile
  (SELECT auth.jwt()->>'sub') = id
  OR
  -- Org owners can view profiles of users in their org
  public.user_owns_org_with_member((SELECT auth.jwt()->>'sub'), id)
);

-- ============================================
-- Org_map write policies (for invite acceptance)
-- ============================================

-- Users can insert themselves into an org if they have an invite
-- Uses SECURITY DEFINER function to avoid RLS recursion (invites -> org_map -> invites)
DROP POLICY IF EXISTS "Users can join org via invite" ON org_map;
CREATE POLICY "Users can join org via invite"
ON org_map FOR INSERT
TO authenticated
WITH CHECK (
  -- User can only add themselves
  (SELECT auth.jwt()->>'sub') = user_id
  AND
  -- Must have an invite for this org (uses SECURITY DEFINER to avoid recursion)
  -- Note: invitee stores EMAIL, so we use get_user_email to get current user's email
  public.user_has_invite_to_org(public.get_user_email((SELECT auth.jwt()->>'sub')), org_id)
);

-- ============================================
-- Groups write policies (org-scoped)
-- ============================================

-- Users can create groups in their organizations
DROP POLICY IF EXISTS "Users can insert groups in their orgs" ON groups;
CREATE POLICY "Users can insert groups in their orgs"
ON groups FOR INSERT
TO authenticated
WITH CHECK (
  public.user_is_org_member((SELECT auth.jwt()->>'sub'), org_id)
);

-- Users can update groups in their organizations
DROP POLICY IF EXISTS "Users can update groups in their orgs" ON groups;
CREATE POLICY "Users can update groups in their orgs"
ON groups FOR UPDATE
TO authenticated
USING (
  public.user_is_org_member((SELECT auth.jwt()->>'sub'), org_id)
)
WITH CHECK (
  public.user_is_org_member((SELECT auth.jwt()->>'sub'), org_id)
);

-- Users can delete groups in their organizations
DROP POLICY IF EXISTS "Users can delete groups in their orgs" ON groups;
CREATE POLICY "Users can delete groups in their orgs"
ON groups FOR DELETE
TO authenticated
USING (
  public.user_is_org_member((SELECT auth.jwt()->>'sub'), org_id)
);

-- ============================================
-- Invites write policies (org-scoped)
-- ============================================

-- Users can create invites for their organizations
DROP POLICY IF EXISTS "Users can insert invites in their orgs" ON invites;
CREATE POLICY "Users can insert invites in their orgs"
ON invites FOR INSERT
TO authenticated
WITH CHECK (
  public.user_is_org_member((SELECT auth.jwt()->>'sub'), org_id)
);

-- Users can update invites in their organizations (e.g., to accept/reject)
-- NOTE: invitee stores EMAIL, not user ID
DROP POLICY IF EXISTS "Users can update invites in their orgs" ON invites;
CREATE POLICY "Users can update invites in their orgs"
ON invites FOR UPDATE
TO authenticated
USING (
  -- Can update if you're in the org (uses SECURITY DEFINER) OR you're the invitee
  public.user_is_org_member((SELECT auth.jwt()->>'sub'), org_id)
  OR public.get_user_email((SELECT auth.jwt()->>'sub')) = invitee
)
WITH CHECK (
  public.user_is_org_member((SELECT auth.jwt()->>'sub'), org_id)
  OR public.get_user_email((SELECT auth.jwt()->>'sub')) = invitee
);

-- Users can delete invites in their organizations
DROP POLICY IF EXISTS "Users can delete invites in their orgs" ON invites;
CREATE POLICY "Users can delete invites in their orgs"
ON invites FOR DELETE
TO authenticated
USING (
  public.user_is_org_member((SELECT auth.jwt()->>'sub'), org_id)
);

-- Also update the invites SELECT policy to allow org members to view all invites
-- (so admins can see pending invites)
-- NOTE: invitee stores EMAIL, inviter stores USER ID
DROP POLICY IF EXISTS "Users can view invites to them" ON invites;
DROP POLICY IF EXISTS "Users can view invites in their orgs or to them" ON invites;

CREATE POLICY "Users can view invites in their orgs or to them"
ON invites FOR SELECT
TO authenticated
USING (
  -- Can view if you're in the org (uses SECURITY DEFINER to avoid recursion)
  public.user_is_org_member((SELECT auth.jwt()->>'sub'), org_id)
  -- OR you're the invitee (compare email since invitee stores email)
  OR public.get_user_email((SELECT auth.jwt()->>'sub')) = invitee
  -- OR you're the inviter (inviter stores user ID)
  OR (SELECT auth.jwt()->>'sub') = inviter
);

-- ============================================
-- Models write policies (org-scoped)
-- ============================================

-- Users can create models in their organizations
DROP POLICY IF EXISTS "Users can insert models in their orgs" ON models;
CREATE POLICY "Users can insert models in their orgs"
ON models FOR INSERT
TO authenticated
WITH CHECK (
  public.user_is_org_member((SELECT auth.jwt()->>'sub'), org_id)
);

-- Users can update models in their organizations
DROP POLICY IF EXISTS "Users can update models in their orgs" ON models;
CREATE POLICY "Users can update models in their orgs"
ON models FOR UPDATE
TO authenticated
USING (
  public.user_is_org_member((SELECT auth.jwt()->>'sub'), org_id)
)
WITH CHECK (
  public.user_is_org_member((SELECT auth.jwt()->>'sub'), org_id)
);

-- Users can delete models in their organizations
DROP POLICY IF EXISTS "Users can delete models in their orgs" ON models;
CREATE POLICY "Users can delete models in their orgs"
ON models FOR DELETE
TO authenticated
USING (
  public.user_is_org_member((SELECT auth.jwt()->>'sub'), org_id)
);

-- ============================================
-- SECURITY DEFINER function to check if user has access to a model
-- ============================================
CREATE OR REPLACE FUNCTION public.user_has_model_access(check_user_id TEXT, check_model_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM models m
    JOIN org_map om ON om.org_id = m.org_id
    WHERE m.id = check_model_id
    AND om.user_id = check_user_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.user_has_model_access(TEXT, UUID) TO authenticated;

-- ============================================
-- Model_keys write policies (via model ownership)
-- ============================================

-- Users can create keys for models in their orgs
DROP POLICY IF EXISTS "Users can insert model_keys in their orgs" ON model_keys;
CREATE POLICY "Users can insert model_keys in their orgs"
ON model_keys FOR INSERT
TO authenticated
WITH CHECK (
  public.user_has_model_access((SELECT auth.jwt()->>'sub'), model_id)
);

-- Users can update keys for models in their orgs
DROP POLICY IF EXISTS "Users can update model_keys in their orgs" ON model_keys;
CREATE POLICY "Users can update model_keys in their orgs"
ON model_keys FOR UPDATE
TO authenticated
USING (
  public.user_has_model_access((SELECT auth.jwt()->>'sub'), model_id)
)
WITH CHECK (
  public.user_has_model_access((SELECT auth.jwt()->>'sub'), model_id)
);

-- Users can delete keys for models in their orgs
DROP POLICY IF EXISTS "Users can delete model_keys in their orgs" ON model_keys;
CREATE POLICY "Users can delete model_keys in their orgs"
ON model_keys FOR DELETE
TO authenticated
USING (
  public.user_has_model_access((SELECT auth.jwt()->>'sub'), model_id)
);

-- ============================================
-- Model_prompts write policies (via model ownership)
-- ============================================

-- Users can create prompts for models in their orgs
DROP POLICY IF EXISTS "Users can insert model_prompts in their orgs" ON model_prompts;
CREATE POLICY "Users can insert model_prompts in their orgs"
ON model_prompts FOR INSERT
TO authenticated
WITH CHECK (
  public.user_has_model_access((SELECT auth.jwt()->>'sub'), model_id)
);

-- Users can update prompts for models in their orgs
DROP POLICY IF EXISTS "Users can update model_prompts in their orgs" ON model_prompts;
CREATE POLICY "Users can update model_prompts in their orgs"
ON model_prompts FOR UPDATE
TO authenticated
USING (
  public.user_has_model_access((SELECT auth.jwt()->>'sub'), model_id)
)
WITH CHECK (
  public.user_has_model_access((SELECT auth.jwt()->>'sub'), model_id)
);

-- Users can delete prompts for models in their orgs
DROP POLICY IF EXISTS "Users can delete model_prompts in their orgs" ON model_prompts;
CREATE POLICY "Users can delete model_prompts in their orgs"
ON model_prompts FOR DELETE
TO authenticated
USING (
  public.user_has_model_access((SELECT auth.jwt()->>'sub'), model_id)
);
