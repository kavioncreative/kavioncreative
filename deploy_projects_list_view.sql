
-- ============================================================
-- Lightweight View for Project Listing
-- Optimized for table rendering by excluding heavy fields 
-- like brief, attachments, and collaborator JSON arrays.
-- ============================================================

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
    due_date,
    due_time,
    client_due_date,
    client_due_time,
    created_at,
    account_id,
    account,
    has_dispute,
    has_art_help
FROM projects;

-- Grant access to authenticated users
GRANT SELECT ON projects_list_view TO authenticated;
GRANT SELECT ON projects_list_view TO anon;
GRANT SELECT ON projects_list_view TO service_role;
