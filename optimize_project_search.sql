
-- ============================================================
-- Optimized Search with Full Text Search (FTS)
-- Adds a generated tsvector column and GIN index
-- ============================================================

-- 1. Add search vector to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS search_vector tsvector GENERATED ALWAYS AS (
  to_tsvector('english', 
    coalesce(project_id, '') || ' ' || 
    coalesce(project_title, '') || ' ' || 
    coalesce(client_name, '') || ' ' || 
    coalesce(assignee, '')
  )
) STORED;

-- 2. Create GIN index for fast searching
CREATE INDEX IF NOT EXISTS idx_projects_search_vector ON projects USING GIN (search_vector);

-- 3. Update the lightweight view to include the search vector
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
    has_art_help,
    search_vector
FROM projects;

-- Grant permissions
GRANT SELECT ON projects_list_view TO authenticated;
GRANT SELECT ON projects_list_view TO anon;
GRANT SELECT ON projects_list_view TO service_role;
