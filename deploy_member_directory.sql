-- ============================================
-- NOVA DESIGN SYSTEM - FULL MEMBER DIRECTORY
-- ============================================

-- 1. Profiles table for active members
CREATE TABLE IF NOT EXISTS profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    email text UNIQUE NOT NULL,
    role text NOT NULL,
    status text DEFAULT 'Active',
    avatar_url text,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Allow all access for profiles" ON profiles;
CREATE POLICY "Allow all access for profiles"
ON profiles FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 2. Seed initial team members
INSERT INTO profiles (name, email, role, status)
VALUES 
('Alex Rivier', 'alex@nova.design', 'Administrator', 'Active'),
('Sarah Chen', 'sarah.c@nova.design', 'Lead Designer', 'Active'),
('Marcus Wright', 'm.wright@nova.design', 'Developer', 'Offline'),
('Elena Kostic', 'elena@nova.design', 'Product Manager', 'Active'),
('James Wilson', 'j.wilson@nova.design', 'Security Analyst', 'Review')
ON CONFLICT (email) DO NOTHING;

-- 3. Ensure member_invitations exists (Fail-safe)
CREATE TABLE IF NOT EXISTS member_invitations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL,
    role text NOT NULL,
    status text DEFAULT 'pending',
    created_at timestamptz DEFAULT now()
);

ALTER TABLE member_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access for member_invitations" ON member_invitations;
CREATE POLICY "Allow all access for member_invitations"
ON member_invitations FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
