-- RECREATE PROJECTS LIST VIEW TO PICK UP NEW COLUMNS
-- This migration ensures the team_designer_fee and any other new columns are visible in the view.

DROP VIEW IF EXISTS public.projects_list_view CASCADE;

CREATE VIEW public.projects_list_view AS
SELECT 
    p.*,
    td.name as team_designer_name
FROM public.projects p
LEFT JOIN public.profiles td ON p.team_designer_id = td.id;

-- Ensure read permissions for all roles
GRANT SELECT ON public.projects_list_view TO authenticated;
GRANT SELECT ON public.projects_list_view TO service_role;
GRANT SELECT ON public.projects_list_view TO anon;
