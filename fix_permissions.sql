-- ============================================
-- FIX: MISSING PERMISSIONS & RLS POLICIES
-- ============================================
-- Run this in your Supabase SQL Editor to resolve the "Foreign Key Constraint" error
-- and enable the "Cloud Assets" & "Tasks" permissions.

-- 1. Allow Admins/Super Admins to manage the permissions table
-- This enables the "Self-Healing" feature in the app to keep permissions in sync.
DROP POLICY IF EXISTS "Allow admin to manage permissions" ON permissions;
CREATE POLICY "Allow admin to manage permissions" ON permissions 
FOR ALL TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND (role = 'Admin' OR role = 'Super Admin')
  )
);

-- 2. Seed all missing system permissions
INSERT INTO permissions (code, name, category, description) VALUES
  ('view_accounts', 'Accounts Directory', 'Accounts', 'Access to view the accounts listing'),
  ('view_tasks', 'Tasks Board', 'Tasks', 'Access to the tasks management board'),
  ('access_assets', 'Cloud Assets', 'Assets', 'Access to the file management system'),
  ('manage_assets', 'Manage Assets', 'Assets', 'Full control over file operations (upload/delete)'),
  ('create_users', 'Create Users', 'Users', 'Invite new users to the platform'),
  ('edit_users', 'Edit Users', 'Users', 'Modify existing user profiles'),
  ('delete_users', 'Delete Users', 'Users', 'Remove users from the system'),
  ('manage_teams', 'Manage Teams', 'Users', 'Create and organize team structures'),
  ('access_control_panel', 'Access Control', 'Accounts', 'Manage system roles and permissions'),
  ('view_channels', 'Channels', 'Channels', 'Access to communication channels'),
  ('view_forms', 'Forms', 'Forms', 'Access to the forms engine'),
  ('view_settings', 'Settings', 'General', 'Access to personal account settings')
ON CONFLICT (code) DO NOTHING;

-- 3. Grant these to Super Admin immediately
INSERT INTO role_permissions (role_name, permission_code)
SELECT 'Super Admin', code FROM permissions WHERE code IN 
  ('view_accounts', 'view_tasks', 'access_assets', 'manage_assets', 'create_users', 'edit_users', 'delete_users', 'manage_teams', 'access_control_panel', 'view_channels', 'view_forms', 'view_settings')
ON CONFLICT DO NOTHING;

-- 4. Grant core view permissions to Admin by default
INSERT INTO role_permissions (role_name, permission_code)
SELECT 'Admin', code FROM permissions WHERE code IN 
  ('view_accounts', 'view_tasks', 'access_assets', 'view_channels', 'view_forms', 'view_settings')
ON CONFLICT DO NOTHING;
