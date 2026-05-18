-- =============================================
-- APPLICANT TRACKING SYSTEM MIGRATION
-- =============================================

-- 1. Create Applicants Table
CREATE TABLE IF NOT EXISTS applicants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  whatsapp text NOT NULL,
  email text NOT NULL,
  cv_file_url text,
  portfolio_links text[] DEFAULT '{}',
  position text DEFAULT 'Designer',
  created_at timestamptz DEFAULT now(),
  status text DEFAULT 'Pending'
);

-- 2. Enable Row Level Security
ALTER TABLE applicants ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- Allow public to insert (anyone can apply)
DROP POLICY IF EXISTS "Allow public to submit applications" ON applicants;
CREATE POLICY "Allow public to submit applications"
ON applicants FOR INSERT
WITH CHECK (true);

-- Only authenticated users (admins) can view applications
DROP POLICY IF EXISTS "Allow authenticated users to view applications" ON applicants;
CREATE POLICY "Allow authenticated users to view applications"
ON applicants FOR SELECT
TO authenticated
USING (true);

-- Allow admins to update status
DROP POLICY IF EXISTS "Allow authenticated users to update applications" ON applicants;
CREATE POLICY "Allow authenticated users to update applications"
ON applicants FOR UPDATE
TO authenticated
USING (true);

-- 4. Add Indexes
CREATE INDEX IF NOT EXISTS idx_applicants_email ON applicants(email);
CREATE INDEX IF NOT EXISTS idx_applicants_created_at ON applicants(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_applicants_status ON applicants(status);

-- 5. Add view_applicants permission (to the existing permissions system)
INSERT INTO permissions (code, name, category, description)
VALUES ('view_applicants', 'View Applicants', 'Users', 'Ability to view and manage designer applications')
ON CONFLICT (code) DO NOTHING;

-- 6. Map permissions to Super Admin and Admin roles
INSERT INTO role_permissions (role_name, permission_code)
VALUES 
  ('Super Admin', 'view_applicants'),
  ('Admin', 'view_applicants')
ON CONFLICT DO NOTHING;
