-- 🔒 SECURITY ENFORCEMENT FIX: PROFILE INSERTION
-- This script allows Active Admins to manually insert new members into the profiles table.
-- This is required because the "Add Member" flow performs a manual insert instead of relying on a trigger.

-- 1. Ensure the Helper Functions exist (redundant but safe for absolute consistency)
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

-- 2. Add INSERT policy for Admins
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
CREATE POLICY "Admins can insert profiles"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (is_active_admin());

-- 3. Also allow users to insert their own profile 
-- (This is a safety measure if they ever use a client-side sign-up flow directly)
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);
