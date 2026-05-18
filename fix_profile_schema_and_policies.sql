-- 🚨 RUN THIS IN SUPABASE DASHBOARD SQL EDITOR 🚨

-- 1. Add the missing 'has_seen_welcome' column
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS has_seen_welcome BOOLEAN DEFAULT FALSE;

-- 2. Allow users to SELECT their own profile (Fixes the redirect loop)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- 3. Allow admins to SELECT all profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles"
ON profiles FOR SELECT
TO authenticated
USING (is_active_admin());

-- 4. Mark existing active admins as having seen the welcome screen
UPDATE public.profiles 
SET has_seen_welcome = TRUE 
WHERE status = 'Active' AND lower(role) = 'admin';
