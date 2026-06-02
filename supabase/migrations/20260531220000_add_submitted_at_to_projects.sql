-- Migration: Add submitted_at column and triggers for automated tracking
-- Created: 2026-05-31

-- 1. Add column to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- 2. Create trigger function to handle submitted_at automatically
CREATE OR REPLACE FUNCTION public.handle_project_submission_time()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        IF (LOWER(TRIM(NEW.status)) IN ('done', 'revision done', 'revision urgent done', 'urgent done', 'final-files-done', 'final files done')) THEN
            NEW.submitted_at := now();
        ELSE
            NEW.submitted_at := NULL;
        END IF;
    ELSIF (TG_OP = 'UPDATE') THEN
        IF (OLD.status IS DISTINCT FROM NEW.status) THEN
            IF (LOWER(TRIM(NEW.status)) IN ('done', 'revision done', 'revision urgent done', 'urgent done', 'final-files-done', 'final files done')) THEN
                NEW.submitted_at := now();
            ELSE
                NEW.submitted_at := NULL;
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create BEFORE trigger
DROP TRIGGER IF EXISTS tr_project_submission_time ON projects;
CREATE TRIGGER tr_project_submission_time
    BEFORE INSERT OR UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION handle_project_submission_time();

-- 4. Retroactively populate existing completed projects
UPDATE projects 
SET submitted_at = updated_at 
WHERE LOWER(TRIM(status)) IN ('done', 'revision done', 'revision urgent done', 'urgent done', 'final-files-done', 'final files done') 
  AND submitted_at IS NULL;

-- 5. Recreate projects_with_collaborators view to expose the column
DROP VIEW IF EXISTS public.projects_with_collaborators CASCADE;

CREATE VIEW public.projects_with_collaborators AS
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
    p.team_designer_fee,
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
    p.qa_status,
    p.alert_type,
    p.alert_status,
    p.alert_initiator_id,
    p.alert_resolver_id,
    p.alert_reason,
    p.alert_additional_message,
    p.submitted_at, -- Exposed column in view
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

GRANT SELECT ON public.projects_with_collaborators TO authenticated;
GRANT SELECT ON public.projects_with_collaborators TO service_role;
GRANT SELECT ON public.projects_with_collaborators TO anon;
ALTER VIEW public.projects_with_collaborators SET (security_invoker = true);
