-- ==========================================
-- PERFORMANCE & STABILITY OPTIMIZATIONS V3
-- INDEXING & RPC ENHANCEMENT
-- ==========================================

-- 1. Index for status-based filtering & grouping (Essential for Counts & Tabs)
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects (status);

-- 2. Indices for RLS (Row Level Security) and Joining
CREATE INDEX IF NOT EXISTS idx_projects_assignee_id ON projects (assignee_id);
CREATE INDEX IF NOT EXISTS idx_projects_team_designer_id ON projects (team_designer_id);
CREATE INDEX IF NOT EXISTS idx_projects_account_id ON projects (account_id);
CREATE INDEX IF NOT EXISTS idx_projects_primary_manager_id ON projects (primary_manager_id);

-- 3. Indices for Alert filtering
CREATE INDEX IF NOT EXISTS idx_projects_alerts ON projects (has_dispute, has_art_help) WHERE has_dispute = true OR has_art_help = true;

-- 4. Search Acceleration (Requires pg_trgm extension)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_projects_project_id_trgm ON projects USING gin (project_id gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_projects_title_trgm ON projects USING gin (project_title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_projects_client_trgm ON projects USING gin (client_name gin_trgm_ops);

-- 5. Optimized Status Counter RPC (More robust)
CREATE OR REPLACE FUNCTION get_project_status_counts()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  result jsonb;
BEGIN
  -- We use a single scan for all counts including specific flags
  SELECT jsonb_build_object(
    'all', COUNT(*),
    'dispute', COUNT(*) FILTER (WHERE has_dispute = true),
    'arthelp', COUNT(*) FILTER (WHERE has_art_help = true)
  ) || COALESCE((
    SELECT jsonb_object_agg(status_clean, cnt)
    FROM (
      SELECT LOWER(TRIM(status)) as status_clean, COUNT(*) as cnt
      FROM projects
      WHERE status != 'Removed'
      GROUP BY 1
    ) t
  ), '{}'::jsonb)
  INTO result
  FROM projects
  WHERE status != 'Removed';
  
  RETURN COALESCE(result, '{}'::jsonb);
END;
$$;
