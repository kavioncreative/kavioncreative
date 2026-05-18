-- 🛡️ FIX FORM ASSIGNMENTS & LOGS RLS
-- Allows Super Admin, Admin, and Project Managers to manage form assignments and logs.
-- Allows users to view and update their own assignments, and submit logs.

-- 1. Ensure RLS is enabled on relevant tables
ALTER TABLE public.form_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_logs ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- FORM_ASSIGNMENTS POLICIES
-- ==========================================

-- 1.1 SELECT: Management can see all, Users can see their own
DROP POLICY IF EXISTS "Anyone can view assignments" ON public.form_assignments;
DROP POLICY IF EXISTS "Management and owners can view assignments" ON public.form_assignments;
CREATE POLICY "Management and owners can view assignments"
ON public.form_assignments FOR SELECT
TO authenticated
USING (
    auth.uid() = user_id 
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'super admin'
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'admin'
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'project operations manager'
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'project manager'
);

-- 1.2 INSERT/UPDATE/DELETE: Management can manage all, Users can update (snooze) their own
DROP POLICY IF EXISTS "Management can manage assignments" ON public.form_assignments;
CREATE POLICY "Management can manage assignments"
ON public.form_assignments FOR ALL
TO authenticated
USING (
    (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'super admin'
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'admin'
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'project operations manager'
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'project manager'
)
WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'super admin'
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'admin'
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'project operations manager'
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'project manager'
);

DROP POLICY IF EXISTS "Users can update their own assignments" ON public.form_assignments;
CREATE POLICY "Users can update their own assignments"
ON public.form_assignments FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);


-- ==========================================
-- FORM_LOGS POLICIES
-- ==========================================

-- 2.1 SELECT: Management can see all, Users can see their own
DROP POLICY IF EXISTS "Management and owners can view logs" ON public.form_logs;
CREATE POLICY "Management and owners can view logs"
ON public.form_logs FOR SELECT
TO authenticated
USING (
    auth.uid() = user_id 
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'super admin'
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'admin'
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'project operations manager'
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'project manager'
);

-- 2.2 INSERT/UPDATE/DELETE: Management can manage all, Users can insert their own
DROP POLICY IF EXISTS "Management can manage logs" ON public.form_logs;
CREATE POLICY "Management can manage logs"
ON public.form_logs FOR ALL
TO authenticated
USING (
    (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'super admin'
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'admin'
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'project operations manager'
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'project manager'
)
WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'super admin'
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'admin'
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'project operations manager'
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'project manager'
);

DROP POLICY IF EXISTS "Users can insert their own logs" ON public.form_logs;
CREATE POLICY "Users can insert their own logs"
ON public.form_logs FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
