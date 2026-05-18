-- ==========================================
-- PERFORMANCE & STABILITY OPTIMIZATIONS V2
-- RLS ACCELERATION (FAST-PATH)
-- ==========================================

-- Optimized RLS Policy for Projects Visibility
-- Uses JWT metadata for "Super Admin" and "Admin" checks to bypass table lookups.
-- Backward compatible: falls back to profile table if metadata is missing.

DROP POLICY IF EXISTS "Secure project visibility" ON projects;
DROP POLICY IF EXISTS "Allow all access for authenticated users" ON projects;

CREATE POLICY "Secure project visibility optimized" ON projects
FOR SELECT
TO authenticated
USING (
    -- FAST PATH: Check JWT metadata first (O(1) complexity)
    (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'super admin'
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'admin'
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'project operations manager'
    
    -- FALLBACK: Table lookups (Only if metadata is missing or insufficient)
    OR EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND LOWER(role) IN ('super admin', 'admin', 'project operations manager')
    )
    
    -- Collaborators & PMs (Scoped lookups)
    OR assignee_id = auth.uid()
    OR team_designer_id = auth.uid()
    OR primary_manager_id = auth.uid()

    -- Legacy/Name/Email Fallback (Ensures visibility whenever name matches, regardless of role)
    OR EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND (
            TRIM(projects.assignee) ILIKE TRIM(profiles.name) 
            OR TRIM(projects.assignee) ILIKE TRIM(profiles.email)
        )
    )

    -- Collaborators (From relational table)
    OR EXISTS (
        SELECT 1 FROM project_collaborators pc
        WHERE pc.project_id = projects.project_id
        AND pc.member_id = auth.uid()
    )
    
    -- Account-based visibility (Optimized indexed join)
    OR EXISTS (
        SELECT 1 FROM user_account_access uaa
        WHERE uaa.user_id = auth.uid()
        AND uaa.account_id = projects.account_id
    )
    
    -- Team-based visibility
    OR EXISTS (
        SELECT 1 FROM team_members tm
        JOIN team_accounts ta ON tm.team_id = ta.team_id
        WHERE tm.member_id = auth.uid()
        AND ta.account_id = projects.account_id
    )
);

-- Re-enable RLS to ensure it's active
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
