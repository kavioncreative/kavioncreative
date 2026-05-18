-- PROJECT UPDATE RLS POLICY (UNLOCK ASSIGNMENT)
-- This migration allows Team Leads to update projects assigned to them.
-- It also ensures Admins/PMs have full update permissions.

DROP POLICY IF EXISTS "Projects Master Update Rule" ON projects;

CREATE POLICY "Projects Master Update Rule" ON projects
FOR UPDATE
TO authenticated
USING (
    -- ADMIn/PM: Full Update Access
    (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'super admin'
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'admin'
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'project operations manager'
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'project manager'
    
    -- TEAM LEAD: Only update projects assigned to them
    OR assignee_id = auth.uid()
    
    -- TEAM DESIGNER: Only update projects where they are the designer
    OR team_designer_id = auth.uid()
)
WITH CHECK (
    -- Adhering to the same rules for the final state
    (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'super admin'
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'admin'
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'project operations manager'
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'project manager'
    OR assignee_id = auth.uid()
    OR team_designer_id = auth.uid()
);

-- Ensure all designers can see their own projects to avoid blank screens
DROP POLICY IF EXISTS "Designer visibility" ON projects;
CREATE POLICY "Designer visibility" ON projects FOR SELECT USING (team_designer_id = auth.uid());
