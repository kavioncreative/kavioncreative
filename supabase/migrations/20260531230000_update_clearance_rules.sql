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
