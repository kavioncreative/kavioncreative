-- 🔒 SECURITY FIX: Allow users to read their own profile
-- This policy is essential for the authentication flow to work correctly.
-- Without it, users cannot read their own profile data on login/refresh.

-- Allow users to SELECT their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Allow admins to SELECT all profiles (for user management)
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles"
ON profiles FOR SELECT
TO authenticated
USING (is_active_admin());
