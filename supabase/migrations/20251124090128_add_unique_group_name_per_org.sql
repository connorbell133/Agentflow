-- Add unique constraint on (org_id, role) to prevent duplicate group names per organization

-- First, clean up any existing duplicates (keep only the oldest one)
DELETE FROM "public"."groups" a
USING "public"."groups" b
WHERE a.org_id = b.org_id
  AND a.role = b.role
  AND a.created_at > b.created_at;

-- Now add the unique constraint
ALTER TABLE "public"."groups"
ADD CONSTRAINT "groups_org_id_role_unique" UNIQUE ("org_id", "role");

