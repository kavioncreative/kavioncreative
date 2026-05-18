-- 1. Update is_active_admin to include Super Admin and Operational Managers
-- This ensures that these roles have the same administrative visibility and update rights as the 'admin' role.
CREATE OR REPLACE FUNCTION public.is_active_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND status = 'Active'
    AND (
        lower(role) = 'admin' 
        OR lower(role) = 'super admin'
        OR lower(role) = 'project manager'
        OR lower(role) = 'project operations manager'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update freelancer_capacity_tickets RLS policies to allow administrative processing
-- Previous policy only allowed the freelancer themselves to update their own ticket.
DROP POLICY IF EXISTS "Allow admins to update tickets" ON public.freelancer_capacity_tickets;
CREATE POLICY "Allow admins to update tickets"
    ON public.freelancer_capacity_tickets FOR UPDATE
    TO authenticated
    USING (is_active_admin())
    WITH CHECK (is_active_admin());

-- 3. Ensure admins can read all tickets (already covered by USING (true) but being explicit for clarity if needed)
-- (The existing "Allow authenticated read" policy already uses USING (true))
