-- PART 3: LOGIC
-- Run this last.

-- 4.1 Check Slab Overlap Function
CREATE OR REPLACE FUNCTION check_slab_overlap()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pricing_slabs
    WHERE id <> NEW.id
      AND (
        (NEW.min_price BETWEEN min_price AND max_price) OR
        (NEW.max_price BETWEEN min_price AND max_price) OR
        (min_price BETWEEN NEW.min_price AND NEW.max_price)
      )
  ) THEN
    RAISE EXCEPTION 'Overlapping pricing slab detected. Ensure strict price ranges.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_slab_overlap ON pricing_slabs;
CREATE TRIGGER trg_check_slab_overlap
BEFORE INSERT OR UPDATE ON pricing_slabs
FOR EACH ROW EXECUTE FUNCTION check_slab_overlap();

-- 4.2 Calculate Project Designer Fee Function
CREATE OR REPLACE FUNCTION calculate_project_designer_fee()
RETURNS TRIGGER AS $$
DECLARE
  v_commission_val numeric := 0;
  v_commission_factor numeric := 0;
  v_net_amount numeric;
  v_slab_freelancer_pct numeric;
  v_slab_count int;
BEGIN
  -- VALIDATION
  IF NEW.price IS NULL THEN 
    NEW.price := 0; 
  END IF;
  
  -- Account ID check can be non-blocking if needed, but let's keep it for data integrity
  IF NEW.account_id IS NULL THEN 
    RETURN NEW; 
  END IF;

  -- fetch commission with SECURITY DEFINER (Bypasses RLS)
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

  -- NORMALIZE (Handle 0.2 vs 20)
  IF v_commission_val > 1 THEN
    v_commission_factor := v_commission_val / 100.0;
  ELSE
    v_commission_factor := v_commission_val;
  END IF;

  -- CALCULATION
  v_net_amount := NEW.price - (NEW.price * v_commission_factor);

  -- SLAB SELECTION
  SELECT freelancer_percentage, COUNT(*) OVER()
  INTO v_slab_freelancer_pct, v_slab_count
  FROM pricing_slabs
  WHERE NEW.price >= min_price AND NEW.price <= max_price;

  -- Check Slabs (Non-blocking fallback to 0 if no slab found)
  IF v_slab_count IS NOT NULL AND v_slab_count > 0 THEN
    NEW.designer_fee := v_net_amount * (v_slab_freelancer_pct / 100.0);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4.3 Trigger for Designer Fee
DROP TRIGGER IF EXISTS trg_calculate_designer_fee ON projects;
CREATE TRIGGER trg_calculate_designer_fee
BEFORE INSERT OR UPDATE OF price, account_id ON projects
FOR EACH ROW
EXECUTE FUNCTION calculate_project_designer_fee();
