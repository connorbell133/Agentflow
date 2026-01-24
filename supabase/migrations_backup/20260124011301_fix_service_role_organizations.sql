-- Fix Service Role Access to Organizations
-- This ensures the service role (used by E2E tests) can bypass ALL RLS policies

-- First, ensure the service_role has the necessary grants
GRANT ALL ON TABLE public.organizations TO service_role;
GRANT ALL ON TABLE public.org_map TO service_role;
GRANT ALL ON TABLE public.groups TO service_role;
GRANT ALL ON TABLE public.group_map TO service_role;
GRANT ALL ON TABLE public.models TO service_role;
GRANT ALL ON TABLE public.model_map TO service_role;
GRANT ALL ON TABLE public.invites TO service_role;
GRANT ALL ON TABLE public.profiles TO service_role;

-- For E2E tests, we need service role to bypass RLS entirely
-- This is the correct approach as service_role should have superuser-like permissions

-- Drop and recreate service role policy for organizations to ensure it has highest priority
DROP POLICY IF EXISTS "Service role full access to organizations" ON public.organizations;
DROP POLICY IF EXISTS "Service role bypass for organizations" ON public.organizations;

-- Create explicit service role bypass policy
CREATE POLICY "Service role bypass for organizations"
ON public.organizations
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Verify: List all policies on organizations table
-- SELECT policyname, roles, cmd, qual::text as using_clause, with_check::text as with_check_clause
-- FROM pg_policies
-- WHERE schemaname = 'public' AND tablename = 'organizations'
-- ORDER BY policyname;
