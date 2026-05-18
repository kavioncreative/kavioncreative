-- ============================================
-- CLEARANCE TRACKING MIGRATION
-- ============================================
-- This migration adds columns needed for tracking payment clearance periods
-- and automating the transition from Pending to Available status

-- 1. Add missing columns to projects table
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS funds_status text DEFAULT 'Pending',
ADD COLUMN IF NOT EXISTS designer_fee numeric,
ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES accounts(id),
ADD COLUMN IF NOT EXISTS clearance_start_date timestamptz,
ADD COLUMN IF NOT EXISTS clearance_days integer DEFAULT 14,
ADD COLUMN IF NOT EXISTS platform_commission_id uuid REFERENCES platform_commissions(id);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_funds_status ON projects(funds_status);
CREATE INDEX IF NOT EXISTS idx_projects_assignee ON projects(assignee);
CREATE INDEX IF NOT EXISTS idx_projects_account_id ON projects(account_id);
CREATE INDEX IF NOT EXISTS idx_projects_clearance_start ON projects(clearance_start_date);

-- 3. Add check constraint for valid funds_status values
ALTER TABLE projects 
DROP CONSTRAINT IF EXISTS check_funds_status;

ALTER TABLE projects 
ADD CONSTRAINT check_funds_status 
CHECK (funds_status IN ('Paid', 'Pending', 'Cleared') OR funds_status IS NULL);

-- 4. Add comments for documentation
COMMENT ON COLUMN projects.funds_status IS 'Payment status: Paid (settled), Pending (awaiting clearance), Cleared (ready for payout)';
COMMENT ON COLUMN projects.designer_fee IS 'Freelancer payout amount after platform commission';
COMMENT ON COLUMN projects.clearance_start_date IS 'Date when clearance period started (typically when project was approved/completed)';
COMMENT ON COLUMN projects.clearance_days IS 'Number of days for clearance period (inherited from platform settings)';

-- 5. Create function to calculate days left in clearance
CREATE OR REPLACE FUNCTION calculate_days_left(
    clearance_start timestamptz,
    clearance_period integer
) RETURNS integer AS $$
BEGIN
    IF clearance_start IS NULL THEN
        RETURN 0;
    END IF;
    
    RETURN GREATEST(0, clearance_period - EXTRACT(DAY FROM (NOW() - clearance_start))::integer);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 6. Create function to auto-update funds_status based on clearance period
CREATE OR REPLACE FUNCTION auto_update_funds_status()
RETURNS void AS $$
BEGIN
    -- Move projects from Pending to Cleared when clearance period expires
    UPDATE projects
    SET funds_status = 'Cleared',
        updated_at = NOW()
    WHERE funds_status = 'Pending'
      AND clearance_start_date IS NOT NULL
      AND clearance_days IS NOT NULL
      AND (EXTRACT(DAY FROM (NOW() - clearance_start_date))::integer >= clearance_days);
END;
$$ LANGUAGE plpgsql;

-- 7. Create a scheduled job using pg_cron (if available) or manual trigger
-- Note: pg_cron needs to be enabled in Supabase dashboard under Database > Extensions
-- Uncomment the following if pg_cron is enabled:

-- SELECT cron.schedule(
--     'auto-clear-pending-projects',
--     '0 0 * * *', -- Run daily at midnight
--     $$ SELECT auto_update_funds_status(); $$
-- );

-- 8. Create trigger to set clearance_start_date when project is approved
CREATE OR REPLACE FUNCTION set_clearance_start_date()
RETURNS TRIGGER AS $$
BEGIN
    -- When status changes to 'Completed' or 'Delivered' and funds_status is Pending
    IF (NEW.status IN ('Completed', 'Delivered')) 
       AND (OLD.status IS NULL OR OLD.status NOT IN ('Completed', 'Delivered'))
       AND (NEW.funds_status = 'Pending' OR NEW.funds_status IS NULL) THEN
        
        NEW.clearance_start_date := NOW();
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
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_clearance_start ON projects;
CREATE TRIGGER trigger_set_clearance_start
    BEFORE INSERT OR UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION set_clearance_start_date();

-- 9. Create view for easy querying of earnings with calculated days left
CREATE OR REPLACE VIEW freelancer_earnings AS
SELECT 
    p.*,
    calculate_days_left(p.clearance_start_date, p.clearance_days) as days_left,
    CASE 
        WHEN p.funds_status = 'Pending' AND calculate_days_left(p.clearance_start_date, p.clearance_days) = 0 
        THEN 'Cleared'
        ELSE p.funds_status
    END as current_funds_status
FROM projects p
WHERE p.status IN ('Completed', 'Delivered');

-- 10. Grant necessary permissions
GRANT SELECT ON freelancer_earnings TO authenticated;
