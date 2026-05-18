-- Migration: Add QA Workflow Columns
-- Created: 2026-04-07

-- 1. Add qa_status to projects
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS qa_status text DEFAULT NULL;
-- Possible values: 'pending_qa', 'qa_revision', 'qa_approved'

-- 2. Add is_internal flag to comments to distinguish QA feedback
-- Defaults to false so existing comments remain visible in main timeline
ALTER TABLE project_comments 
ADD COLUMN IF NOT EXISTS is_internal boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS category text DEFAULT 'comment';

-- 3. Add project_id and category to assets
-- To link files to specific projects and distinguish between previews and final files
ALTER TABLE assets 
ADD COLUMN IF NOT EXISTS project_id text REFERENCES projects(project_id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS category text DEFAULT 'deliverable';
-- Categories: 'deliverable', 'qa_preview'

-- 4. Speed up filtering with indexes
CREATE INDEX IF NOT EXISTS idx_project_comments_is_internal ON project_comments(is_internal);
CREATE INDEX IF NOT EXISTS idx_projects_qa_status ON projects(qa_status);
CREATE INDEX IF NOT EXISTS idx_assets_project_id ON assets(project_id);
CREATE INDEX IF NOT EXISTS idx_assets_category ON assets(category);

-- 5. Update projects_with_collaborators view to include qa_status
-- This ensures the frontend project details can actually read the new column
CREATE OR REPLACE VIEW public.projects_with_collaborators AS
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
    p.order_type,
    p.assignee_id,
    p.team_designer_id,
    p.team_payout,
    p.team_slab_id,
    p.client_due_date,
    p.client_due_time,
    p.revision_notes,
    p.qa_status, -- Added column
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
FROM public.projects p;

-- 6. Update get_project_status_counts RPC
-- This ensures that dashboard tabs show correct counts and isolate QA projects
CREATE OR REPLACE FUNCTION get_project_status_counts()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'all', COUNT(*),
    'dispute', COUNT(*) FILTER (WHERE has_dispute = true),
    'arthelp', COUNT(*) FILTER (WHERE has_art_help = true),
    'qa_pending', COUNT(*) FILTER (WHERE qa_status = 'pending_qa')
  ) || COALESCE((
    SELECT jsonb_object_agg(status_clean, cnt)
    FROM (
      SELECT LOWER(TRIM(status)) as status_clean, COUNT(*) as cnt
      FROM projects
      WHERE status != 'Removed' 
      AND (qa_status IS NULL OR qa_status != 'pending_qa') -- Filter out QA isolated projects from standard counts
      GROUP BY 1
    ) t
  ), '{}'::jsonb)
  INTO result
  FROM projects
  WHERE status != 'Removed';
  
  RETURN COALESCE(result, '{}'::jsonb);
END;
$$;
