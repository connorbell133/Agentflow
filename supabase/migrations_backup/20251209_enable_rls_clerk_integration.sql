-- Enable Row Level Security with Clerk Integration
-- This migration enables RLS on all tables and creates policies
-- that use Clerk's user ID from auth.jwt()->>'sub'

-- ============================================
-- Enable RLS on all tables
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE models ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE key_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE temp_org_requests ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Profiles policies
-- ============================================

-- Users can read their own profile
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
TO authenticated
USING ((SELECT auth.jwt()->>'sub') = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
TO authenticated
USING ((SELECT auth.jwt()->>'sub') = id);

-- Service role can do anything (for webhooks)
CREATE POLICY "Service role full access to profiles"
ON profiles FOR ALL
TO service_role
USING (true);

-- ============================================
-- Conversations policies
-- ============================================

-- Users can view their own conversations
CREATE POLICY "Users can view own conversations"
ON conversations FOR SELECT
TO authenticated
USING ((SELECT auth.jwt()->>'sub') = "user");

-- Users can create their own conversations
CREATE POLICY "Users can create own conversations"
ON conversations FOR INSERT
TO authenticated
WITH CHECK ((SELECT auth.jwt()->>'sub') = "user");

-- Users can update their own conversations
CREATE POLICY "Users can update own conversations"
ON conversations FOR UPDATE
TO authenticated
USING ((SELECT auth.jwt()->>'sub') = "user");

-- Users can delete their own conversations
CREATE POLICY "Users can delete own conversations"
ON conversations FOR DELETE
TO authenticated
USING ((SELECT auth.jwt()->>'sub') = "user");

-- Service role full access
CREATE POLICY "Service role full access to conversations"
ON conversations FOR ALL
TO service_role
USING (true);

-- ============================================
-- Messages policies (via conversation ownership)
-- ============================================

-- Users can view messages in their conversations
CREATE POLICY "Users can view messages in own conversations"
ON messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversations
    WHERE conversations.id = messages.conversation_id
    AND conversations."user" = (SELECT auth.jwt()->>'sub')
  )
);

-- Users can create messages in their conversations
CREATE POLICY "Users can create messages in own conversations"
ON messages FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM conversations
    WHERE conversations.id = messages.conversation_id
    AND conversations."user" = (SELECT auth.jwt()->>'sub')
  )
);

-- Users can update messages in their conversations
CREATE POLICY "Users can update messages in own conversations"
ON messages FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversations
    WHERE conversations.id = messages.conversation_id
    AND conversations."user" = (SELECT auth.jwt()->>'sub')
  )
);

-- Users can delete messages in their conversations
CREATE POLICY "Users can delete messages in own conversations"
ON messages FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversations
    WHERE conversations.id = messages.conversation_id
    AND conversations."user" = (SELECT auth.jwt()->>'sub')
  )
);

-- Service role full access
CREATE POLICY "Service role full access to messages"
ON messages FOR ALL
TO service_role
USING (true);

-- ============================================
-- Org_map policies
-- ============================================

-- Users can see their own org memberships
CREATE POLICY "Users can view own org memberships"
ON org_map FOR SELECT
TO authenticated
USING ((SELECT auth.jwt()->>'sub') = user_id);

-- Service role full access
CREATE POLICY "Service role full access to org_map"
ON org_map FOR ALL
TO service_role
USING (true);

-- ============================================
-- Organizations policies
-- ============================================

-- Users can view organizations they belong to
CREATE POLICY "Users can view their organizations"
ON organizations FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM org_map
    WHERE org_map.org_id = organizations.id
    AND org_map.user_id = (SELECT auth.jwt()->>'sub')
  )
);

-- Owners can update their organizations
CREATE POLICY "Owners can update their organizations"
ON organizations FOR UPDATE
TO authenticated
USING ((SELECT auth.jwt()->>'sub') = owner);

-- Service role full access
CREATE POLICY "Service role full access to organizations"
ON organizations FOR ALL
TO service_role
USING (true);

-- ============================================
-- Groups policies (org-scoped)
-- ============================================

-- Users can view groups in their organizations
CREATE POLICY "Users can view groups in their orgs"
ON groups FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM org_map
    WHERE org_map.org_id = groups.org_id
    AND org_map.user_id = (SELECT auth.jwt()->>'sub')
  )
);

-- Service role full access
CREATE POLICY "Service role full access to groups"
ON groups FOR ALL
TO service_role
USING (true);

-- ============================================
-- Group_map policies
-- ============================================

-- Users can view their own group memberships
CREATE POLICY "Users can view own group memberships"
ON group_map FOR SELECT
TO authenticated
USING ((SELECT auth.jwt()->>'sub') = user_id);

-- Service role full access
CREATE POLICY "Service role full access to group_map"
ON group_map FOR ALL
TO service_role
USING (true);

-- ============================================
-- Models policies (org-scoped)
-- ============================================

-- Users can view models in their organizations
CREATE POLICY "Users can view models in their orgs"
ON models FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM org_map
    WHERE org_map.org_id = models.org_id
    AND org_map.user_id = (SELECT auth.jwt()->>'sub')
  )
);

-- Service role full access
CREATE POLICY "Service role full access to models"
ON models FOR ALL
TO service_role
USING (true);

-- ============================================
-- Model_map policies (org-scoped)
-- ============================================

-- Users can view model mappings in their organizations
CREATE POLICY "Users can view model_map in their orgs"
ON model_map FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM org_map
    WHERE org_map.org_id = model_map.org_id
    AND org_map.user_id = (SELECT auth.jwt()->>'sub')
  )
);

-- Service role full access
CREATE POLICY "Service role full access to model_map"
ON model_map FOR ALL
TO service_role
USING (true);

-- ============================================
-- Model_keys policies (via model ownership)
-- ============================================

-- Users can view keys for models in their orgs
CREATE POLICY "Users can view model_keys in their orgs"
ON model_keys FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM models
    JOIN org_map ON org_map.org_id = models.org_id
    WHERE models.id = model_keys.model_id
    AND org_map.user_id = (SELECT auth.jwt()->>'sub')
  )
);

-- Service role full access
CREATE POLICY "Service role full access to model_keys"
ON model_keys FOR ALL
TO service_role
USING (true);

-- ============================================
-- Model_prompts policies (via model ownership)
-- ============================================

-- Users can view prompts for models in their orgs
CREATE POLICY "Users can view model_prompts in their orgs"
ON model_prompts FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM models
    JOIN org_map ON org_map.org_id = models.org_id
    WHERE models.id = model_prompts.model_id
    AND org_map.user_id = (SELECT auth.jwt()->>'sub')
  )
);

-- Service role full access
CREATE POLICY "Service role full access to model_prompts"
ON model_prompts FOR ALL
TO service_role
USING (true);

-- ============================================
-- Invites policies
-- ============================================

-- Users can view invites sent to them or by them
CREATE POLICY "Users can view invites to them"
ON invites FOR SELECT
TO authenticated
USING ((SELECT auth.jwt()->>'sub') = invitee OR (SELECT auth.jwt()->>'sub') = inviter);

-- Service role full access
CREATE POLICY "Service role full access to invites"
ON invites FOR ALL
TO service_role
USING (true);

-- ============================================
-- Message_feedback policies
-- ============================================

-- Users can view their own feedback
CREATE POLICY "Users can view own feedback"
ON message_feedback FOR SELECT
TO authenticated
USING ((SELECT auth.jwt()->>'sub') = user_id);

-- Users can create their own feedback
CREATE POLICY "Users can create own feedback"
ON message_feedback FOR INSERT
TO authenticated
WITH CHECK ((SELECT auth.jwt()->>'sub') = user_id);

-- Service role full access
CREATE POLICY "Service role full access to message_feedback"
ON message_feedback FOR ALL
TO service_role
USING (true);

-- ============================================
-- Key_map policies
-- ============================================

-- Users can view their own API keys
CREATE POLICY "Users can view own api keys"
ON key_map FOR SELECT
TO authenticated
USING ((SELECT auth.jwt()->>'sub') = "user");

-- Service role full access
CREATE POLICY "Service role full access to key_map"
ON key_map FOR ALL
TO service_role
USING (true);

-- ============================================
-- Temp_org_requests policies
-- ============================================

-- Users can view their own org requests
CREATE POLICY "Users can view own org requests"
ON temp_org_requests FOR SELECT
TO authenticated
USING ((SELECT auth.jwt()->>'sub') = requester_id);

-- Users can create their own org requests
CREATE POLICY "Users can create own org requests"
ON temp_org_requests FOR INSERT
TO authenticated
WITH CHECK ((SELECT auth.jwt()->>'sub') = requester_id);

-- Service role full access
CREATE POLICY "Service role full access to temp_org_requests"
ON temp_org_requests FOR ALL
TO service_role
USING (true);
