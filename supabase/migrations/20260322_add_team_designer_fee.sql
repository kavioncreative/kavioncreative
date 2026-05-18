-- Add team_designer_fee column to support Team Lead -> Team Designer payout calculations
ALTER TABLE projects ADD COLUMN IF NOT EXISTS team_designer_fee NUMERIC DEFAULT 0;

-- Update projects_list_view to include the new column
DROP VIEW IF EXISTS projects_list_view;

CREATE VIEW projects_list_view AS
SELECT 
    project_id,
    project_title,
    status,
    assignee,
    assignee_id,
    team_designer_id,
    client_name,
    client_type,
    price,
    designer_fee,
    team_designer_fee, -- Added column
    due_date,
    due_time,
    client_due_date,
    client_due_time,
    created_at,
    account_id,
    account,
    has_dispute,
    has_art_help,
    search_vector
FROM projects;

-- Grant access to authenticated users
GRANT SELECT ON projects_list_view TO authenticated;
GRANT SELECT ON projects_list_view TO anon;
GRANT SELECT ON projects_list_view TO service_role;
ALTER VIEW projects_list_view SET (security_invoker = true);
