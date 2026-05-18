-- 🛡️ FIX PROJECT COLLABORATORS RLS POLICY
-- This migration ensures that authenticated users (Admins, PMs, Team Leads)
-- can correctly manage project collaborators without hitting 42501 RLS errors.
-- These errors were previously blocking project edits where collaborators were modified.

-- 1. Ensure RLS is enabled
ALTER TABLE public.project_collaborators ENABLE ROW LEVEL SECURITY;

-- 2. Allow all authenticated users to SEE collaborators
DROP POLICY IF EXISTS "Anyone can view project collaborators" ON public.project_collaborators;
CREATE POLICY "Anyone can view project collaborators"
ON public.project_collaborators FOR SELECT
TO authenticated
USING (true);

-- 3. Allow authorized roles to MANAGE (Insert/Update/Delete) collaborators
-- This includes Super Admin, Admin, Project Manager, and Team Lead.
DROP POLICY IF EXISTS "Lead roles can manage project collaborators" ON public.project_collaborators;
CREATE POLICY "Lead roles can manage project collaborators"
ON public.project_collaborators FOR ALL
TO authenticated
USING (
    (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'super admin'
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'admin'
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'project operations manager'
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'project manager'
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'team lead'
)
WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'super admin'
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'admin'
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'project operations manager'
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'project manager'
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'team lead'
);

-- Note: We use meta-data role check for maximum O(1) performance in RLS.
