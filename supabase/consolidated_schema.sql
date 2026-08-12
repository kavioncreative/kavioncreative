-- ========================================================
-- CODESLOGIC CONSOLIDATED DATABASE SCHEMA
-- Generated on: 2026-08-12T06:25:43.529Z
-- Use this script to set up a fresh Supabase database instance.
-- ========================================================

-- 0. ENABLE EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================================
-- 1. BASELINE SCHEMA (supabase_schema.sql)
-- ========================================================

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


-- ========================================================
-- 2. COLUMN UPGRADES (ALTER TABLE STATEMENTS)
-- ========================================================

-- add daily capacity to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS daily_capacity INT DEFAULT 5;

-- --- START OF add_project_management_columns.sql ---
-- Add Project Management Columns to Projects Table
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS primary_manager_id uuid REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS collaborators jsonb DEFAULT '[]'::jsonb;

-- Update RLS policies to ensure these columns can be read/written
-- (Existing policies are already quite broad, but this is for completeness)

-- --- END OF add_project_management_columns.sql ---

-- --- START OF add_alert_columns.sql ---
-- Add alert columns to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS has_art_help BOOLEAN DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS has_dispute BOOLEAN DEFAULT false;

-- --- END OF add_alert_columns.sql ---

-- --- START OF add_options_required_column.sql ---
-- Add 'options_required' column to 'projects' table
-- This column stores the number of options (1-20) required for a project brief as an integer.

ALTER TABLE projects
ADD COLUMN options_required INT DEFAULT NULL;

-- Optional Comment for table documentation
COMMENT ON COLUMN projects.options_required IS 'Number of options required for the project brief (1-20)';

-- --- END OF add_options_required_column.sql ---

-- --- START OF add_payment_method_column.sql ---
-- Add preferred_payment_method column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS preferred_payment_method text;

-- --- END OF add_payment_method_column.sql ---

-- --- START OF add_user_id_to_notifications.sql ---
-- Add user_id to notifications for targeted delivery
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- --- END OF add_user_id_to_notifications.sql ---

-- ========================================================
-- 3. EXTRA SYSTEM TABLES
-- ========================================================

-- --- START OF create_leads_table.sql (leads & lead_comments) ---
-- Create leads table
CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name text NOT NULL,
  project_title text,
  client_type text NOT NULL DEFAULT 'New', -- 'New' or 'Repeat'
  status text NOT NULL DEFAULT 'New',
  initial_message text,
  message_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Create policies for leads
DROP POLICY IF EXISTS "Allow all access for leads" ON leads;
CREATE POLICY "Allow all access for leads"
ON leads FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Create lead_comments table
CREATE TABLE IF NOT EXISTS lead_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  content text NOT NULL,
  author_name text,
  author_role text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE lead_comments ENABLE ROW LEVEL SECURITY;

-- Create policies for lead_comments
DROP POLICY IF EXISTS "Allow all access for lead_comments" ON lead_comments;
CREATE POLICY "Allow all access for lead_comments"
ON lead_comments FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_comments_lead_id ON lead_comments(lead_id);

-- --- END OF create_leads_table.sql ---

-- --- START OF create_teams_table.sql (teams, team_members, team_accounts) ---
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

-- --- END OF create_teams_table.sql ---

-- --- START OF create_reminders_table.sql (reminders) ---

-- Create reminders table
CREATE TABLE IF NOT EXISTS public.reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('refresher', 'task')),
    recurrence_type TEXT NOT NULL,
    recurrence_data JSONB NOT NULL,
    time TIME NOT NULL,
    project_managers UUID[] DEFAULT '{}',
    message TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all actions for authenticated users on their own reminders
-- (For now, we'll allow all authenticated users to see/manage all reminders or just their own?)
-- Typically system-wide reminders might need different policies, but we'll start with per-user.
CREATE POLICY "Users can manage their own reminders" ON public.reminders
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_reminders_updated_at
    BEFORE UPDATE ON public.reminders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- --- END OF create_reminders_table.sql ---

-- --- START OF create_reminder_responses.sql (reminder_responses) ---

-- Create reminder_responses table
CREATE TABLE IF NOT EXISTS public.reminder_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reminder_id UUID REFERENCES public.reminders(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    message TEXT,
    file_urls TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.reminder_responses ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can create responses" ON public.reminder_responses
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own responses" ON public.reminder_responses
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

-- Storage for reminder files
-- We assume a bucket named 'reminders' exists or we'll use a generic one
-- For now, let's just make sure the table exists.

-- --- END OF create_reminder_responses.sql ---

-- --- START OF create_channels_system.sql (channels, channel_members, channel_messages) ---
-- 1. Create Channels Table
CREATE TABLE IF NOT EXISTS public.channels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    created_by UUID REFERENCES auth.users(id),
    is_private BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Create Channel Members Table (For permissions and user selection)
CREATE TABLE IF NOT EXISTS public.channel_members (
    channel_id UUID REFERENCES public.channels(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (channel_id, user_id)
);

-- 3. Create Channel Messages Table (The Inbox)
CREATE TABLE IF NOT EXISTS public.channel_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id UUID REFERENCES public.channels(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- NULL if system/bot message
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb, -- To store MCC specific data (job number, counters)
    is_system_message BOOLEAN DEFAULT false, -- True for MCC bot alerts
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Row Level Security (RLS)
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_messages ENABLE ROW LEVEL SECURITY;

-- Basic Policies (You can adjust these later based on your roles)
CREATE POLICY "Enable read access for all authenticated users" ON public.channels FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert for authenticated users" ON public.channels FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable read access for all authenticated users" ON public.channel_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert for authenticated users" ON public.channel_messages FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable read access for all authenticated users" ON public.channel_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert for authenticated users" ON public.channel_members FOR INSERT TO authenticated WITH CHECK (true);

-- --- END OF create_channels_system.sql ---

-- --- START OF deploy_roles.sql (roles) ---
-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Insert default roles
INSERT INTO roles (name, description) VALUES
  ('Super Admin', 'Owner access to all systems and destructive operations'),
  ('Admin', 'Full access to all system features'),
  ('Project Manager', 'Manage projects, timelines, and resources'),
  ('Freelancer', 'External contributor working on assigned tasks'),
  ('Presentation Designer', 'Specialized in creating presentation designs'),
  ('Finance Manager', 'Manage financial records, invoices, and payments'),
  ('ORM Manager', 'Manage online reputation, reviews, and public perception'),
  ('Project Operations Manager', 'Oversee project workflows, operational efficiency, and delivery standards')
ON CONFLICT (name) DO NOTHING;

-- --- END OF deploy_roles.sql ---

-- --- START OF deploy_webhooks.sql (webhooks) ---
-- =============================================
-- Webhooks Table Schema
-- =============================================
-- This script creates the webhooks table and related policies
-- for storing webhook configurations in Supabase

-- Drop existing table if needed (uncomment for fresh start)
-- DROP TABLE IF EXISTS public.webhooks CASCADE;

-- Create webhooks table
CREATE TABLE IF NOT EXISTS public.webhooks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Webhook details
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    secret TEXT,
    icon TEXT DEFAULT 'Default',
    
    -- Trigger events (stored as JSONB for flexibility)
    events JSONB DEFAULT '{
        "projectCreated": true,
        "statusChanged": false,
        "commentAdded": false,
        "fileUploaded": false
    }'::jsonb,
    
    -- Status tracking
    is_active BOOLEAN DEFAULT true,
    last_triggered_at TIMESTAMP WITH TIME ZONE,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    
    -- Optional metadata
    description TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Constraints
    CONSTRAINT webhooks_name_check CHECK (char_length(name) > 0),
    CONSTRAINT webhooks_url_check CHECK (char_length(url) > 0)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_webhooks_created_at ON public.webhooks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhooks_is_active ON public.webhooks(is_active);
CREATE INDEX IF NOT EXISTS idx_webhooks_created_by ON public.webhooks(created_by);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_webhooks_updated_at ON public.webhooks;
CREATE TRIGGER update_webhooks_updated_at
    BEFORE UPDATE ON public.webhooks
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- Row Level Security (RLS) Policies
-- =============================================

-- Enable RLS
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to view all webhooks
CREATE POLICY "Allow authenticated users to view webhooks"
    ON public.webhooks
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy: Allow authenticated users to insert webhooks
CREATE POLICY "Allow authenticated users to create webhooks"
    ON public.webhooks
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Policy: Allow users to update their own webhooks or all if admin
CREATE POLICY "Allow users to update webhooks"
    ON public.webhooks
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Policy: Allow users to delete their own webhooks or all if admin
CREATE POLICY "Allow users to delete webhooks"
    ON public.webhooks
    FOR DELETE
    TO authenticated
    USING (true);

-- =============================================
-- Helper Functions
-- =============================================

-- Function to increment success count
CREATE OR REPLACE FUNCTION public.increment_webhook_success(webhook_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE public.webhooks
    SET 
        success_count = success_count + 1,
        last_triggered_at = timezone('utc'::text, now())
    WHERE id = webhook_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment failure count
CREATE OR REPLACE FUNCTION public.increment_webhook_failure(webhook_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE public.webhooks
    SET 
        failure_count = failure_count + 1,
        last_triggered_at = timezone('utc'::text, now())
    WHERE id = webhook_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get active webhooks for a specific event
CREATE OR REPLACE FUNCTION public.get_webhooks_for_event(event_name TEXT)
RETURNS TABLE (
    id UUID,
    name TEXT,
    url TEXT,
    secret TEXT,
    icon TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        w.id,
        w.name,
        w.url,
        w.secret,
        w.icon
    FROM public.webhooks w
    WHERE 
        w.is_active = true
        AND w.events->event_name = 'true'::jsonb;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Sample Data (Optional - for testing)
-- =============================================

-- Uncomment to insert sample webhook
/*
INSERT INTO public.webhooks (name, url, secret, icon, events, description)
VALUES (
    'Production Deployment Hook',
    'https://n8n.example.com/webhook/deployment',
    'whsec_example123',
    'N8N',
    '{
        "projectCreated": true,
        "statusChanged": true,
        "commentAdded": false,
        "fileUploaded": false
    }'::jsonb,
    'Triggers on project creation and status changes'
);
*/

-- =============================================
-- Verification Queries
-- =============================================

-- Check if table was created successfully
-- SELECT * FROM public.webhooks LIMIT 10;

-- Check RLS policies
-- SELECT * FROM pg_policies WHERE tablename = 'webhooks';

-- Check indexes
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'webhooks';

-- --- END OF deploy_webhooks.sql ---

-- --- START OF add_labels_column.sql (add labels to webhooks) ---
ALTER TABLE public.webhooks ADD COLUMN IF NOT EXISTS labels TEXT[] DEFAULT '{}';

-- --- END OF add_labels_column.sql ---

-- --- START OF project_reviews ---
-- Create project_reviews table
CREATE TABLE IF NOT EXISTS public.project_reviews (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id text NOT NULL REFERENCES public.projects(project_id) ON DELETE CASCADE,
    reviewer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewer_name text,
    reviewer_role text,
    reviewee_name text,
    rating numeric NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text text,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.project_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read access for authenticated users on project_reviews" ON public.project_reviews;
CREATE POLICY "Allow read access for authenticated users on project_reviews" 
ON public.project_reviews FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow insert for authenticated users on project_reviews" ON public.project_reviews;
CREATE POLICY "Allow insert for authenticated users on project_reviews" 
ON public.project_reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = reviewer_id);

CREATE INDEX IF NOT EXISTS idx_project_reviews_project_id ON public.project_reviews(project_id);
CREATE INDEX IF NOT EXISTS idx_project_reviews_reviewer_id ON public.project_reviews(reviewer_id);
-- --- END OF project_reviews ---

-- ========================================================
-- 4. CHRONOLOGICAL MIGRATIONS
-- ========================================================

-- --- MIGRATION 1: 20260107015446_add_is_active_to_pricing_slabs.sql ---
alter table "public"."pricing_slabs" add column "is_active" boolean not null default false;

-- Create index for faster lookups
create index if not exists idx_pricing_slabs_is_active on "public"."pricing_slabs" using btree ("is_active");

-- Function to ensure mutually exclusive is_active
CREATE OR REPLACE FUNCTION public.enforce_single_active_slab()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = true THEN
    UPDATE public.pricing_slabs
    SET is_active = false
    WHERE id <> NEW.id AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
DROP TRIGGER IF EXISTS trigger_enforce_single_active_slab ON public.pricing_slabs;
CREATE TRIGGER trigger_enforce_single_active_slab
BEFORE INSERT OR UPDATE OF is_active ON public.pricing_slabs
FOR EACH ROW
WHEN (NEW.is_active = true)
EXECUTE FUNCTION public.enforce_single_active_slab();

-- -----------------------------------------------------

-- --- MIGRATION 2: 20260107020000_allow_multiple_active_slabs.sql ---
-- Remove trigger and function that enforced single active slab
DROP TRIGGER IF EXISTS trigger_enforce_single_active_slab ON public.pricing_slabs;
DROP FUNCTION IF EXISTS public.enforce_single_active_slab;

-- -----------------------------------------------------

-- --- MIGRATION 3: 20260215000000_add_converted_by.sql ---
-- Add converted_by column to projects table
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS converted_by text;

-- -----------------------------------------------------

-- --- MIGRATION 4: 20260215032249_add_logo_url_to_platform_commissions.sql ---
ALTER TABLE platform_commissions ADD COLUMN IF NOT EXISTS logo_url text;

-- -----------------------------------------------------

-- --- MIGRATION 5: 20260216000000_create_tasks_table.sql ---

-- SQL to create the tasks table in Supabase
-- Run this in the Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'In Progress' CHECK (status IN ('In Progress', 'Completed')),
    deadline_date DATE NOT NULL,
    deadline_time TIME NOT NULL,
    assignee_id UUID REFERENCES public.profiles(id),
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow individual read access" ON public.tasks FOR SELECT USING (true);
CREATE POLICY "Allow individual insert access" ON public.tasks FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow individual update access" ON public.tasks FOR UPDATE USING (true);
CREATE POLICY "Allow individual delete access" ON public.tasks FOR DELETE USING (true);

-- -----------------------------------------------------

-- --- MIGRATION 6: 20260216000001_add_task_id_to_comments.sql ---

-- SQL to add task_id support to project_comments
-- This allows comments to be linked to either projects or tasks

ALTER TABLE public.project_comments 
ADD COLUMN IF NOT EXISTS task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE;

-- Also add an index for performance when fetching task comments
CREATE INDEX IF NOT EXISTS idx_project_comments_task_id ON public.project_comments(task_id);

-- -----------------------------------------------------

-- --- MIGRATION 7: 20260217000000_add_first_last_name_to_profiles.sql ---
-- Add first_name and last_name columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Update existing profiles by attempting to split the name field if first_name is null
UPDATE public.profiles
SET 
    first_name = split_part(name, ' ', 1),
    last_name = CASE 
        WHEN position(' ' in trim(name)) > 0 
        THEN substring(trim(name) from position(' ' in trim(name)) + 1)
        ELSE ''
    END
WHERE first_name IS NULL OR first_name = '';

-- -----------------------------------------------------

-- --- MIGRATION 8: 20260217000001_enforce_active_status_security.sql ---
-- Secure Role/Status Access Control
-- This script ensures that ONLY active users can interact with the system data.
-- Deactivated or Pending users will be blocked at the database level.

-- 1. Create a helper function to check if the current user is active
CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND status = 'Active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update Projects Policies
DROP POLICY IF EXISTS "Allow read access for authenticated users" ON projects;
CREATE POLICY "Allow read access for authenticated users"
ON projects FOR SELECT
TO authenticated
USING (is_active_user());

DROP POLICY IF EXISTS "Allow insert access for authenticated users" ON projects;
CREATE POLICY "Allow insert access for authenticated users"
ON projects FOR INSERT
TO authenticated
WITH CHECK (is_active_user());

DROP POLICY IF EXISTS "Allow update access for authenticated users" ON projects;
CREATE POLICY "Allow update access for authenticated users"
ON projects FOR UPDATE
TO authenticated
USING (is_active_user());

-- 3. Update Accounts Policies
DROP POLICY IF EXISTS "Allow read access for accounts" ON accounts;
CREATE POLICY "Allow read access for accounts"
ON accounts FOR SELECT
TO authenticated
USING (is_active_user());

-- 4. Update Tasks Policies (if exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'tasks') THEN
        DROP POLICY IF EXISTS "Users can view their assigned tasks" ON tasks;
        CREATE POLICY "Users can view their assigned tasks" ON tasks FOR SELECT TO authenticated USING (is_active_user());
        
        DROP POLICY IF EXISTS "Users can update their tasks" ON tasks;
        CREATE POLICY "Users can update their tasks" ON tasks FOR UPDATE TO authenticated USING (is_active_user());
    END IF;
END $$;

-- 5. Profile Policy (Critical: User MUST be able to read their own profile to see they are deactivated)
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- But updates to profile should only be allowed if active (except for initial setup)
CREATE POLICY "Users can update own profile if active"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id AND (status = 'Active' OR status = 'Invited'))
WITH CHECK (auth.uid() = id);

-- 6. Notifications
DROP POLICY IF EXISTS "Allow read access for notifications" ON notifications;
CREATE POLICY "Allow read access for notifications"
ON notifications FOR SELECT
TO authenticated
USING (is_active_user());

-- 7. Platform Data
DROP POLICY IF EXISTS "Access Commissions" ON platform_commissions;
CREATE POLICY "Access Commissions" ON platform_commissions FOR SELECT TO authenticated USING (is_active_user());

-- -----------------------------------------------------

-- --- MIGRATION 9: 20260217000002_fix_admin_visibility.sql ---
-- 🔒 SECURITY ENFORCEMENT FIX: ADMIN VISIBILITY & ACTIVE STATUS
-- This script fixes the "missing users" issue while maintaining strict security for deactivated accounts.

-- 1. Helper Function: Is the user an Active Admin?
CREATE OR REPLACE FUNCTION public.is_active_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND status = 'Active'
    AND lower(role) = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update Profiles Policy (Fix for the Users Table)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- Users can ALWAYS see their own profile (even if deactivated)
-- Admins can see ALL profiles if they are Active
CREATE POLICY "View Profiles"
ON profiles FOR SELECT
TO authenticated
USING (
  (auth.uid() = id) OR (is_active_admin())
);

-- 3. Update Other Policies to allow Active Admins or Active Users
-- (Projects, Accounts, etc. usually require the user to be Active regardless of role)

DROP POLICY IF EXISTS "Allow read access for authenticated users" ON projects;
CREATE POLICY "Allow read access for authenticated users"
ON projects FOR SELECT
TO authenticated
USING (is_active_user() OR is_active_admin());

DROP POLICY IF EXISTS "Allow read access for accounts" ON accounts;
CREATE POLICY "Allow read access for accounts"
ON accounts FOR SELECT
TO authenticated
USING (is_active_user() OR is_active_admin());

-- 4. Ensure invitations are visible to admins
DROP POLICY IF EXISTS "Allow all access for authenticated users" ON member_invitations;
CREATE POLICY "Admins can manage invitations"
ON member_invitations FOR ALL
TO authenticated
USING (is_active_admin())
WITH CHECK (is_active_admin());

-- 5. Final check on is_active_user
-- (It already works, but we make sure it represents anyone who is allowed to use system data)

-- -----------------------------------------------------

-- --- MIGRATION 10: 20260217000003_allow_admin_updates.sql ---
-- 🔒 SECURITY ENFORCEMENT FIX: ADMIN UPDATES & VISIBILITY
-- This script Fixes the "Deactivate Button" failing by allowing Active Admins to UPDATE profiles.

-- 1. Ensure the Helper Functions exist
CREATE OR REPLACE FUNCTION public.is_active_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND status = 'Active'
    AND lower(role) = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update Profiles Policies
-- Users can see themselves, Admins can see everyone
DROP POLICY IF EXISTS "View Profiles" ON profiles;
CREATE POLICY "View Profiles"
ON profiles FOR SELECT
TO authenticated
USING (
  (auth.uid() = id) OR (is_active_admin())
);

-- Admins can UPDATE profiles (needed for deactivation/role changes)
-- Users can update their own profile ONLY if they are Active or just Invited
DROP POLICY IF EXISTS "Users can update own profile if active" ON profiles;
DROP POLICY IF EXISTS "Manage Profiles" ON profiles;

CREATE POLICY "Manage Profiles"
ON profiles FOR UPDATE
TO authenticated
USING (
  (auth.uid() = id AND (status = 'Active' OR status = 'Invited')) -- User themselves
  OR (is_active_admin()) -- Active Admin
)
WITH CHECK (
  (auth.uid() = id) -- User can only update their own record in the "WITH CHECK" context if they are the owner
  OR (is_active_admin()) -- Admin can update anyone
);

-- 3. Delete access for Admins
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;
CREATE POLICY "Admins can delete profiles"
ON profiles FOR DELETE
TO authenticated
USING (is_active_admin());

-- -----------------------------------------------------

-- --- MIGRATION 11: 20260217000004_enable_realtime.sql ---
-- ⚡ ENABLE REAL-TIME FOR PROFILES
-- This ensures that changes to user statuses are broadcast immediately.

-- 1. Enable replication for the profiles table
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;

-- 2. Ensure invitations are also real-time (optional but recommended)
-- ALTER PUBLICATION supabase_realtime ADD TABLE member_invitations;

-- -----------------------------------------------------

-- --- MIGRATION 12: 20260217000005_allow_profile_insertion.sql ---
-- 🔒 SECURITY ENFORCEMENT FIX: PROFILE INSERTION
-- This script allows Active Admins to manually insert new members into the profiles table.
-- This is required because the "Add Member" flow performs a manual insert instead of relying on a trigger.

-- 1. Ensure the Helper Functions exist (redundant but safe for absolute consistency)
CREATE OR REPLACE FUNCTION public.is_active_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND status = 'Active'
    AND lower(role) = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Add INSERT policy for Admins
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
CREATE POLICY "Admins can insert profiles"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (is_active_admin());

-- 3. Also allow users to insert their own profile 
-- (This is a safety measure if they ever use a client-side sign-up flow directly)
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- -----------------------------------------------------

-- --- MIGRATION 13: 20260217000007_add_welcome_tracking_v2.sql ---
-- Add has_seen_welcome column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS has_seen_welcome BOOLEAN DEFAULT FALSE;

-- Ensure all current active admins have seen it to avoid annoying them
UPDATE public.profiles 
SET has_seen_welcome = TRUE 
WHERE status = 'Active' AND lower(role) = 'admin';

-- -----------------------------------------------------

-- --- MIGRATION 14: 20260218000000_create_forms_table.sql ---

-- Create forms table
CREATE TABLE IF NOT EXISTS forms (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    status text DEFAULT 'active',
    fields jsonb DEFAULT '[]'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE forms ENABLE ROW LEVEL SECURITY;

-- Create Policies
DROP POLICY IF EXISTS "Allow all access for authenticated users" ON forms;
CREATE POLICY "Allow all access for authenticated users"
ON forms FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_forms_updated_at
    BEFORE UPDATE ON forms
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- Create form_assignments table
CREATE TABLE IF NOT EXISTS form_assignments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id text NOT NULL,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    trigger_time text DEFAULT '09:00',
    frequency text DEFAULT 'daily',
    is_mandatory boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create form_logs table
CREATE TABLE IF NOT EXISTS form_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id uuid REFERENCES form_assignments(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    form_id text NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- -----------------------------------------------------

-- --- MIGRATION 15: 20260218000001_create_performance_metrics.sql ---
-- Create performance_metrics table
CREATE TABLE IF NOT EXISTS performance_metrics (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    date date NOT NULL,
    success_score numeric,
    rating numeric,
    ctr numeric,
    conversion_rate numeric,
    impressions integer,
    clicks integer,
    orders integer,
    cancelled_orders integer,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;

-- Create Policies
DROP POLICY IF EXISTS "Allow all access for authenticated users" ON performance_metrics;
CREATE POLICY "Allow all access for authenticated users"
ON performance_metrics FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- -----------------------------------------------------

-- --- MIGRATION 16: 20260218000002_add_account_id_to_performance_metrics.sql ---
ALTER TABLE performance_metrics ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES accounts(id);

-- -----------------------------------------------------

-- --- MIGRATION 17: 20260218000002_allow_profile_select.sql ---
-- 🔒 SECURITY FIX: Allow users to read their own profile
-- This policy is essential for the authentication flow to work correctly.
-- Without it, users cannot read their own profile data on login/refresh.

-- Allow users to SELECT their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Allow admins to SELECT all profiles (for user management)
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles"
ON profiles FOR SELECT
TO authenticated
USING (is_active_admin());

-- -----------------------------------------------------

-- --- MIGRATION 18: 20260222000001_permissions_system.sql ---

-- 1. Create permissions table to define available capabilities
CREATE TABLE IF NOT EXISTS permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL, -- e.g. 'view_projects', 'edit_finances'
  name text NOT NULL,
  category text NOT NULL, -- e.g. 'Projects', 'Finances', 'Users'
  description text,
  created_at timestamptz DEFAULT now()
);

-- 2. Create role_permissions table to map roles to capabilities
CREATE TABLE IF NOT EXISTS role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name text NOT NULL REFERENCES roles(name) ON DELETE CASCADE,
  permission_code text NOT NULL REFERENCES permissions(code) ON DELETE CASCADE,
  UNIQUE(role_name, permission_code)
);

-- 3. Create user_account_access for granular data scoping
CREATE TABLE IF NOT EXISTS user_account_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  UNIQUE(user_id, account_id)
);

-- 4. Enable RLS
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_account_access ENABLE ROW LEVEL SECURITY;

-- 5. Policies
DROP POLICY IF EXISTS "Allow read access for authenticated users" ON permissions;
CREATE POLICY "Allow read access for authenticated users" ON permissions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow read access for authenticated users" ON role_permissions;
CREATE POLICY "Allow read access for authenticated users" ON role_permissions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow read access for authenticated users" ON user_account_access;
CREATE POLICY "Allow read access for authenticated users" ON user_account_access FOR SELECT TO authenticated USING (true);

-- 6. Seed initial permissions
INSERT INTO permissions (code, name, category, description) VALUES
  ('view_dashboard', 'View Dashboard', 'General', 'Access to the main dashboard overview'),
  ('view_projects', 'View Projects', 'Projects', 'Ability to see the projects list'),
  ('create_projects', 'Create Projects', 'Projects', 'Ability to add new projects'),
  ('edit_projects', 'Edit Projects', 'Projects', 'Ability to modify project details'),
  ('delete_projects', 'Delete Projects', 'Projects', 'Ability to remove projects'),
  ('view_finances', 'View Finances', 'Finances', 'Access to financial records and stats'),
  ('manage_accounts', 'Manage Accounts', 'Accounts', 'Ability to add, edit, and delete accounts and their display prefixes.'),
  ('view_users', 'View Users', 'Users', 'Access to the users and teams directory'),
  ('manage_users', 'Manage Users', 'Users', 'Ability to invite and edit user roles'),
  ('view_analytics', 'View Analytics', 'Analytics', 'Access to Gig Stats and reports'),
  ('view_gig_stats', 'View Gig Stats', 'Analytics', 'Access to the Gig Stats tab in Analytics'),
  ('view_sales_analytics', 'View Sales Analytics', 'Analytics', 'Access to the Sales tab in Analytics'),
  ('view_company_earnings', 'View Company Earnings', 'Finances', 'Access to company profit and revenue reports'),
  ('view_freelancer_earnings', 'View Freelancer Earnings', 'Finances', 'Access to freelancer payout and earning records'),
  ('manage_finance_config', 'Manage Finance Config', 'Finances', 'Ability to edit commissions and pricing slabs'),
  ('access_chats', 'Access Chats', 'Communication', 'Access to internal chat system'),
  ('access_reminders', 'Access Reminders', 'Communication', 'Access to system reminders'),
  ('access_integrations', 'Access Integrations', 'System', 'Access to external platform settings')
ON CONFLICT (code) DO NOTHING;

-- 7. Default Role Mappings (Super Admin gets all)
INSERT INTO role_permissions (role_name, permission_code)
SELECT 'Super Admin', code FROM permissions
ON CONFLICT DO NOTHING;

-- Admin defaults (restricted per user request)
INSERT INTO role_permissions (role_name, permission_code)
SELECT 'Admin', code FROM permissions 
WHERE code NOT IN ('access_chats', 'access_reminders', 'access_integrations', 'access_channels', 'access_forms')
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------

-- --- MIGRATION 19: 20260222000002_fix_rls_write_policies.sql ---

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

-- -----------------------------------------------------

-- --- MIGRATION 20: 20260226000000_fix_user_deletion.sql ---

-- 🛡️ SECURITY & CLEANUP: FIX USER DELETION & INVITATIONS (SUPER ADMIN ONLY)
-- This migration ensures that only Super Admins can manage users or invitations.
-- It also preserves historical data by setting references to NULL instead of cascading deletions.

-- 1. Helper Function: Is the user an Active Admin or Super Admin? (For general management)
CREATE OR REPLACE FUNCTION public.is_active_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND status = 'Active'
    AND (lower(role) = 'admin' OR lower(role) = 'super admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Helper Function: Is the user a Super Admin? (For destructive/sensitive operations)
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND status = 'Active'
    AND lower(role) = 'super admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Complete User Deletion RPC (Super Admin Only)
CREATE OR REPLACE FUNCTION public.delete_user_entirely(target_user_id uuid)
RETURNS void AS $$
BEGIN
  -- Validation: Only Super Admins can perform this action
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Only Super Admins can delete users permanently';
  END IF;

  -- Validation: Prevent self-deletion
  IF auth.uid() = target_user_id THEN
    RAISE EXCEPTION 'You cannot delete your own account. Please contact another Super Admin.';
  END IF;

  -- Step A: Delete from public.profiles
  DELETE FROM public.profiles WHERE id = target_user_id;

  -- Step B: Delete from auth.users (removes them from Supabase entirely)
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Bulk User Deletion RPC (Super Admin Only)
CREATE OR REPLACE FUNCTION public.delete_users_bulk(target_user_ids uuid[])
RETURNS void AS $$
BEGIN
  -- Validation: Only Super Admins can perform this action
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Only Super Admins can delete users permanently';
  END IF;

  -- Step A: Delete from public.profiles
  DELETE FROM public.profiles WHERE id = ANY(target_user_ids) AND id != auth.uid();

  -- Step B: Delete from auth.users
  DELETE FROM auth.users WHERE id = ANY(target_user_ids) AND id != auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Profiles Table: Restrict DELETE to Super Admin Only
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;
DROP POLICY IF EXISTS "Super Admins can delete profiles" ON profiles;
CREATE POLICY "Super Admins can delete profiles"
ON profiles FOR DELETE
TO authenticated
USING (is_super_admin());

-- 6. Member Invitations Table: Restrict ALL access to Super Admin Only
DROP POLICY IF EXISTS "Admins can manage invitations" ON member_invitations;
DROP POLICY IF EXISTS "Admins can view and edit invitations" ON member_invitations;
DROP POLICY IF EXISTS "Super Admins can delete invitations" ON member_invitations;
DROP POLICY IF EXISTS "Super Admins can manage invitations" ON member_invitations;

CREATE POLICY "Super Admins can manage invitations"
ON member_invitations FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- 7. Permissions System Cleanup
DELETE FROM public.role_permissions 
WHERE role_name = 'Admin' 
AND permission_code IN (
    'delete_users', 
    'create_users', 
    'manage_users'
);

-- 8. Data Preservation & FK Updates (SET NULL)
-- This ensures that historical data remains intact when a user is deleted.
DO $$ 
DECLARE
    v_constr_name text;
BEGIN
    -- Fix form_logs (The current error point)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'form_logs') THEN
        ALTER TABLE public.form_logs ALTER COLUMN user_id DROP NOT NULL;
        
        SELECT constraint_name INTO v_constr_name
        FROM information_schema.key_column_usage
        WHERE table_name = 'form_logs' AND column_name = 'user_id'
        LIMIT 1;
        
        IF v_constr_name IS NOT NULL THEN
            EXECUTE format('ALTER TABLE public.form_logs DROP CONSTRAINT %I', v_constr_name);
        END IF;
        
        ALTER TABLE public.form_logs ADD CONSTRAINT form_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;

    -- Fix form_assignments
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'form_assignments') THEN
        ALTER TABLE public.form_assignments ALTER COLUMN user_id DROP NOT NULL;
        
        SELECT constraint_name INTO v_constr_name
        FROM information_schema.key_column_usage
        WHERE table_name = 'form_assignments' AND column_name = 'user_id'
        LIMIT 1;
        
        IF v_constr_name IS NOT NULL THEN
            EXECUTE format('ALTER TABLE public.form_assignments DROP CONSTRAINT %I', v_constr_name);
        END IF;
        
        ALTER TABLE public.form_assignments ADD CONSTRAINT form_assignments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;

    -- Fix performance_metrics
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'performance_metrics') THEN
        ALTER TABLE public.performance_metrics ALTER COLUMN user_id DROP NOT NULL;
        
        SELECT constraint_name INTO v_constr_name
        FROM information_schema.key_column_usage
        WHERE table_name = 'performance_metrics' AND column_name = 'user_id'
        LIMIT 1;
        
        IF v_constr_name IS NOT NULL THEN
            EXECUTE format('ALTER TABLE public.performance_metrics DROP CONSTRAINT %I', v_constr_name);
        END IF;
        
        ALTER TABLE public.performance_metrics ADD CONSTRAINT performance_metrics_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;

    -- Fix tasks (assignee_id)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks') THEN
        ALTER TABLE public.tasks ALTER COLUMN assignee_id DROP NOT NULL;

        SELECT constraint_name INTO v_constr_name
        FROM information_schema.key_column_usage
        WHERE table_name = 'tasks' AND column_name = 'assignee_id'
        LIMIT 1;
        
        IF v_constr_name IS NOT NULL THEN
            EXECUTE format('ALTER TABLE public.tasks DROP CONSTRAINT %I', v_constr_name);
        END IF;
        
        ALTER TABLE public.tasks ADD CONSTRAINT tasks_assignee_id_fkey FOREIGN KEY (assignee_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;

    -- Fix tasks (created_by)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks') THEN
        ALTER TABLE public.tasks ALTER COLUMN created_by DROP NOT NULL;

        SELECT constraint_name INTO v_constr_name
        FROM information_schema.key_column_usage
        WHERE table_name = 'tasks' AND column_name = 'created_by'
        LIMIT 1;
        
        IF v_constr_name IS NOT NULL THEN
            EXECUTE format('ALTER TABLE public.tasks DROP CONSTRAINT %I', v_constr_name);
        END IF;
        
        ALTER TABLE public.tasks ADD CONSTRAINT tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;

    -- Fix projects (primary_manager_id)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'projects') THEN
        ALTER TABLE public.projects ALTER COLUMN primary_manager_id DROP NOT NULL;

        SELECT constraint_name INTO v_constr_name
        FROM information_schema.key_column_usage
        WHERE table_name = 'projects' AND column_name = 'primary_manager_id'
        LIMIT 1;
        
        IF v_constr_name IS NOT NULL THEN
            EXECUTE format('ALTER TABLE public.projects DROP CONSTRAINT %I', v_constr_name);
        END IF;
        
        ALTER TABLE public.projects ADD CONSTRAINT projects_primary_manager_id_fkey FOREIGN KEY (primary_manager_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
END $$;

-- -----------------------------------------------------

-- --- MIGRATION 21: 20260302000001_advanced_ranking.sql ---

-- ============================================
-- FULL MULTI-LEVEL RANKING SYSTEM WITH EARNINGS
-- ============================================

-- 1. Configuration Table (Ensure clean state)
CREATE TABLE IF NOT EXISTS algorithm_config (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name text UNIQUE NOT NULL,
    metric_value numeric NOT NULL DEFAULT 0,
    description text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 2. Seed ALL Thresholds for ALL Levels (Including Earnings)
INSERT INTO algorithm_config (metric_name, metric_value, description) VALUES
('Confidence Threshold (m)', 5, 'Minimum reviews needed before a freelancer rating is fully trusted'),

-- Rising Talent (Tier 1)
('Rising Talent Score Min', 4.0, 'Minimum adjusted score for Rising Talent badge'),
('Rising Talent Project Min', 2, 'Minimum projects for Rising Talent badge'),
('Rising Talent Earnings Min', 0, 'Minimum lifetime earnings for Rising Talent badge'),

-- Top Rated (Tier 2)
('Top Rated Score Min', 4.7, 'Minimum adjusted score for Top Rated badge'),
('Top Rated Project Min', 10, 'Minimum projects for Top Rated badge'),
('Top Rated Earnings Min', 500, 'Minimum lifetime earnings for Top Rated badge'),

-- Top Rated Plus (Tier 3)
('Top Rated Plus Score Min', 4.85, 'Minimum adjusted score for Top Rated Plus badge'),
('Top Rated Plus Project Min', 30, 'Minimum projects for Top Rated Plus badge'),
('Top Rated Plus Earnings Min', 2500, 'Minimum lifetime earnings for Top Rated Plus badge'),

-- Expert (Tier 4)
('Expert Score Min', 4.95, 'Minimum adjusted score for Expert badge'),
('Expert Project Min', 50, 'Minimum projects for Expert badge'),
('Expert Earnings Min', 10000, 'Minimum lifetime earnings for Expert badge')
ON CONFLICT (metric_name) DO UPDATE SET metric_value = EXCLUDED.metric_value;

-- 3. Advanced Multi-Level Ranking View
CREATE OR REPLACE VIEW freelancer_performance_ranking AS
WITH site_stats AS (
    SELECT 
        AVG(rating) as site_avg_rating,
        COALESCE((SELECT metric_value FROM algorithm_config WHERE metric_name = 'Confidence Threshold (m)'), 5) as m_threshold
    FROM project_reviews
),
freelancer_stats AS (
    SELECT 
        p.assignee as freelancer_name,
        COUNT(pr.id) as review_count,
        AVG(pr.rating) as avg_rating,
        (SELECT COUNT(*) FROM projects p2 WHERE p2.assignee = p.assignee AND p2.status ILIKE '%Done%') as completed_projects,
        (SELECT COUNT(*) FROM projects p3 WHERE p3.assignee = p.assignee AND p3.has_dispute = true) as dispute_count,
        SUM(COALESCE(p.designer_fee, 0) + CASE WHEN p.tips_given THEN COALESCE(p.tip_amount, 0) ELSE 0 END) as lifetime_earnings
    FROM projects p
    LEFT JOIN project_reviews pr ON p.project_id = pr.project_id
    WHERE p.assignee IS NOT NULL
    GROUP BY p.assignee
),
bayesian_calc AS (
    SELECT 
        fs.*,
        ss.site_avg_rating,
        ss.m_threshold,
        -- Bayesian Formula
        ((fs.review_count / (fs.review_count + ss.m_threshold)) * fs.avg_rating) + 
        ((ss.m_threshold / (fs.review_count + ss.m_threshold)) * ss.site_avg_rating) as adjusted_score
    FROM freelancer_stats fs, site_stats ss
),
thresholds AS (
    SELECT
        (SELECT metric_value FROM algorithm_config WHERE metric_name = 'Expert Score Min') as exp_s,
        (SELECT metric_value FROM algorithm_config WHERE metric_name = 'Expert Project Min') as exp_p,
        (SELECT metric_value FROM algorithm_config WHERE metric_name = 'Expert Earnings Min') as exp_e,
        (SELECT metric_value FROM algorithm_config WHERE metric_name = 'Top Rated Plus Score Min') as trp_s,
        (SELECT metric_value FROM algorithm_config WHERE metric_name = 'Top Rated Plus Project Min') as trp_p,
        (SELECT metric_value FROM algorithm_config WHERE metric_name = 'Top Rated Plus Earnings Min') as trp_e,
        (SELECT metric_value FROM algorithm_config WHERE metric_name = 'Top Rated Score Min') as tr_s,
        (SELECT metric_value FROM algorithm_config WHERE metric_name = 'Top Rated Project Min') as tr_p,
        (SELECT metric_value FROM algorithm_config WHERE metric_name = 'Top Rated Earnings Min') as tr_e,
        (SELECT metric_value FROM algorithm_config WHERE metric_name = 'Rising Talent Score Min') as rt_s,
        (SELECT metric_value FROM algorithm_config WHERE metric_name = 'Rising Talent Project Min') as rt_p,
        (SELECT metric_value FROM algorithm_config WHERE metric_name = 'Rising Talent Earnings Min') as rt_e
)
SELECT 
    bc.*,
    CASE 
        WHEN bc.dispute_count > 0 THEN 'New Talent'
        WHEN bc.adjusted_score >= t.exp_s AND bc.completed_projects >= t.exp_p AND bc.lifetime_earnings >= t.exp_e THEN 'Expert'
        WHEN bc.adjusted_score >= t.trp_s AND bc.completed_projects >= t.trp_p AND bc.lifetime_earnings >= t.trp_e THEN 'Top Rated Plus'
        WHEN bc.adjusted_score >= t.tr_s AND bc.completed_projects >= t.tr_p AND bc.lifetime_earnings >= t.tr_e THEN 'Top Rated'
        WHEN bc.adjusted_score >= t.rt_s AND bc.completed_projects >= t.rt_p AND bc.lifetime_earnings >= t.rt_e THEN 'Rising Talent'
        ELSE 'New Talent'
    END as badge_status
FROM bayesian_calc bc, thresholds t;

-- -----------------------------------------------------

-- --- MIGRATION 22: 20260312000001_add_edit_projects_permission.sql ---
-- Add 'edit_projects' permission to the database
INSERT INTO permissions (code, name, category, description)
VALUES ('edit_projects', 'Edit Projects', 'Projects', 'Edit existing project properties and details')
ON CONFLICT (code) DO UPDATE
SET name = 'Edit Projects',
    category = 'Projects',
    description = 'Edit existing project properties and details';

-- -----------------------------------------------------

-- --- MIGRATION 23: 20260312000002_update_designer_fee_trigger.sql ---
-- Update the designer fee calculation trigger to also run on PRICE or ACCOUNT_ID updates
-- This ensures that if an admin edits the price, the freelancer's fee is recalculated correctly

DROP TRIGGER IF EXISTS trg_calculate_designer_fee ON projects;

CREATE TRIGGER trg_calculate_designer_fee
BEFORE INSERT OR UPDATE OF price, account_id ON projects
FOR EACH ROW
EXECUTE FUNCTION calculate_project_designer_fee();

-- -----------------------------------------------------

-- --- MIGRATION 24: 20260312000003_add_order_type_to_projects.sql ---
-- Add order_type column to projects table
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS order_type text DEFAULT 'Direct';

-- Update existing records to 'Converted' if they have a converted_by PM
UPDATE projects 
SET order_type = 'Converted' 
WHERE converted_by IS NOT NULL;

-- -----------------------------------------------------

-- --- MIGRATION 25: 20260313000001_add_comment_delete_permission.sql ---
-- Add delete_timeline_items permission
INSERT INTO permissions (code, name, category, description) VALUES
  ('delete_timeline_items', 'Delete Timeline Items', 'Projects', 'Ability to delete comments and logs from project timeline')
ON CONFLICT (code) DO NOTHING;

-- Grant to Super Admin
INSERT INTO role_permissions (role_name, permission_code)
VALUES ('Super Admin', 'delete_timeline_items')
ON CONFLICT DO NOTHING;

-- Ensure Super Admin can delete project_comments via RLS
DROP POLICY IF EXISTS "Allow super admin to delete any comment" ON project_comments;
CREATE POLICY "Allow super admin to delete any comment" ON project_comments 
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'Super Admin'
  )
);

-- -----------------------------------------------------

-- --- MIGRATION 26: 20260314000000_add_seller_commissions.sql ---
CREATE TABLE public.seller_commissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_name TEXT NOT NULL,
    logo_url TEXT,
    commission_percentage NUMERIC DEFAULT 0,
    clearance_days INTEGER DEFAULT 14,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.seller_commission_accounts (
    seller_commission_id UUID REFERENCES public.seller_commissions(id) ON DELETE CASCADE,
    account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
    PRIMARY KEY (seller_commission_id, account_id)
);

ALTER TABLE public.seller_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_commission_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read seller_commissions"
    ON public.seller_commissions FOR SELECT
    TO authenticated USING (true);

CREATE POLICY "Allow authenticated write seller_commissions"
    ON public.seller_commissions FOR ALL
    TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated read seller_commission_accounts"
    ON public.seller_commission_accounts FOR SELECT
    TO authenticated USING (true);

CREATE POLICY "Allow authenticated write seller_commission_accounts"
    ON public.seller_commission_accounts FOR ALL
    TO authenticated USING (true) WITH CHECK (true);

-- -----------------------------------------------------

-- --- MIGRATION 27: 20260314010000_update_seller_commissions_seller_id.sql ---
ALTER TABLE public.seller_commissions
DROP COLUMN seller_name,
ADD COLUMN seller_id UUID REFERENCES public.profiles(id);

-- -----------------------------------------------------

-- --- MIGRATION 28: 20260315000000_create_applicants_system.sql ---
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

-- -----------------------------------------------------

-- --- MIGRATION 29: 20260316014000_create_freelancer_capacity_tickets.sql ---
-- Create enum type for ticket status if it doesn't already exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'capacity_ticket_status') THEN
        CREATE TYPE capacity_ticket_status AS ENUM ('pending', 'approved', 'rejected');
    END IF;
END $$;

-- Create freelancer_capacity_tickets table
CREATE TABLE IF NOT EXISTS public.freelancer_capacity_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    freelancer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    start_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    daily_capacity INTEGER NOT NULL,
    status capacity_ticket_status DEFAULT 'pending' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add indexes for optimized query performance
CREATE INDEX IF NOT EXISTS idx_freelancer_capacity_tickets_freelancer_id ON public.freelancer_capacity_tickets(freelancer_id);
CREATE INDEX IF NOT EXISTS idx_freelancer_capacity_tickets_status ON public.freelancer_capacity_tickets(status);

-- Enable Row Level Security (consistent with project standards)
ALTER TABLE public.freelancer_capacity_tickets ENABLE ROW LEVEL SECURITY;

-- Add RLS Policies
DROP POLICY IF EXISTS "Allow authenticated read freelancer_capacity_tickets" ON public.freelancer_capacity_tickets;
CREATE POLICY "Allow authenticated read freelancer_capacity_tickets"
    ON public.freelancer_capacity_tickets FOR SELECT
    TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow users to create their own tickets" ON public.freelancer_capacity_tickets;
CREATE POLICY "Allow users to create their own tickets"
    ON public.freelancer_capacity_tickets FOR INSERT
    TO authenticated WITH CHECK (auth.uid() = freelancer_id);

DROP POLICY IF EXISTS "Allow users to update their own pending tickets" ON public.freelancer_capacity_tickets;
CREATE POLICY "Allow users to update their own pending tickets"
    ON public.freelancer_capacity_tickets FOR UPDATE
    TO authenticated 
    USING (auth.uid() = freelancer_id AND status = 'pending')
    WITH CHECK (auth.uid() = freelancer_id AND status = 'pending');

-- Add trigger for updated_at
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_freelancer_capacity_tickets_updated_at') THEN
        CREATE TRIGGER update_freelancer_capacity_tickets_updated_at
            BEFORE UPDATE ON public.freelancer_capacity_tickets
            FOR EACH ROW
            EXECUTE PROCEDURE public.update_updated_at_column();
    END IF;
END $$;

-- -----------------------------------------------------

-- --- MIGRATION 30: 20260316032700_add_ticket_type_to_capacity_tickets.sql ---
-- Create enum type for capacity ticket type
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'capacity_ticket_type') THEN
        CREATE TYPE capacity_ticket_type AS ENUM ('initial_capacity', 'increase_capacity');
    END IF;
END $$;

-- Add ticket_type column to freelancer_capacity_tickets table
ALTER TABLE public.freelancer_capacity_tickets
ADD COLUMN IF NOT EXISTS ticket_type capacity_ticket_type DEFAULT 'initial_capacity' NOT NULL;

-- Add index for ticket_type to optimize filtering
CREATE INDEX IF NOT EXISTS idx_freelancer_capacity_tickets_ticket_type ON public.freelancer_capacity_tickets(ticket_type);

-- -----------------------------------------------------

-- --- MIGRATION 31: 20260316040000_make_daily_capacity_nullable.sql ---
-- Remove default value and set existing freelancers' capacity to null to trigger the setup modal
ALTER TABLE profiles ALTER COLUMN daily_capacity DROP DEFAULT;

UPDATE profiles 
SET daily_capacity = NULL 
WHERE role = 'Freelancer';

-- -----------------------------------------------------

-- --- MIGRATION 32: 20260316041500_add_capacity_tickets_permission.sql ---
-- Add permission for Capacity Tickets
INSERT INTO permissions (code, name, category, description) VALUES
  ('view_capacity_tickets', 'Capacity Tickets', 'Workload', 'Access to review and manage freelancer capacity requests')
ON CONFLICT (code) DO NOTHING;

-- Grant access to specified roles
-- Super Admin
INSERT INTO role_permissions (role_name, permission_code)
VALUES ('Super Admin', 'view_capacity_tickets')
ON CONFLICT DO NOTHING;

-- Project Manager
INSERT INTO role_permissions (role_name, permission_code)
VALUES ('Project Manager', 'view_capacity_tickets')
ON CONFLICT DO NOTHING;

-- Project Operations Manager
INSERT INTO role_permissions (role_name, permission_code)
VALUES ('Project Operations Manager', 'view_capacity_tickets')
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------

-- --- MIGRATION 33: 20260316043200_fix_capacity_tickets_rls.sql ---
-- 1. Update is_active_admin to include Super Admin and Operational Managers
-- This ensures that these roles have the same administrative visibility and update rights as the 'admin' role.
CREATE OR REPLACE FUNCTION public.is_active_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND status = 'Active'
    AND (
        lower(role) = 'admin' 
        OR lower(role) = 'super admin'
        OR lower(role) = 'project manager'
        OR lower(role) = 'project operations manager'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update freelancer_capacity_tickets RLS policies to allow administrative processing
-- Previous policy only allowed the freelancer themselves to update their own ticket.
DROP POLICY IF EXISTS "Allow admins to update tickets" ON public.freelancer_capacity_tickets;
CREATE POLICY "Allow admins to update tickets"
    ON public.freelancer_capacity_tickets FOR UPDATE
    TO authenticated
    USING (is_active_admin())
    WITH CHECK (is_active_admin());

-- 3. Ensure admins can read all tickets (already covered by USING (true) but being explicit for clarity if needed)
-- (The existing "Allow authenticated read" policy already uses USING (true))

-- -----------------------------------------------------

-- --- MIGRATION 34: 20260316060000_consolidate_accounts.sql ---
-- ============================================
-- ACCOUNT CONSOLIDATION & CLEANUP (FIXED)
-- ============================================
-- Re-links all projects and permissions from redundant entries
-- to the full-name account entries.

DO $$
DECLARE
    v_ars_keep_id uuid;
    v_ars_remove_id uuid;
    v_gha_keep_id uuid;
    v_gha_remove_id uuid;
    v_man_keep_id uuid;
    v_man_remove_id uuid;
BEGIN
    -- 1. IDENTIFY THE IDS
    SELECT id INTO v_ars_keep_id FROM public.accounts WHERE name ILIKE 'Arshiya Azhar' LIMIT 1;
    SELECT id INTO v_ars_remove_id FROM public.accounts WHERE name ILIKE 'ARS Account' LIMIT 1;
    
    SELECT id INTO v_gha_keep_id FROM public.accounts WHERE name ILIKE 'Abdul Ghani' LIMIT 1;
    SELECT id INTO v_gha_remove_id FROM public.accounts WHERE name ILIKE 'GHA Account' LIMIT 1;
    
    SELECT id INTO v_man_keep_id FROM public.accounts WHERE name ILIKE 'Mansoor Hassan' OR name ILIKE 'Mmansoor Hassan' LIMIT 1;
    SELECT id INTO v_man_remove_id FROM public.accounts WHERE name ILIKE 'MAN Account' LIMIT 1;

    -- 2. CONSOLIDATE ARS
    IF v_ars_keep_id IS NOT NULL AND v_ars_remove_id IS NOT NULL THEN
        UPDATE public.projects SET account_id = v_ars_keep_id, account = 'Arshiya Azhar' WHERE account_id = v_ars_remove_id OR account = 'ARS Account';
        
        -- user_account_access (Unique on user_id, account_id)
        DELETE FROM public.user_account_access WHERE account_id = v_ars_remove_id AND user_id IN (SELECT user_id FROM public.user_account_access WHERE account_id = v_ars_keep_id);
        UPDATE public.user_account_access SET account_id = v_ars_keep_id WHERE account_id = v_ars_remove_id;
        
        -- team_accounts (Unique on team_id, account_id)
        DELETE FROM public.team_accounts WHERE account_id = v_ars_remove_id AND team_id IN (SELECT team_id FROM public.team_accounts WHERE account_id = v_ars_keep_id);
        UPDATE public.team_accounts SET account_id = v_ars_keep_id WHERE account_id = v_ars_remove_id;
        
        -- performance_metrics
        UPDATE public.performance_metrics SET account_id = v_ars_keep_id WHERE account_id = v_ars_remove_id;
        
        -- platform_commission_accounts (Unique on platform_commission_id, account_id)
        DELETE FROM public.platform_commission_accounts WHERE account_id = v_ars_remove_id AND platform_commission_id IN (SELECT platform_commission_id FROM public.platform_commission_accounts WHERE account_id = v_ars_keep_id);
        UPDATE public.platform_commission_accounts SET account_id = v_ars_keep_id WHERE account_id = v_ars_remove_id;
        
        DELETE FROM public.accounts WHERE id = v_ars_remove_id;
    END IF;

    -- 3. CONSOLIDATE GHA
    IF v_gha_keep_id IS NOT NULL AND v_gha_remove_id IS NOT NULL THEN
        UPDATE public.projects SET account_id = v_gha_keep_id, account = 'Abdul Ghani' WHERE account_id = v_gha_remove_id OR account = 'GHA Account';
        
        DELETE FROM public.user_account_access WHERE account_id = v_gha_remove_id AND user_id IN (SELECT user_id FROM public.user_account_access WHERE account_id = v_gha_keep_id);
        UPDATE public.user_account_access SET account_id = v_gha_keep_id WHERE account_id = v_gha_remove_id;
        
        DELETE FROM public.team_accounts WHERE account_id = v_gha_remove_id AND team_id IN (SELECT team_id FROM public.team_accounts WHERE account_id = v_gha_keep_id);
        UPDATE public.team_accounts SET account_id = v_gha_keep_id WHERE account_id = v_gha_remove_id;
        
        UPDATE public.performance_metrics SET account_id = v_gha_keep_id WHERE account_id = v_gha_remove_id;
        
        DELETE FROM public.platform_commission_accounts WHERE account_id = v_gha_remove_id AND platform_commission_id IN (SELECT platform_commission_id FROM public.platform_commission_accounts WHERE account_id = v_gha_keep_id);
        UPDATE public.platform_commission_accounts SET account_id = v_gha_keep_id WHERE account_id = v_gha_remove_id;
        
        DELETE FROM public.accounts WHERE id = v_gha_remove_id;
    END IF;

    -- 4. CONSOLIDATE MAN
    IF v_man_keep_id IS NOT NULL AND v_man_remove_id IS NOT NULL THEN
        UPDATE public.projects SET account_id = v_man_keep_id, account = 'Mansoor Hassan' WHERE account_id = v_man_remove_id OR account = 'MAN Account';
        
        DELETE FROM public.user_account_access WHERE account_id = v_man_remove_id AND user_id IN (SELECT user_id FROM public.user_account_access WHERE account_id = v_man_keep_id);
        UPDATE public.user_account_access SET account_id = v_man_keep_id WHERE account_id = v_man_remove_id;
        
        DELETE FROM public.team_accounts WHERE account_id = v_man_remove_id AND team_id IN (SELECT team_id FROM public.team_accounts WHERE account_id = v_man_keep_id);
        UPDATE public.team_accounts SET account_id = v_man_keep_id WHERE account_id = v_man_remove_id;
        
        UPDATE public.performance_metrics SET account_id = v_man_keep_id WHERE account_id = v_man_remove_id;
        
        DELETE FROM public.platform_commission_accounts WHERE account_id = v_man_remove_id AND platform_commission_id IN (SELECT platform_commission_id FROM public.platform_commission_accounts WHERE account_id = v_man_keep_id);
        UPDATE public.platform_commission_accounts SET account_id = v_man_keep_id WHERE account_id = v_man_remove_id;
        
        DELETE FROM public.accounts WHERE id = v_man_remove_id;
    END IF;
END $$;

-- -----------------------------------------------------

-- --- MIGRATION 35: 20260316070000_relax_applicants_constraints.sql ---
-- =============================================
-- FIX RELAX APPLICANTS CONSTRAINTS
-- =============================================

-- Make whatsapp nullable as it's been removed from the UI
ALTER TABLE applicants ALTER COLUMN whatsapp DROP NOT NULL;

-- Ensure cv_file_url is also nullable (it already is, but just in case)
ALTER TABLE applicants ALTER COLUMN cv_file_url DROP NOT NULL;

-- -----------------------------------------------------

-- --- MIGRATION 36: 20260316080000_separate_account_requests.sql ---
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

-- -----------------------------------------------------

-- --- MIGRATION 37: 20260316112000_restore_existing_user_capacity.sql ---
-- Restore daily_capacity for existing freelancers who were established before the capacity system launch
-- This prevents the onboarding modal from appearing for "already users"
UPDATE public.profiles
SET daily_capacity = 5
WHERE role = 'Freelancer' 
  AND daily_capacity IS NULL
  AND created_at < '2026-03-16 00:00:00+00';

-- -----------------------------------------------------

-- --- MIGRATION 38: 20260316120000_add_whatsapp_to_profiles.sql ---
-- Add whatsapp_number to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;

-- -----------------------------------------------------

-- --- MIGRATION 39: 20260317060000_add_applicant_labels.sql ---
-- Step 1: Create Labels and Label Assignments tables

-- Create table for storing custom labels
CREATE TABLE IF NOT EXISTS public.applicant_labels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL, -- Hex color or tailwind class
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create table for assigning labels to applicants (Many-to-Many)
CREATE TABLE IF NOT EXISTS public.applicant_label_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    applicant_id UUID NOT NULL REFERENCES public.applicants(id) ON DELETE CASCADE,
    label_id UUID NOT NULL REFERENCES public.applicant_labels(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(applicant_id, label_id)
);

-- Enable RLS (Assuming existing patterns)
ALTER TABLE public.applicant_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applicant_label_assignments ENABLE ROW LEVEL SECURITY;

-- Dynamic policies (Modify according to your project's roles)
-- For now, allow all authenticated users to manage labels
CREATE POLICY "Allow all authenticated users to read labels" ON public.applicant_labels
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow all authenticated users to insert labels" ON public.applicant_labels
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow all authenticated users to delete labels" ON public.applicant_labels
    FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow all authenticated users to read assignments" ON public.applicant_label_assignments
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow all authenticated users to update assignments" ON public.applicant_label_assignments
    FOR ALL TO authenticated USING (true);

-- -----------------------------------------------------

-- --- MIGRATION 40: 20260317070000_fix_user_deletion_historical.sql ---
-- 🛡️ FIX USER DELETION: PRESERVE HISTORICAL RECORDS (SET NULL)
-- This migration updates foreign keys to ensure that deleting a user
-- doesn't fail due to existing records, and preserves those records
-- by setting their user references to NULL instead of cascading or blocking.

DO $$ 
DECLARE
    v_constr_name text;
BEGIN
    -- 1. Fix notifications (Primary blocker found in screenshot)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
        -- Ensure column is nullable
        ALTER TABLE public.notifications ALTER COLUMN user_id DROP NOT NULL;
        
        -- Find and drop existing constraint referencing auth.users or profiles
        SELECT constraint_name INTO v_constr_name
        FROM information_schema.key_column_usage
        WHERE table_name = 'notifications' AND column_name = 'user_id'
        LIMIT 1;
        
        IF v_constr_name IS NOT NULL THEN
            EXECUTE format('ALTER TABLE public.notifications DROP CONSTRAINT %I', v_constr_name);
        END IF;
        
        -- Add back with SET NULL pointing to profiles
        -- This ensures that if the profile is deleted, the notification record stays with user_id = null
        ALTER TABLE public.notifications ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;

    -- 2. Fix member_invitations (invited_by)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'member_invitations') THEN
        ALTER TABLE public.member_invitations ALTER COLUMN invited_by DROP NOT NULL;
        
        SELECT constraint_name INTO v_constr_name
        FROM information_schema.key_column_usage
        WHERE table_name = 'member_invitations' AND column_name = 'invited_by'
        LIMIT 1;
        
        IF v_constr_name IS NOT NULL THEN
            EXECUTE format('ALTER TABLE public.member_invitations DROP CONSTRAINT %I', v_constr_name);
        END IF;
        
        ALTER TABLE public.member_invitations ADD CONSTRAINT member_invitations_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;

    -- 3. Fix freelancer_capacity_tickets (freelancer_id)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'freelancer_capacity_tickets') THEN
        -- Make nullable to allow SET NULL
        ALTER TABLE public.freelancer_capacity_tickets ALTER COLUMN freelancer_id DROP NOT NULL;
        
        SELECT constraint_name INTO v_constr_name
        FROM information_schema.key_column_usage
        WHERE table_name = 'freelancer_capacity_tickets' AND column_name = 'freelancer_id'
        LIMIT 1;
        
        IF v_constr_name IS NOT NULL THEN
            EXECUTE format('ALTER TABLE public.freelancer_capacity_tickets DROP CONSTRAINT %I', v_constr_name);
        END IF;
        
        ALTER TABLE public.freelancer_capacity_tickets ADD CONSTRAINT freelancer_capacity_tickets_freelancer_id_fkey FOREIGN KEY (freelancer_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;

    -- 4. Fix project_collaborators (member_id)
    -- Even though this is a join table, we might want to keep the entry with a NULL member_id 
    -- to show 'Former Member' in logs, or just CASCADE it.
    -- However, PROJECT_COLLABORATORS has a Primary Key on (project_id, member_id).
    -- Setting member_id to NULL would violate the Primary Key.
    -- Therefore, CASCADE is the only viable option for project_collaborators to avoid errors.
    -- It is likely already CASCADE, but let's ensure it doesn't block deletion.
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_collaborators') THEN
        SELECT constraint_name INTO v_constr_name
        FROM information_schema.key_column_usage
        WHERE table_name = 'project_collaborators' AND column_name = 'member_id'
        LIMIT 1;
        
        IF v_constr_name IS NOT NULL THEN
            EXECUTE format('ALTER TABLE public.project_collaborators DROP CONSTRAINT %I', v_constr_name);
        END IF;
        
        ALTER TABLE public.project_collaborators ADD CONSTRAINT project_collaborators_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;

    -- 5. Fix teams (leader_id)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'teams') THEN
        -- Ensure column is nullable
        ALTER TABLE public.teams ALTER COLUMN leader_id DROP NOT NULL;
        
        -- Find and drop existing constraint
        SELECT constraint_name INTO v_constr_name
        FROM information_schema.key_column_usage
        WHERE table_name = 'teams' AND column_name = 'leader_id'
        LIMIT 1;
        
        IF v_constr_name IS NOT NULL THEN
            EXECUTE format('ALTER TABLE public.teams DROP CONSTRAINT %I', v_constr_name);
        END IF;
        
        -- Add back with SET NULL
        ALTER TABLE public.teams ADD CONSTRAINT teams_leader_id_fkey FOREIGN KEY (leader_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;

    -- 6. Fix payment_releases (released_by)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_releases') THEN
        -- Ensure column is nullable
        ALTER TABLE public.payment_releases ALTER COLUMN released_by DROP NOT NULL;
        
        -- Find and drop existing constraint
        SELECT constraint_name INTO v_constr_name
        FROM information_schema.key_column_usage
        WHERE table_name = 'payment_releases' AND column_name = 'released_by'
        LIMIT 1;
        
        IF v_constr_name IS NOT NULL THEN
            EXECUTE format('ALTER TABLE public.payment_releases DROP CONSTRAINT %I', v_constr_name);
        END IF;
        
        -- Add back with SET NULL
        ALTER TABLE public.payment_releases ADD CONSTRAINT payment_releases_released_by_fkey FOREIGN KEY (released_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;

END $$;

-- -----------------------------------------------------

-- --- MIGRATION 41: 20260317180000_add_team_lead_economy.sql ---
-- Migration: Add Team Lead Economy Support with Automated Calculations
-- Created: 2026-03-17 18:30:00

-- 1. Create team_pricing_slabs table
CREATE TABLE IF NOT EXISTS public.team_pricing_slabs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_lead_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    min_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    max_price NUMERIC(10, 2) NOT NULL DEFAULT 999999,
    percentage NUMERIC(5, 2) NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Add columns to projects table for internal team tracking
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS assignee_id UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS team_designer_id UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS team_payout NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS team_slab_id UUID REFERENCES public.team_pricing_slabs(id);

-- 3. Enable RLS on team_pricing_slabs
ALTER TABLE public.team_pricing_slabs ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for team_pricing_slabs
DROP POLICY IF EXISTS "Team Leads can manage their own slabs" ON public.team_pricing_slabs;
CREATE POLICY "Team Leads can manage their own slabs" 
ON public.team_pricing_slabs 
FOR ALL 
USING (auth.uid() = team_lead_id)
WITH CHECK (auth.uid() = team_lead_id);

DROP POLICY IF EXISTS "Team Designers can view their TL's slabs" ON public.team_pricing_slabs;
CREATE POLICY "Team Designers can view their TL's slabs" 
ON public.team_pricing_slabs 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.team_members tm
        JOIN public.teams t ON tm.team_id = t.id
        WHERE tm.member_id = auth.uid()
        AND t.leader_id = public.team_pricing_slabs.team_lead_id
    )
);

-- 5. Calculation Function for Team Designer Payout
CREATE OR REPLACE FUNCTION public.calculate_team_designer_payout()
RETURNS TRIGGER AS $$
DECLARE
    v_slab_percentage NUMERIC;
    v_slab_id UUID;
    v_tl_id UUID;
BEGIN
    -- Only calculate if there is a team designer assigned
    IF NEW.team_designer_id IS NULL THEN
        NEW.team_payout := NULL;
        NEW.team_slab_id := NULL;
        RETURN NEW;
    END IF;

    -- The Team Lead is the assignee of the project
    v_tl_id := NEW.assignee_id;

    -- If no assignee_id, we can't find the TL's slabs
    IF v_tl_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Find the TL's slab that covers the project's freelancer payout (designer_fee)
    -- As requested: "jo freelancer payout hoga hamare project ka wo consider hoga team lead ka project price"
    SELECT percentage, id INTO v_slab_percentage, v_slab_id
    FROM public.team_pricing_slabs
    WHERE team_lead_id = v_tl_id
      AND NEW.designer_fee >= min_price 
      AND NEW.designer_fee <= max_price
      AND is_active = true
    LIMIT 1;

    -- If slab found, calculate payout (percentage of TL's designer_fee)
    IF v_slab_id IS NOT NULL THEN
        NEW.team_payout := NEW.designer_fee * (v_slab_percentage / 100.0);
        NEW.team_slab_id := v_slab_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Trigger for Team Designer Payout
DROP TRIGGER IF EXISTS trg_calculate_team_designer_payout ON public.projects;
CREATE TRIGGER trg_calculate_team_designer_payout
BEFORE INSERT OR UPDATE OF team_designer_id, designer_fee, assignee_id ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.calculate_team_designer_payout();

-- 7. Trigger for updated_at on slabs
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON public.team_pricing_slabs;
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.team_pricing_slabs
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- -----------------------------------------------------

-- --- MIGRATION 42: 20260317181000_update_view_with_team_columns.sql ---
-- Update: projects_with_collaborators view to include team economy columns
-- Created: 2026-03-17 18:45:00

CREATE OR REPLACE VIEW public.projects_with_collaborators AS
SELECT 
    p.id,
    p.project_id,
    p.action_move,
    p.project_title,
    p.account,
    p.client_type,
    p.client_name,
    p.previous_logo_no,
    p.items_sold,
    p.addons,
    p.medium,
    p.price,
    p.brief,
    p.attachments,
    p.due_date,
    p.due_time,
    p.assignee,
    p.removal_reason,
    p.cancellation_reason,
    p.tips_given,
    p.tip_amount,
    p.status,
    p.created_at,
    p.updated_at,
    p.account_id,
    p.designer_fee,
    p.primary_manager_id,
    p.options_required,
    p.has_dispute,
    p.has_art_help,
    p.payout_completed,
    p.converted_by,
    p.order_type,
    p.assignee_id,
    p.team_designer_id,
    p.team_payout,
    p.team_slab_id,
    p.client_due_date,
    p.client_due_time,
    p.revision_notes,
    COALESCE(
        (
            SELECT jsonb_agg(jsonb_build_object(
                'id', pc.member_id,
                'name', pr.name,
                'role', pr.role
            ))
            FROM project_collaborators pc
            JOIN profiles pr ON pc.member_id = pr.id
            WHERE pc.project_id = p.project_id
        ),
        '[]'::jsonb
    ) as collaborators
FROM public.projects p;

-- -----------------------------------------------------

-- --- MIGRATION 43: 20260317190000_add_slab_name_to_team_slabs.sql ---
-- Migration: Add slab_name to team_pricing_slabs
-- Created: 2026-03-17 19:00:00

ALTER TABLE public.team_pricing_slabs 
ADD COLUMN IF NOT EXISTS slab_name TEXT;

-- Update existing records if any (though there shouldn't be yet)
UPDATE public.team_pricing_slabs SET slab_name = 'Tier ' || min_price::text WHERE slab_name IS NULL;

-- Make it NOT NULL for future entries if desired, but for now we'll just use it in the UI

-- -----------------------------------------------------

-- --- MIGRATION 44: 20260318000000_update_labels_generic.sql ---
-- Ensure all internal and team economy columns exist on the projects table before the view references them
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS assignee_id UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS team_designer_id UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS team_payout NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS team_slab_id UUID,
ADD COLUMN IF NOT EXISTS client_due_date DATE,
ADD COLUMN IF NOT EXISTS client_due_time TIME,
ADD COLUMN IF NOT EXISTS revision_notes TEXT;

-- Rename applicant_labels to generic labels (Idempotent)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'applicant_labels') THEN
        ALTER TABLE public.applicant_labels RENAME TO labels;
    END IF;
END $$;

-- Add category column
ALTER TABLE public.labels ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'applicant' CHECK (category IN ('applicant', 'project'));

-- Add visibility columns
ALTER TABLE public.labels ADD COLUMN IF NOT EXISTS visibility_type TEXT DEFAULT 'all' CHECK (visibility_type IN ('all', 'roles', 'users', 'private'));
ALTER TABLE public.labels ADD COLUMN IF NOT EXISTS visible_to_roles TEXT[] DEFAULT '{}';
ALTER TABLE public.labels ADD COLUMN IF NOT EXISTS visible_to_users UUID[] DEFAULT '{}';
ALTER TABLE public.labels ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Create table for Project Label Assignments
CREATE TABLE IF NOT EXISTS public.project_label_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id TEXT NOT NULL REFERENCES public.projects(project_id) ON DELETE CASCADE,
    label_id UUID NOT NULL REFERENCES public.labels(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(project_id, label_id)
);

-- Enable RLS
ALTER TABLE public.project_label_assignments ENABLE ROW LEVEL SECURITY;

-- Policies for project_label_assignments
DROP POLICY IF EXISTS "Allow all authenticated users to read project assignments" ON public.project_label_assignments;
CREATE POLICY "Allow all authenticated users to read project assignments" ON public.project_label_assignments
    FOR SELECT TO authenticated USING (true);

-- Update the view to include labels
DROP VIEW IF EXISTS public.projects_with_collaborators;
CREATE VIEW public.projects_with_collaborators AS
SELECT 
    p.id,
    p.project_id,
    p.action_move,
    p.project_title,
    p.account,
    p.client_type,
    p.client_name,
    p.previous_logo_no,
    p.items_sold,
    p.addons,
    p.medium,
    p.price,
    p.brief,
    p.attachments,
    p.due_date,
    p.due_time,
    p.assignee,
    p.removal_reason,
    p.cancellation_reason,
    p.tips_given,
    p.tip_amount,
    p.status,
    p.created_at,
    p.updated_at,
    p.account_id,
    p.designer_fee,
    p.primary_manager_id,
    p.options_required,
    p.has_dispute,
    p.has_art_help,
    p.payout_completed,
    p.converted_by,
    p.order_type,
    p.assignee_id,
    p.team_designer_id,
    p.team_payout,
    p.team_slab_id,
    p.client_due_date,
    p.client_due_time,
    p.revision_notes,
    COALESCE(
        (
            SELECT jsonb_agg(jsonb_build_object(
                'id', pc.member_id,
                'name', pr.name,
                'role', pr.role
            ))
            FROM project_collaborators pc
            JOIN profiles pr ON pc.member_id = pr.id
            WHERE pc.project_id = p.project_id
        ),
        '[]'::jsonb
    ) as collaborators,
    COALESCE(
        (
            SELECT jsonb_agg(jsonb_build_object(
                'id', l.id,
                'name', l.name,
                'color', l.color
            ))
            FROM project_label_assignments pla
            JOIN labels l ON pla.label_id = l.id
            WHERE pla.project_id = p.project_id
        ),
        '[]'::jsonb
    ) as labels
FROM public.projects p;

-- Grant access to the view
GRANT SELECT ON public.projects_with_collaborators TO authenticated;

DROP POLICY IF EXISTS "Allow all authenticated users to manage project assignments" ON public.project_label_assignments;
CREATE POLICY "Allow all authenticated users to manage project assignments" ON public.project_label_assignments
    FOR ALL TO authenticated USING (true);

-- Update RLS for labels to handle visibility and permissions
DROP POLICY IF EXISTS "Allow users to read labels based on visibility" ON public.labels;
CREATE POLICY "Allow users to read labels based on visibility" ON public.labels
    FOR SELECT TO authenticated
    USING (
        auth.uid() = created_by OR
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'Super Admin' OR
        (
            visibility_type = 'all' AND 
            (SELECT role FROM public.profiles WHERE id = auth.uid()) != 'Team Designer'
        ) OR
        (visibility_type = 'roles' AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = ANY(visible_to_roles)) OR
        (visibility_type = 'users' AND auth.uid() = ANY(visible_to_users))
    );

DROP POLICY IF EXISTS "Users can manage their own labels" ON public.labels;
CREATE POLICY "Users can edit/delete their own labels" ON public.labels
    FOR ALL TO authenticated
    USING (
        (auth.uid() = created_by AND 
         NOT EXISTS (
             SELECT 1 FROM public.profiles 
             WHERE id = created_by AND role = 'Super Admin'
         )) OR
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'Super Admin'
    );

-- -----------------------------------------------------

-- --- MIGRATION 45: 20260318000001_fix_labels_visibility_constraint.sql ---
-- Fix the visibility_type check constraint to include 'private'
-- This addresses the case where the constraint was created without 'private' in a previous run

ALTER TABLE public.labels DROP CONSTRAINT IF EXISTS labels_visibility_type_check;
ALTER TABLE public.labels ADD CONSTRAINT labels_visibility_type_check CHECK (visibility_type IN ('all', 'roles', 'users', 'private'));

-- Ensure visibility_type column has a default
ALTER TABLE public.labels ALTER COLUMN visibility_type SET DEFAULT 'all';

-- -----------------------------------------------------

-- --- MIGRATION 46: 20260318000002_ensure_team_slabs_schema.sql ---
-- Ensure Team Pricing Slabs and Teams table schema and permissions exist
-- This migration acts as a self-healing script for the Team Economy feature

-- 1. Ensure Team Pricing Slabs Table Exists
CREATE TABLE IF NOT EXISTS public.team_pricing_slabs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_lead_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    min_price DECIMAL(12,2) NOT NULL DEFAULT 0,
    max_price DECIMAL(12,2) NOT NULL DEFAULT 999999999,
    designer_payout DECIMAL(12,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Ensure slab_name column exists
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'team_pricing_slabs' AND column_name = 'slab_name') THEN
        ALTER TABLE public.team_pricing_slabs ADD COLUMN slab_name TEXT DEFAULT 'Standard Slab';
    END IF;
END $$;

-- 3. FIX Teams Table Schema (Add Missing leader_id needed for TeamDesignerEarnings.tsx)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'teams' AND column_name = 'leader_id') THEN
        ALTER TABLE public.teams ADD COLUMN leader_id UUID REFERENCES public.profiles(id);
    END IF;
END $$;

-- 4. Enable RLS on slabs
ALTER TABLE public.team_pricing_slabs ENABLE ROW LEVEL SECURITY;

-- 5. Recreate Slab Policies
DROP POLICY IF EXISTS "Team Leads can manage their own slabs" ON public.team_pricing_slabs;
CREATE POLICY "Team Leads can manage their own slabs" ON public.team_pricing_slabs
    FOR ALL TO authenticated
    USING (auth.uid() = team_lead_id)
    WITH CHECK (auth.uid() = team_lead_id);

DROP POLICY IF EXISTS "Anyone can view slabs assigned to them" ON public.team_pricing_slabs;
CREATE POLICY "Anyone can view slabs assigned to them" ON public.team_pricing_slabs
    FOR SELECT TO authenticated
    USING (true);

-- 6. CRITICAL: Grant Permissions to fix PGRST205
GRANT ALL ON TABLE public.team_pricing_slabs TO postgres;
GRANT ALL ON TABLE public.team_pricing_slabs TO anon;
GRANT ALL ON TABLE public.team_pricing_slabs TO authenticated;
GRANT ALL ON TABLE public.team_pricing_slabs TO service_role;

-- 7. Ensure project columns exist
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS team_designer_id UUID REFERENCES public.profiles(id);
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS team_payout DECIMAL(12,2) DEFAULT 0;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS team_slab_id UUID REFERENCES public.team_pricing_slabs(id);

-- 8. Payout Function & Trigger
CREATE OR REPLACE FUNCTION public.calculate_team_designer_payout()
RETURNS TRIGGER AS $$
DECLARE
    slab_payout DECIMAL(12,2);
BEGIN
    -- Only calculate if we have a team designer and project price
    IF NEW.team_designer_id IS NOT NULL AND NEW.price IS NOT NULL THEN
        -- Find the matching slab for this team lead and price point
        -- We use the primary_manager_id as the team_lead_id
        SELECT designer_payout INTO slab_payout
        FROM public.team_pricing_slabs
        WHERE team_lead_id = NEW.primary_manager_id
          AND NEW.price >= min_price
          AND NEW.price <= max_price
        LIMIT 1;

        IF slab_payout IS NOT NULL THEN
            NEW.team_payout := slab_payout;
            
            -- Also store the slab ID for reference if not manually set
            IF NEW.team_slab_id IS NULL THEN
                SELECT id INTO NEW.team_slab_id
                FROM public.team_pricing_slabs
                WHERE team_lead_id = NEW.primary_manager_id
                  AND NEW.price >= min_price
                  AND NEW.price <= max_price
                LIMIT 1;
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Re-attach trigger
DROP TRIGGER IF EXISTS trigger_calculate_team_payout ON public.projects;
CREATE TRIGGER trigger_calculate_team_payout
    BEFORE INSERT OR UPDATE OF price, team_designer_id, primary_manager_id
    ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION public.calculate_team_designer_payout();

-- 10. Indexes
CREATE INDEX IF NOT EXISTS idx_team_pricing_slabs_lead ON public.team_pricing_slabs(team_lead_id);
CREATE INDEX IF NOT EXISTS idx_projects_team_designer ON public.projects(team_designer_id) WHERE team_designer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_projects_team_slab ON public.projects(team_slab_id) WHERE team_slab_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_teams_leader ON public.teams(leader_id);

-- -----------------------------------------------------

-- --- MIGRATION 47: 20260318000003_fix_application_form.sql ---
-- =============================================
-- FIX DESIGNER APPLICATION FORM SYSTEM
-- =============================================

-- 1. Ensure applicants table and necessary permissions
-- Assuming the table exists, but we want to make sure anon and authenticated can insert
GRANT INSERT ON TABLE applicants TO anon, authenticated;
GRANT SELECT ON TABLE applicants TO authenticated;

-- Ensure RLS is enabled and policies are correct
ALTER TABLE applicants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public/anon to submit applications" ON applicants;
CREATE POLICY "Allow public/anon to submit applications"
ON applicants FOR INSERT
TO public
WITH CHECK (true);

-- 2. Ensure Storage Bucket for CVs/Documents
-- Supabase storage uses the storage schema
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage Policies for 'documents' bucket
-- These policies use storage.objects

-- Allow anyone to upload documents (for applications)
DROP POLICY IF EXISTS "Allow public uploads to documents" ON storage.objects;
CREATE POLICY "Allow public uploads to documents"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'documents');

-- Allow authenticated users to read/manage documents
DROP POLICY IF EXISTS "Allow authenticated to view documents" ON storage.objects;
CREATE POLICY "Allow authenticated to view documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'documents');

-- Allow anon to view documents (if needed, or only for public bucket URL)
DROP POLICY IF EXISTS "Allow public to view documents" ON storage.objects;
CREATE POLICY "Allow public to view documents"
ON storage.objects FOR SELECT
TO anon
USING (bucket_id = 'documents');

-- Ensure storage has proper permissions for public/anon
GRANT ALL ON storage.objects TO postgres;
GRANT ALL ON storage.buckets TO postgres;
-- Storage usually handles its own role mapping, but let's confirm common ones
GRANT INSERT ON storage.objects TO anon, authenticated;
GRANT SELECT ON storage.objects TO anon, authenticated;

-- -----------------------------------------------------

-- --- MIGRATION 48: 20260319014000_fix_projects_list_view_columns.sql ---
-- Fix: Add missing columns to projects_list_view required by the frontend
-- Missing columns: assignee_id, team_designer_id, client_due_date, client_due_time
-- This fix is required for Freelancer/Designer roles to correctly filter their projects.

DROP VIEW IF EXISTS projects_list_view;

CREATE VIEW projects_list_view AS
SELECT 
    project_id,
    project_title,
    status,
    assignee,
    assignee_id,
    team_designer_id,
    client_name,
    client_type,
    price,
    designer_fee,
    due_date,
    due_time,
    client_due_date,
    client_due_time,
    created_at,
    account_id,
    account,
    has_dispute,
    has_art_help,
    search_vector
FROM projects;

-- Grant access to authenticated users
GRANT SELECT ON projects_list_view TO authenticated;
GRANT SELECT ON projects_list_view TO anon;
GRANT SELECT ON projects_list_view TO service_role;

-- -----------------------------------------------------

-- --- MIGRATION 49: 20260319020000_add_reply_to_comments.sql ---
-- Add parent_id to project_comments to support threaded replies
ALTER TABLE public.project_comments 
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.project_comments(id);

-- Add index for performance on threaded fetching
CREATE INDEX IF NOT EXISTS idx_project_comments_parent_id ON public.project_comments(parent_id);

-- -----------------------------------------------------

-- --- MIGRATION 50: 20260319115500_performance_stability.sql ---
-- ==========================================
-- PERFORMANCE & STABILITY OPTIMIZATIONS V1
-- ==========================================

-- 1. Composite Index for the primary "Projects" list sorting pattern
-- Addresses "Filesort" operations that spike CPU on large listings
CREATE INDEX IF NOT EXISTS idx_projects_sort_priority 
ON projects (due_date ASC NULLS LAST, due_time ASC NULLS LAST, created_at DESC);

-- 2. Index for joining accounts and primary managers in Analytics/Details
CREATE INDEX IF NOT EXISTS idx_projects_account_id_id ON projects (account_id, id);
CREATE INDEX IF NOT EXISTS idx_projects_primary_manager ON projects (primary_manager_id);

-- 3. Optimization for Row-Level Security (RLS)
-- Index foreign keys used in project visibility checks
CREATE INDEX IF NOT EXISTS idx_team_members_member_id ON team_members (member_id);
CREATE INDEX IF NOT EXISTS idx_team_accounts_account_id ON team_accounts (account_id);

-- 4. High-Performance Server-Side Counter
-- Replaces client-side "Fetch-All-Then-Count" which saturates memory & connections
CREATE OR REPLACE FUNCTION get_project_status_counts()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER -- Respects RLS of the caller
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'all', COUNT(*),
    'dispute', COUNT(*) FILTER (WHERE has_dispute = true),
    'arthelp', COUNT(*) FILTER (WHERE has_art_help = true)
  ) || jsonb_object_agg(status_clean, cnt)
  INTO result
  FROM (
    SELECT LOWER(TRIM(status)) as status_clean, COUNT(*) as cnt
    FROM projects
    WHERE status != 'Removed'
    GROUP BY 1
  ) t;
  
  RETURN COALESCE(result, '{}'::jsonb);
END;
$$;

-- 5. Enable Secure View Inheritance
-- Ensures views inherit RLS policies properly to avoid redundant manual filters
ALTER VIEW IF EXISTS projects_list_view SET (security_invoker = true);

-- -----------------------------------------------------

-- --- MIGRATION 51: 20260319120500_rls_performance_boost.sql ---
-- ==========================================
-- PERFORMANCE & STABILITY OPTIMIZATIONS V2
-- RLS ACCELERATION (FAST-PATH)
-- ==========================================

-- Optimized RLS Policy for Projects Visibility
-- Uses JWT metadata for "Super Admin" and "Admin" checks to bypass table lookups.
-- Backward compatible: falls back to profile table if metadata is missing.

DROP POLICY IF EXISTS "Secure project visibility" ON projects;
DROP POLICY IF EXISTS "Allow all access for authenticated users" ON projects;

CREATE POLICY "Secure project visibility optimized" ON projects
FOR SELECT
TO authenticated
USING (
    -- FAST PATH: Check JWT metadata first (O(1) complexity)
    (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'super admin'
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'admin'
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'project operations manager'
    
    -- FALLBACK: Table lookups (Only if metadata is missing or insufficient)
    OR EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND LOWER(role) IN ('super admin', 'admin', 'project operations manager')
    )
    
    -- Collaborators & PMs (Scoped lookups)
    OR assignee_id = auth.uid()
    OR team_designer_id = auth.uid()
    OR primary_manager_id = auth.uid()

    -- Legacy/Name/Email Fallback (Ensures visibility whenever name matches, regardless of role)
    OR EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND (
            TRIM(projects.assignee) ILIKE TRIM(profiles.name) 
            OR TRIM(projects.assignee) ILIKE TRIM(profiles.email)
        )
    )

    -- Collaborators (From relational table)
    OR EXISTS (
        SELECT 1 FROM project_collaborators pc
        WHERE pc.project_id = projects.project_id
        AND pc.member_id = auth.uid()
    )
    
    -- Account-based visibility (Optimized indexed join)
    OR EXISTS (
        SELECT 1 FROM user_account_access uaa
        WHERE uaa.user_id = auth.uid()
        AND uaa.account_id = projects.account_id
    )
    
    -- Team-based visibility
    OR EXISTS (
        SELECT 1 FROM team_members tm
        JOIN team_accounts ta ON tm.team_id = ta.team_id
        WHERE tm.member_id = auth.uid()
        AND ta.account_id = projects.account_id
    )
);

-- Re-enable RLS to ensure it's active
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------

-- --- MIGRATION 52: 20260322_add_team_designer_fee.sql ---
-- Add team_designer_fee column to support Team Lead -> Team Designer payout calculations
ALTER TABLE projects ADD COLUMN IF NOT EXISTS team_designer_fee NUMERIC DEFAULT 0;

-- Update projects_list_view to include the new column
DROP VIEW IF EXISTS projects_list_view;

CREATE VIEW projects_list_view AS
SELECT 
    project_id,
    project_title,
    status,
    assignee,
    assignee_id,
    team_designer_id,
    client_name,
    client_type,
    price,
    designer_fee,
    team_designer_fee, -- Added column
    due_date,
    due_time,
    client_due_date,
    client_due_time,
    created_at,
    account_id,
    account,
    has_dispute,
    has_art_help,
    search_vector
FROM projects;

-- Grant access to authenticated users
GRANT SELECT ON projects_list_view TO authenticated;
GRANT SELECT ON projects_list_view TO anon;
GRANT SELECT ON projects_list_view TO service_role;
ALTER VIEW projects_list_view SET (security_invoker = true);

-- -----------------------------------------------------

-- --- MIGRATION 53: 20260322_refresh_projects_view.sql ---
-- RECREATE PROJECTS LIST VIEW TO PICK UP NEW COLUMNS
-- This migration ensures the team_designer_fee and any other new columns are visible in the view.

DROP VIEW IF EXISTS public.projects_list_view CASCADE;

CREATE VIEW public.projects_list_view AS
SELECT 
    p.*,
    td.name as team_designer_name
FROM public.projects p
LEFT JOIN public.profiles td ON p.team_designer_id = td.id;

-- Ensure read permissions for all roles
GRANT SELECT ON public.projects_list_view TO authenticated;
GRANT SELECT ON public.projects_list_view TO service_role;
GRANT SELECT ON public.projects_list_view TO anon;

-- -----------------------------------------------------

-- --- MIGRATION 54: 20260323_add_project_update_rls.sql ---
-- PROJECT UPDATE RLS POLICY (UNLOCK ASSIGNMENT)
-- This migration allows Team Leads to update projects assigned to them.
-- It also ensures Admins/PMs have full update permissions.

DROP POLICY IF EXISTS "Projects Master Update Rule" ON projects;

CREATE POLICY "Projects Master Update Rule" ON projects
FOR UPDATE
TO authenticated
USING (
    -- ADMIn/PM: Full Update Access
    (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'super admin'
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'admin'
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'project operations manager'
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'project manager'
    
    -- TEAM LEAD: Only update projects assigned to them
    OR assignee_id = auth.uid()
    
    -- TEAM DESIGNER: Only update projects where they are the designer
    OR team_designer_id = auth.uid()
)
WITH CHECK (
    -- Adhering to the same rules for the final state
    (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'super admin'
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'admin'
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'project operations manager'
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'project manager'
    OR assignee_id = auth.uid()
    OR team_designer_id = auth.uid()
);

-- Ensure all designers can see their own projects to avoid blank screens
DROP POLICY IF EXISTS "Designer visibility" ON projects;
CREATE POLICY "Designer visibility" ON projects FOR SELECT USING (team_designer_id = auth.uid());

-- -----------------------------------------------------

-- --- MIGRATION 55: 20260326080000_fix_profile_visibility_rbac.sql ---
-- Migration: Fix Admin Logic and Profile Visibility for Team Leads
-- This fixes the is_active_admin function and allows Team Leads to see their team members.

-- 1. Correct is_active_admin to include Super Admin, PMs and Operational Managers
-- This matches the definition in fix_capacity_tickets_rls.sql but ensures consistency.
CREATE OR REPLACE FUNCTION public.is_active_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND status = 'Active'
    AND lower(role) IN ('admin', 'super admin', 'project operations manager', 'project manager')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update Profiles Policy to allow Team Leads to see their members
DROP POLICY IF EXISTS "View Profiles" ON public.profiles;
CREATE POLICY "View Profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (
  (auth.uid() = id) 
  OR (is_active_admin())
  -- Team Lead check: Can see members of teams they lead
  OR EXISTS (
    SELECT 1 FROM public.team_members tm
    JOIN public.teams t ON tm.team_id = t.id
    WHERE tm.member_id = public.profiles.id
    AND t.leader_id = auth.uid()
  )
  -- Member check: Can see their team lead
  OR EXISTS (
    SELECT 1 FROM public.team_members tm
    JOIN public.teams t ON tm.team_id = t.id
    WHERE tm.member_id = auth.uid()
    AND t.leader_id = public.profiles.id
  )
);

-- -----------------------------------------------------

-- --- MIGRATION 56: 20260326081000_perf_optimization_v4.sql ---
-- ==========================================
-- PERFORMANCE & STABILITY OPTIMIZATIONS V3
-- INDEXING & RPC ENHANCEMENT
-- ==========================================

-- 1. Index for status-based filtering & grouping (Essential for Counts & Tabs)
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects (status);

-- 2. Indices for RLS (Row Level Security) and Joining
CREATE INDEX IF NOT EXISTS idx_projects_assignee_id ON projects (assignee_id);
CREATE INDEX IF NOT EXISTS idx_projects_team_designer_id ON projects (team_designer_id);
CREATE INDEX IF NOT EXISTS idx_projects_account_id ON projects (account_id);
CREATE INDEX IF NOT EXISTS idx_projects_primary_manager_id ON projects (primary_manager_id);

-- 3. Indices for Alert filtering
CREATE INDEX IF NOT EXISTS idx_projects_alerts ON projects (has_dispute, has_art_help) WHERE has_dispute = true OR has_art_help = true;

-- 4. Search Acceleration (Requires pg_trgm extension)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_projects_project_id_trgm ON projects USING gin (project_id gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_projects_title_trgm ON projects USING gin (project_title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_projects_client_trgm ON projects USING gin (client_name gin_trgm_ops);

-- 5. Optimized Status Counter RPC (More robust)
CREATE OR REPLACE FUNCTION get_project_status_counts()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  result jsonb;
BEGIN
  -- We use a single scan for all counts including specific flags
  SELECT jsonb_build_object(
    'all', COUNT(*),
    'dispute', COUNT(*) FILTER (WHERE has_dispute = true),
    'arthelp', COUNT(*) FILTER (WHERE has_art_help = true)
  ) || COALESCE((
    SELECT jsonb_object_agg(status_clean, cnt)
    FROM (
      SELECT LOWER(TRIM(status)) as status_clean, COUNT(*) as cnt
      FROM projects
      WHERE status != 'Removed'
      GROUP BY 1
    ) t
  ), '{}'::jsonb)
  INTO result
  FROM projects
  WHERE status != 'Removed';
  
  RETURN COALESCE(result, '{}'::jsonb);
END;
$$;

-- -----------------------------------------------------

-- --- MIGRATION 57: 20260326173000_fix_user_deletion_final_sweep.sql ---
-- 🛡️ FINAL FIX: USER DELETION RESILIENCE (PROJECTS & OTHERS)
-- This migration updates foreign keys in the projects, seller_commissions, and labels tables 
-- to ensure that deleting a user doesn't fail due to structural restrictions.
-- It preserves historical data by setting references to NULL instead of cascading deletions.

DO $$ 
DECLARE
    v_constr_name text;
BEGIN
    -- 1. Fix projects (team_designer_id) - Reported blocker
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'projects') THEN
        -- Ensure column is nullable (should already be, but for safety)
        ALTER TABLE public.projects ALTER COLUMN team_designer_id DROP NOT NULL;
        
        -- Identify existing constraint
        SELECT constraint_name INTO v_constr_name
        FROM information_schema.key_column_usage
        WHERE table_name = 'projects' AND column_name = 'team_designer_id'
        LIMIT 1;
        
        IF v_constr_name IS NOT NULL THEN
            EXECUTE format('ALTER TABLE public.projects DROP CONSTRAINT %I', v_constr_name);
        END IF;
        
        -- Apply SET NULL to allow profile deletion while keeping the project record
        ALTER TABLE public.projects 
        ADD CONSTRAINT projects_team_designer_id_fkey 
        FOREIGN KEY (team_designer_id) REFERENCES public.profiles(id) 
        ON DELETE SET NULL;
    END IF;

    -- 2. Fix projects (assignee_id)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'projects') THEN
        ALTER TABLE public.projects ALTER COLUMN assignee_id DROP NOT NULL;
        
        SELECT constraint_name INTO v_constr_name
        FROM information_schema.key_column_usage
        WHERE table_name = 'projects' AND column_name = 'assignee_id'
        LIMIT 1;
        
        IF v_constr_name IS NOT NULL THEN
            EXECUTE format('ALTER TABLE public.projects DROP CONSTRAINT %I', v_constr_name);
        END IF;
        
        ALTER TABLE public.projects 
        ADD CONSTRAINT projects_assignee_id_fkey 
        FOREIGN KEY (assignee_id) REFERENCES public.profiles(id) 
        ON DELETE SET NULL;
    END IF;

    -- 2.5 Fix projects (team_slab_id)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'projects') THEN
        SELECT constraint_name INTO v_constr_name
        FROM information_schema.key_column_usage
        WHERE table_name = 'projects' AND column_name = 'team_slab_id'
        LIMIT 1;
        
        IF v_constr_name IS NOT NULL THEN
            EXECUTE format('ALTER TABLE public.projects DROP CONSTRAINT %I', v_constr_name);
        END IF;
        
        ALTER TABLE public.projects 
        ADD CONSTRAINT projects_team_slab_id_fkey 
        FOREIGN KEY (team_slab_id) REFERENCES public.team_pricing_slabs(id) 
        ON DELETE SET NULL;
    END IF;

    -- 3. Fix seller_commissions (seller_id)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'seller_commissions') THEN
        ALTER TABLE public.seller_commissions ALTER COLUMN seller_id DROP NOT NULL;
        
        SELECT constraint_name INTO v_constr_name
        FROM information_schema.key_column_usage
        WHERE table_name = 'seller_commissions' AND column_name = 'seller_id'
        LIMIT 1;
        
        IF v_constr_name IS NOT NULL THEN
            EXECUTE format('ALTER TABLE public.seller_commissions DROP CONSTRAINT %I', v_constr_name);
        END IF;
        
        ALTER TABLE public.seller_commissions 
        ADD CONSTRAINT seller_commissions_seller_id_fkey 
        FOREIGN KEY (seller_id) REFERENCES public.profiles(id) 
        ON DELETE SET NULL;
    END IF;

    -- 4. Fix labels (created_by)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'labels') THEN
        ALTER TABLE public.labels ALTER COLUMN created_by DROP NOT NULL;
        
        SELECT constraint_name INTO v_constr_name
        FROM information_schema.key_column_usage
        WHERE table_name = 'labels' AND column_name = 'created_by'
        LIMIT 1;
        
        IF v_constr_name IS NOT NULL THEN
            EXECUTE format('ALTER TABLE public.labels DROP CONSTRAINT %I', v_constr_name);
        END IF;
        
        ALTER TABLE public.labels 
        ADD CONSTRAINT labels_created_by_fkey 
        FOREIGN KEY (created_by) REFERENCES auth.users(id) 
        ON DELETE SET NULL;
    END IF;

END $$;

-- -----------------------------------------------------

-- --- MIGRATION 58: 20260329000000_fix_payout_payouts_final.sql ---

-- ========================================================
-- MANDATORY PAYOUT ENGINE FIX (STRICT BUSINESS LOGIC)
-- ========================================================

-- 1. FIX DESIGNER FEE FUNCTION (Global Freelancer / Team Lead Cut)
-- This ensures that it correctly handles both INSERT and UPDATE
CREATE OR REPLACE FUNCTION public.calculate_project_designer_fee()
RETURNS TRIGGER AS $$
DECLARE
  v_commission_val numeric := 0;
  v_commission_factor numeric := 0;
  v_net_amount numeric;
  v_slab_freelancer_pct numeric;
  v_slab_count int;
BEGIN
  -- 1. VALIDATION
  IF NEW.price IS NULL THEN 
    NEW.price := 0;
  END IF;

  -- 2. FETCH COMMISSION 
  -- We look for platform commissions linked to the account
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

  -- NORMALIZE (Handle both 20 or 0.20)
  IF v_commission_val > 1 THEN
    v_commission_factor := v_commission_val / 100.0;
  ELSE
    v_commission_factor := v_commission_val;
  END IF;

  -- 3. CALCULATE NET AMOUNT (Price minus platform commission)
  v_net_amount := NEW.price - (NEW.price * v_commission_factor);

  -- 4. SLAB SELECTION
  -- Select matching slab (checks if min <= price <= max)
  SELECT freelancer_percentage, COUNT(*) OVER()
  INTO v_slab_freelancer_pct, v_slab_count
  FROM pricing_slabs
  WHERE NEW.price >= min_price AND NEW.price <= max_price
  LIMIT 1;

  -- 5. SLAB CHECKING
  IF v_slab_count IS NOT NULL AND v_slab_count > 0 THEN
      NEW.designer_fee := v_net_amount * (v_slab_freelancer_pct / 100.0);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. RECREATE TRIGGER to handle both INSERT and UPDATE (Robust Fix)
-- This ensures that if Price or Account changes, the Designer Fee is recalculated
DROP TRIGGER IF EXISTS trg_calculate_designer_fee ON projects;
CREATE TRIGGER trg_calculate_designer_fee
BEFORE INSERT OR UPDATE OF price, account_id ON projects
FOR EACH ROW
EXECUTE FUNCTION calculate_project_designer_fee();


-- 3. FIX TEAM DESIGNER PAYOUT FUNCTION (Lead -> Designer Share)
-- This ensures it updates the correct column (team_designer_fee) and handles legacy columns
CREATE OR REPLACE FUNCTION public.calculate_team_designer_payout()
RETURNS TRIGGER AS $$
DECLARE
    v_slab_percentage NUMERIC;
    v_slab_id UUID;
    v_tl_id UUID;
BEGIN
    -- Only calculate if there is a team designer assigned
    IF NEW.team_designer_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- The Team Lead is the assignee_id
    v_tl_id := NEW.assignee_id;

    -- Fallback: If assignee_id is missing, look up by assignee name (for older records)
    IF v_tl_id IS NULL AND NEW.assignee IS NOT NULL THEN
        SELECT id INTO v_tl_id FROM profiles WHERE name = NEW.assignee OR email = NEW.assignee LIMIT 1;
    END IF;

    -- If no Lead found, we can't find the TL's slabs
    IF v_tl_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Find the TL's slab that covers the project's designer_fee (the Lead's share)
    SELECT percentage, id INTO v_slab_percentage, v_slab_id
    FROM public.team_pricing_slabs
    WHERE team_lead_id = v_tl_id
      AND NEW.designer_fee >= min_price 
      AND NEW.designer_fee <= max_price
      AND is_active = true
    LIMIT 1;

    -- If slab found, calculate payout (percentage of TL's designer_fee)
    IF v_slab_id IS NOT NULL THEN
        NEW.team_designer_fee := NEW.designer_fee * (v_slab_percentage / 100.0);
        NEW.team_payout := NEW.team_designer_fee; -- Legacy column support
        NEW.team_slab_id := v_slab_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RECREATE TRIGGER for Team Designer Fee (Robust Fix)
-- This ensures it runs whenever a designer is assigned or the Lead's fee changes
DROP TRIGGER IF EXISTS trg_calculate_team_designer_payout ON public.projects;
CREATE TRIGGER trg_calculate_team_designer_payout
BEFORE INSERT OR UPDATE OF team_designer_id, designer_fee, assignee_id ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.calculate_team_designer_payout();

-- 5. BACKFILL: Recalculate fees for all impacted projects
-- This will trigger BOTH functions above for every project with a price
UPDATE projects 
SET price = price 
WHERE status != 'Cancelled' 
  AND price > 0;

-- 6. Ensure all slabs are active unless manually disabled
-- Check if column exists first before updating
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pricing_slabs' AND column_name='is_active') THEN
        UPDATE pricing_slabs SET is_active = true WHERE is_active = false;
    END IF;
END $$;

-- -----------------------------------------------------

-- --- MIGRATION 59: 20260329120000_user_specific_payout_strategy.sql ---

-- USER-SPECIFIC PAYOUT STRATEGY (Slab vs Fixed)
-- 1. Add new columns to profiles if they don't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS payout_strategy TEXT DEFAULT 'slab',
ADD COLUMN IF NOT EXISTS fixed_payout_rate NUMERIC DEFAULT 0;

-- 2. Update Basic Designer Fee Trigger Function
CREATE OR REPLACE FUNCTION calculate_project_designer_fee()
RETURNS TRIGGER AS $$
DECLARE
  v_commission_val numeric := 0;
  v_commission_factor numeric := 0;
  v_net_amount numeric;
  v_slab_freelancer_pct numeric;
  v_slab_count int;
  v_user_strategy text := 'slab';
  v_user_fixed_rate numeric := 0;
BEGIN
  -- VALIDATION
  IF NEW.price IS NULL THEN 
    NEW.price := 0; 
  END IF;
  
  -- 0. Check User's Payout Strategy (Priority)
  IF NEW.assignee_id IS NOT NULL THEN
      SELECT payout_strategy, fixed_payout_rate 
      INTO v_user_strategy, v_user_fixed_rate
      FROM public.profiles 
      WHERE id = NEW.assignee_id;
  END IF;

  -- Strategy: FIXED
  IF v_user_strategy = 'fixed' THEN
      NEW.designer_fee := COALESCE(v_user_fixed_rate, 0);
      RETURN NEW;
  END IF;

  -- Strategy: SLAB (Original Logic)
  IF NEW.account_id IS NULL THEN 
    RETURN NEW; 
  END IF;

  -- fetch commission with SECURITY DEFINER
  SELECT pc.commission_percentage
  INTO v_commission_val
  FROM public.platform_commissions pc
  JOIN public.platform_commission_accounts pca ON pc.id = pca.platform_commission_id
  WHERE pca.account_id = NEW.account_id
  LIMIT 1;

  IF v_commission_val IS NULL THEN v_commission_val := 0; END IF;

  -- NORMALIZE
  IF v_commission_val > 1 THEN v_commission_factor := v_commission_val / 100.0;
  ELSE v_commission_factor := v_commission_val; END IF;

  -- CALCULATION
  v_net_amount := NEW.price - (NEW.price * v_commission_factor);

  -- SLAB SELECTION
  SELECT freelancer_percentage, COUNT(*) OVER()
  INTO v_slab_freelancer_pct, v_slab_count
  FROM public.pricing_slabs
  WHERE NEW.price >= min_price AND NEW.price <= max_price;

  -- Check Slabs (Non-blocking fallback to 0 if no slab found)
  IF v_slab_count IS NOT NULL AND v_slab_count > 0 THEN
    NEW.designer_fee := v_net_amount * (v_slab_freelancer_pct / 100.0);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update Team Designer Payout Trigger Function
CREATE OR REPLACE FUNCTION calculate_team_designer_payout()
RETURNS TRIGGER AS $$
DECLARE
    v_tl_id text;
    v_td_id text;
    v_slab_percentage numeric;
    v_td_strategy text := 'slab';
    v_td_fixed_rate numeric := 0;
BEGIN
    -- 0. Identify Team Lead and Team Designer
    v_tl_id := NEW.assignee_id;
    v_td_id := NEW.team_designer_id;

    -- If no Team Designer, set fee to 0
    IF v_td_id IS NULL THEN
        NEW.team_designer_fee := 0;
        NEW.team_payout := 0;
        RETURN NEW;
    END IF;

    -- 1. Check Team Designer's Strategy
    SELECT payout_strategy, fixed_payout_rate 
    INTO v_td_strategy, v_td_fixed_rate
    FROM public.profiles 
    WHERE id = v_td_id;

    -- Strategy: FIXED
    IF v_td_strategy = 'fixed' THEN
        NEW.team_designer_fee := COALESCE(v_td_fixed_rate, 0);
        NEW.team_payout := NEW.team_designer_fee; -- Legacy support
        RETURN NEW;
    END IF;

    -- Strategy: SLAB (Original Logic)
    -- Get slab calculation for the designer from the team's pricing slabs
    SELECT td_percentage INTO v_slab_percentage
    FROM public.team_pricing_slabs
    WHERE team_lead_id = v_tl_id
      AND NEW.designer_fee >= min_designer_fee 
      AND NEW.designer_fee <= max_designer_fee
    LIMIT 1;

    -- Update fee if slab exists
    IF v_slab_percentage IS NOT NULL THEN
        NEW.team_designer_fee := NEW.designer_fee * (v_slab_percentage / 100.0);
        NEW.team_payout := NEW.team_designer_fee; -- Legacy support
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------

-- --- MIGRATION 60: 20260402000000_fix_project_collaborators_rls.sql ---
-- 🛡️ FIX PROJECT COLLABORATORS RLS POLICY
-- This migration ensures that authenticated users (Admins, PMs, Team Leads)
-- can correctly manage project collaborators without hitting 42501 RLS errors.
-- These errors were previously blocking project edits where collaborators were modified.

-- 1. Ensure RLS is enabled
ALTER TABLE public.project_collaborators ENABLE ROW LEVEL SECURITY;

-- 2. Allow all authenticated users to SEE collaborators
DROP POLICY IF EXISTS "Anyone can view project collaborators" ON public.project_collaborators;
CREATE POLICY "Anyone can view project collaborators"
ON public.project_collaborators FOR SELECT
TO authenticated
USING (true);

-- 3. Allow authorized roles to MANAGE (Insert/Update/Delete) collaborators
-- This includes Super Admin, Admin, Project Manager, and Team Lead.
DROP POLICY IF EXISTS "Lead roles can manage project collaborators" ON public.project_collaborators;
CREATE POLICY "Lead roles can manage project collaborators"
ON public.project_collaborators FOR ALL
TO authenticated
USING (
    (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'super admin'
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'admin'
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'project operations manager'
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'project manager'
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'team lead'
)
WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'super admin'
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'admin'
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'project operations manager'
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'project manager'
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'team lead'
);

-- Note: We use meta-data role check for maximum O(1) performance in RLS.

-- -----------------------------------------------------

-- --- MIGRATION 61: 20260406000000_fix_forms_rls.sql ---
-- 🛡️ FIX FORM ASSIGNMENTS & LOGS RLS
-- Allows Super Admin, Admin, and Project Managers to manage form assignments and logs.
-- Allows users to view and update their own assignments, and submit logs.

-- 1. Ensure RLS is enabled on relevant tables
ALTER TABLE public.form_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_logs ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- FORM_ASSIGNMENTS POLICIES
-- ==========================================

-- 1.1 SELECT: Management can see all, Users can see their own
DROP POLICY IF EXISTS "Anyone can view assignments" ON public.form_assignments;
DROP POLICY IF EXISTS "Management and owners can view assignments" ON public.form_assignments;
CREATE POLICY "Management and owners can view assignments"
ON public.form_assignments FOR SELECT
TO authenticated
USING (
    auth.uid() = user_id 
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'super admin'
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'admin'
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'project operations manager'
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'project manager'
);

-- 1.2 INSERT/UPDATE/DELETE: Management can manage all, Users can update (snooze) their own
DROP POLICY IF EXISTS "Management can manage assignments" ON public.form_assignments;
CREATE POLICY "Management can manage assignments"
ON public.form_assignments FOR ALL
TO authenticated
USING (
    (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'super admin'
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'admin'
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'project operations manager'
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'project manager'
)
WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'super admin'
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'admin'
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'project operations manager'
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'project manager'
);

DROP POLICY IF EXISTS "Users can update their own assignments" ON public.form_assignments;
CREATE POLICY "Users can update their own assignments"
ON public.form_assignments FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);


-- ==========================================
-- FORM_LOGS POLICIES
-- ==========================================

-- 2.1 SELECT: Management can see all, Users can see their own
DROP POLICY IF EXISTS "Management and owners can view logs" ON public.form_logs;
CREATE POLICY "Management and owners can view logs"
ON public.form_logs FOR SELECT
TO authenticated
USING (
    auth.uid() = user_id 
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'super admin'
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'admin'
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'project operations manager'
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'project manager'
);

-- 2.2 INSERT/UPDATE/DELETE: Management can manage all, Users can insert their own
DROP POLICY IF EXISTS "Management can manage logs" ON public.form_logs;
CREATE POLICY "Management can manage logs"
ON public.form_logs FOR ALL
TO authenticated
USING (
    (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'super admin'
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'admin'
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'project operations manager'
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'project manager'
)
WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'super admin'
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'admin'
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'project operations manager'
    OR (auth.jwt() -> 'user_metadata' ->> 'role')::text ILIKE 'project manager'
);

DROP POLICY IF EXISTS "Users can insert their own logs" ON public.form_logs;
CREATE POLICY "Users can insert their own logs"
ON public.form_logs FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- -----------------------------------------------------

-- --- MIGRATION 62: 20260407000001_add_qa_workflow_columns.sql ---
-- Migration: Add QA Workflow Columns
-- Created: 2026-04-07

-- 1. Add qa_status to projects
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS qa_status text DEFAULT NULL;
-- Possible values: 'pending_qa', 'qa_revision', 'qa_approved'

-- 2. Add is_internal flag to comments to distinguish QA feedback
-- Defaults to false so existing comments remain visible in main timeline
ALTER TABLE project_comments 
ADD COLUMN IF NOT EXISTS is_internal boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS category text DEFAULT 'comment';

-- 3. Add project_id and category to assets
-- To link files to specific projects and distinguish between previews and final files
ALTER TABLE assets 
ADD COLUMN IF NOT EXISTS project_id text REFERENCES projects(project_id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS category text DEFAULT 'deliverable';
-- Categories: 'deliverable', 'qa_preview'

-- 4. Speed up filtering with indexes
CREATE INDEX IF NOT EXISTS idx_project_comments_is_internal ON project_comments(is_internal);
CREATE INDEX IF NOT EXISTS idx_projects_qa_status ON projects(qa_status);
CREATE INDEX IF NOT EXISTS idx_assets_project_id ON assets(project_id);
CREATE INDEX IF NOT EXISTS idx_assets_category ON assets(category);

-- 5. Update projects_with_collaborators view to include qa_status
-- This ensures the frontend project details can actually read the new column
CREATE OR REPLACE VIEW public.projects_with_collaborators AS
SELECT 
    p.id,
    p.project_id,
    p.action_move,
    p.project_title,
    p.account,
    p.client_type,
    p.client_name,
    p.previous_logo_no,
    p.items_sold,
    p.addons,
    p.medium,
    p.price,
    p.brief,
    p.attachments,
    p.due_date,
    p.due_time,
    p.assignee,
    p.removal_reason,
    p.cancellation_reason,
    p.tips_given,
    p.tip_amount,
    p.status,
    p.created_at,
    p.updated_at,
    p.account_id,
    p.designer_fee,
    p.primary_manager_id,
    p.options_required,
    p.has_dispute,
    p.has_art_help,
    p.payout_completed,
    p.converted_by,
    p.order_type,
    p.assignee_id,
    p.team_designer_id,
    p.team_payout,
    p.team_slab_id,
    p.client_due_date,
    p.client_due_time,
    p.revision_notes,
    p.qa_status, -- Added column
    COALESCE(
        (
            SELECT jsonb_agg(jsonb_build_object(
                'id', pc.member_id,
                'name', pr.name,
                'role', pr.role
            ))
            FROM project_collaborators pc
            JOIN profiles pr ON pc.member_id = pr.id
            WHERE pc.project_id = p.project_id
        ),
        '[]'::jsonb
    ) as collaborators
FROM public.projects p;

-- 6. Update get_project_status_counts RPC
-- This ensures that dashboard tabs show correct counts and isolate QA projects
CREATE OR REPLACE FUNCTION get_project_status_counts()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'all', COUNT(*),
    'dispute', COUNT(*) FILTER (WHERE has_dispute = true),
    'arthelp', COUNT(*) FILTER (WHERE has_art_help = true),
    'qa_pending', COUNT(*) FILTER (WHERE qa_status = 'pending_qa')
  ) || COALESCE((
    SELECT jsonb_object_agg(status_clean, cnt)
    FROM (
      SELECT LOWER(TRIM(status)) as status_clean, COUNT(*) as cnt
      FROM projects
      WHERE status != 'Removed' 
      AND (qa_status IS NULL OR qa_status != 'pending_qa') -- Filter out QA isolated projects from standard counts
      GROUP BY 1
    ) t
  ), '{}'::jsonb)
  INTO result
  FROM projects
  WHERE status != 'Removed';
  
  RETURN COALESCE(result, '{}'::jsonb);
END;
$$;

-- -----------------------------------------------------

-- --- MIGRATION 63: 20260408000001_create_attachments_bucket.sql ---
-- ============================================
-- STORAGE SETUP: PROJECT ATTACHMENTS
-- ============================================

-- 1. Create 'attachments' bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Enable RLS on storage.objects (usually enabled by default in Supabase)

-- 3. Create RLS Policies for the 'attachments' bucket

-- Allow public read access to attachments
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'attachments');

-- Allow authenticated users to upload attachments
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'attachments');

-- Allow authenticated users to delete their own uploads (optional but good practice)
DROP POLICY IF EXISTS "Authenticated Delete" ON storage.objects;
CREATE POLICY "Authenticated Delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'attachments');

-- -----------------------------------------------------

-- --- MIGRATION 64: 20260410000000_activity_logs.sql ---
-- Migration: Global Activity Logs
-- Created: 2026-04-10
-- Description: Centralized logging for all project activities using database triggers.

-- 1. Create activity_logs table
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id TEXT,
    user_id UUID REFERENCES auth.users(id),
    user_name TEXT,
    action_type TEXT NOT NULL, -- 'status_change', 'qa_status_change', 'comment', 'assignee_change'
    old_value JSONB DEFAULT '{}'::jsonb,
    new_value JSONB DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Performance Optimization: Indexing
CREATE INDEX IF NOT EXISTS idx_activity_logs_project_id ON activity_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action_type ON activity_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);

-- 2. Security: Enable RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Only Admins and Super Admins can view activity logs
DROP POLICY IF EXISTS "Admins can view all logs" ON public.activity_logs;
CREATE POLICY "Admins can view all logs" ON public.activity_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND (role = 'Admin' OR role = 'Super Admin')
        )
    );

-- 3. Trigger Function: Log Project Changes (INSERT and UPDATE)
CREATE OR REPLACE FUNCTION public.handle_project_changes_logging()
RETURNS TRIGGER AS $$
DECLARE
    current_uid UUID;
    current_user_name TEXT;
BEGIN
    current_uid := auth.uid();
    
    -- Resolve user name
    IF current_uid IS NOT NULL THEN
        SELECT name INTO current_user_name FROM profiles WHERE id = current_uid;
    ELSE
        current_user_name := 'System';
    END IF;

    -- A. Handle INSERT (Project Creation) - Capture full initial state
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.activity_logs (
            project_id, user_id, user_name, action_type, new_value, metadata
        ) VALUES (
            NEW.project_id, current_uid, current_user_name, 'project_created',
            jsonb_build_object(
                'status', NEW.status,
                'assignee', NEW.assignee,
                'price', NEW.price,
                'qa_status', NEW.qa_status
            ),
            jsonb_build_object('project_title', NEW.project_title)
        );
        RETURN NEW;
    END IF;

    -- B. Handle UPDATE (Changes)
    IF (TG_OP = 'UPDATE') THEN
        -- Log Status Changes
        IF (OLD.status IS DISTINCT FROM NEW.status) THEN
            INSERT INTO public.activity_logs (
                project_id, user_id, user_name, action_type, old_value, new_value, metadata
            ) VALUES (
                NEW.project_id, current_uid, current_user_name, 'status_change',
                jsonb_build_object('status', OLD.status),
                jsonb_build_object('status', NEW.status),
                jsonb_build_object('project_title', NEW.project_title)
            );
        END IF;

        -- Log QA Status Changes
        IF (OLD.qa_status IS DISTINCT FROM NEW.qa_status) THEN
            INSERT INTO public.activity_logs (
                project_id, user_id, user_name, action_type, old_value, new_value, metadata
            ) VALUES (
                NEW.project_id, current_uid, current_user_name, 'qa_status_change',
                jsonb_build_object('qa_status', OLD.qa_status),
                jsonb_build_object('qa_status', NEW.qa_status),
                jsonb_build_object('project_title', NEW.project_title)
            );
        END IF;

        -- Log Assignee Changes
        IF (OLD.assignee_id IS DISTINCT FROM NEW.assignee_id OR OLD.assignee IS DISTINCT FROM NEW.assignee) THEN
            INSERT INTO public.activity_logs (
                project_id, user_id, user_name, action_type, old_value, new_value, metadata
            ) VALUES (
                NEW.project_id, current_uid, current_user_name, 'assignee_change',
                jsonb_build_object('assignee', OLD.assignee),
                jsonb_build_object('assignee', NEW.assignee),
                jsonb_build_object('project_title', NEW.project_title)
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for Projects (INSERT/UPDATE)
DROP TRIGGER IF EXISTS tr_log_project_changes ON projects;
CREATE TRIGGER tr_log_project_changes
    AFTER INSERT OR UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION handle_project_changes_logging();

-- 4. Trigger Function: Log New Comments (Handling System Logs)
CREATE OR REPLACE FUNCTION public.handle_new_comment_logging()
RETURNS TRIGGER AS $$
DECLARE
    project_title_val TEXT;
    project_created_at TIMESTAMPTZ;
    current_uid UUID;
    display_name TEXT;
BEGIN
    current_uid := auth.uid();
    
    -- Get project details
    SELECT project_title, created_at 
    INTO project_title_val, project_created_at 
    FROM projects WHERE project_id = NEW.project_id;
    
    display_name := NEW.author_name;

    -- Detect System-Generated Logs: Assignment (PROJECT_ASSIGNED|... or PROJECT_ASSIGNED:...)
    IF NEW.content LIKE 'PROJECT_ASSIGNED|%' OR NEW.content LIKE 'PROJECT_ASSIGNED:%' THEN
        -- SKIP if the project was created less than 30 seconds ago (already in project_created log)
        IF (now() - project_created_at) < interval '30 seconds' THEN
            RETURN NEW;
        END IF;

        INSERT INTO public.activity_logs (
            project_id, user_id, user_name, action_type, new_value, metadata
        ) VALUES (
            NEW.project_id, current_uid, display_name, 'assignee_change',
            jsonb_build_object('assignee', COALESCE(split_part(NEW.content, '|', 3), split_part(NEW.content, ':', 3))),
            jsonb_build_object('project_title', project_title_val, 'is_system_log', true)
        );
        RETURN NEW;
    END IF;

    -- Ignore Technical Status Change Comments (Source of truth is the projects table)
    -- This prevents the "COMMENT: STATUS_CHANGED:..." duplicate entry
    IF NEW.content LIKE 'STATUS_CHANGED:%' OR NEW.content LIKE 'STATUS_CHANGED|%' THEN
        RETURN NEW;
    END IF;

    -- Default: Normal Comment
    INSERT INTO public.activity_logs (
        project_id, user_id, user_name, action_type, new_value, metadata
    ) VALUES (
        NEW.project_id, current_uid, display_name,
        CASE WHEN NEW.is_internal THEN 'qa_comment' ELSE 'comment' END,
        jsonb_build_object('content', NEW.content),
        jsonb_build_object('project_title', project_title_val, 'is_internal', NEW.is_internal)
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for Comments
DROP TRIGGER IF EXISTS tr_log_new_comment ON project_comments;
CREATE TRIGGER tr_log_new_comment
    AFTER INSERT ON project_comments
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_comment_logging();

-- 5. Permissions: Register and Grant view_activity_logs
-- First register the permission in the main permissions table
INSERT INTO public.permissions (code, name, category, description)
VALUES ('view_activity_logs', 'View Activity Logs', 'System', 'Allows users to view the global system activity and audit logs.')
ON CONFLICT (code) DO NOTHING;

-- Then grant it to the Admin role
INSERT INTO public.role_permissions (role_name, permission_code)
VALUES ('Admin', 'view_activity_logs')
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------

-- --- MIGRATION 65: 20260410000001_project_unread_tracking.sql ---
-- Migration: Project Unread Tracking (Blue Dot System)
-- Created: 2026-04-10
-- Description: Tracks the latest message in a project and per-user read states to show a blue dot notification.

-- 1. Add tracking columns to projects
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS latest_comment_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS latest_comment_author_id UUID;

-- 2. Add author_id to project_comments for robust tracking
ALTER TABLE public.project_comments 
ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES auth.users(id);

-- 3. Create project_read_states table
CREATE TABLE IF NOT EXISTS public.project_read_states (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id TEXT, -- matches projects.project_id
    last_read_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (user_id, project_id)
);

-- Enable RLS for read states
ALTER TABLE public.project_read_states ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see/update their own read states
DROP POLICY IF EXISTS "Users can manage own read states" ON public.project_read_states;
CREATE POLICY "Users can manage own read states"
    ON public.project_read_states
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 4. Trigger Function: Update project latest message info (ONLY FOR DISCUSSION)
CREATE OR REPLACE FUNCTION public.handle_update_project_latest_comment()
RETURNS TRIGGER AS $$
BEGIN
    -- Only trigger Blue Dot for Discussion messages as per user requirement
    IF NEW.category = 'discussion' THEN
        UPDATE public.projects 
        SET 
            latest_comment_at = NEW.created_at,
            latest_comment_author_id = auth.uid(),
            updated_at = now()
        WHERE project_id = NEW.project_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for Project Comments
DROP TRIGGER IF EXISTS tr_update_project_latest_comment ON project_comments;
CREATE TRIGGER tr_update_project_latest_comment
    AFTER INSERT ON project_comments
    FOR EACH ROW
    EXECUTE FUNCTION handle_update_project_latest_comment();

-- 5. Backfill: Set initial latest_comment_at for existing projects
UPDATE public.projects p
SET latest_comment_at = (
    SELECT MAX(created_at) 
    FROM public.project_comments 
    WHERE project_id = p.project_id
)
WHERE latest_comment_at IS NULL;

-- -----------------------------------------------------

-- --- MIGRATION 66: 20260410000002_fix_unread_tracking_trigger.sql ---
-- Migration: Fix Project Unread Tracking Trigger
-- Description: Ensures system logs and non-discussion comments do not trigger the unread blue dot.
-- Also cleans up any existing stale data where system logs erroneously populated latest_comment_at.

-- 1. Update the trigger function to be more strict
CREATE OR REPLACE FUNCTION public.handle_update_project_latest_comment()
RETURNS TRIGGER AS $$
BEGIN
    -- Only trigger Blue Dot for genuine Discussion messages
    -- 1. Category must be 'discussion'
    -- 2. Content must NOT be a system log prefix
    -- 3. MUST NOT be an internal/QA comment
    IF NEW.category = 'discussion' 
       AND NEW.is_internal = false
       AND NEW.content NOT LIKE 'PROJECT_ASSIGNED%'
       AND NEW.content NOT LIKE 'STATUS_CHANGED%'
       AND NEW.content NOT LIKE 'QA_STATUS_CHANGED%'
       AND NEW.content NOT LIKE 'FILE_SUBMITTED%'
    THEN
        UPDATE public.projects 
        SET 
            latest_comment_at = NEW.created_at,
            latest_comment_author_id = NEW.author_id, -- Use the author_id from the comment
            updated_at = now()
        WHERE project_id = NEW.project_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Clean up existing projects that were triggered by system logs
-- We set latest_comment_at to NULL if the latest comment for that project is NOT a discussion message
UPDATE public.projects p
SET 
    latest_comment_at = sub.last_disc_at,
    latest_comment_author_id = sub.last_disc_author
FROM (
    -- Find the latest genuine discussion message for each project
    SELECT DISTINCT ON (project_id)
        project_id,
        created_at as last_disc_at,
        author_id as last_disc_author
    FROM public.project_comments
    WHERE category = 'discussion' 
      AND is_internal = false
      AND content NOT LIKE 'PROJECT_ASSIGNED%'
      AND content NOT LIKE 'STATUS_CHANGED%'
    ORDER BY project_id, created_at DESC
) sub
WHERE p.project_id = sub.project_id;

-- Clear latest_comment_at for projects that have NO discussion messages (only system logs)
UPDATE public.projects
SET 
    latest_comment_at = NULL,
    latest_comment_author_id = NULL
WHERE project_id NOT IN (
    SELECT DISTINCT project_id 
    FROM public.project_comments 
    WHERE category = 'discussion'
);

-- -----------------------------------------------------

-- --- MIGRATION 67: 20260411000000_add_decrease_capacity_type.sql ---

-- Add 'decrease_capacity' to capacity_ticket_type enum
DO $$ 
BEGIN
    ALTER TYPE capacity_ticket_type ADD VALUE IF NOT EXISTS 'decrease_capacity';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- -----------------------------------------------------

-- --- MIGRATION 68: 20260411000001_add_workload_permission_to_tl.sql ---
-- Grant 'view_workload' and 'edit_workload' permission to 'Team Lead' role
INSERT INTO role_permissions (role_name, permission_code)
VALUES 
    ('Team Lead', 'view_workload'),
    ('Team Lead', 'edit_workload')
ON CONFLICT (role_name, permission_code) DO NOTHING;

-- -----------------------------------------------------

-- --- MIGRATION 69: 20260411000002_add_location_to_leads.sql ---
-- Migration: Add Location to Leads
-- Description: Adds a location column to the leads table to store client geographical information.

ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS location text;

-- -----------------------------------------------------

-- --- MIGRATION 70: 20260417000000_add_project_alerts.sql ---
-- Migration: Add Alert Management Columns to Projects
-- This allows tracking Art Help and Dispute workflows

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS alert_type text CHECK (alert_type IN ('arthelp', 'dispute')),
ADD COLUMN IF NOT EXISTS alert_status text CHECK (alert_status IN ('triggered', 'resolved', 'confirmed')),
ADD COLUMN IF NOT EXISTS alert_initiator_id uuid REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS alert_resolver_id uuid REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS alert_reason text,
ADD COLUMN IF NOT EXISTS alert_additional_message text;

-- Add index for performance on active alerts
CREATE INDEX IF NOT EXISTS idx_projects_alert_active ON projects(alert_type) WHERE alert_type IS NOT NULL;

-- -----------------------------------------------------

-- --- MIGRATION 71: 20260417181500_update_view_alert_columns.sql ---
-- Migration: Fix projects_with_collaborators view column naming conflict
-- Created: 2026-04-17

DROP VIEW IF EXISTS public.projects_with_collaborators CASCADE;

CREATE VIEW public.projects_with_collaborators AS
SELECT 
    p.id,
    p.project_id,
    p.action_move,
    p.project_title,
    p.account,
    p.client_type,
    p.client_name,
    p.previous_logo_no,
    p.items_sold,
    p.addons,
    p.medium,
    p.price,
    p.brief,
    p.attachments,
    p.due_date,
    p.due_time,
    p.assignee,
    p.removal_reason,
    p.cancellation_reason,
    p.tips_given,
    p.tip_amount,
    p.status,
    p.created_at,
    p.updated_at,
    p.account_id,
    p.designer_fee,
    p.team_designer_fee,
    p.primary_manager_id,
    p.options_required,
    p.has_dispute,
    p.has_art_help,
    p.payout_completed,
    p.converted_by,
    p.order_type,
    p.assignee_id,
    p.team_designer_id,
    p.team_payout,
    p.team_slab_id,
    p.client_due_date,
    p.client_due_time,
    p.revision_notes,
    p.qa_status,
    p.alert_type,
    p.alert_status,
    p.alert_initiator_id,
    p.alert_resolver_id,
    p.alert_reason,
    p.alert_additional_message,
    COALESCE(
        (
            SELECT jsonb_agg(jsonb_build_object(
                'id', pc.member_id,
                'name', pr.name,
                'role', pr.role
            ))
            FROM project_collaborators pc
            JOIN profiles pr ON pc.member_id = pr.id
            WHERE pc.project_id = p.project_id
        ),
        '[]'::jsonb
    ) as collaborators
FROM public.projects p;

GRANT SELECT ON public.projects_with_collaborators TO authenticated;
GRANT SELECT ON public.projects_with_collaborators TO service_role;
GRANT SELECT ON public.projects_with_collaborators TO anon;
ALTER VIEW public.projects_with_collaborators SET (security_invoker = true);

-- -----------------------------------------------------

-- --- MIGRATION 72: 20260418000000_mass_project_approval.sql ---
-- Migration: Mass project approval and clearance date update
-- Created: 2026-04-18
-- Based on: Approved Projects Clearance Start Date CSV

-- 1. Add clearance_start_date to projects table
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS clearance_start_date date DEFAULT NULL;

-- 2. Update projects_with_collaborators view to include the new column
DROP VIEW IF EXISTS public.projects_with_collaborators CASCADE;
CREATE OR REPLACE VIEW public.projects_with_collaborators AS
SELECT 
    p.id,
    p.project_id,
    p.action_move,
    p.project_title,
    p.account,
    p.client_type,
    p.client_name,
    p.previous_logo_no,
    p.items_sold,
    p.addons,
    p.medium,
    p.price,
    p.brief,
    p.attachments,
    p.due_date,
    p.due_time,
    p.assignee,
    p.removal_reason,
    p.cancellation_reason,
    p.tips_given,
    p.tip_amount,
    p.status,
    p.created_at,
    p.updated_at,
    p.account_id,
    p.designer_fee,
    p.team_designer_fee,
    p.primary_manager_id,
    p.options_required,
    p.has_dispute,
    p.has_art_help,
    p.payout_completed,
    p.converted_by,
    p.order_type,
    p.assignee_id,
    p.team_designer_id,
    p.team_payout,
    p.team_slab_id,
    p.client_due_date,
    p.client_due_time,
    p.revision_notes,
    p.qa_status,
    p.alert_type,
    p.alert_status,
    p.alert_initiator_id,
    p.alert_resolver_id,
    p.alert_reason,
    p.alert_additional_message,
    p.clearance_start_date, -- New column
    COALESCE(
        (
            SELECT jsonb_agg(jsonb_build_object(
                'id', pc.member_id,
                'name', pr.name,
                'role', pr.role
            ))
            FROM project_collaborators pc
            JOIN profiles pr ON pc.member_id = pr.id
            WHERE pc.project_id = p.project_id
        ),
        '[]'::jsonb
    ) as collaborators
FROM public.projects p;

GRANT SELECT ON public.projects_with_collaborators TO authenticated;
GRANT SELECT ON public.projects_with_collaborators TO service_role;
GRANT SELECT ON public.projects_with_collaborators TO anon;
ALTER VIEW public.projects_with_collaborators SET (security_invoker = true);

-- 3. Perform mass update for specified projects
UPDATE projects
SET 
    status = 'Approved',
    clearance_start_date = CASE project_id
        WHEN 'MAN 100122' THEN '2026-03-05'::date
        WHEN 'MAN 100126' THEN '2026-03-11'::date
        WHEN 'MAN 100135' THEN '2026-03-13'::date
        WHEN 'MAN 100137' THEN '2026-03-20'::date
        WHEN 'MAN 100140' THEN '2026-03-10'::date
        WHEN 'MAN 100143' THEN '2026-03-30'::date
        WHEN 'MAN 100159' THEN '2026-03-20'::date
        WHEN 'MAN 100160' THEN '2026-03-12'::date
        WHEN 'MAN 100161' THEN '2026-03-14'::date
        WHEN 'MAN 100162' THEN '2026-03-29'::date
        WHEN 'MAN 100168' THEN '2026-04-04'::date
        WHEN 'MAN 100178' THEN '2026-03-30'::date
        WHEN 'MAN 217459' THEN '2026-04-01'::date
        WHEN 'MAN 854123' THEN '2026-03-14'::date
        WHEN 'MAN 939627' THEN '2026-03-18'::date
        WHEN 'MAN 210636' THEN '2026-04-09'::date
        WHEN 'MAN 329867' THEN '2026-04-09'::date
        WHEN 'MAN 415083' THEN '2026-03-21'::date
        WHEN 'MAN 792741' THEN '2026-03-21'::date
        WHEN 'MAN 223840' THEN '2026-04-06'::date
        WHEN 'MAN 845553' THEN '2026-03-29'::date
        WHEN 'MAN 337365' THEN '2026-03-29'::date
        WHEN 'MAN 766865' THEN '2026-04-08'::date
        WHEN 'MAN 215915' THEN '2026-04-03'::date
        WHEN 'MAN 719191' THEN '2026-04-10'::date
        WHEN 'MAN 391459' THEN '2026-04-06'::date
        WHEN 'MAN 154284' THEN '2026-04-12'::date
        WHEN 'MAN 312877' THEN '2026-04-07'::date
        WHEN 'MAN 452876' THEN '2026-04-06'::date
        WHEN 'MAN 877128' THEN '2026-04-12'::date
    END
WHERE project_id IN (
    'MAN 100122', 'MAN 100126', 'MAN 100135', 'MAN 100137', 'MAN 100140',
    'MAN 100143', 'MAN 100159', 'MAN 100160', 'MAN 100161', 'MAN 100162',
    'MAN 100168', 'MAN 100178', 'MAN 217459', 'MAN 854123', 'MAN 939627',
    'MAN 210636', 'MAN 329867', 'MAN 415083', 'MAN 792741', 'MAN 223840',
    'MAN 845553', 'MAN 337365', 'MAN 766865', 'MAN 215915', 'MAN 719191',
    'MAN 391459', 'MAN 154284', 'MAN 312877', 'MAN 452876', 'MAN 877128'
);

-- -----------------------------------------------------

-- --- MIGRATION 73: 20260418000001_mass_project_approval_arsalan.sql ---
-- Migration: Mass project approval and clearance date update for Arsalan Hussain
-- Created: 2026-04-18
-- Based on: Approved Projects Clearance Start Date - Arsalan Hussain CSV

-- Perform mass update for specified projects
UPDATE projects
SET 
    status = 'Approved',
    clearance_start_date = CASE project_id
        WHEN 'MAN 364263' THEN '2026-03-23'::date
        WHEN 'MAN 995088' THEN '2026-04-07'::date
        WHEN 'MAN 738131' THEN '2026-03-18'::date
        WHEN 'MAN 384473' THEN '2026-03-17'::date
        WHEN 'MAN 377396' THEN '2026-03-22'::date
        WHEN 'MAN 166438' THEN '2026-03-23'::date
        WHEN 'MAN 937014' THEN '2026-03-21'::date
        WHEN 'MAN 534266' THEN '2026-03-25'::date
        WHEN 'MAN 718843' THEN '2026-04-05'::date
        WHEN 'MAN 830890' THEN '2026-03-29'::date
        WHEN 'MAN 122327' THEN '2026-03-28'::date
        WHEN 'MAN 953379' THEN '2026-03-31'::date
        WHEN 'MAN 224406' THEN '2026-04-07'::date
        WHEN 'MAN 572307' THEN '2026-04-05'::date
        WHEN 'MAN 734778' THEN '2026-04-04'::date
        WHEN 'MAN 808808' THEN '2026-04-11'::date
        WHEN 'MAN 260104' THEN '2026-04-13'::date
    END
WHERE project_id IN (
    'MAN 364263', 'MAN 995088', 'MAN 738131', 'MAN 384473', 'MAN 377396',
    'MAN 166438', 'MAN 937014', 'MAN 534266', 'MAN 718843', 'MAN 830890',
    'MAN 122327', 'MAN 953379', 'MAN 224406', 'MAN 572307', 'MAN 734778',
    'MAN 808808', 'MAN 260104'
);

-- -----------------------------------------------------

-- --- MIGRATION 74: 20260418000002_tiered_payout_strategy.sql ---

-- PAYOUT RULES TABLE
CREATE TABLE IF NOT EXISTS public.payout_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    min_price NUMERIC NOT NULL,
    max_price NUMERIC NOT NULL,
    payout_amount NUMERIC NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payout_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated full access" ON public.payout_rules;
CREATE POLICY "Allow authenticated full access" ON public.payout_rules FOR ALL TO authenticated USING (true);

-- Initial Data: $5 -> $4 and >$5 -> $5
INSERT INTO public.payout_rules (min_price, max_price, payout_amount, description)
VALUES 
(0, 5, 4, 'Standard Low Tier ($5 projects pay $4)'),
(5.0001, 999999, 5, 'Standard Mid Tier (> $5 projects pay $5)');

-- UPDATE PROJECT DESIGNER FEE CALCULATION
CREATE OR REPLACE FUNCTION calculate_project_designer_fee()
RETURNS TRIGGER AS $$
DECLARE
  v_commission_val numeric := 0;
  v_commission_factor numeric := 0;
  v_net_amount numeric;
  v_slab_freelancer_pct numeric;
  v_slab_count int;
  v_user_strategy text := 'slab';
  v_user_fixed_rate numeric := 0;
  v_tiered_rate numeric := 0;
BEGIN
  -- VALIDATION
  IF NEW.price IS NULL THEN 
    NEW.price := 0; 
  END IF;
  
  -- 0. Check User's Payout Strategy (Priority)
  IF NEW.assignee_id IS NOT NULL THEN
      SELECT payout_strategy, fixed_payout_rate 
      INTO v_user_strategy, v_user_fixed_rate
      FROM public.profiles 
      WHERE id = NEW.assignee_id;
  END IF;

  -- Strategy: FIXED
  IF v_user_strategy = 'fixed' THEN
      NEW.designer_fee := COALESCE(v_user_fixed_rate, 0);
      RETURN NEW;
  END IF;

  -- Strategy: TIERED (New)
  IF v_user_strategy = 'tiered' THEN
      SELECT payout_amount INTO v_tiered_rate
      FROM public.payout_rules
      WHERE NEW.price >= min_price AND NEW.price <= max_price
      AND is_active = true
      ORDER BY created_at DESC
      LIMIT 1;

      NEW.designer_fee := COALESCE(v_tiered_rate, 0);
      RETURN NEW;
  END IF;

  -- Strategy: SLAB (Original Logic)
  IF NEW.account_id IS NULL THEN 
    RETURN NEW; 
  END IF;

  -- fetch commission with SECURITY DEFINER
  SELECT pc.commission_percentage
  INTO v_commission_val
  FROM public.platform_commissions pc
  JOIN public.platform_commission_accounts pca ON pc.id = pca.platform_commission_id
  WHERE pca.account_id = NEW.account_id
  LIMIT 1;

  IF v_commission_val IS NULL THEN v_commission_val := 0; END IF;

  -- NORMALIZE
  IF v_commission_val > 1 THEN v_commission_factor := v_commission_val / 100.0;
  ELSE v_commission_factor := v_commission_val; END IF;

  -- CALCULATION
  v_net_amount := NEW.price - (NEW.price * v_commission_factor);

  -- SLAB SELECTION
  SELECT freelancer_percentage, COUNT(*) OVER()
  INTO v_slab_freelancer_pct, v_slab_count
  FROM public.pricing_slabs
  WHERE NEW.price >= min_price AND NEW.price <= max_price;

  -- Check Slabs (Non-blocking fallback to 0 if no slab found)
  IF v_slab_count IS NOT NULL AND v_slab_count > 0 THEN
    NEW.designer_fee := v_net_amount * (v_slab_freelancer_pct / 100.0);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- UPDATE TEAM DESIGNER PAYOUT CALCULATION
CREATE OR REPLACE FUNCTION calculate_team_designer_payout()
RETURNS TRIGGER AS $$
DECLARE
    v_tl_id text;
    v_td_id text;
    v_slab_percentage numeric;
    v_td_strategy text := 'slab';
    v_td_fixed_rate numeric := 0;
    v_tiered_rate numeric := 0;
BEGIN
    -- 0. Identify Team Lead and Team Designer
    v_tl_id := NEW.assignee_id;
    v_td_id := NEW.team_designer_id;

    -- If no Team Designer, set fee to 0
    IF v_td_id IS NULL THEN
        NEW.team_designer_fee := 0;
        NEW.team_payout := 0;
        RETURN NEW;
    END IF;

    -- 1. Check Team Designer's Strategy
    SELECT payout_strategy, fixed_payout_rate 
    INTO v_td_strategy, v_td_fixed_rate
    FROM public.profiles 
    WHERE id = v_td_id;

    -- Strategy: FIXED
    IF v_td_strategy = 'fixed' THEN
        NEW.team_designer_fee := COALESCE(v_td_fixed_rate, 0);
        NEW.team_payout := NEW.team_designer_fee; -- Legacy support
        RETURN NEW;
    END IF;

    -- Strategy: TIERED (New)
    IF v_td_strategy = 'tiered' THEN
        SELECT payout_amount INTO v_tiered_rate
        FROM public.payout_rules
        WHERE NEW.price >= min_price AND NEW.price <= max_price
        AND is_active = true
        ORDER BY created_at DESC
        LIMIT 1;

        NEW.team_designer_fee := COALESCE(v_tiered_rate, 0);
        NEW.team_payout := NEW.team_designer_fee;
        RETURN NEW;
    END IF;

    -- Strategy: SLAB (Original Logic)
    -- Get slab calculation for the designer from the team's pricing slabs
    SELECT td_percentage INTO v_slab_percentage
    FROM public.team_pricing_slabs
    WHERE team_lead_id = v_tl_id
      AND NEW.designer_fee >= min_designer_fee 
      AND NEW.designer_fee <= max_designer_fee
    LIMIT 1;

    -- Update fee if slab exists
    IF v_slab_percentage IS NOT NULL THEN
        NEW.team_designer_fee := NEW.designer_fee * (v_slab_percentage / 100.0);
        NEW.team_payout := NEW.team_designer_fee; -- Legacy support
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------

-- --- MIGRATION 75: 20260418000003_fix_tiered_triggers.sql ---

-- 1. CLEANUP OLD TRIGGERS TO ENSURE FRESH START
DROP TRIGGER IF EXISTS trg_calculate_designer_fee ON public.projects;
DROP TRIGGER IF EXISTS trg_calculate_team_designer_payout ON public.projects;
DROP TRIGGER IF EXISTS trigger_calculate_project_designer_fee ON public.projects;

-- 2. ENHANCED PROJECT DESIGNER FEE FUNCTION
CREATE OR REPLACE FUNCTION public.calculate_project_designer_fee()
RETURNS TRIGGER AS $$
DECLARE
  v_user_strategy text := 'slab';
  v_user_fixed_rate numeric := 0;
  v_tiered_rate numeric := 0;
  v_commission_val numeric := 0;
  v_commission_factor numeric := 0;
  v_net_amount numeric;
  v_slab_freelancer_pct numeric;
  v_slab_count int;
BEGIN
  -- 0. MANUAL OVERRIDE CHECK
  -- If designer_fee is provided from frontend (> 0), skip auto-calculation.
  -- This allows special projects like Animation/Web to have manual pricing.
  IF TG_OP = 'INSERT' AND NEW.designer_fee IS NOT NULL AND NEW.designer_fee > 0 THEN
      RETURN NEW;
  END IF;

  -- For updates, we only skip if the designer_fee was specifically changed to a new manual value
  IF TG_OP = 'UPDATE' AND NEW.designer_fee IS NOT NULL AND NEW.designer_fee > 0 AND NEW.designer_fee != OLD.designer_fee THEN
      RETURN NEW;
  END IF;

  -- VALIDATION: Ensure price exists
  IF NEW.price IS NULL THEN 
    NEW.price := 0; 
  END IF;

  -- 1. Fetch User's Payout Configuration
  IF NEW.assignee_id IS NOT NULL THEN
      SELECT payout_strategy, fixed_payout_rate 
      INTO v_user_strategy, v_user_fixed_rate
      FROM public.profiles 
      WHERE id = NEW.assignee_id;
  END IF;

  -- STRATEGY: FIXED
  IF v_user_strategy = 'fixed' THEN
      NEW.designer_fee := COALESCE(v_user_fixed_rate, 0);
      RETURN NEW;
  END IF;

  -- STRATEGY: TIERED (Priority Logic)
  IF v_user_strategy = 'tiered' THEN
      -- CRITICAL FIX: If designer_fee is already set (Manual Override), do NOT overwrite it.
      -- This ensures that manual prices persist even when other project columns are updated.
      IF NEW.designer_fee IS NOT NULL AND NEW.designer_fee > 0 THEN
          RETURN NEW;
      END IF;

      -- Find the most specific applicable rule (smallest range for precision or newest)
      SELECT payout_amount INTO v_tiered_rate
      FROM public.payout_rules
      WHERE NEW.price >= min_price AND NEW.price <= max_price
      AND is_active = true
      ORDER BY (max_price - min_price) ASC, created_at DESC
      LIMIT 1;

      IF v_tiered_rate IS NOT NULL THEN
          NEW.designer_fee := v_tiered_rate;
          RETURN NEW;
      END IF;
      -- Fallback to 0 or slab if no tiered rule matches
  END IF;

  -- STRATEGY: SLAB (Original Legacy Logic)
  IF NEW.account_id IS NULL THEN 
    RETURN NEW; 
  END IF;

  -- Fetch commission for the account
  SELECT pc.commission_percentage INTO v_commission_val
  FROM public.platform_commissions pc
  JOIN public.platform_commission_accounts pca ON pc.id = pca.platform_commission_id
  WHERE pca.account_id = NEW.account_id
  LIMIT 1;

  v_commission_val := COALESCE(v_commission_val, 0);
  IF v_commission_val > 1 THEN v_commission_factor := v_commission_val / 100.0;
  ELSE v_commission_factor := v_commission_val; END IF;

  v_net_amount := NEW.price - (NEW.price * v_commission_factor);

  -- Select matching slab
  SELECT freelancer_percentage, COUNT(*) OVER()
  INTO v_slab_freelancer_pct, v_slab_count
  FROM public.pricing_slabs
  WHERE NEW.price >= min_price AND NEW.price <= max_price
  LIMIT 1;

  IF v_slab_count IS NOT NULL AND v_slab_count > 0 THEN
    NEW.designer_fee := v_net_amount * (v_slab_freelancer_pct / 100.0);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. ENHANCED TEAM DESIGNER PAYOUT FUNCTION
CREATE OR REPLACE FUNCTION public.calculate_team_designer_payout()
RETURNS TRIGGER AS $$
DECLARE
    v_tl_id uuid;
    v_td_id uuid;
    v_td_strategy text := 'slab';
    v_td_fixed_rate numeric := 0;
    v_tiered_rate numeric := 0;
    v_slab_percentage numeric;
BEGIN
    -- Only run if a team designer is assigned
    IF NEW.team_designer_id IS NULL THEN
        RETURN NEW;
    END IF;

    v_tl_id := NEW.assignee_id;
    v_td_id := NEW.team_designer_id;

    -- Fetch Team Designer's strategy
    SELECT payout_strategy, fixed_payout_rate 
    INTO v_td_strategy, v_td_fixed_rate
    FROM public.profiles 
    WHERE id = v_td_id;

    -- STRATEGY: FIXED
    IF v_td_strategy = 'fixed' THEN
        NEW.team_designer_fee := COALESCE(v_td_fixed_rate, 0);
        NEW.team_payout := NEW.team_designer_fee;
        RETURN NEW;
    END IF;

    -- STRATEGY: TIERED
    IF v_td_strategy = 'tiered' THEN
        SELECT payout_amount INTO v_tiered_rate
        FROM public.payout_rules
        WHERE NEW.price >= min_price AND NEW.price <= max_price
        AND is_active = true
        ORDER BY (max_price - min_price) ASC, created_at DESC
        LIMIT 1;

        IF v_tiered_rate IS NOT NULL THEN
            NEW.team_designer_fee := v_tiered_rate;
            NEW.team_payout := NEW.team_designer_fee;
            RETURN NEW;
        END IF;
    END IF;

    -- STRATEGY: SLAB (Team Specific)
    -- Team slabs look at min_price/max_price for original designer_fee
    SELECT percentage INTO v_slab_percentage
    FROM public.team_pricing_slabs
    WHERE team_lead_id = v_tl_id
      AND NEW.designer_fee >= min_price 
      AND NEW.designer_fee <= max_price
      AND is_active = true
    LIMIT 1;

    IF v_slab_percentage IS NOT NULL THEN
        NEW.team_designer_fee := NEW.designer_fee * (v_slab_percentage / 100.0);
        NEW.team_payout := NEW.team_designer_fee;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RE-REGISTER TRIGGERS EXPLICITLY
CREATE TRIGGER trg_calculate_designer_fee
BEFORE INSERT OR UPDATE OF price, account_id, assignee_id, designer_fee ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.calculate_project_designer_fee();

CREATE TRIGGER trg_calculate_team_designer_payout
BEFORE INSERT OR UPDATE OF team_designer_id, designer_fee, assignee_id, price ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.calculate_team_designer_payout();

-- 5. RE-CALC FEES FOR IMPACTED PROJECTS (Force trigger run)
UPDATE projects 
SET price = price 
WHERE status NOT IN ('Approved', 'Delivered', 'Cancelled')
  AND price > 0;

-- -----------------------------------------------------

-- --- MIGRATION 76: 20260421000000_fix_legacy_id_payouts.sql ---

-- 1. ENHANCED PROJECT DESIGNER FEE FUNCTION (W/ NAME FALLBACK)
CREATE OR REPLACE FUNCTION public.calculate_project_designer_fee()
RETURNS TRIGGER AS $$
DECLARE
  v_user_strategy text := 'slab';
  v_user_fixed_rate numeric := 0;
  v_tiered_rate numeric := 0;
  v_commission_val numeric := 0;
  v_commission_factor numeric := 0;
  v_net_amount numeric;
  v_slab_freelancer_pct numeric;
  v_slab_id_found uuid;
BEGIN
  -- VALIDATION: Ensure price exists
  IF NEW.price IS NULL THEN 
    NEW.price := 0; 
  END IF;

  -- 0. Fetch User's Payout Configuration (Try ID first, then Name)
  IF NEW.assignee_id IS NOT NULL THEN
      SELECT payout_strategy, fixed_payout_rate 
      INTO v_user_strategy, v_user_fixed_rate
      FROM public.profiles 
      WHERE id = NEW.assignee_id;
  ELSIF NEW.assignee IS NOT NULL THEN
      -- Fallback for legacy projects with name only
      SELECT payout_strategy, fixed_payout_rate 
      INTO v_user_strategy, v_user_fixed_rate
      FROM public.profiles 
      WHERE name = NEW.assignee OR email = NEW.assignee
      LIMIT 1;
  END IF;

  -- STRATEGY: FIXED
  IF v_user_strategy = 'fixed' THEN
      NEW.designer_fee := COALESCE(v_user_fixed_rate, 0);
      RETURN NEW;
  END IF;

  -- STRATEGY: TIERED (Priority Logic)
  IF v_user_strategy = 'tiered' THEN
      SELECT payout_amount INTO v_tiered_rate
      FROM public.payout_rules
      WHERE NEW.price >= min_price AND NEW.price <= max_price
      AND is_active = true
      ORDER BY (max_price - min_price) ASC, created_at DESC
      LIMIT 1;

      IF v_tiered_rate IS NOT NULL THEN
          NEW.designer_fee := v_tiered_rate;
          RETURN NEW;
      END IF;
  END IF;

  -- STRATEGY: SLAB (Original Legacy Logic)
  IF NEW.account_id IS NULL THEN 
    RETURN NEW; 
  END IF;

  -- Fetch commission for the account
  SELECT pc.commission_percentage INTO v_commission_val
  FROM public.platform_commissions pc
  JOIN public.platform_commission_accounts pca ON pc.id = pca.platform_commission_id
  WHERE pca.account_id = NEW.account_id
  LIMIT 1;

  v_commission_val := COALESCE(v_commission_val, 0);
  IF v_commission_val > 1 THEN v_commission_factor := v_commission_val / 100.0;
  ELSE v_commission_factor := v_commission_val; END IF;

  v_net_amount := NEW.price - (NEW.price * v_commission_factor);

  -- Select matching slab
  SELECT freelancer_percentage INTO v_slab_freelancer_pct
  FROM public.pricing_slabs
  WHERE NEW.price >= min_price AND NEW.price <= max_price
  LIMIT 1;

  IF v_slab_freelancer_pct IS NOT NULL THEN
    NEW.designer_fee := v_net_amount * (v_slab_freelancer_pct / 100.0);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. ENHANCED TEAM DESIGNER PAYOUT FUNCTION (W/ NAME FALLBACK)
CREATE OR REPLACE FUNCTION public.calculate_team_designer_payout()
RETURNS TRIGGER AS $$
DECLARE
    v_tl_id uuid;
    v_td_id uuid;
    v_td_strategy text := 'slab';
    v_td_fixed_rate numeric := 0;
    v_tiered_rate numeric := 0;
    v_slab_percentage numeric;
BEGIN
    -- Only run if a team designer is assigned
    IF NEW.team_designer_id IS NULL THEN
        RETURN NEW;
    END IF;

    v_tl_id := NEW.assignee_id;
    v_td_id := NEW.team_designer_id;

    -- Fetch Team Designer's strategy (Using ID)
    SELECT payout_strategy, fixed_payout_rate 
    INTO v_td_strategy, v_td_fixed_rate
    FROM public.profiles 
    WHERE id = v_td_id;

    -- STRATEGY: FIXED
    IF v_td_strategy = 'fixed' THEN
        NEW.team_designer_fee := COALESCE(v_td_fixed_rate, 0);
        NEW.team_payout := NEW.team_designer_fee;
        RETURN NEW;
    END IF;

    -- STRATEGY: TIERED
    IF v_td_strategy = 'tiered' THEN
        SELECT payout_amount INTO v_tiered_rate
        FROM public.payout_rules
        WHERE NEW.price >= min_price AND NEW.price <= max_price
        AND is_active = true
        ORDER BY (max_price - min_price) ASC, created_at DESC
        LIMIT 1;

        IF v_tiered_rate IS NOT NULL THEN
            NEW.team_designer_fee := v_tiered_rate;
            NEW.team_payout := NEW.team_designer_fee;
            RETURN NEW;
        END IF;
    END IF;

    -- STRATEGY: SLAB (Team Specific)
    -- Recalculate TL ID from name if missing
    IF v_tl_id IS NULL AND NEW.assignee IS NOT NULL THEN
        SELECT id INTO v_tl_id FROM public.profiles WHERE name = NEW.assignee OR email = NEW.assignee LIMIT 1;
    END IF;

    SELECT percentage INTO v_slab_percentage
    FROM public.team_pricing_slabs
    WHERE team_lead_id = v_tl_id
      AND NEW.designer_fee >= min_price 
      AND NEW.designer_fee <= max_price
      AND is_active = true
    LIMIT 1;

    IF v_slab_percentage IS NOT NULL THEN
        NEW.team_designer_fee := NEW.designer_fee * (v_slab_percentage / 100.0);
        NEW.team_payout := NEW.team_designer_fee;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. RE-CALC FEES TO APPLY FIX
UPDATE public.projects 
SET price = price 
WHERE status NOT IN ('Approved', 'Delivered', 'Cancelled');

-- -----------------------------------------------------

-- --- MIGRATION 77: 20260422000000_mass_project_approval_stephen.sql ---
-- Migration: Mass project approval and clearance date update (Stephen Designs)
-- Created: 2026-04-22
-- Based on: public/Approved Projects Clearance Start Date - Stephen Designs.csv

UPDATE projects
SET 
    status = 'Approved',
    clearance_start_date = CASE project_id
        WHEN 'MAD 124060' THEN '2026-03-14'::date
        WHEN 'MOS 124081' THEN '2026-02-26'::date
        WHEN 'MOS 124236' THEN '2026-03-15'::date
        WHEN 'MEM 124251' THEN '2026-03-22'::date
        WHEN 'MOS 124621' THEN '2026-03-30'::date
        WHEN 'MOS 124689' THEN '2026-04-02'::date
        WHEN 'SEO 124831' THEN '2026-04-01'::date
        WHEN 'MOS 124821' THEN '2026-04-04'::date
        WHEN 'MOS 124943' THEN '2026-04-03'::date
        WHEN 'MAD 125043' THEN '2026-04-04'::date
        WHEN 'MAD 125060' THEN '2026-04-09'::date
        WHEN 'MOS 125091' THEN '2026-04-09'::date
        WHEN 'MOS 125112' THEN '2026-04-16'::date
        WHEN 'MOS 125429' THEN '2026-04-19'::date
        WHEN 'BOS 125114' THEN '2026-04-18'::date
        WHEN 'TOK 125306' THEN '2026-04-18'::date
        WHEN 'DEN 123220' THEN '2026-04-18'::date
        WHEN 'MAD 125218' THEN '2026-04-11'::date
        WHEN 'MAN 515945' THEN '2026-03-20'::date
        WHEN 'MAN 243435' THEN '2026-04-18'::date
        WHEN 'MAN 101161' THEN '2026-04-22'::date
        WHEN 'MAN 887888' THEN '2026-03-31'::date
        WHEN 'MAN 796434' THEN '2026-03-24'::date
        WHEN 'MAN 499578' THEN '2026-03-26'::date
        WHEN 'MAN 401438' THEN '2026-03-12'::date
        WHEN 'MAN 914743' THEN '2026-04-05'::date
        WHEN 'MAN 468725' THEN '2026-04-10'::date
    END
WHERE project_id IN (
    'MAD 124060', 'MOS 124081', 'MOS 124236', 'MEM 124251', 'MOS 124621',
    'MOS 124689', 'SEO 124831', 'MOS 124821', 'MOS 124943', 'MAD 125043',
    'MAD 125060', 'MOS 125091', 'MOS 125112', 'MOS 125429', 'BOS 125114',
    'TOK 125306', 'DEN 123220', 'MAD 125218', 'MAN 515945', 'MAN 243435',
    'MAN 101161', 'MAN 887888', 'MAN 796434', 'MAN 499578', 'MAN 401438',
    'MAN 914743', 'MAN 468725'
);

-- -----------------------------------------------------

-- --- MIGRATION 78: 20260422000001_add_added_by_to_leads.sql ---
-- Description: Adds an added_by column to the leads table to track which user created the lead.

ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS added_by TEXT;

-- -----------------------------------------------------

-- --- MIGRATION 79: 20260426000000_add_missing_leads_columns.sql ---
-- Migration: Add Missing Columns to Leads Table
-- Description: Adds previous_order_id and account columns to the leads table for better tracking.

ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS previous_order_id TEXT,
ADD COLUMN IF NOT EXISTS account TEXT,
ADD COLUMN IF NOT EXISTS source TEXT,
ADD COLUMN IF NOT EXISTS client_message_screenshot TEXT,
ADD COLUMN IF NOT EXISTS response_screenshot TEXT,
ADD COLUMN IF NOT EXISTS client_message_time TEXT,
ADD COLUMN IF NOT EXISTS response_time TEXT,
ADD COLUMN IF NOT EXISTS client_message_text TEXT,
ADD COLUMN IF NOT EXISTS response_text TEXT,
ADD COLUMN IF NOT EXISTS automation_result TEXT;

-- -----------------------------------------------------

-- --- MIGRATION 80: 20260426000001_create_leads_proof_bucket.sql ---
-- ============================================
-- STORAGE SETUP: LEADS INTERACTION PROOFS
-- ============================================

-- 1. Create 'leads-proof' bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('leads-proof', 'leads-proof', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Create RLS Policies for the 'leads-proof' bucket

-- Allow public read access to proofs
DROP POLICY IF EXISTS "Leads Proof Public Access" ON storage.objects;
CREATE POLICY "Leads Proof Public Access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'leads-proof');

-- Allow authenticated users to upload proofs
DROP POLICY IF EXISTS "Leads Proof Authenticated Upload" ON storage.objects;
CREATE POLICY "Leads Proof Authenticated Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'leads-proof');

-- Allow authenticated users to update proofs (for overwriting if needed)
DROP POLICY IF EXISTS "Leads Proof Authenticated Update" ON storage.objects;
CREATE POLICY "Leads Proof Authenticated Update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'leads-proof');

-- Allow authenticated users to delete proofs
DROP POLICY IF EXISTS "Leads Proof Authenticated Delete" ON storage.objects;
CREATE POLICY "Leads Proof Authenticated Delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'leads-proof');

-- -----------------------------------------------------

-- --- MIGRATION 81: 20260501000000_create_scorecard_tables.sql ---
-- Create scorecard_categories table
CREATE TABLE IF NOT EXISTS scorecard_categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

-- Create scorecard_rules table
CREATE TABLE IF NOT EXISTS scorecard_rules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    action_type text NOT NULL,
    category_id uuid REFERENCES scorecard_categories(id) ON DELETE CASCADE,
    weight numeric NOT NULL DEFAULT 1,
    created_at timestamptz DEFAULT now()
);

-- Create scorecard_targets table
CREATE TABLE IF NOT EXISTS scorecard_targets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE, -- null means all users
    metric text NOT NULL,
    target_value numeric NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE scorecard_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE scorecard_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE scorecard_targets ENABLE ROW LEVEL SECURITY;

-- Policies for scorecard_categories
CREATE POLICY "Allow all access for authenticated users on scorecard_categories"
ON scorecard_categories FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Policies for scorecard_rules
CREATE POLICY "Allow all access for authenticated users on scorecard_rules"
ON scorecard_rules FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Policies for scorecard_targets
CREATE POLICY "Allow all access for authenticated users on scorecard_targets"
ON scorecard_targets FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- -----------------------------------------------------

-- --- MIGRATION 82: 20260501000001_create_scorecard_submissions.sql ---
-- Create scorecard_submissions table
CREATE TABLE IF NOT EXISTS scorecard_submissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    action_type text NOT NULL,
    category_id uuid REFERENCES scorecard_categories(id) ON DELETE SET NULL,
    points numeric NOT NULL DEFAULT 0,
    reference_id text, -- string type to accommodate different kinds of IDs (uuid or short id)
    created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE scorecard_submissions ENABLE ROW LEVEL SECURITY;

-- Policies for scorecard_submissions
-- Allow users to insert their own submissions, or system to insert
CREATE POLICY "Allow insert for authenticated users on scorecard_submissions"
ON scorecard_submissions FOR INSERT TO authenticated WITH CHECK (true);

-- Allow users to view all submissions (needed for leaderboard)
CREATE POLICY "Allow select for authenticated users on scorecard_submissions"
ON scorecard_submissions FOR SELECT TO authenticated USING (true);

-- -----------------------------------------------------

-- --- MIGRATION 83: 20260515000000_create_training_videos.sql ---
CREATE TABLE IF NOT EXISTS public.training_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    youtube_id TEXT NOT NULL,
    role TEXT NOT NULL,
    module TEXT,
    documentation TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.training_videos ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow public read access" ON public.training_videos
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to insert" ON public.training_videos
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update" ON public.training_videos
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to delete" ON public.training_videos
    FOR DELETE TO authenticated USING (true);

-- -----------------------------------------------------

-- --- MIGRATION 84: 20260515000001_add_timeframe_to_targets.sql ---
ALTER TABLE public.scorecard_targets
ADD COLUMN IF NOT EXISTS timeframe VARCHAR(20) DEFAULT 'daily';

-- -----------------------------------------------------

-- --- MIGRATION 85: 20260515000001_create_user_notes.sql ---
create table if not exists public.user_notes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null,
  title text not null default 'Untitled Note',
  content text default '',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.user_notes enable row level security;

-- Create policies
create policy "Users can view their own notes"
  on public.user_notes for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own notes"
  on public.user_notes for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own notes"
  on public.user_notes for update
  using ( auth.uid() = user_id );

create policy "Users can delete their own notes"
  on public.user_notes for delete
  using ( auth.uid() = user_id );

-- Create updated_at trigger
create trigger handle_updated_at before update on public.user_notes
  for each row execute procedure moddatetime (updated_at);

-- -----------------------------------------------------

-- --- MIGRATION 86: 20260531220000_add_submitted_at_to_projects.sql ---
-- Migration: Add submitted_at column and triggers for automated tracking
-- Created: 2026-05-31

-- 1. Add column to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- 2. Create trigger function to handle submitted_at automatically
CREATE OR REPLACE FUNCTION public.handle_project_submission_time()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        IF (LOWER(TRIM(NEW.status)) IN ('done', 'revision done', 'revision urgent done', 'urgent done', 'final-files-done', 'final files done')) THEN
            NEW.submitted_at := now();
        ELSE
            NEW.submitted_at := NULL;
        END IF;
    ELSIF (TG_OP = 'UPDATE') THEN
        IF (OLD.status IS DISTINCT FROM NEW.status) THEN
            IF (LOWER(TRIM(NEW.status)) IN ('done', 'revision done', 'revision urgent done', 'urgent done', 'final-files-done', 'final files done')) THEN
                NEW.submitted_at := now();
            ELSE
                NEW.submitted_at := NULL;
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create BEFORE trigger
DROP TRIGGER IF EXISTS tr_project_submission_time ON projects;
CREATE TRIGGER tr_project_submission_time
    BEFORE INSERT OR UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION handle_project_submission_time();

-- 4. Retroactively populate existing completed projects
UPDATE projects 
SET submitted_at = updated_at 
WHERE LOWER(TRIM(status)) IN ('done', 'revision done', 'revision urgent done', 'urgent done', 'final-files-done', 'final files done') 
  AND submitted_at IS NULL;

-- 5. Recreate projects_with_collaborators view to expose the column
DROP VIEW IF EXISTS public.projects_with_collaborators CASCADE;

CREATE VIEW public.projects_with_collaborators AS
SELECT 
    p.id,
    p.project_id,
    p.action_move,
    p.project_title,
    p.account,
    p.client_type,
    p.client_name,
    p.previous_logo_no,
    p.items_sold,
    p.addons,
    p.medium,
    p.price,
    p.brief,
    p.attachments,
    p.due_date,
    p.due_time,
    p.assignee,
    p.removal_reason,
    p.cancellation_reason,
    p.tips_given,
    p.tip_amount,
    p.status,
    p.created_at,
    p.updated_at,
    p.account_id,
    p.designer_fee,
    p.team_designer_fee,
    p.primary_manager_id,
    p.options_required,
    p.has_dispute,
    p.has_art_help,
    p.payout_completed,
    p.converted_by,
    p.order_type,
    p.assignee_id,
    p.team_designer_id,
    p.team_payout,
    p.team_slab_id,
    p.client_due_date,
    p.client_due_time,
    p.revision_notes,
    p.qa_status,
    p.alert_type,
    p.alert_status,
    p.alert_initiator_id,
    p.alert_resolver_id,
    p.alert_reason,
    p.alert_additional_message,
    p.submitted_at, -- Exposed column in view
    COALESCE(
        (
            SELECT jsonb_agg(jsonb_build_object(
                'id', pc.member_id,
                'name', pr.name,
                'role', pr.role
            ))
            FROM project_collaborators pc
            JOIN profiles pr ON pc.member_id = pr.id
            WHERE pc.project_id = p.project_id
        ),
        '[]'::jsonb
    ) as collaborators
FROM public.projects p;

GRANT SELECT ON public.projects_with_collaborators TO authenticated;
GRANT SELECT ON public.projects_with_collaborators TO service_role;
GRANT SELECT ON public.projects_with_collaborators TO anon;
ALTER VIEW public.projects_with_collaborators SET (security_invoker = true);

-- -----------------------------------------------------

-- --- MIGRATION 87: 20260531230000_update_clearance_rules.sql ---
-- Migration: Update Payment Clearance Rules to "15th of next month (PKT)"
-- Created: 2026-05-31

-- 1. Update calculate_days_left function to use PKT next-month 15th logic
CREATE OR REPLACE FUNCTION public.calculate_days_left(
    clearance_start timestamp with time zone,
    clearance_period integer DEFAULT 14
) RETURNS integer AS $$
DECLARE
    target_release timestamp;
    current_date_karachi timestamp;
    days_diff integer;
BEGIN
    IF clearance_start IS NULL THEN
        RETURN 0;
    END IF;
    
    -- Calculate target release date in Karachi time (15th of the next month)
    target_release := date_trunc('month', (clearance_start AT TIME ZONE 'Asia/Karachi') + interval '1 month') + interval '14 days';
    
    -- Get current date in Karachi time (date portion only)
    current_date_karachi := date_trunc('day', NOW() AT TIME ZONE 'Asia/Karachi');
    
    -- Calculate difference in days
    days_diff := EXTRACT(day FROM (target_release - current_date_karachi))::integer;
    
    -- If it's already past the target release, return 0
    RETURN GREATEST(0, days_diff);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 2. Update auto_update_funds_status function to release on or after 15th of next month (PKT)
CREATE OR REPLACE FUNCTION public.auto_update_funds_status()
RETURNS void AS $$
BEGIN
    -- Move projects from Pending to Cleared when clearance period expires (on or after 15th of next month in PKT)
    UPDATE projects
    SET funds_status = 'Cleared',
        updated_at = NOW()
    WHERE funds_status = 'Pending'
      AND clearance_start_date IS NOT NULL
      AND (NOW() AT TIME ZONE 'Asia/Karachi' >= (date_trunc('month', (clearance_start_date AT TIME ZONE 'Asia/Karachi') + interval '1 month') + interval '14 days'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update set_clearance_start_date trigger function to support 'Approved' status
CREATE OR REPLACE FUNCTION public.set_clearance_start_date()
RETURNS TRIGGER AS $$
BEGIN
    -- When status changes to 'Completed', 'Delivered', or 'Approved' and funds_status is Pending
    IF (NEW.status IN ('Completed', 'Delivered', 'Approved')) 
       AND (OLD.status IS NULL OR OLD.status NOT IN ('Completed', 'Delivered', 'Approved'))
       AND (NEW.funds_status = 'Pending' OR NEW.funds_status IS NULL) THEN
        
        IF NEW.clearance_start_date IS NULL THEN
            NEW.clearance_start_date := NOW();
        END IF;
        NEW.funds_status := 'Pending';
        
        -- Get clearance days from platform if linked
        IF NEW.platform_commission_id IS NOT NULL THEN
            SELECT clearance_days INTO NEW.clearance_days
            FROM platform_commissions
            WHERE id = NEW.platform_commission_id;
        ELSE
            -- Default to 14 days if no platform linked
            NEW.clearance_days := 14;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------

-- --- MIGRATION 88: 20260602183000_add_additional_permissions.sql ---
-- Migration: Add additional_permissions column to profiles to allow user-specific overrides
-- Created: 2026-06-02

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS additional_permissions text[] DEFAULT '{}';

-- -----------------------------------------------------

-- --- MIGRATION 89: 20260603000000_add_comments_author_created_index.sql ---
-- Migration: Add index to project_comments for OTD stats tracking
-- Created: 2026-06-03

CREATE INDEX IF NOT EXISTS idx_project_comments_otd_tracking 
ON public.project_comments(author_id, created_at)
WHERE content LIKE 'STATUS_CHANGED:%';

-- -----------------------------------------------------

-- --- MIGRATION 90: 20260608120000_create_seller_commissions.sql ---
-- Migration: Create Seller Commissions and Seller Commission Accounts Tables
-- Created: 2026-06-08

-- 1. Create seller_commissions Table
CREATE TABLE IF NOT EXISTS public.seller_commissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    commission_percentage NUMERIC DEFAULT 0,
    clearance_days INTEGER DEFAULT 14,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create seller_commission_accounts Join Table
CREATE TABLE IF NOT EXISTS public.seller_commission_accounts (
    seller_commission_id UUID REFERENCES public.seller_commissions(id) ON DELETE CASCADE,
    account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
    PRIMARY KEY (seller_commission_id, account_id)
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.seller_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_commission_accounts ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies for seller_commissions
DROP POLICY IF EXISTS "Allow authenticated read seller_commissions" ON public.seller_commissions;
CREATE POLICY "Allow authenticated read seller_commissions"
    ON public.seller_commissions FOR SELECT
    TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated write seller_commissions" ON public.seller_commissions;
CREATE POLICY "Allow authenticated write seller_commissions"
    ON public.seller_commissions FOR ALL
    TO authenticated USING (true) WITH CHECK (true);

-- 5. Create RLS Policies for seller_commission_accounts
DROP POLICY IF EXISTS "Allow authenticated read seller_commission_accounts" ON public.seller_commission_accounts;
CREATE POLICY "Allow authenticated read seller_commission_accounts"
    ON public.seller_commission_accounts FOR SELECT
    TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated write seller_commission_accounts" ON public.seller_commission_accounts;
CREATE POLICY "Allow authenticated write seller_commission_accounts"
    ON public.seller_commission_accounts FOR ALL
    TO authenticated USING (true) WITH CHECK (true);

-- -----------------------------------------------------

-- ========================================================
-- 5. SEED DATA & PERMISSIONS
-- ========================================================

-- Seed workload permissions
INSERT INTO permissions (code, name, category, description)
VALUES ('view_workload', 'View Workload', 'Users', 'View Freelancer Workload & Capacity')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_name, permission_code)
VALUES 
    ('Super Admin', 'view_workload'),
    ('Admin', 'view_workload'),
    ('Project Operations Manager', 'view_workload')
ON CONFLICT (role_name, permission_code) DO NOTHING;

-- --- START OF seed_data.sql ---
-- ============================================
-- SEED DATA - Run this to avoid "No pricing slab" errors
-- ============================================

-- 1. Insert Standard Pricing Slabs (REQUIRED for fee calculation)
INSERT INTO pricing_slabs (slab_name, min_price, max_price, freelancer_percentage)
VALUES 
  ('Micro Project', 0, 100, 70),       -- 70% to freelancer for small jobs
  ('Standard', 101, 500, 80),          -- 80% to freelancer for standard jobs
  ('Premium', 501, 100000, 90)         -- 90% to freelancer for big jobs
ON CONFLICT DO NOTHING;

-- 2. Insert Common Platforms (Optional but creating projects fails if Account is linked to nothing)
INSERT INTO platform_commissions (platform_name, commission_percentage, clearance_days)
VALUES 
  ('Direct Client', 0, 0),
  ('Upwork', 10, 5),
  ('Fiverr', 20, 14)
ON CONFLICT DO NOTHING;

-- 3. Insert a Default Account (Needed because projects link to accounts)
INSERT INTO accounts (name, prefix, display_prefix)
VALUES 
  ('Main Account', 'MAIN', 'M-01')
ON CONFLICT (display_prefix) DO NOTHING;

-- 4. Link Platforms to Account (Optional)
-- This links "Upwork" (from above) to "Main Account" (from above)
-- You might need to adjust IDs if you use existing data, but this works for fresh dbs.
DO $$
DECLARE
  v_upwork_id uuid;
  v_account_id uuid;
BEGIN
  SELECT id INTO v_upwork_id FROM platform_commissions WHERE platform_name = 'Upwork';
  SELECT id INTO v_account_id FROM accounts WHERE name = 'Main Account';
  
  IF v_upwork_id IS NOT NULL AND v_account_id IS NOT NULL THEN
    INSERT INTO platform_commission_accounts (platform_commission_id, account_id)
    VALUES (v_upwork_id, v_account_id)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- --- END OF seed_data.sql ---

