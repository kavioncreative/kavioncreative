-- =============================================
-- SEPARATE ACCOUNT REQUESTS FROM APPLICANTS
-- =============================================

-- 1. Create Dedicated Account Requests Designers Table
CREATE TABLE IF NOT EXISTS account_requests_designers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  created_at timestamptz DEFAULT now(),
  status text DEFAULT 'Pending'
);

-- 2. Enable Row Level Security
ALTER TABLE account_requests_designers ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies for Account Requests Designers
-- Allow public to submit requests
CREATE POLICY "Allow public to submit account requests designers"
ON account_requests_designers FOR INSERT
WITH CHECK (true);

-- Allow admins to manage requests
CREATE POLICY "Allow authenticated users to manage account requests designers"
ON account_requests_designers FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 4. Move existing onboarding requests from applicants to account_requests_designers
-- We identify them by having no whatsapp (or placeholder 'EMPTY'/'') and position 'Designer'
INSERT INTO account_requests_designers (id, first_name, last_name, email, created_at, status)
SELECT id, first_name, last_name, email, created_at, status
FROM applicants
WHERE position = 'Designer' AND (whatsapp = '' OR whatsapp = 'EMPTY' OR whatsapp IS NULL);

-- 5. Delete moved records from original applicants table
DELETE FROM applicants
WHERE position = 'Designer' AND (whatsapp = '' OR whatsapp = 'EMPTY' OR whatsapp IS NULL);
