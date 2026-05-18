-- Ensure all internal and team economy columns exist on the projects table before the view references them
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS assignee_id UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS team_designer_id UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS team_payout NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS team_slab_id UUID,
ADD COLUMN IF NOT EXISTS client_due_date DATE,
ADD COLUMN IF NOT EXISTS client_due_time TIME,
ADD COLUMN IF NOT EXISTS revision_notes TEXT;

-- Rename applicant_labels to generic labels (Idempotent)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'applicant_labels') THEN
        ALTER TABLE public.applicant_labels RENAME TO labels;
    END IF;
END $$;

-- Add category column
ALTER TABLE public.labels ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'applicant' CHECK (category IN ('applicant', 'project'));

-- Add visibility columns
ALTER TABLE public.labels ADD COLUMN IF NOT EXISTS visibility_type TEXT DEFAULT 'all' CHECK (visibility_type IN ('all', 'roles', 'users', 'private'));
ALTER TABLE public.labels ADD COLUMN IF NOT EXISTS visible_to_roles TEXT[] DEFAULT '{}';
ALTER TABLE public.labels ADD COLUMN IF NOT EXISTS visible_to_users UUID[] DEFAULT '{}';
ALTER TABLE public.labels ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Create table for Project Label Assignments
CREATE TABLE IF NOT EXISTS public.project_label_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id TEXT NOT NULL REFERENCES public.projects(project_id) ON DELETE CASCADE,
    label_id UUID NOT NULL REFERENCES public.labels(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(project_id, label_id)
);

-- Enable RLS
ALTER TABLE public.project_label_assignments ENABLE ROW LEVEL SECURITY;

-- Policies for project_label_assignments
DROP POLICY IF EXISTS "Allow all authenticated users to read project assignments" ON public.project_label_assignments;
CREATE POLICY "Allow all authenticated users to read project assignments" ON public.project_label_assignments
    FOR SELECT TO authenticated USING (true);

-- Update the view to include labels
DROP VIEW IF EXISTS public.projects_with_collaborators;
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
    ) as collaborators,
    COALESCE(
        (
            SELECT jsonb_agg(jsonb_build_object(
                'id', l.id,
                'name', l.name,
                'color', l.color
            ))
            FROM project_label_assignments pla
            JOIN labels l ON pla.label_id = l.id
            WHERE pla.project_id = p.project_id
        ),
        '[]'::jsonb
    ) as labels
FROM public.projects p;

-- Grant access to the view
GRANT SELECT ON public.projects_with_collaborators TO authenticated;

DROP POLICY IF EXISTS "Allow all authenticated users to manage project assignments" ON public.project_label_assignments;
CREATE POLICY "Allow all authenticated users to manage project assignments" ON public.project_label_assignments
    FOR ALL TO authenticated USING (true);

-- Update RLS for labels to handle visibility and permissions
DROP POLICY IF EXISTS "Allow users to read labels based on visibility" ON public.labels;
CREATE POLICY "Allow users to read labels based on visibility" ON public.labels
    FOR SELECT TO authenticated
    USING (
        auth.uid() = created_by OR
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'Super Admin' OR
        (
            visibility_type = 'all' AND 
            (SELECT role FROM public.profiles WHERE id = auth.uid()) != 'Team Designer'
        ) OR
        (visibility_type = 'roles' AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = ANY(visible_to_roles)) OR
        (visibility_type = 'users' AND auth.uid() = ANY(visible_to_users))
    );

DROP POLICY IF EXISTS "Users can manage their own labels" ON public.labels;
CREATE POLICY "Users can edit/delete their own labels" ON public.labels
    FOR ALL TO authenticated
    USING (
        (auth.uid() = created_by AND 
         NOT EXISTS (
             SELECT 1 FROM public.profiles 
             WHERE id = created_by AND role = 'Super Admin'
         )) OR
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'Super Admin'
    );
