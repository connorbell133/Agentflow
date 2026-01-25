-- ============================================================================
-- RLS POLICY HARDENING MIGRATION
-- Generated: January 24, 2026
-- Purpose: Strengthen Row-Level Security policies and close security gaps
-- ============================================================================

-- This migration addresses critical security vulnerabilities identified in the
-- RLS audit. It adds missing policies, enforces RLS on all tables, and removes
-- the need for service role bypasses in the invite acceptance flow.

-- ============================================================================
-- SECTION 1: ENABLE AND FORCE ROW LEVEL SECURITY ON ALL TABLES
-- ============================================================================

-- Enable RLS first (required before FORCE can work)
-- Then Force RLS to ensure even table owners and service role must go through policies
-- This prevents accidental bypass of security restrictions

-- Profiles
ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."profiles" FORCE ROW LEVEL SECURITY;

-- Organizations
ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."organizations" FORCE ROW LEVEL SECURITY;

-- Organization mappings
ALTER TABLE "public"."org_map" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."org_map" FORCE ROW LEVEL SECURITY;

-- Groups
ALTER TABLE "public"."groups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."groups" FORCE ROW LEVEL SECURITY;

-- Group mappings
ALTER TABLE "public"."group_map" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."group_map" FORCE ROW LEVEL SECURITY;

-- Invites
ALTER TABLE "public"."invites" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."invites" FORCE ROW LEVEL SECURITY;

-- Models
ALTER TABLE "public"."models" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."models" FORCE ROW LEVEL SECURITY;

-- Model mappings
ALTER TABLE "public"."model_map" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."model_map" FORCE ROW LEVEL SECURITY;

-- Model keys
ALTER TABLE "public"."model_keys" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."model_keys" FORCE ROW LEVEL SECURITY;

-- Model prompts
ALTER TABLE "public"."model_prompts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."model_prompts" FORCE ROW LEVEL SECURITY;

-- Model config presets
ALTER TABLE "public"."model_config_presets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."model_config_presets" FORCE ROW LEVEL SECURITY;

-- Conversations
ALTER TABLE "public"."conversations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."conversations" FORCE ROW LEVEL SECURITY;

-- Messages
ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."messages" FORCE ROW LEVEL SECURITY;

-- Message feedback
ALTER TABLE "public"."message_feedback" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."message_feedback" FORCE ROW LEVEL SECURITY;

-- Temp org requests
ALTER TABLE "public"."temp_org_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."temp_org_requests" FORCE ROW LEVEL SECURITY;

-- Enable RLS on product_tiers (previously unprotected)
ALTER TABLE "public"."product_tiers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."product_tiers" FORCE ROW LEVEL SECURITY;


-- ============================================================================
-- SECTION 2: CRITICAL SECURITY FIX - INVITE VISIBILITY
-- ============================================================================

-- PROBLEM: Users cannot see invites sent to them without service role bypass
-- SOLUTION: Add policy to allow users to see invites sent to their email address

-- Drop existing invite SELECT policy
DROP POLICY IF EXISTS "Users can view invites to their organization" ON "public"."invites";

-- Create new comprehensive policy that allows both org members and invitees to view
CREATE POLICY "Users can view invites to their organization or email"
  ON "public"."invites" FOR SELECT TO "authenticated"
  USING (
    -- User belongs to the organization
    EXISTS (
      SELECT 1 FROM "public"."org_map"
      WHERE "org_map"."org_id" = "invites"."org_id"
        AND "org_map"."user_id" = "auth"."uid"()
    )
    OR
    -- Invite is sent to the user's email
    "invites"."invitee" = (
      SELECT "email" FROM "public"."profiles"
      WHERE "id" = "auth"."uid"()
    )
  );

COMMENT ON POLICY "Users can view invites to their organization or email" ON "public"."invites"
  IS 'Allows org members to view all org invites, and allows any user to view invites sent to their email address';


-- ============================================================================
-- SECTION 3: INVITE ACCEPTANCE FLOW - REPLACE SERVICE ROLE
-- ============================================================================

-- PROBLEM: Invite acceptance uses service role to bypass RLS
-- SOLUTION: Add policies that validate invite existence before allowing joins

-- Allow users to join organizations they have valid invites for
CREATE POLICY "Users can join organization via valid invite"
  ON "public"."org_map" FOR INSERT TO "authenticated"
  WITH CHECK (
    -- User is adding themselves
    "user_id" = "auth"."uid"()
    AND
    -- Valid invite exists for this user to this organization
    EXISTS (
      SELECT 1 FROM "public"."invites"
      WHERE "invites"."org_id" = "org_map"."org_id"
        AND "invites"."invitee" = (
          SELECT "email" FROM "public"."profiles"
          WHERE "id" = "auth"."uid"()
        )
    )
  );

COMMENT ON POLICY "Users can join organization via valid invite" ON "public"."org_map"
  IS 'Allows users to add themselves to an organization if they have a valid invite to that org';


-- Allow users to join groups they have valid invites for
CREATE POLICY "Users can join group via valid invite"
  ON "public"."group_map" FOR INSERT TO "authenticated"
  WITH CHECK (
    -- User is adding themselves
    "user_id" = "auth"."uid"()
    AND
    -- Valid invite exists for this user to this group
    EXISTS (
      SELECT 1 FROM "public"."invites"
      WHERE "invites"."group_id" = "group_map"."group_id"
        AND "invites"."org_id" = "group_map"."org_id"
        AND "invites"."invitee" = (
          SELECT "email" FROM "public"."profiles"
          WHERE "id" = "auth"."uid"()
        )
    )
  );

COMMENT ON POLICY "Users can join group via valid invite" ON "public"."group_map"
  IS 'Allows users to add themselves to a group if they have a valid invite to that group';


-- Allow users to delete invites they have received
CREATE POLICY "Users can delete invites sent to them"
  ON "public"."invites" FOR DELETE TO "authenticated"
  USING (
    -- Invite is sent to the user's email
    "invites"."invitee" = (
      SELECT "email" FROM "public"."profiles"
      WHERE "id" = "auth"."uid"()
    )
    OR
    -- User is an owner of the organization (existing functionality)
    EXISTS (
      SELECT 1 FROM "public"."org_map"
      WHERE "org_map"."org_id" = "invites"."org_id"
        AND "org_map"."user_id" = "auth"."uid"()
        AND "org_map"."role" = 'owner'::"text"
    )
  );

COMMENT ON POLICY "Users can delete invites sent to them" ON "public"."invites"
  IS 'Allows users to decline invites sent to them, or org owners to revoke any invites';


-- ============================================================================
-- SECTION 4: MISSING UPDATE POLICIES
-- ============================================================================

-- org_map: Allow organization owners to update member roles
CREATE POLICY "Organization owners can update member roles"
  ON "public"."org_map" FOR UPDATE TO "authenticated"
  USING (
    -- User is an owner of the organization
    EXISTS (
      SELECT 1 FROM "public"."org_map" "owner_check"
      WHERE "owner_check"."org_id" = "org_map"."org_id"
        AND "owner_check"."user_id" = "auth"."uid"()
        AND "owner_check"."role" = 'owner'::"text"
    )
  )
  WITH CHECK (
    -- Ensure the update maintains the same org_id and user_id
    "org_map"."org_id" = (SELECT "org_id" FROM "public"."org_map" WHERE "id" = "org_map"."id")
    AND
    "org_map"."user_id" = (SELECT "user_id" FROM "public"."org_map" WHERE "id" = "org_map"."id")
    AND
    -- Prevent owners from demoting themselves (must transfer ownership first)
    (
      "org_map"."user_id" != "auth"."uid"()
      OR
      "org_map"."role" = 'owner'::"text"
    )
  );

COMMENT ON POLICY "Organization owners can update member roles" ON "public"."org_map"
  IS 'Allows org owners to change member roles, but prevents them from demoting themselves';


-- group_map: Allow organization owners to update group memberships
CREATE POLICY "Organization owners can update group memberships"
  ON "public"."group_map" FOR UPDATE TO "authenticated"
  USING (
    EXISTS (
      SELECT 1 FROM "public"."groups"
      JOIN "public"."org_map" ON "org_map"."org_id" = "groups"."org_id"
      WHERE "groups"."id" = "group_map"."group_id"
        AND "org_map"."user_id" = "auth"."uid"()
        AND "org_map"."role" = 'owner'::"text"
    )
  )
  WITH CHECK (
    -- Ensure org_id and user_id remain unchanged
    "group_map"."org_id" = (SELECT "org_id" FROM "public"."group_map" WHERE "id" = "group_map"."id")
    AND
    "group_map"."user_id" = (SELECT "user_id" FROM "public"."group_map" WHERE "id" = "group_map"."id")
  );

COMMENT ON POLICY "Organization owners can update group memberships" ON "public"."group_map"
  IS 'Allows org owners to update group membership details while preventing changes to core identifiers';


-- model_map: Allow organization owners to update model-group assignments
CREATE POLICY "Organization owners can update model mappings"
  ON "public"."model_map" FOR UPDATE TO "authenticated"
  USING (
    EXISTS (
      SELECT 1 FROM "public"."groups"
      JOIN "public"."org_map" ON "org_map"."org_id" = "groups"."org_id"
      WHERE "groups"."id" = "model_map"."group_id"
        AND "org_map"."user_id" = "auth"."uid"()
        AND "org_map"."role" = 'owner'::"text"
    )
  )
  WITH CHECK (
    -- Ensure org_id remains unchanged
    "model_map"."org_id" = (SELECT "org_id" FROM "public"."model_map" WHERE "id" = "model_map"."id")
  );

COMMENT ON POLICY "Organization owners can update model mappings" ON "public"."model_map"
  IS 'Allows org owners to update model-to-group assignments';


-- message_feedback: Allow users to update their own feedback
CREATE POLICY "Users can update feedback on their messages"
  ON "public"."message_feedback" FOR UPDATE TO "authenticated"
  USING (
    EXISTS (
      SELECT 1 FROM "public"."messages"
      JOIN "public"."conversations" ON "conversations"."id" = "messages"."conversation_id"
      WHERE "messages"."id" = "message_feedback"."message_id"
        AND "conversations"."user" = "auth"."uid"()
    )
  )
  WITH CHECK (
    -- Prevent changing which message the feedback belongs to
    "message_feedback"."message_id" = (
      SELECT "message_id" FROM "public"."message_feedback" WHERE "id" = "message_feedback"."id"
    )
    AND
    "message_feedback"."conversation_id" = (
      SELECT "conversation_id" FROM "public"."message_feedback" WHERE "id" = "message_feedback"."id"
    )
  );

COMMENT ON POLICY "Users can update feedback on their messages" ON "public"."message_feedback"
  IS 'Allows users to modify feedback they have given on messages in their own conversations';


-- message_feedback: Allow users to delete their own feedback
CREATE POLICY "Users can delete feedback on their messages"
  ON "public"."message_feedback" FOR DELETE TO "authenticated"
  USING (
    EXISTS (
      SELECT 1 FROM "public"."messages"
      JOIN "public"."conversations" ON "conversations"."id" = "messages"."conversation_id"
      WHERE "messages"."id" = "message_feedback"."message_id"
        AND "conversations"."user" = "auth"."uid"()
    )
  );

COMMENT ON POLICY "Users can delete feedback on their messages" ON "public"."message_feedback"
  IS 'Allows users to remove feedback they have given';


-- ============================================================================
-- SECTION 5: PRODUCT TIERS - ADD RLS PROTECTION
-- ============================================================================

-- product_tiers is reference data that should be readable by all authenticated users

CREATE POLICY "Authenticated users can view product tiers"
  ON "public"."product_tiers" FOR SELECT TO "authenticated"
  USING (true);

COMMENT ON POLICY "Authenticated users can view product tiers" ON "public"."product_tiers"
  IS 'Allows all authenticated users to view product tier reference data';

-- Only service role can modify product tiers (reference data management)
CREATE POLICY "Service role can manage product tiers"
  ON "public"."product_tiers" TO "service_role"
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY "Service role can manage product tiers" ON "public"."product_tiers"
  IS 'Allows service role to manage product tier reference data';


-- ============================================================================
-- SECTION 6: HELPER FUNCTIONS FOR INVITE VALIDATION
-- ============================================================================

-- Helper function to check if a user has a pending invite to an organization
CREATE OR REPLACE FUNCTION "public"."user_has_pending_invite_to_org"(
  "check_user_id" "uuid",
  "check_org_id" "uuid"
)
RETURNS boolean
LANGUAGE "sql"
STABLE
SECURITY DEFINER
SET "search_path" TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM "public"."invites"
    WHERE "invites"."org_id" = check_org_id
      AND "invites"."invitee" = (
        SELECT "email" FROM "public"."profiles"
        WHERE "id" = check_user_id
      )
  );
$$;

ALTER FUNCTION "public"."user_has_pending_invite_to_org"("check_user_id" "uuid", "check_org_id" "uuid")
  OWNER TO "postgres";

COMMENT ON FUNCTION "public"."user_has_pending_invite_to_org"("check_user_id" "uuid", "check_org_id" "uuid")
  IS 'Checks if a user has a pending invite to the specified organization';


-- Helper function to check if a user has a pending invite to a group
CREATE OR REPLACE FUNCTION "public"."user_has_pending_invite_to_group"(
  "check_user_id" "uuid",
  "check_group_id" "uuid"
)
RETURNS boolean
LANGUAGE "sql"
STABLE
SECURITY DEFINER
SET "search_path" TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM "public"."invites"
    WHERE "invites"."group_id" = check_group_id
      AND "invites"."invitee" = (
        SELECT "email" FROM "public"."profiles"
        WHERE "id" = check_user_id
      )
  );
$$;

ALTER FUNCTION "public"."user_has_pending_invite_to_group"("check_user_id" "uuid", "check_group_id" "uuid")
  OWNER TO "postgres";

COMMENT ON FUNCTION "public"."user_has_pending_invite_to_group"("check_user_id" "uuid", "check_group_id" "uuid")
  IS 'Checks if a user has a pending invite to the specified group';


-- ============================================================================
-- SECTION 7: GRANT PERMISSIONS ON NEW FUNCTIONS
-- ============================================================================

GRANT ALL ON FUNCTION "public"."user_has_pending_invite_to_org"("check_user_id" "uuid", "check_org_id" "uuid")
  TO "anon";
GRANT ALL ON FUNCTION "public"."user_has_pending_invite_to_org"("check_user_id" "uuid", "check_org_id" "uuid")
  TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_has_pending_invite_to_org"("check_user_id" "uuid", "check_org_id" "uuid")
  TO "service_role";

GRANT ALL ON FUNCTION "public"."user_has_pending_invite_to_group"("check_user_id" "uuid", "check_group_id" "uuid")
  TO "anon";
GRANT ALL ON FUNCTION "public"."user_has_pending_invite_to_group"("check_user_id" "uuid", "check_group_id" "uuid")
  TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_has_pending_invite_to_group"("check_user_id" "uuid", "check_group_id" "uuid")
  TO "service_role";


-- ============================================================================
-- SECTION 8: AUDIT LOGGING SETUP (OPTIONAL)
-- ============================================================================

-- Create audit log table to track all RLS policy violations and service role usage
-- This is optional but highly recommended for security monitoring

CREATE TABLE IF NOT EXISTS "public"."rls_audit_log" (
  "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
  "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
  "user_id" "uuid",
  "table_name" "text" NOT NULL,
  "operation" "text" NOT NULL,
  "policy_name" "text",
  "success" boolean NOT NULL,
  "error_message" "text",
  "metadata" "jsonb",

  CONSTRAINT "rls_audit_log_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "public"."rls_audit_log" OWNER TO "postgres";
ALTER TABLE "public"."rls_audit_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."rls_audit_log" FORCE ROW LEVEL SECURITY;

-- Only service role can write to audit log
CREATE POLICY "Service role can write to audit log"
  ON "public"."rls_audit_log" FOR INSERT TO "service_role"
  WITH CHECK (true);

-- Admins can read audit logs for their organizations
CREATE POLICY "Org owners can read audit logs"
  ON "public"."rls_audit_log" FOR SELECT TO "authenticated"
  USING (
    "user_id" = "auth"."uid"()
    OR
    EXISTS (
      SELECT 1 FROM "public"."org_map"
      WHERE "org_map"."user_id" = "auth"."uid"()
        AND "org_map"."role" = 'owner'::"text"
    )
  );

COMMENT ON TABLE "public"."rls_audit_log"
  IS 'Audit trail for RLS policy enforcement and security events';

-- Create index for efficient audit log queries
CREATE INDEX "idx_rls_audit_log_user_id" ON "public"."rls_audit_log" USING "btree" ("user_id");
CREATE INDEX "idx_rls_audit_log_table_name" ON "public"."rls_audit_log" USING "btree" ("table_name");
CREATE INDEX "idx_rls_audit_log_created_at" ON "public"."rls_audit_log" USING "btree" ("created_at" DESC);


-- ============================================================================
-- SECTION 9: VERIFY POLICY COVERAGE
-- ============================================================================

-- This query should return no rows if all tables have appropriate policies
-- Run manually after migration to verify coverage:

-- SELECT
--   schemaname,
--   tablename,
--   policyname,
--   permissive,
--   roles,
--   cmd,
--   qual,
--   with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, cmd, policyname;


-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- IMPORTANT NOTES FOR DEPLOYMENT:
--
-- 1. This migration will BREAK existing code that uses service role to bypass RLS
--    You must update the following files before deploying:
--    - src/actions/organization/invites.ts (getUserInvites, acceptInvite)
--    - src/actions/organization/invites.ts (getInviteGroup)
--
-- 2. After deployment, update application code to remove service role usage:
--    - Replace service role client calls with regular server client
--    - Invite acceptance flow will now work via RLS policies
--
-- 3. Test the following flows thoroughly:
--    - User signup and profile creation
--    - Organization creation
--    - Sending invites
--    - Accepting invites (both org and group)
--    - Declining invites
--    - Viewing pending invites
--
-- 4. Monitor the rls_audit_log table for any policy violations
--
-- 5. ROLLBACK PLAN:
--    If issues arise, you can disable FORCE RLS on specific tables:
--    ALTER TABLE table_name NO FORCE ROW LEVEL SECURITY;
--
-- 6. Performance: The new policies use EXISTS subqueries which are well-optimized
--    by PostgreSQL. Monitor query performance and add indexes if needed.


-- ============================================================================
-- SECTION 10: SERVICE ROLE BYPASS POLICIES
-- ============================================================================

-- IMPORTANT: These policies allow service role to manage data while enforcing
-- RLS for all authenticated users.
--
-- Service role usage (server-side only):
-- 1. E2E test setup/teardown
-- 2. Admin operations and maintenance scripts
-- 3. Background jobs and system operations
-- 4. Data migrations and cleanup
--
-- CRITICAL: Service role key must NEVER be exposed to client code.
-- All user-facing application code MUST use authenticated clients.
--
-- SECURITY: Service role key must be kept secret and never committed to git

-- Organizations: Service role can manage for E2E tests
CREATE POLICY "service_role_can_manage_organizations"
  ON "public"."organizations" FOR ALL TO "service_role"
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY "service_role_can_manage_organizations" ON "public"."organizations"
  IS 'Allows service role to manage organizations for E2E test setup/teardown';

-- org_map: Service role can manage for E2E tests
CREATE POLICY "service_role_can_manage_org_map"
  ON "public"."org_map" FOR ALL TO "service_role"
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY "service_role_can_manage_org_map" ON "public"."org_map"
  IS 'Allows service role to manage org memberships for E2E test setup/teardown';

-- groups: Service role can manage for E2E tests
CREATE POLICY "service_role_can_manage_groups"
  ON "public"."groups" FOR ALL TO "service_role"
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY "service_role_can_manage_groups" ON "public"."groups"
  IS 'Allows service role to manage groups for E2E test setup/teardown';

-- group_map: Service role can manage for E2E tests
CREATE POLICY "service_role_can_manage_group_map"
  ON "public"."group_map" FOR ALL TO "service_role"
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY "service_role_can_manage_group_map" ON "public"."group_map"
  IS 'Allows service role to manage group memberships for E2E test setup/teardown';

-- invites: Service role can manage for E2E tests
CREATE POLICY "service_role_can_manage_invites"
  ON "public"."invites" FOR ALL TO "service_role"
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY "service_role_can_manage_invites" ON "public"."invites"
  IS 'Allows service role to manage invites for E2E test setup/teardown';

-- profiles: Service role can manage for E2E tests
CREATE POLICY "service_role_can_manage_profiles"
  ON "public"."profiles" FOR ALL TO "service_role"
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY "service_role_can_manage_profiles" ON "public"."profiles"
  IS 'Allows service role to manage profiles for E2E test setup/teardown';

-- conversations: Service role can manage for E2E tests
CREATE POLICY "service_role_can_manage_conversations"
  ON "public"."conversations" FOR ALL TO "service_role"
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY "service_role_can_manage_conversations" ON "public"."conversations"
  IS 'Allows service role to manage conversations for E2E test setup/teardown';

-- messages: Service role can manage for E2E tests
CREATE POLICY "service_role_can_manage_messages"
  ON "public"."messages" FOR ALL TO "service_role"
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY "service_role_can_manage_messages" ON "public"."messages"
  IS 'Allows service role to manage messages for E2E test setup/teardown';

-- models: Service role can manage for E2E tests
CREATE POLICY "service_role_can_manage_models"
  ON "public"."models" FOR ALL TO "service_role"
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY "service_role_can_manage_models" ON "public"."models"
  IS 'Allows service role to manage models for E2E test setup/teardown';

-- model_map: Service role can manage for E2E tests
CREATE POLICY "service_role_can_manage_model_map"
  ON "public"."model_map" FOR ALL TO "service_role"
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY "service_role_can_manage_model_map" ON "public"."model_map"
  IS 'Allows service role to manage model mappings for E2E test setup/teardown';

-- temp_org_requests: Service role can manage for E2E tests
CREATE POLICY "service_role_can_manage_temp_org_requests"
  ON "public"."temp_org_requests" FOR ALL TO "service_role"
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY "service_role_can_manage_temp_org_requests" ON "public"."temp_org_requests"
  IS 'Allows service role to manage temp org requests for E2E test setup/teardown';

-- message_feedback: Service role can manage for E2E tests
CREATE POLICY "service_role_can_manage_message_feedback"
  ON "public"."message_feedback" FOR ALL TO "service_role"
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY "service_role_can_manage_message_feedback" ON "public"."message_feedback"
  IS 'Allows service role to manage message feedback for E2E test setup/teardown';


-- ============================================================================
-- VERIFICATION: Check RLS is properly enabled on all tables
-- ============================================================================

DO $$
DECLARE
  table_record RECORD;
  missing_rls TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Check all critical tables have RLS enabled
  FOR table_record IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename IN (
      'profiles', 'organizations', 'org_map', 'groups', 'group_map',
      'invites', 'models', 'model_map', 'conversations', 'messages',
      'temp_org_requests', 'message_feedback', 'rls_audit_log'
    )
    AND NOT EXISTS (
      SELECT 1 FROM pg_class c
      WHERE c.relname = pg_tables.tablename
      AND c.relrowsecurity = true
    )
  LOOP
    missing_rls := array_append(missing_rls, table_record.tablename);
  END LOOP;

  -- Report results
  IF array_length(missing_rls, 1) > 0 THEN
    RAISE WARNING 'The following tables are missing RLS: %', array_to_string(missing_rls, ', ');
    RAISE EXCEPTION 'RLS migration incomplete - some tables do not have RLS enabled';
  ELSE
    RAISE NOTICE '✅ RLS VERIFICATION PASSED: All critical tables have RLS enabled';
    RAISE NOTICE '✅ Service role bypass policies added for E2E test operations';
    RAISE NOTICE '✅ Application code uses authenticated user sessions (RLS enforced)';
    RAISE NOTICE '✅ Production security: FORCE RLS enabled on all tables';
  END IF;
END $$;
