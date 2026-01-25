-- ============================================================================
-- Invite Flow RLS Policies
-- ============================================================================
-- This migration adds RLS policies to support the invite acceptance flow.
-- 
-- Key insight: Authenticated users cannot query auth.users directly, so we use
-- auth.jwt() ->> 'email' to get the current user's email from the JWT token.
--
-- Policies added:
-- 1. invites: SELECT - org members can view all, invited users can view theirs
-- 2. invites: DELETE - users can delete invites sent to their email
-- 3. groups: SELECT - org members and invited users can view group details
-- 4. org_map: SELECT - users can check their own org membership
-- 5. org_map: INSERT - invited users can add themselves to organizations
-- 6. group_map: SELECT - users can check their own group membership
-- 7. group_map: INSERT - invited users can add themselves to groups
-- ============================================================================


-- ============================================================================
-- invites: SELECT policy
-- ============================================================================

DROP POLICY IF EXISTS "Organization members and invitees can view invites" ON "public"."invites";

CREATE POLICY "Organization members and invitees can view invites"
  ON "public"."invites" FOR SELECT TO "authenticated"
  USING (
    -- User belongs to the organization
    EXISTS (
      SELECT 1 FROM "public"."org_map"
      WHERE "org_map"."org_id" = "invites"."org_id"
        AND "org_map"."user_id" = "auth"."uid"()
    )
    OR
    -- Invite is sent to the user's email (using JWT claim)
    "invites"."invitee" = "auth"."jwt"() ->> 'email'
  );

COMMENT ON POLICY "Organization members and invitees can view invites" ON "public"."invites" IS
  'Allows org members to view all invites in their org and invited users to see invites sent to their email.';


-- ============================================================================
-- invites: DELETE policy
-- ============================================================================

DROP POLICY IF EXISTS "Users can delete their own invites" ON "public"."invites";

CREATE POLICY "Users can delete their own invites"
  ON "public"."invites" FOR DELETE TO "authenticated"
  USING (
    -- Invite is sent to the current user's email
    "invitee" = "auth"."jwt"() ->> 'email'
  );

COMMENT ON POLICY "Users can delete their own invites" ON "public"."invites" IS
  'Allows users to delete invites sent to their email (after accepting them).';


-- ============================================================================
-- groups: SELECT policy
-- ============================================================================

DROP POLICY IF EXISTS "Members and invitees can view groups" ON "public"."groups";
DROP POLICY IF EXISTS "Organization members can view their groups" ON "public"."groups";

CREATE POLICY "Members and invitees can view groups"
  ON "public"."groups" FOR SELECT TO "authenticated"
  USING (
    -- User is a member of the organization
    EXISTS (
      SELECT 1 FROM "public"."org_map"
      WHERE "org_map"."org_id" = "groups"."org_id"
        AND "org_map"."user_id" = "auth"."uid"()
    )
    OR
    -- User has a pending invite to this group
    EXISTS (
      SELECT 1 FROM "public"."invites"
      WHERE "invites"."group_id" = "groups"."id"
        AND "invites"."org_id" = "groups"."org_id"
        AND "invites"."invitee" = "auth"."jwt"() ->> 'email'
    )
  );

COMMENT ON POLICY "Members and invitees can view groups" ON "public"."groups" IS
  'Allows org members and invited users to view group details.';


-- ============================================================================
-- org_map: SELECT policy
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own org memberships" ON "public"."org_map";
DROP POLICY IF EXISTS "Users can view own organization mappings" ON "public"."org_map";
DROP POLICY IF EXISTS "Users and invitees can view relevant org memberships" ON "public"."org_map";

CREATE POLICY "Users can view their own org memberships"
  ON "public"."org_map" FOR SELECT TO "authenticated"
  USING (
    "user_id" = "auth"."uid"()
  );

COMMENT ON POLICY "Users can view their own org memberships" ON "public"."org_map" IS
  'Allows users to query org_map for their own user_id.';


-- ============================================================================
-- org_map: INSERT policy for invited users
-- ============================================================================

DROP POLICY IF EXISTS "Invited users can add themselves to organization" ON "public"."org_map";

CREATE POLICY "Invited users can add themselves to organization"
  ON "public"."org_map" FOR INSERT TO "authenticated"
  WITH CHECK (
    -- User is adding themselves
    "user_id" = "auth"."uid"()
    AND
    -- User has a valid invite to this organization
    EXISTS (
      SELECT 1 FROM "public"."invites"
      WHERE "invites"."org_id" = "org_map"."org_id"
        AND "invites"."invitee" = "auth"."jwt"() ->> 'email'
    )
  );

COMMENT ON POLICY "Invited users can add themselves to organization" ON "public"."org_map" IS
  'Allows users with a valid invite to add themselves to an organization.';


-- ============================================================================
-- group_map: SELECT policy
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own group memberships" ON "public"."group_map";
DROP POLICY IF EXISTS "Users and invitees can view relevant group memberships" ON "public"."group_map";

CREATE POLICY "Users can view their own group memberships"
  ON "public"."group_map" FOR SELECT TO "authenticated"
  USING (
    "user_id" = "auth"."uid"()
  );

COMMENT ON POLICY "Users can view their own group memberships" ON "public"."group_map" IS
  'Allows users to query group_map for their own user_id.';


-- ============================================================================
-- group_map: INSERT policy for invited users
-- ============================================================================

DROP POLICY IF EXISTS "Invited users can add themselves to group" ON "public"."group_map";

CREATE POLICY "Invited users can add themselves to group"
  ON "public"."group_map" FOR INSERT TO "authenticated"
  WITH CHECK (
    -- User is adding themselves
    "user_id" = "auth"."uid"()
    AND
    -- User has a valid invite to this group
    EXISTS (
      SELECT 1 FROM "public"."invites"
      WHERE "invites"."group_id" = "group_map"."group_id"
        AND "invites"."org_id" = "group_map"."org_id"
        AND "invites"."invitee" = "auth"."jwt"() ->> 'email'
    )
  );

COMMENT ON POLICY "Invited users can add themselves to group" ON "public"."group_map" IS
  'Allows users with a valid invite to add themselves to a group.';
