-- Run this in the Supabase SQL Editor

-- 1. Add daily_capacity to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS daily_capacity INT DEFAULT 5;

-- 2. Add a new view_workload permission so that it can be explicitly managed
INSERT INTO permissions (code, name, category, description)
VALUES ('view_workload', 'View Workload', 'Users', 'View Freelancer Workload & Capacity')
ON CONFLICT (code) DO NOTHING;

-- 3. Grant view_workload to essential admin roles
INSERT INTO role_permissions (role_name, permission_code)
VALUES 
    ('Super Admin', 'view_workload'),
    ('Admin', 'view_workload'),
    ('Project Operations Manager', 'view_workload')
ON CONFLICT DO NOTHING;
