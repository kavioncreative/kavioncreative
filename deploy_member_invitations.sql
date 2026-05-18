-- ============================================
-- NOVA DESIGN SYSTEM - MEMBER INVITATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS member_invitations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL,
    role text NOT NULL,
    status text DEFAULT 'pending',
    created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE member_invitations ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Allow read access for member_invitations" ON member_invitations;
CREATE POLICY "Allow read access for member_invitations"
ON member_invitations FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Allow insert access for member_invitations" ON member_invitations;
CREATE POLICY "Allow insert access for member_invitations"
ON member_invitations FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update access for member_invitations" ON member_invitations;
CREATE POLICY "Allow update access for member_invitations"
ON member_invitations FOR UPDATE
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Allow delete access for member_invitations" ON member_invitations;
CREATE POLICY "Allow delete access for member_invitations"
ON member_invitations FOR DELETE
TO authenticated
USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_member_invitations_email ON member_invitations(email);
CREATE INDEX IF NOT EXISTS idx_member_invitations_status ON member_invitations(status);
