-- ============================================
-- Test function to debug JWT access with Clerk
-- ============================================

-- Create a test function to see what JWT data is available
CREATE OR REPLACE FUNCTION public.test_jwt_access()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  jwt_claims json;
  jwt_sub text;
  auth_jwt_result json;
BEGIN
  -- Try to get JWT claims from request settings
  BEGIN
    jwt_claims := current_setting('request.jwt.claims', true)::json;
  EXCEPTION WHEN OTHERS THEN
    jwt_claims := NULL;
  END;

  -- Try auth.jwt()
  BEGIN
    auth_jwt_result := auth.jwt();
  EXCEPTION WHEN OTHERS THEN
    auth_jwt_result := NULL;
  END;

  -- Extract sub from claims if available
  IF jwt_claims IS NOT NULL THEN
    jwt_sub := jwt_claims->>'sub';
  ELSIF auth_jwt_result IS NOT NULL THEN
    jwt_sub := auth_jwt_result->>'sub';
  ELSE
    jwt_sub := NULL;
  END IF;

  RETURN json_build_object(
    'jwt_claims', jwt_claims,
    'auth_jwt', auth_jwt_result,
    'sub', jwt_sub,
    'role', current_setting('request.jwt.claims', true)::json->>'role'
  );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.test_jwt_access() TO authenticated;



