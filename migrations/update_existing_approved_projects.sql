-- Update existing approved projects to have clearance tracking
-- This script adds clearance tracking to projects that were approved before the feature was implemented

-- Update all approved projects that don't have clearance tracking yet
UPDATE projects
SET 
    funds_status = 'Pending',
    clearance_start_date = CURRENT_DATE,
    clearance_days = COALESCE(
        (SELECT clearance_days FROM platform_commissions WHERE id = projects.platform_commission_id),
        14  -- Default to 14 days if no platform commission is set
    )
WHERE 
    status = 'Approved' 
    AND funds_status IS NULL
    AND assignee IS NOT NULL;

-- Verify the update
SELECT 
    project_id,
    project_title,
    assignee,
    status,
    funds_status,
    clearance_start_date,
    clearance_days
FROM projects
WHERE status = 'Approved'
ORDER BY updated_at DESC;
