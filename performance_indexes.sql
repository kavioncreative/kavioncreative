-- ============================================================
-- Performance Indexes for Projects Table
-- Run this once in Supabase SQL Editor
-- Safe to run: adds indexes only, no data changes
-- ============================================================

-- Index 1: account_id — speeds up role-based filtering OR queries
CREATE INDEX IF NOT EXISTS idx_projects_account_id
    ON projects (account_id);

-- Index 2: created_at DESC — speeds up ORDER BY created_at DESC (used on every fetch)
CREATE INDEX IF NOT EXISTS idx_projects_created_at_desc
    ON projects (created_at DESC);

-- Index 3: status — speeds up WHERE status != 'Removed' and tab filters
CREATE INDEX IF NOT EXISTS idx_projects_status
    ON projects (status);

-- Index 4: assignee — speeds up freelancer assignee filter
CREATE INDEX IF NOT EXISTS idx_projects_assignee
    ON projects (assignee);

-- Index 5: Composite index for the most common query pattern (status + account_id)
CREATE INDEX IF NOT EXISTS idx_projects_account_status
    ON projects (account_id, status);

-- Verify indexes were created
SELECT indexname, tablename, indexdef
FROM pg_indexes
WHERE tablename = 'projects'
ORDER BY indexname;
