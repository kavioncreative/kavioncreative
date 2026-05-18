
-- 1. Drop the existing view to allow for column shifts and avoiding duplicate column names
DROP VIEW IF EXISTS projects_with_collaborators;

-- 2. Recreate the view by explicitly listing columns to avoid conflicts with 'p.*'
-- This ensuring order_type and converted_by are properly exposed for the frontend.
CREATE VIEW projects_with_collaborators AS
SELECT 
    p.id,
    p.project_id,
    p.action_move,
    p.project_title,
    p.account,
    p.account_id,
    p.client_type,
    p.client_name,
    p.previous_logo_no,
    p.items_sold,
    p.addons,
    p.medium,
    p.price,
    p.designer_fee,
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
    p.primary_manager_id,
    p.options_required,
    p.has_dispute,
    p.has_art_help,
    p.payout_completed,
    p.converted_by,
    p.order_type,
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
FROM projects p;
