-- ============================================
-- CONSOLIDATED MIGRATION: RLS Policy Updates for Multi-Table Operations
-- ============================================
-- This migration consolidates the following migrations:
--   - 20251229003100_add_group_map_write_policies.sql
--   - 20251229003200_add_model_map_write_policies.sql
--   - 20251229003300_fix_messages_rls_policy.sql
--
-- Creates SECURITY DEFINER helper functions and comprehensive RLS policies
-- for group_map, model_map, and messages tables to support AI SDK 6 operations
-- ============================================

-- ============================================
-- Helper Function 1: Check if user can manage a group
-- ============================================
CREATE OR REPLACE FUNCTION public.user_can_manage_group(check_user_id TEXT, check_group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM groups g
    WHERE g.id = check_group_id
    AND public.user_is_org_member(check_user_id, g.org_id)
  );
$$;

GRANT EXECUTE ON FUNCTION public.user_can_manage_group(TEXT, UUID) TO authenticated;

-- ============================================
-- Helper Function 2: Check if user can manage a model
-- ============================================
CREATE OR REPLACE FUNCTION public.user_can_manage_model(check_user_id TEXT, check_model_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM models m
    WHERE m.id = check_model_id
    AND public.user_is_org_member(check_user_id, m.org_id)
  );
$$;

GRANT EXECUTE ON FUNCTION public.user_can_manage_model(TEXT, UUID) TO authenticated;

-- ============================================
-- Helper Function 3: Check if user owns a conversation
-- ============================================
CREATE OR REPLACE FUNCTION public.user_owns_conversation(check_user_id TEXT, check_conversation_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM conversations
    WHERE id = check_conversation_id
    AND "user" = check_user_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.user_owns_conversation(TEXT, UUID) TO authenticated;

-- ============================================
-- Group_map RLS Policies
-- ============================================

-- SELECT: Users can view group memberships in their org
DROP POLICY IF EXISTS "Users can view own group memberships" ON group_map;
DROP POLICY IF EXISTS "Users can view group_map in their org" ON group_map;

CREATE POLICY "Users can view group_map in their org"
ON group_map FOR SELECT
TO authenticated
USING (
  -- Can view own group memberships
  (SELECT auth.jwt()->>'sub') = user_id
  OR
  -- Org members can view all group memberships in their org
  public.user_can_manage_group((SELECT auth.jwt()->>'sub'), group_id)
);

-- INSERT: Org members can add users to groups
DROP POLICY IF EXISTS "Org members can add users to groups" ON group_map;

CREATE POLICY "Org members can add users to groups"
ON group_map FOR INSERT
TO authenticated
WITH CHECK (
  public.user_can_manage_group((SELECT auth.jwt()->>'sub'), group_id)
);

-- DELETE: Org members can remove users from groups
DROP POLICY IF EXISTS "Org members can remove users from groups" ON group_map;

CREATE POLICY "Org members can remove users from groups"
ON group_map FOR DELETE
TO authenticated
USING (
  public.user_can_manage_group((SELECT auth.jwt()->>'sub'), group_id)
);

-- ============================================
-- Model_map RLS Policies
-- ============================================

-- SELECT: Org members can view model mappings in their org
DROP POLICY IF EXISTS "Users can view model_map in their orgs" ON model_map;

CREATE POLICY "Users can view model_map in their orgs"
ON model_map FOR SELECT
TO authenticated
USING (
  -- Org members can view all model mappings where either the model or group is in their org
  public.user_can_manage_model((SELECT auth.jwt()->>'sub'), model_id)
  OR
  public.user_can_manage_group((SELECT auth.jwt()->>'sub'), group_id)
);

-- INSERT: Org members can add models to groups
DROP POLICY IF EXISTS "Org members can add models to groups" ON model_map;

CREATE POLICY "Org members can add models to groups"
ON model_map FOR INSERT
TO authenticated
WITH CHECK (
  -- User must be able to manage both the model and the group
  public.user_can_manage_model((SELECT auth.jwt()->>'sub'), model_id)
  AND
  public.user_can_manage_group((SELECT auth.jwt()->>'sub'), group_id)
);

-- DELETE: Org members can remove models from groups
DROP POLICY IF EXISTS "Org members can remove models from groups" ON model_map;

CREATE POLICY "Org members can remove models from groups"
ON model_map FOR DELETE
TO authenticated
USING (
  -- User must be able to manage both the model and the group
  public.user_can_manage_model((SELECT auth.jwt()->>'sub'), model_id)
  AND
  public.user_can_manage_group((SELECT auth.jwt()->>'sub'), group_id)
);

-- ============================================
-- Messages RLS Policies
-- ============================================
-- Uses SECURITY DEFINER function to check conversation ownership
-- This avoids recursion issues with RLS policies

-- SELECT: Users can view messages in their own conversations
DROP POLICY IF EXISTS "Users can view messages in own conversations" ON messages;

CREATE POLICY "Users can view messages in own conversations"
ON messages FOR SELECT
TO authenticated
USING (
  public.user_owns_conversation((SELECT auth.jwt()->>'sub'), conversation_id)
);

-- INSERT: Users can create messages in their own conversations
DROP POLICY IF EXISTS "Users can create messages in own conversations" ON messages;

CREATE POLICY "Users can create messages in own conversations"
ON messages FOR INSERT
TO authenticated
WITH CHECK (
  public.user_owns_conversation((SELECT auth.jwt()->>'sub'), conversation_id)
);

-- UPDATE: Users can update messages in their own conversations
DROP POLICY IF EXISTS "Users can update messages in own conversations" ON messages;

CREATE POLICY "Users can update messages in own conversations"
ON messages FOR UPDATE
TO authenticated
USING (
  public.user_owns_conversation((SELECT auth.jwt()->>'sub'), conversation_id)
)
WITH CHECK (
  public.user_owns_conversation((SELECT auth.jwt()->>'sub'), conversation_id)
);

-- DELETE: Users can delete messages in their own conversations
DROP POLICY IF EXISTS "Users can delete messages in own conversations" ON messages;

CREATE POLICY "Users can delete messages in own conversations"
ON messages FOR DELETE
TO authenticated
USING (
  public.user_owns_conversation((SELECT auth.jwt()->>'sub'), conversation_id)
);
