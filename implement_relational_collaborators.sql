-- ============================================
-- BEST APPROACH: RELATIONAL COLLABORATORS
-- ============================================

-- 1. Create project_collaborators table
CREATE TABLE IF NOT EXISTS project_collaborators (
    project_id text REFERENCES projects(project_id) ON DELETE CASCADE,
    member_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    role text, 
    created_at timestamptz DEFAULT now(),
    PRIMARY KEY (project_id, member_id)
);

-- 2. Enable RLS
ALTER TABLE project_collaborators ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies
DROP POLICY IF EXISTS "Allow all access to collaborators for authenticated" ON project_collaborators;
CREATE POLICY "Allow all access to collaborators for authenticated" 
ON project_collaborators FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- 4. Create a Database View for seamless frontend integration
-- This view replicates the old projects table structure but dynamically 
-- aggregates collaborators from the relational table into a JSONB array.
CREATE OR REPLACE VIEW projects_with_collaborators AS
SELECT 
    p.id,
    p.project_id,
    p.action_move,
    p.project_title,
    p.account,
    p.client_type,
    p.client_name,
    p.previous_logo_no,
    p.items_sold,
    p.addons,
    p.medium,
    p.price,
    p.brief,
    p.attachments,
    p.due_date,
    p.due_time,
    p.assignee,
    p.removal_reason,
    p.cancellation_reason,
    p.tips_given,
    p.tip_amount,
    p.status,
    p.created_at,
    p.updated_at,
    p.account_id,
    p.designer_fee,
    p.primary_manager_id,
    p.options_required,
    p.has_dispute,
    p.has_art_help,
    p.payout_completed,
    p.converted_by,
    COALESCE(
        (
            SELECT jsonb_agg(jsonb_build_object(
                'id', pc.member_id,
                'name', pr.name,
                'role', pr.role
            ))
            FROM project_collaborators pc
            JOIN profiles pr ON pc.member_id = pr.id
            WHERE pc.project_id = p.project_id
        ),
        '[]'::jsonb
    ) as collaborators
FROM projects p;

-- 5. Migrate existing data (Optional but recommended)
-- Uncomment the following if you have existing data in projects.collaborators
/*
INSERT INTO project_collaborators (project_id, member_id, role)
SELECT 
    project_id, 
    (collab->>'id')::uuid, 
    collab->>'role'
FROM projects, jsonb_array_elements(collaborators) AS collab
ON CONFLICT DO NOTHING;
*/
