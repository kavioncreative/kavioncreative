-- 🔒 SECURITY ENFORCEMENT FIX: ADMIN UPDATES & VISIBILITY
-- This script Fixes the "Deactivate Button" failing by allowing Active Admins to UPDATE profiles.

-- 1. Ensure the Helper Functions exist
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

-- 2. Update Profiles Policies
-- Users can see themselves, Admins can see everyone
DROP POLICY IF EXISTS "View Profiles" ON profiles;
CREATE POLICY "View Profiles"
ON profiles FOR SELECT
TO authenticated
USING (
  (auth.uid() = id) OR (is_active_admin())
);

-- Admins can UPDATE profiles (needed for deactivation/role changes)
-- Users can update their own profile ONLY if they are Active or just Invited
DROP POLICY IF EXISTS "Users can update own profile if active" ON profiles;
DROP POLICY IF EXISTS "Manage Profiles" ON profiles;

CREATE POLICY "Manage Profiles"
ON profiles FOR UPDATE
TO authenticated
USING (
  (auth.uid() = id AND (status = 'Active' OR status = 'Invited')) -- User themselves
  OR (is_active_admin()) -- Active Admin
)
WITH CHECK (
  (auth.uid() = id) -- User can only update their own record in the "WITH CHECK" context if they are the owner
  OR (is_active_admin()) -- Admin can update anyone
);

-- 3. Delete access for Admins
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;
CREATE POLICY "Admins can delete profiles"
ON profiles FOR DELETE
TO authenticated
USING (is_active_admin());
