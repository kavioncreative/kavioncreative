-- Move a project from Pending Clearance to Available Amount
-- This simulates the clearance period expiring by setting the clearance_start_date to the past

-- Option 1: Move ONE specific project (replace 'PROJECT_ID_HERE' with actual project ID)
UPDATE projects
SET 
    clearance_start_date = CURRENT_DATE - INTERVAL '15 days',  -- 15 days ago (clearance expired)
    funds_status = 'Cleared'
WHERE 
    project_id = 'ARS 296791'  -- Replace with your actual project ID
    AND status = 'Approved';

-- Option 2: Move the OLDEST pending clearance project
UPDATE projects
SET 
    clearance_start_date = CURRENT_DATE - INTERVAL '15 days',
    funds_status = 'Cleared'
WHERE 
    project_id = (
        SELECT project_id 
        FROM projects 
        WHERE funds_status = 'Pending' 
        AND status = 'Approved'
        ORDER BY updated_at ASC 
        LIMIT 1
    );

-- Verify the changes
SELECT 
    project_id,
    project_title,
    assignee,
    funds_status,
    clearance_start_date,
    clearance_days,
    CURRENT_DATE - clearance_start_date::date as days_passed,
    price,
    designer_fee
FROM projects
WHERE status = 'Approved'
ORDER BY clearance_start_date DESC;
