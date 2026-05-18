
-- Fix missing write policies on user_account_access and role_permissions.
-- Previously only SELECT was allowed; INSERT and DELETE were blocked by RLS.

-- ── user_account_access ─────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Allow insert for authenticated users" ON user_account_access;
CREATE POLICY "Allow insert for authenticated users"
  ON user_account_access
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete for authenticated users" ON user_account_access;
CREATE POLICY "Allow delete for authenticated users"
  ON user_account_access
  FOR DELETE
  TO authenticated
  USING (true);

-- ── role_permissions ─────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Allow insert for authenticated users" ON role_permissions;
CREATE POLICY "Allow insert for authenticated users"
  ON role_permissions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete for authenticated users" ON role_permissions;
CREATE POLICY "Allow delete for authenticated users"
  ON role_permissions
  FOR DELETE
  TO authenticated
  USING (true);
