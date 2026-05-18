-- Add delete_timeline_items permission
INSERT INTO permissions (code, name, category, description) VALUES
  ('delete_timeline_items', 'Delete Timeline Items', 'Projects', 'Ability to delete comments and logs from project timeline')
ON CONFLICT (code) DO NOTHING;

-- Grant to Super Admin
INSERT INTO role_permissions (role_name, permission_code)
VALUES ('Super Admin', 'delete_timeline_items')
ON CONFLICT DO NOTHING;

-- Ensure Super Admin can delete project_comments via RLS
DROP POLICY IF EXISTS "Allow super admin to delete any comment" ON project_comments;
CREATE POLICY "Allow super admin to delete any comment" ON project_comments 
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'Super Admin'
  )
);
