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
