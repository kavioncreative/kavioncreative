
-- ============================================
-- SECURE PROJECTS RLS - INDUSTRY STANDARD
-- ============================================
-- This migration replaces the permissive "USING (true)" policy with
-- strict, role-based visibility at the DATABASE level.
-- ============================================

-- 1. Helper Function to determine user permissions efficiently
-- This avoids deep nesting in every single RLS check
CREATE OR REPLACE FUNCTION get_user_visibility_context(requesting_user_id uuid)
RETURNS TABLE (
    user_role text,
    user_name text,
    user_email text
) AS $$
BEGIN
    RETURN QUERY 
    SELECT role, name, email FROM profiles WHERE id = requesting_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Clean up existing permissive policy
DROP POLICY IF EXISTS "Allow read access for authenticated users" ON projects;

-- 3. Create the NEW Secure Read Policy
DROP POLICY IF EXISTS "Secure project visibility" ON projects;
CREATE POLICY "Secure project visibility"
ON projects FOR SELECT
TO authenticated
USING (
    -- CASE A: Super Admin (Total Access)
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND LOWER(role) = 'super admin'
    )
    OR
    -- CASE B: Explicit Collaborator
    EXISTS (
        SELECT 1 FROM project_collaborators 
        WHERE project_id = projects.project_id 
        AND member_id = auth.uid()
    )
    OR
    -- CASE C: Freelancer / Assignee
    (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND LOWER(role) = 'freelancer'
            AND (
                projects.assignee = profiles.name 
                OR projects.assignee = profiles.email
            )
        )
    )
    OR
    -- CASE D: Admin / POM (Account Scoped)
    (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND LOWER(role) IN ('admin', 'project operations manager')
            AND EXISTS (
                SELECT 1 FROM user_account_access 
                WHERE user_id = auth.uid() 
                AND account_id = projects.account_id
            )
        )
    )
    OR
    -- CASE E: Project Manager (Team Account Scoped)
    (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND LOWER(role) = 'project manager'
            AND EXISTS (
                SELECT 1 FROM team_members tm
                JOIN team_accounts ta ON tm.team_id = ta.team_id
                WHERE tm.member_id = auth.uid() 
                AND ta.account_id = projects.account_id
            )
        )
    )
);

-- 4. Apply similar security to project_collaborators (NON-RECURSIVE)
DROP POLICY IF EXISTS "Collaborator visibility" ON project_collaborators;
CREATE POLICY "Collaborator visibility"
ON project_collaborators FOR SELECT
TO authenticated
USING (
    -- Users can always see their own collaboration entries
    member_id = auth.uid()
    OR
    -- Admins/Super Admins can see all
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND LOWER(role) IN ('super admin', 'admin', 'project operations manager')
    )
);


-- 5. Designer Fee Protection (Privacy)
-- Ensure sensitive financial columns aren't visible to people who shouldn't see them
-- Note: Supabase RLS works on rows. To hide columns, we usually do this at the API/View level
-- but for now, the 'Secure project visibility' ensures freelancers only see THEIR projects.
