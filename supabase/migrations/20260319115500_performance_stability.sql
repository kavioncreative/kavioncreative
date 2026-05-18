-- ==========================================
-- PERFORMANCE & STABILITY OPTIMIZATIONS V1
-- ==========================================

-- 1. Composite Index for the primary "Projects" list sorting pattern
-- Addresses "Filesort" operations that spike CPU on large listings
CREATE INDEX IF NOT EXISTS idx_projects_sort_priority 
ON projects (due_date ASC NULLS LAST, due_time ASC NULLS LAST, created_at DESC);

-- 2. Index for joining accounts and primary managers in Analytics/Details
CREATE INDEX IF NOT EXISTS idx_projects_account_id_id ON projects (account_id, id);
CREATE INDEX IF NOT EXISTS idx_projects_primary_manager ON projects (primary_manager_id);

-- 3. Optimization for Row-Level Security (RLS)
-- Index foreign keys used in project visibility checks
CREATE INDEX IF NOT EXISTS idx_team_members_member_id ON team_members (member_id);
CREATE INDEX IF NOT EXISTS idx_team_accounts_account_id ON team_accounts (account_id);

-- 4. High-Performance Server-Side Counter
-- Replaces client-side "Fetch-All-Then-Count" which saturates memory & connections
CREATE OR REPLACE FUNCTION get_project_status_counts()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER -- Respects RLS of the caller
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'all', COUNT(*),
    'dispute', COUNT(*) FILTER (WHERE has_dispute = true),
    'arthelp', COUNT(*) FILTER (WHERE has_art_help = true)
  ) || jsonb_object_agg(status_clean, cnt)
  INTO result
  FROM (
    SELECT LOWER(TRIM(status)) as status_clean, COUNT(*) as cnt
    FROM projects
    WHERE status != 'Removed'
    GROUP BY 1
  ) t;
  
  RETURN COALESCE(result, '{}'::jsonb);
END;
$$;

-- 5. Enable Secure View Inheritance
-- Ensures views inherit RLS policies properly to avoid redundant manual filters
ALTER VIEW IF EXISTS projects_list_view SET (security_invoker = true);
