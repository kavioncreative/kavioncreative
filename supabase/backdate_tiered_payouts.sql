-- =========================================================================
-- STEP 1: DRY RUN (PREVIEW)
-- Highlight and run this SELECT block first to see what will change.
-- It will NOT modify any data.
-- =========================================================================

SELECT 
    p.project_id, 
    p.created_at,
    p.price,
    prof.name AS assignee_name,
    p.designer_fee AS old_designer_fee,
    (SELECT pr.payout_amount FROM public.payout_rules pr WHERE p.price >= pr.min_price AND p.price <= pr.max_price AND pr.is_active = true ORDER BY pr.created_at DESC LIMIT 1) AS new_designer_fee
FROM public.projects p
LEFT JOIN public.profiles prof ON p.assignee_id = prof.id
WHERE p.status = 'Approved' 
  AND p.created_at >= '2026-03-17 00:00:00'
  AND p.project_id != 'MAN 901192' -- EXCLUDED MANUAL PROJECT
  AND p.funds_status != 'Paid' -- EXCLUDED ALREADY PAID PROJECTS
  AND prof.payout_strategy = 'tiered' 
  AND p.designer_fee != (SELECT pr.payout_amount FROM public.payout_rules pr WHERE p.price >= pr.min_price AND p.price <= pr.max_price AND pr.is_active = true ORDER BY pr.created_at DESC LIMIT 1);

-- =========================================================================
-- STEP 2 & 3: BACKUP AND TRANSACTIONAL UPDATE
-- Once you review the preview above, highlight and run the block below.
-- =========================================================================

BEGIN; -- Start Transaction

-- STEP 2: Create a Backup Table of exactly what we might change
CREATE TABLE IF NOT EXISTS public.projects_backup_march_17 AS 
SELECT * FROM public.projects 
WHERE status = 'Approved' 
  AND created_at >= '2026-03-17 00:00:00'
  AND project_id != 'MAN 901192'
  AND funds_status != 'Paid';

-- STEP 3: Perform the update safely (Triggers will auto-calculate team fees)
UPDATE public.projects p
SET 
    designer_fee = COALESCE((SELECT pr.payout_amount FROM public.payout_rules pr WHERE p.price >= pr.min_price AND p.price <= pr.max_price AND pr.is_active = true ORDER BY pr.created_at DESC LIMIT 1), p.designer_fee)
FROM public.profiles prof
WHERE p.assignee_id = prof.id
  AND p.status = 'Approved' 
  AND p.created_at >= '2026-03-17 00:00:00'
  AND p.project_id != 'MAN 901192' -- EXCLUDED MANUAL PROJECT
  AND p.funds_status != 'Paid' -- EXCLUDED ALREADY PAID PROJECTS
  AND prof.payout_strategy = 'tiered'; 

COMMIT; -- Finalize the changes
