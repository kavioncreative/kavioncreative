-- ============================================
-- CODESLOGIC - DEPLOYMENT SCRIPT
-- ============================================
-- This script sets up the entire database schema for CodesLogic.
-- It is designed for a fresh Supabase instance or to update an existing one idempotently.
-- ============================================

-- 0. Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- 1. DATABASE TABLES
-- ============================================

-- 1.1 Accounts Table
CREATE TABLE IF NOT EXISTS accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  prefix text,
  display_prefix text UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- 1.2 Projects Table
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id text UNIQUE NOT NULL,
  action_move text NOT NULL,
  project_title text,
  account text, -- Legacy text field? Kept for compatibility.
  account_id uuid REFERENCES accounts(id), -- Linked account
  client_type text,
  client_name text,
  previous_logo_no text,
  items_sold jsonb,
  addons jsonb,
  medium text,
  price numeric,
  designer_fee numeric, -- Calculated fee
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

-- 1.3 Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  reference_id text,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 1.4 Project Comments Table
CREATE TABLE IF NOT EXISTS project_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id text REFERENCES projects(project_id) ON DELETE CASCADE,
  content text NOT NULL,
  attachments jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- 1.5 Platform Commissions
CREATE TABLE IF NOT EXISTS platform_commissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    platform_name text NOT NULL,
    commission_percentage numeric NOT NULL, -- Stored as decimal factor (e.g. 0.20 for 20%)
    clearance_days int NOT NULL
);

-- 1.6 Platform Commission Accounts (Join Table)
CREATE TABLE IF NOT EXISTS platform_commission_accounts (
    platform_commission_id uuid REFERENCES platform_commissions(id) ON DELETE CASCADE,
    account_id uuid REFERENCES accounts(id) ON DELETE CASCADE,
    PRIMARY KEY (platform_commission_id, account_id)
);

-- 1.7 Pricing Slabs
CREATE TABLE IF NOT EXISTS pricing_slabs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slab_name text NOT NULL,
    min_price numeric NOT NULL,
    max_price numeric NOT NULL,
    freelancer_percentage numeric NOT NULL, -- Stored as percentage (e.g. 70 for 70%)
    created_at timestamptz DEFAULT now()
);

-- ============================================
-- 2. ROW LEVEL SECURITY (RLS) & POLICIES
-- ============================================

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

-- ============================================
-- 3. INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_projects_project_id ON projects(project_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at);

CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

CREATE INDEX IF NOT EXISTS idx_project_comments_project_id ON project_comments(project_id);
CREATE INDEX IF NOT EXISTS idx_project_comments_created_at ON project_comments(created_at DESC);

-- ============================================
-- 4. FUNCTIONS & TRIGGERS
-- ============================================

-- 4.1 Check Slab Overlap Function
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

-- 4.2 Calculate Project Designer Fee Function
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

  -- fetch commission with SECURITY DEFINER (Bypasses RLS)
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

-- 4.3 Trigger for Designer Fee
DROP TRIGGER IF EXISTS trg_calculate_designer_fee ON projects;
CREATE TRIGGER trg_calculate_designer_fee
BEFORE INSERT ON projects
FOR EACH ROW
EXECUTE FUNCTION calculate_project_designer_fee();

-- ============================================
-- SCHEMA DEPLOYMENT COMPLETE
-- ============================================
