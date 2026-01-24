-- Add unique constraint to prevent duplicate invites
-- A user should only have one pending invite per (org, group) combination

-- First, remove any existing duplicate invites (keep the oldest one)
-- Handle NULL group_id properly
DELETE FROM invites a
USING invites b
WHERE a.id > b.id
  AND a.invitee = b.invitee
  AND a.org_id = b.org_id
  AND (
    (a.group_id IS NULL AND b.group_id IS NULL) OR
    (a.group_id = b.group_id)
  );

-- Add unique constraint
-- Note: PostgreSQL treats NULL as distinct, so we need both a constraint and an index
ALTER TABLE invites
ADD CONSTRAINT unique_invite_per_user_org_group
UNIQUE NULLS NOT DISTINCT (invitee, org_id, group_id);

-- Note: NULLS NOT DISTINCT means NULL = NULL for uniqueness purposes
-- This ensures only one invite per (invitee, org_id, group_id) combination
-- including when group_id is NULL
