-- ============================================
-- Migration: Convert RLS policies from Clerk to Supabase Auth
-- Updates all RLS policies to use auth.uid() instead of auth.jwt()->>'sub'
-- Created: 2026-01-22
-- ============================================

-- This migration converts all RLS policies from Clerk's JWT-based auth
-- to native Supabase Auth using auth.uid()

-- ============================================
-- DROP ALL EXISTING POLICIES
-- ============================================

-- Profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Service role full access to profiles" ON profiles;

-- Conversations
DROP POLICY IF EXISTS "Users can view own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can create own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can delete own conversations" ON conversations;
DROP POLICY IF EXISTS "Service role full access to conversations" ON conversations;

-- Messages
DROP POLICY IF EXISTS "Users can view messages in own conversations" ON messages;
DROP POLICY IF EXISTS "Users can create messages in own conversations" ON messages;
DROP POLICY IF EXISTS "Users can update messages in own conversations" ON messages;
DROP POLICY IF EXISTS "Users can delete messages in own conversations" ON messages;
DROP POLICY IF EXISTS "Service role full access to messages" ON messages;

-- Organizations
DROP POLICY IF EXISTS "Users can view organizations they belong to" ON organizations;
DROP POLICY IF EXISTS "Users can create organizations" ON organizations;
DROP POLICY IF EXISTS "Organization owners can update organization" ON organizations;
DROP POLICY IF EXISTS "Organization owners can delete organization" ON organizations;
DROP POLICY IF EXISTS "Service role full access to organizations" ON organizations;

-- org_map
DROP POLICY IF EXISTS "Users can view own organization mappings" ON org_map;
DROP POLICY IF EXISTS "Users can create organization mappings" ON org_map;
DROP POLICY IF EXISTS "Organization owners can delete mappings" ON org_map;
DROP POLICY IF EXISTS "Service role full access to org_map" ON org_map;

-- Groups
DROP POLICY IF EXISTS "Users can view groups in their organization" ON groups;
DROP POLICY IF EXISTS "Organization owners can create groups" ON groups;
DROP POLICY IF EXISTS "Organization owners can update groups" ON groups;
DROP POLICY IF EXISTS "Organization owners can delete groups" ON groups;
DROP POLICY IF EXISTS "Service role full access to groups" ON groups;

-- group_map
DROP POLICY IF EXISTS "Users can view own group mappings" ON group_map;
DROP POLICY IF EXISTS "Organization owners can manage group mappings" ON group_map;
DROP POLICY IF EXISTS "Service role full access to group_map" ON group_map;

-- Models
DROP POLICY IF EXISTS "Users can view models in their organization" ON models;
DROP POLICY IF EXISTS "Organization owners can create models" ON models;
DROP POLICY IF EXISTS "Organization owners can update models" ON models;
DROP POLICY IF EXISTS "Organization owners can delete models" ON models;
DROP POLICY IF EXISTS "Service role full access to models" ON models;

-- model_map
DROP POLICY IF EXISTS "Users can view model mappings in their groups" ON model_map;
DROP POLICY IF EXISTS "Organization owners can manage model mappings" ON model_map;
DROP POLICY IF EXISTS "Service role full access to model_map" ON model_map;

-- model_keys
DROP POLICY IF EXISTS "Users can view model keys in their organization" ON model_keys;
DROP POLICY IF EXISTS "Organization owners can manage model keys" ON model_keys;
DROP POLICY IF EXISTS "Service role full access to model_keys" ON model_keys;

-- model_prompts
DROP POLICY IF EXISTS "Users can view model prompts in their organization" ON model_prompts;
DROP POLICY IF EXISTS "Organization owners can manage model prompts" ON model_prompts;
DROP POLICY IF EXISTS "Service role full access to model_prompts" ON model_prompts;

-- Invites
DROP POLICY IF EXISTS "Users can view invites to their organization" ON invites;
DROP POLICY IF EXISTS "Organization owners can create invites" ON invites;
DROP POLICY IF EXISTS "Organization owners can delete invites" ON invites;
DROP POLICY IF EXISTS "Service role full access to invites" ON invites;

-- message_feedback
DROP POLICY IF EXISTS "Users can view feedback on their messages" ON message_feedback;
DROP POLICY IF EXISTS "Users can create feedback on their messages" ON message_feedback;
DROP POLICY IF EXISTS "Service role full access to message_feedback" ON message_feedback;

-- key_map
DROP POLICY IF EXISTS "Users can view key mappings in their organization" ON key_map;
DROP POLICY IF EXISTS "Organization owners can manage key mappings" ON key_map;
DROP POLICY IF EXISTS "Service role full access to key_map" ON key_map;

-- temp_org_requests
DROP POLICY IF EXISTS "Users can view own temp org requests" ON temp_org_requests;
DROP POLICY IF EXISTS "Users can create temp org requests" ON temp_org_requests;
DROP POLICY IF EXISTS "Service role full access to temp_org_requests" ON temp_org_requests;

-- ============================================
-- RECREATE POLICIES WITH auth.uid()
-- ============================================

-- ============================================
-- Profiles policies
-- ============================================

CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Service role full access to profiles"
ON profiles FOR ALL
TO service_role
USING (true);

-- ============================================
-- Conversations policies
-- ============================================

CREATE POLICY "Users can view own conversations"
ON conversations FOR SELECT
TO authenticated
USING (auth.uid() = "user");

CREATE POLICY "Users can create own conversations"
ON conversations FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = "user");

CREATE POLICY "Users can update own conversations"
ON conversations FOR UPDATE
TO authenticated
USING (auth.uid() = "user");

CREATE POLICY "Users can delete own conversations"
ON conversations FOR DELETE
TO authenticated
USING (auth.uid() = "user");

CREATE POLICY "Service role full access to conversations"
ON conversations FOR ALL
TO service_role
USING (true);

-- ============================================
-- Messages policies (via conversation ownership)
-- ============================================

CREATE POLICY "Users can view messages in own conversations"
ON messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversations
    WHERE conversations.id = messages.conversation_id
    AND conversations."user" = auth.uid()
  )
);

CREATE POLICY "Users can create messages in own conversations"
ON messages FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM conversations
    WHERE conversations.id = messages.conversation_id
    AND conversations."user" = auth.uid()
  )
);

CREATE POLICY "Users can update messages in own conversations"
ON messages FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversations
    WHERE conversations.id = messages.conversation_id
    AND conversations."user" = auth.uid()
  )
);

CREATE POLICY "Users can delete messages in own conversations"
ON messages FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversations
    WHERE conversations.id = messages.conversation_id
    AND conversations."user" = auth.uid()
  )
);

CREATE POLICY "Service role full access to messages"
ON messages FOR ALL
TO service_role
USING (true);

-- ============================================
-- Organizations policies
-- ============================================

CREATE POLICY "Users can view organizations they belong to"
ON organizations FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM org_map
    WHERE org_map.org_id = organizations.id
    AND org_map.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create organizations"
ON organizations FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Organization owners can update organization"
ON organizations FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM org_map
    WHERE org_map.org_id = organizations.id
    AND org_map.user_id = auth.uid()
    AND org_map.role = 'owner'
  )
);

CREATE POLICY "Organization owners can delete organization"
ON organizations FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM org_map
    WHERE org_map.org_id = organizations.id
    AND org_map.user_id = auth.uid()
    AND org_map.role = 'owner'
  )
);

CREATE POLICY "Service role full access to organizations"
ON organizations FOR ALL
TO service_role
USING (true);

-- ============================================
-- org_map policies
-- ============================================

CREATE POLICY "Users can view own organization mappings"
ON org_map FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can create organization mappings"
ON org_map FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Organization owners can delete mappings"
ON org_map FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM org_map AS owner_check
    WHERE owner_check.org_id = org_map.org_id
    AND owner_check.user_id = auth.uid()
    AND owner_check.role = 'owner'
  )
);

CREATE POLICY "Service role full access to org_map"
ON org_map FOR ALL
TO service_role
USING (true);

-- ============================================
-- Groups policies
-- ============================================

CREATE POLICY "Users can view groups in their organization"
ON groups FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM org_map
    WHERE org_map.org_id = groups.org_id
    AND org_map.user_id = auth.uid()
  )
);

CREATE POLICY "Organization owners can create groups"
ON groups FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM org_map
    WHERE org_map.org_id = groups.org_id
    AND org_map.user_id = auth.uid()
    AND org_map.role = 'owner'
  )
);

CREATE POLICY "Organization owners can update groups"
ON groups FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM org_map
    WHERE org_map.org_id = groups.org_id
    AND org_map.user_id = auth.uid()
    AND org_map.role = 'owner'
  )
);

CREATE POLICY "Organization owners can delete groups"
ON groups FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM org_map
    WHERE org_map.org_id = groups.org_id
    AND org_map.user_id = auth.uid()
    AND org_map.role = 'owner'
  )
);

CREATE POLICY "Service role full access to groups"
ON groups FOR ALL
TO service_role
USING (true);

-- ============================================
-- group_map policies
-- ============================================

CREATE POLICY "Users can view own group mappings"
ON group_map FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Organization owners can manage group mappings"
ON group_map FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM groups
    JOIN org_map ON org_map.org_id = groups.org_id
    WHERE groups.id = group_map.group_id
    AND org_map.user_id = auth.uid()
    AND org_map.role = 'owner'
  )
);

CREATE POLICY "Service role full access to group_map"
ON group_map FOR ALL
TO service_role
USING (true);

-- ============================================
-- Models policies
-- ============================================

CREATE POLICY "Users can view models in their organization"
ON models FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM org_map
    WHERE org_map.org_id = models.org_id
    AND org_map.user_id = auth.uid()
  )
);

CREATE POLICY "Organization owners can create models"
ON models FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM org_map
    WHERE org_map.org_id = models.org_id
    AND org_map.user_id = auth.uid()
    AND org_map.role = 'owner'
  )
);

CREATE POLICY "Organization owners can update models"
ON models FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM org_map
    WHERE org_map.org_id = models.org_id
    AND org_map.user_id = auth.uid()
    AND org_map.role = 'owner'
  )
);

CREATE POLICY "Organization owners can delete models"
ON models FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM org_map
    WHERE org_map.org_id = models.org_id
    AND org_map.user_id = auth.uid()
    AND org_map.role = 'owner'
  )
);

CREATE POLICY "Service role full access to models"
ON models FOR ALL
TO service_role
USING (true);

-- ============================================
-- model_map policies
-- ============================================

CREATE POLICY "Users can view model mappings in their groups"
ON model_map FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM group_map
    WHERE group_map.group_id = model_map.group_id
    AND group_map.user_id = auth.uid()
  )
);

CREATE POLICY "Organization owners can manage model mappings"
ON model_map FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM groups
    JOIN org_map ON org_map.org_id = groups.org_id
    WHERE groups.id = model_map.group_id
    AND org_map.user_id = auth.uid()
    AND org_map.role = 'owner'
  )
);

CREATE POLICY "Service role full access to model_map"
ON model_map FOR ALL
TO service_role
USING (true);

-- ============================================
-- model_keys policies
-- ============================================

CREATE POLICY "Users can view model keys in their organization"
ON model_keys FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM models
    JOIN org_map ON org_map.org_id = models.org_id
    WHERE models.id = model_keys.model_id
    AND org_map.user_id = auth.uid()
  )
);

CREATE POLICY "Organization owners can manage model keys"
ON model_keys FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM models
    JOIN org_map ON org_map.org_id = models.org_id
    WHERE models.id = model_keys.model_id
    AND org_map.user_id = auth.uid()
    AND org_map.role = 'owner'
  )
);

CREATE POLICY "Service role full access to model_keys"
ON model_keys FOR ALL
TO service_role
USING (true);

-- ============================================
-- model_prompts policies
-- ============================================

CREATE POLICY "Users can view model prompts in their organization"
ON model_prompts FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM models
    JOIN org_map ON org_map.org_id = models.org_id
    WHERE models.id = model_prompts.model_id
    AND org_map.user_id = auth.uid()
  )
);

CREATE POLICY "Organization owners can manage model prompts"
ON model_prompts FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM models
    JOIN org_map ON org_map.org_id = models.org_id
    WHERE models.id = model_prompts.model_id
    AND org_map.user_id = auth.uid()
    AND org_map.role = 'owner'
  )
);

CREATE POLICY "Service role full access to model_prompts"
ON model_prompts FOR ALL
TO service_role
USING (true);

-- ============================================
-- Invites policies
-- ============================================

CREATE POLICY "Users can view invites to their organization"
ON invites FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM org_map
    WHERE org_map.org_id = invites.org_id
    AND org_map.user_id = auth.uid()
  )
);

CREATE POLICY "Organization owners can create invites"
ON invites FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM org_map
    WHERE org_map.org_id = invites.org_id
    AND org_map.user_id = auth.uid()
    AND org_map.role = 'owner'
  )
);

CREATE POLICY "Organization owners can delete invites"
ON invites FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM org_map
    WHERE org_map.org_id = invites.org_id
    AND org_map.user_id = auth.uid()
    AND org_map.role = 'owner'
  )
);

CREATE POLICY "Service role full access to invites"
ON invites FOR ALL
TO service_role
USING (true);

-- ============================================
-- message_feedback policies
-- ============================================

CREATE POLICY "Users can view feedback on their messages"
ON message_feedback FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM messages
    JOIN conversations ON conversations.id = messages.conversation_id
    WHERE messages.id = message_feedback.message_id
    AND conversations."user" = auth.uid()
  )
);

CREATE POLICY "Users can create feedback on their messages"
ON message_feedback FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM messages
    JOIN conversations ON conversations.id = messages.conversation_id
    WHERE messages.id = message_feedback.message_id
    AND conversations."user" = auth.uid()
  )
);

CREATE POLICY "Service role full access to message_feedback"
ON message_feedback FOR ALL
TO service_role
USING (true);

-- ============================================
-- key_map policies
-- ============================================

CREATE POLICY "Users can view own api keys"
ON key_map FOR SELECT
TO authenticated
USING (auth.uid() = "user");

CREATE POLICY "Service role full access to key_map"
ON key_map FOR ALL
TO service_role
USING (true);

-- ============================================
-- temp_org_requests policies
-- ============================================

CREATE POLICY "Users can view own temp org requests"
ON temp_org_requests FOR SELECT
TO authenticated
USING (requester_id = auth.uid());

CREATE POLICY "Users can create temp org requests"
ON temp_org_requests FOR INSERT
TO authenticated
WITH CHECK (requester_id = auth.uid());

CREATE POLICY "Service role full access to temp_org_requests"
ON temp_org_requests FOR ALL
TO service_role
USING (true);

-- ============================================
-- Migration complete
-- ============================================

-- This migration has successfully converted all RLS policies
-- from Clerk's JWT-based authentication to Supabase's native auth.uid()
