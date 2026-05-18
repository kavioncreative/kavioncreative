-- Secure Role/Status Access Control
-- This script ensures that ONLY active users can interact with the system data.
-- Deactivated or Pending users will be blocked at the database level.

-- 1. Create a helper function to check if the current user is active
CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND status = 'Active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update Projects Policies
DROP POLICY IF EXISTS "Allow read access for authenticated users" ON projects;
CREATE POLICY "Allow read access for authenticated users"
ON projects FOR SELECT
TO authenticated
USING (is_active_user());

DROP POLICY IF EXISTS "Allow insert access for authenticated users" ON projects;
CREATE POLICY "Allow insert access for authenticated users"
ON projects FOR INSERT
TO authenticated
WITH CHECK (is_active_user());

DROP POLICY IF EXISTS "Allow update access for authenticated users" ON projects;
CREATE POLICY "Allow update access for authenticated users"
ON projects FOR UPDATE
TO authenticated
USING (is_active_user());

-- 3. Update Accounts Policies
DROP POLICY IF EXISTS "Allow read access for accounts" ON accounts;
CREATE POLICY "Allow read access for accounts"
ON accounts FOR SELECT
TO authenticated
USING (is_active_user());

-- 4. Update Tasks Policies (if exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'tasks') THEN
        DROP POLICY IF EXISTS "Users can view their assigned tasks" ON tasks;
        CREATE POLICY "Users can view their assigned tasks" ON tasks FOR SELECT TO authenticated USING (is_active_user());
        
        DROP POLICY IF EXISTS "Users can update their tasks" ON tasks;
        CREATE POLICY "Users can update their tasks" ON tasks FOR UPDATE TO authenticated USING (is_active_user());
    END IF;
END $$;

-- 5. Profile Policy (Critical: User MUST be able to read their own profile to see they are deactivated)
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- But updates to profile should only be allowed if active (except for initial setup)
CREATE POLICY "Users can update own profile if active"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id AND (status = 'Active' OR status = 'Invited'))
WITH CHECK (auth.uid() = id);

-- 6. Notifications
DROP POLICY IF EXISTS "Allow read access for notifications" ON notifications;
CREATE POLICY "Allow read access for notifications"
ON notifications FOR SELECT
TO authenticated
USING (is_active_user());

-- 7. Platform Data
DROP POLICY IF EXISTS "Access Commissions" ON platform_commissions;
CREATE POLICY "Access Commissions" ON platform_commissions FOR SELECT TO authenticated USING (is_active_user());
