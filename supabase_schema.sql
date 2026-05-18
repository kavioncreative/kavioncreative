-- ============================================
-- CODESLOGIC - DATABASE SCHEMA
-- ============================================
-- This file contains the complete database schema
-- Run this ONLY ONCE during initial setup
-- For updates, use DROP POLICY IF EXISTS before CREATE POLICY
-- ============================================

-- 1. Create the projects table
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id text UNIQUE NOT NULL,
  action_move text NOT NULL,
  project_title text,
  account text,
  client_type text,
  client_name text,
  previous_logo_no text,
  items_sold jsonb,
  addons jsonb,
  medium text,
  price numeric,
  brief text,
  attachments jsonb,
  due_date date,
  due_time time,
  assignee text,
  removal_reason text,
  cancellation_reason text,
  tips_given boolean,
  tip_amount numeric,
  status text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Enable Row Level Security (RLS) on projects
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies for projects (with DROP IF EXISTS for idempotency)
DROP POLICY IF EXISTS "Allow read access for authenticated users" ON projects;
CREATE POLICY "Allow read access for authenticated users"
ON projects FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Allow insert access for authenticated users" ON projects;
CREATE POLICY "Allow insert access for authenticated users"
ON projects FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update access for authenticated users" ON projects;
CREATE POLICY "Allow update access for authenticated users"
ON projects FOR UPDATE
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Allow delete access for authenticated users" ON projects;
CREATE POLICY "Allow delete access for authenticated users"
ON projects FOR DELETE
TO authenticated
USING (true);

-- 4. Create Indexes for projects
CREATE INDEX IF NOT EXISTS idx_projects_project_id ON projects(project_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at);

-- 5. Create Accounts Table
CREATE TABLE IF NOT EXISTS accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  prefix text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read access for accounts" ON accounts;
CREATE POLICY "Allow read access for accounts"
ON accounts FOR SELECT
TO authenticated
USING (true);

-- 6. Create Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  reference_id text,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read access for notifications" ON notifications;
CREATE POLICY "Allow read access for notifications"
ON notifications FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Allow insert access for notifications" ON notifications;
CREATE POLICY "Allow insert access for notifications"
ON notifications FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update access for notifications" ON notifications;
CREATE POLICY "Allow update access for notifications"
ON notifications FOR UPDATE
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Allow delete access for notifications" ON notifications;
CREATE POLICY "Allow delete access for notifications"
ON notifications FOR DELETE
TO authenticated
USING (true);

-- 7. Create Indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- 8. Create Project Comments Table
CREATE TABLE IF NOT EXISTS project_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id text REFERENCES projects(project_id) ON DELETE CASCADE,
  content text NOT NULL,
  author_name text,
  author_role text,
  attachments jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE project_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read access for project_comments" ON project_comments;
CREATE POLICY "Allow read access for project_comments"
ON project_comments FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Allow insert access for project_comments" ON project_comments;
CREATE POLICY "Allow insert access for project_comments"
ON project_comments FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete access for project_comments" ON project_comments;
CREATE POLICY "Allow delete access for project_comments"
ON project_comments FOR DELETE
TO authenticated
USING (true);

CREATE INDEX IF NOT EXISTS idx_project_comments_project_id ON project_comments(project_id);
CREATE INDEX IF NOT EXISTS idx_project_comments_created_at ON project_comments(created_at DESC);

-- 9. Create Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  name text,
  role text,
  status text DEFAULT 'Pending',
  phone text,
  payment_email text,
  cnic_front_url text,
  cnic_back_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 10. Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 11. Create RLS Policies for profiles
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON profiles;
CREATE POLICY "Enable all access for authenticated users"
ON profiles FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 12. Create Member Invitations Table
CREATE TABLE IF NOT EXISTS member_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  role text NOT NULL,
  status text DEFAULT 'pending',
  invited_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- 13. Enable RLS on member_invitations
ALTER TABLE member_invitations ENABLE ROW LEVEL SECURITY;

-- 14. Create RLS Policies for member_invitations
DROP POLICY IF EXISTS "Allow all access for authenticated users" ON member_invitations;
CREATE POLICY "Allow all access for authenticated users"
ON member_invitations FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- ============================================
-- SCHEMA COMPLETE
-- ============================================
-- All tables, policies, and indexes are now set up
-- The schema is idempotent and can be re-run safely
-- ============================================

-- ============================================
-- BILLING ENGINE SCHEMA (STRICT BUSINESS LOGIC)
-- ============================================

-- A) DATABASE TABLES

-- 1. Accounts (Enhancement)
-- Ensuring strict adherence to: id, name, display_prefix
ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS display_prefix text UNIQUE;

-- 2. Platform Commissions
CREATE TABLE IF NOT EXISTS platform_commissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    platform_name text NOT NULL,
    commission_percentage numeric NOT NULL, -- Stored as decimal factor (e.g. 0.20 for 20%) per locked formula
    clearance_days int NOT NULL
);

-- 3. Platform Commission Accounts (Join Table)
CREATE TABLE IF NOT EXISTS platform_commission_accounts (
    platform_commission_id uuid REFERENCES platform_commissions(id) ON DELETE CASCADE,
    account_id uuid REFERENCES accounts(id) ON DELETE CASCADE,
    PRIMARY KEY (platform_commission_id, account_id)
);

-- 4. Pricing Slabs
CREATE TABLE IF NOT EXISTS pricing_slabs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slab_name text NOT NULL,
    min_price numeric NOT NULL,
    max_price numeric NOT NULL,
    freelancer_percentage numeric NOT NULL, -- Stored as percentage (e.g. 70 for 70%) per locked formula
    created_at timestamptz DEFAULT now()
);

-- Data Safety: Prevent Overlapping Slabs
CREATE OR REPLACE FUNCTION check_slab_overlap()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pricing_slabs
    WHERE id <> NEW.id
      AND (
        (NEW.min_price BETWEEN min_price AND max_price) OR
        (NEW.max_price BETWEEN min_price AND max_price) OR
        (min_price BETWEEN NEW.min_price AND NEW.max_price)
      )
  ) THEN
    RAISE EXCEPTION 'Overlapping pricing slab detected. Ensure strict price ranges.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_slab_overlap ON pricing_slabs;
CREATE TRIGGER trg_check_slab_overlap
BEFORE INSERT OR UPDATE ON pricing_slabs
FOR EACH ROW EXECUTE FUNCTION check_slab_overlap();

-- 5. Projects (Enhancement)
-- Modify existing table to support strict billing columns
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES accounts(id),
ADD COLUMN IF NOT EXISTS designer_fee numeric;


-- ============================================
-- FINAL PRODUCTION SETUP
-- ============================================

-- 1. ENSURE POLICIES EXIST (Idempotent)
ALTER TABLE platform_commission_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Access Commission Accounts" ON platform_commission_accounts;
CREATE POLICY "Access Commission Accounts" ON platform_commission_accounts FOR ALL TO authenticated USING (true);

ALTER TABLE platform_commissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Access Commissions" ON platform_commissions;
CREATE POLICY "Access Commissions" ON platform_commissions FOR ALL TO authenticated USING (true);

-- 2. CALCULATION FUNCTION WITH ADMIN PRIVILEGES
CREATE OR REPLACE FUNCTION calculate_project_designer_fee()
RETURNS TRIGGER AS $$
DECLARE
  v_commission_val numeric := 0;
  v_commission_factor numeric := 0;
  v_net_amount numeric;
  v_slab_freelancer_pct numeric;
  v_slab_count int;
BEGIN
  -- VALIDATION
  IF NEW.price IS NULL THEN RAISE EXCEPTION 'Price cannot be NULL'; END IF;
  IF NEW.account_id IS NULL THEN RAISE EXCEPTION 'Account cannot be NULL'; END IF;

  -- Fetch commission via join table
  SELECT pc.commission_percentage
  INTO v_commission_val
  FROM platform_commissions pc
  JOIN platform_commission_accounts pca ON pc.id = pca.platform_commission_id
  WHERE pca.account_id = NEW.account_id
  LIMIT 1;

  -- Default to 0 if no commission found
  IF v_commission_val IS NULL THEN
    v_commission_val := 0;
  END IF;

  -- NORMALIZE (Handle 0.2 vs 20)
  IF v_commission_val > 1 THEN
    v_commission_factor := v_commission_val / 100.0;
  ELSE
    v_commission_factor := v_commission_val;
  END IF;

  -- CALCULATION
  v_net_amount := NEW.price - (NEW.price * v_commission_factor);

  -- SLAB SELECTION
  SELECT freelancer_percentage, COUNT(*) OVER()
  INTO v_slab_freelancer_pct, v_slab_count
  FROM pricing_slabs
  WHERE NEW.price >= min_price AND NEW.price <= max_price;

  -- Check Slabs
  IF v_slab_count IS NULL OR v_slab_count = 0 THEN
    RAISE EXCEPTION 'No pricing slab for %', NEW.price;
  ELSIF v_slab_count > 1 THEN
    RAISE EXCEPTION 'Multiple slabs for %', NEW.price;
  END IF;

  NEW.designer_fee := v_net_amount * (v_slab_freelancer_pct / 100.0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. TRIGGER SETUP
DROP TRIGGER IF EXISTS trg_calculate_designer_fee ON projects;
CREATE TRIGGER trg_calculate_designer_fee
BEFORE INSERT ON projects
FOR EACH ROW
EXECUTE FUNCTION calculate_project_designer_fee();
