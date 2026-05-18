-- 🔒 SECURITY ENFORCEMENT FIX: ADMIN VISIBILITY & ACTIVE STATUS
-- This script fixes the "missing users" issue while maintaining strict security for deactivated accounts.

-- 1. Helper Function: Is the user an Active Admin?
CREATE OR REPLACE FUNCTION public.is_active_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND status = 'Active'
    AND lower(role) = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update Profiles Policy (Fix for the Users Table)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- Users can ALWAYS see their own profile (even if deactivated)
-- Admins can see ALL profiles if they are Active
CREATE POLICY "View Profiles"
ON profiles FOR SELECT
TO authenticated
USING (
  (auth.uid() = id) OR (is_active_admin())
);

-- 3. Update Other Policies to allow Active Admins or Active Users
-- (Projects, Accounts, etc. usually require the user to be Active regardless of role)

DROP POLICY IF EXISTS "Allow read access for authenticated users" ON projects;
CREATE POLICY "Allow read access for authenticated users"
ON projects FOR SELECT
TO authenticated
USING (is_active_user() OR is_active_admin());

DROP POLICY IF EXISTS "Allow read access for accounts" ON accounts;
CREATE POLICY "Allow read access for accounts"
ON accounts FOR SELECT
TO authenticated
USING (is_active_user() OR is_active_admin());

-- 4. Ensure invitations are visible to admins
DROP POLICY IF EXISTS "Allow all access for authenticated users" ON member_invitations;
CREATE POLICY "Admins can manage invitations"
ON member_invitations FOR ALL
TO authenticated
USING (is_active_admin())
WITH CHECK (is_active_admin());

-- 5. Final check on is_active_user
-- (It already works, but we make sure it represents anyone who is allowed to use system data)
