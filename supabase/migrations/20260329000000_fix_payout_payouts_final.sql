
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
