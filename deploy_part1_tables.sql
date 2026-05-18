-- PART 1: TABLES (Modified)
-- Removed 'CREATE EXTENSION' which can cause UI errors in some self-hosted versions.
-- Try running this. If it fails on 'gen_random_uuid', then we know we need the extension.

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
  account text, 
  account_id uuid REFERENCES accounts(id),
  client_type text,
  client_name text,
  previous_logo_no text,
  items_sold jsonb,
  addons jsonb,
  medium text,
  price numeric,
  designer_fee numeric,
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
    commission_percentage numeric NOT NULL,
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
    freelancer_percentage numeric NOT NULL,
    created_at timestamptz DEFAULT now()
);
