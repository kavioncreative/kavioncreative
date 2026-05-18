-- ============================================
-- TEAMS MANAGEMENT SCHEMA
-- ============================================

-- 1. Create Teams Table
CREATE TABLE IF NOT EXISTS teams (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 2. Create Team Members Join Table (Links Teams to Profiles/Users)
CREATE TABLE IF NOT EXISTS team_members (
    team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
    member_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    PRIMARY KEY (team_id, member_id)
);

-- 3. Create Team Accounts Join Table (Links Teams to Accounts)
CREATE TABLE IF NOT EXISTS team_accounts (
    team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
    account_id uuid REFERENCES accounts(id) ON DELETE CASCADE,
    PRIMARY KEY (team_id, account_id)
);

-- 4. Enable RLS
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_accounts ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS Policies
DROP POLICY IF EXISTS "Allow all access for authenticated users to teams" ON teams;
CREATE POLICY "Allow all access for authenticated users to teams" ON teams 
FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access for authenticated users to team_members" ON team_members;
CREATE POLICY "Allow all access for authenticated users to team_members" ON team_members 
FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access for authenticated users to team_accounts" ON team_accounts;
CREATE POLICY "Allow all access for authenticated users to team_accounts" ON team_accounts 
FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. Create Indexes
CREATE INDEX IF NOT EXISTS idx_teams_name ON teams(name);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_member_id ON team_members(member_id);
CREATE INDEX IF NOT EXISTS idx_team_accounts_team_id ON team_accounts(team_id);
CREATE INDEX IF NOT EXISTS idx_team_accounts_account_id ON team_accounts(account_id);
