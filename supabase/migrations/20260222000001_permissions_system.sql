
-- 1. Create permissions table to define available capabilities
CREATE TABLE IF NOT EXISTS permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL, -- e.g. 'view_projects', 'edit_finances'
  name text NOT NULL,
  category text NOT NULL, -- e.g. 'Projects', 'Finances', 'Users'
  description text,
  created_at timestamptz DEFAULT now()
);

-- 2. Create role_permissions table to map roles to capabilities
CREATE TABLE IF NOT EXISTS role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name text NOT NULL REFERENCES roles(name) ON DELETE CASCADE,
  permission_code text NOT NULL REFERENCES permissions(code) ON DELETE CASCADE,
  UNIQUE(role_name, permission_code)
);

-- 3. Create user_account_access for granular data scoping
CREATE TABLE IF NOT EXISTS user_account_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  UNIQUE(user_id, account_id)
);

-- 4. Enable RLS
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_account_access ENABLE ROW LEVEL SECURITY;

-- 5. Policies
DROP POLICY IF EXISTS "Allow read access for authenticated users" ON permissions;
CREATE POLICY "Allow read access for authenticated users" ON permissions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow read access for authenticated users" ON role_permissions;
CREATE POLICY "Allow read access for authenticated users" ON role_permissions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow read access for authenticated users" ON user_account_access;
CREATE POLICY "Allow read access for authenticated users" ON user_account_access FOR SELECT TO authenticated USING (true);

-- 6. Seed initial permissions
INSERT INTO permissions (code, name, category, description) VALUES
  ('view_dashboard', 'View Dashboard', 'General', 'Access to the main dashboard overview'),
  ('view_projects', 'View Projects', 'Projects', 'Ability to see the projects list'),
  ('create_projects', 'Create Projects', 'Projects', 'Ability to add new projects'),
  ('edit_projects', 'Edit Projects', 'Projects', 'Ability to modify project details'),
  ('delete_projects', 'Delete Projects', 'Projects', 'Ability to remove projects'),
  ('view_finances', 'View Finances', 'Finances', 'Access to financial records and stats'),
  ('manage_accounts', 'Manage Accounts', 'Accounts', 'Ability to add, edit, and delete accounts and their display prefixes.'),
  ('view_users', 'View Users', 'Users', 'Access to the users and teams directory'),
  ('manage_users', 'Manage Users', 'Users', 'Ability to invite and edit user roles'),
  ('view_analytics', 'View Analytics', 'Analytics', 'Access to Gig Stats and reports'),
  ('view_gig_stats', 'View Gig Stats', 'Analytics', 'Access to the Gig Stats tab in Analytics'),
  ('view_sales_analytics', 'View Sales Analytics', 'Analytics', 'Access to the Sales tab in Analytics'),
  ('view_company_earnings', 'View Company Earnings', 'Finances', 'Access to company profit and revenue reports'),
  ('view_freelancer_earnings', 'View Freelancer Earnings', 'Finances', 'Access to freelancer payout and earning records'),
  ('manage_finance_config', 'Manage Finance Config', 'Finances', 'Ability to edit commissions and pricing slabs'),
  ('access_chats', 'Access Chats', 'Communication', 'Access to internal chat system'),
  ('access_reminders', 'Access Reminders', 'Communication', 'Access to system reminders'),
  ('access_integrations', 'Access Integrations', 'System', 'Access to external platform settings')
ON CONFLICT (code) DO NOTHING;

-- 7. Default Role Mappings (Super Admin gets all)
INSERT INTO role_permissions (role_name, permission_code)
SELECT 'Super Admin', code FROM permissions
ON CONFLICT DO NOTHING;

-- Admin defaults (restricted per user request)
INSERT INTO role_permissions (role_name, permission_code)
SELECT 'Admin', code FROM permissions 
WHERE code NOT IN ('access_chats', 'access_reminders', 'access_integrations', 'access_channels', 'access_forms')
ON CONFLICT DO NOTHING;
