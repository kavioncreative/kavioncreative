-- Debug query to check what data exists for freelancer earnings
-- Run this in Supabase SQL Editor to see what's in the database

-- 1. Check all approved projects
SELECT 
    project_id,
    project_title,
    assignee,
    status,
    funds_status,
    clearance_start_date,
    clearance_days,
    price,
    designer_fee,
    updated_at
FROM projects
WHERE status = 'Approved'
ORDER BY updated_at DESC;

-- 2. Check specifically for kashif.asif
SELECT 
    project_id,
    project_title,
    assignee,
    status,
    funds_status,
    clearance_start_date,
    clearance_days,
    price,
    designer_fee,
    updated_at
FROM projects
WHERE assignee = 'kashif.asif'
ORDER BY updated_at DESC;

-- 3. Check if assignee field matches exactly
SELECT DISTINCT assignee
FROM projects
WHERE assignee IS NOT NULL;
