-- ============================================
-- Migration: Auto-add organization owner to org_map
-- ============================================
-- This migration creates a trigger that automatically adds
-- the organization owner to the org_map table with role='owner'
-- when a new organization is created.
-- Created: 2026-01-23
-- ============================================

-- Create the trigger function
CREATE OR REPLACE FUNCTION public.auto_add_org_owner_to_org_map()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert the organization owner into org_map with role='owner'
  -- Only if they're not already in org_map for this org
  INSERT INTO org_map (user_id, org_id, role)
  VALUES (NEW.owner, NEW.id, 'owner')
  ON CONFLICT (user_id, org_id)
  DO UPDATE SET role = 'owner'
  WHERE org_map.user_id = NEW.owner AND org_map.org_id = NEW.id;

  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_auto_add_org_owner ON organizations;

CREATE TRIGGER trigger_auto_add_org_owner
  AFTER INSERT ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_add_org_owner_to_org_map();

-- Add comment
COMMENT ON FUNCTION public.auto_add_org_owner_to_org_map() IS
  'Automatically adds organization owner to org_map with role=owner when org is created';
