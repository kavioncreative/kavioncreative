
-- 1. Ensure all pricing slabs are active (as requested)
UPDATE public.pricing_slabs SET is_active = true;

-- 2. Update the Designer Fee Function to handle INSERT/UPDATE and check active status
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
  -- If price is NULL, default to 0 to prevent crashes
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
  -- Select matching slab that is set to is_active = true
  SELECT freelancer_percentage, COUNT(*) OVER()
  INTO v_slab_freelancer_pct, v_slab_count
  FROM pricing_slabs
  WHERE NEW.price >= min_price AND NEW.price <= max_price
    AND is_active = true;

  -- 5. SLAB CHECKING
  IF v_slab_count IS NULL OR v_slab_count = 0 THEN
      -- Optional: Fallback percentage or set to 0? 
      -- Let's set designer_fee to 0 if no slab is found to avoid blocking insertion
      NEW.designer_fee := 0;
  ELSE
      -- 6. FINAL FEE CALCULATION
      NEW.designer_fee := v_net_amount * (v_slab_freelancer_pct / 100.0);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. RECREATE TRIGGER to handle both INSERT and UPDATE
DROP TRIGGER IF EXISTS trg_calculate_designer_fee ON projects;
CREATE TRIGGER trg_calculate_designer_fee
BEFORE INSERT OR UPDATE OF price, account_id ON projects
FOR EACH ROW
EXECUTE FUNCTION calculate_project_designer_fee();
