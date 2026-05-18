-- PART 2: RLS & INDEXES
-- Run this second, after tables are created.

-- 2.1 Projects RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read access for authenticated users" ON projects;
CREATE POLICY "Allow read access for authenticated users" ON projects FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow insert access for authenticated users" ON projects;
CREATE POLICY "Allow insert access for authenticated users" ON projects FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update access for authenticated users" ON projects;
CREATE POLICY "Allow update access for authenticated users" ON projects FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow delete access for authenticated users" ON projects;
CREATE POLICY "Allow delete access for authenticated users" ON projects FOR DELETE TO authenticated USING (true);

-- 2.2 Accounts RLS
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read access for accounts" ON accounts;
CREATE POLICY "Allow read access for accounts" ON accounts FOR SELECT TO authenticated USING (true);

-- 2.3 Notifications RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read access for notifications" ON notifications;
CREATE POLICY "Allow read access for notifications" ON notifications FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow insert access for notifications" ON notifications;
CREATE POLICY "Allow insert access for notifications" ON notifications FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update access for notifications" ON notifications;
CREATE POLICY "Allow update access for notifications" ON notifications FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow delete access for notifications" ON notifications;
CREATE POLICY "Allow delete access for notifications" ON notifications FOR DELETE TO authenticated USING (true);

-- 2.4 Project Comments RLS
ALTER TABLE project_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read access for project_comments" ON project_comments;
CREATE POLICY "Allow read access for project_comments" ON project_comments FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow insert access for project_comments" ON project_comments;
CREATE POLICY "Allow insert access for project_comments" ON project_comments FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete access for project_comments" ON project_comments;
CREATE POLICY "Allow delete access for project_comments" ON project_comments FOR DELETE TO authenticated USING (true);

-- 2.5 Platform Commissions & Links RLS
ALTER TABLE platform_commissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Access Commissions" ON platform_commissions;
CREATE POLICY "Access Commissions" ON platform_commissions FOR ALL TO authenticated USING (true);

ALTER TABLE platform_commission_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Access Commission Accounts" ON platform_commission_accounts;
CREATE POLICY "Access Commission Accounts" ON platform_commission_accounts FOR ALL TO authenticated USING (true);

-- 3. INDEXES
CREATE INDEX IF NOT EXISTS idx_projects_project_id ON projects(project_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at);

CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

CREATE INDEX IF NOT EXISTS idx_project_comments_project_id ON project_comments(project_id);
CREATE INDEX IF NOT EXISTS idx_project_comments_created_at ON project_comments(created_at DESC);
