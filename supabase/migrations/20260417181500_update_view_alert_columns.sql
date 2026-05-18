-- Migration: Fix projects_with_collaborators view column naming conflict
-- Created: 2026-04-17

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
