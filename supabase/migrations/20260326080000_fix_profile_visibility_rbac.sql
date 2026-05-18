-- Migration: Fix Admin Logic and Profile Visibility for Team Leads
-- This fixes the is_active_admin function and allows Team Leads to see their team members.

-- 1. Correct is_active_admin to include Super Admin, PMs and Operational Managers
-- This matches the definition in fix_capacity_tickets_rls.sql but ensures consistency.
CREATE OR REPLACE FUNCTION public.is_active_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND status = 'Active'
    AND lower(role) IN ('admin', 'super admin', 'project operations manager', 'project manager')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update Profiles Policy to allow Team Leads to see their members
DROP POLICY IF EXISTS "View Profiles" ON public.profiles;
CREATE POLICY "View Profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (
  (auth.uid() = id) 
  OR (is_active_admin())
  -- Team Lead check: Can see members of teams they lead
  OR EXISTS (
    SELECT 1 FROM public.team_members tm
    JOIN public.teams t ON tm.team_id = t.id
    WHERE tm.member_id = public.profiles.id
    AND t.leader_id = auth.uid()
  )
  -- Member check: Can see their team lead
  OR EXISTS (
    SELECT 1 FROM public.team_members tm
    JOIN public.teams t ON tm.team_id = t.id
    WHERE tm.member_id = auth.uid()
    AND t.leader_id = public.profiles.id
  )
);
