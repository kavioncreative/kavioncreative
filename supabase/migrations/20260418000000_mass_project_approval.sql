-- Migration: Mass project approval and clearance date update
-- Created: 2026-04-18
-- Based on: Approved Projects Clearance Start Date CSV

-- 1. Add clearance_start_date to projects table
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS clearance_start_date date DEFAULT NULL;

-- 2. Update projects_with_collaborators view to include the new column
DROP VIEW IF EXISTS public.projects_with_collaborators CASCADE;
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
    p.clearance_start_date, -- New column
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

-- 3. Perform mass update for specified projects
UPDATE projects
SET 
    status = 'Approved',
    clearance_start_date = CASE project_id
        WHEN 'MAN 100122' THEN '2026-03-05'::date
        WHEN 'MAN 100126' THEN '2026-03-11'::date
        WHEN 'MAN 100135' THEN '2026-03-13'::date
        WHEN 'MAN 100137' THEN '2026-03-20'::date
        WHEN 'MAN 100140' THEN '2026-03-10'::date
        WHEN 'MAN 100143' THEN '2026-03-30'::date
        WHEN 'MAN 100159' THEN '2026-03-20'::date
        WHEN 'MAN 100160' THEN '2026-03-12'::date
        WHEN 'MAN 100161' THEN '2026-03-14'::date
        WHEN 'MAN 100162' THEN '2026-03-29'::date
        WHEN 'MAN 100168' THEN '2026-04-04'::date
        WHEN 'MAN 100178' THEN '2026-03-30'::date
        WHEN 'MAN 217459' THEN '2026-04-01'::date
        WHEN 'MAN 854123' THEN '2026-03-14'::date
        WHEN 'MAN 939627' THEN '2026-03-18'::date
        WHEN 'MAN 210636' THEN '2026-04-09'::date
        WHEN 'MAN 329867' THEN '2026-04-09'::date
        WHEN 'MAN 415083' THEN '2026-03-21'::date
        WHEN 'MAN 792741' THEN '2026-03-21'::date
        WHEN 'MAN 223840' THEN '2026-04-06'::date
        WHEN 'MAN 845553' THEN '2026-03-29'::date
        WHEN 'MAN 337365' THEN '2026-03-29'::date
        WHEN 'MAN 766865' THEN '2026-04-08'::date
        WHEN 'MAN 215915' THEN '2026-04-03'::date
        WHEN 'MAN 719191' THEN '2026-04-10'::date
        WHEN 'MAN 391459' THEN '2026-04-06'::date
        WHEN 'MAN 154284' THEN '2026-04-12'::date
        WHEN 'MAN 312877' THEN '2026-04-07'::date
        WHEN 'MAN 452876' THEN '2026-04-06'::date
        WHEN 'MAN 877128' THEN '2026-04-12'::date
    END
WHERE project_id IN (
    'MAN 100122', 'MAN 100126', 'MAN 100135', 'MAN 100137', 'MAN 100140',
    'MAN 100143', 'MAN 100159', 'MAN 100160', 'MAN 100161', 'MAN 100162',
    'MAN 100168', 'MAN 100178', 'MAN 217459', 'MAN 854123', 'MAN 939627',
    'MAN 210636', 'MAN 329867', 'MAN 415083', 'MAN 792741', 'MAN 223840',
    'MAN 845553', 'MAN 337365', 'MAN 766865', 'MAN 215915', 'MAN 719191',
    'MAN 391459', 'MAN 154284', 'MAN 312877', 'MAN 452876', 'MAN 877128'
);
