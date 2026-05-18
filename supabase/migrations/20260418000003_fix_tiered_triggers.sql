
-- 1. CLEANUP OLD TRIGGERS TO ENSURE FRESH START
DROP TRIGGER IF EXISTS trg_calculate_designer_fee ON public.projects;
DROP TRIGGER IF EXISTS trg_calculate_team_designer_payout ON public.projects;
DROP TRIGGER IF EXISTS trigger_calculate_project_designer_fee ON public.projects;

-- 2. ENHANCED PROJECT DESIGNER FEE FUNCTION
CREATE OR REPLACE FUNCTION public.calculate_project_designer_fee()
RETURNS TRIGGER AS $$
DECLARE
  v_user_strategy text := 'slab';
  v_user_fixed_rate numeric := 0;
  v_tiered_rate numeric := 0;
  v_commission_val numeric := 0;
  v_commission_factor numeric := 0;
  v_net_amount numeric;
  v_slab_freelancer_pct numeric;
  v_slab_count int;
BEGIN
  -- 0. MANUAL OVERRIDE CHECK
  -- If designer_fee is provided from frontend (> 0), skip auto-calculation.
  -- This allows special projects like Animation/Web to have manual pricing.
  IF TG_OP = 'INSERT' AND NEW.designer_fee IS NOT NULL AND NEW.designer_fee > 0 THEN
      RETURN NEW;
  END IF;

  -- For updates, we only skip if the designer_fee was specifically changed to a new manual value
  IF TG_OP = 'UPDATE' AND NEW.designer_fee IS NOT NULL AND NEW.designer_fee > 0 AND NEW.designer_fee != OLD.designer_fee THEN
      RETURN NEW;
  END IF;

  -- VALIDATION: Ensure price exists
  IF NEW.price IS NULL THEN 
    NEW.price := 0; 
  END IF;

  -- 1. Fetch User's Payout Configuration
  IF NEW.assignee_id IS NOT NULL THEN
      SELECT payout_strategy, fixed_payout_rate 
      INTO v_user_strategy, v_user_fixed_rate
      FROM public.profiles 
      WHERE id = NEW.assignee_id;
  END IF;

  -- STRATEGY: FIXED
  IF v_user_strategy = 'fixed' THEN
      NEW.designer_fee := COALESCE(v_user_fixed_rate, 0);
      RETURN NEW;
  END IF;

  -- STRATEGY: TIERED (Priority Logic)
  IF v_user_strategy = 'tiered' THEN
      -- CRITICAL FIX: If designer_fee is already set (Manual Override), do NOT overwrite it.
      -- This ensures that manual prices persist even when other project columns are updated.
      IF NEW.designer_fee IS NOT NULL AND NEW.designer_fee > 0 THEN
          RETURN NEW;
      END IF;

      -- Find the most specific applicable rule (smallest range for precision or newest)
      SELECT payout_amount INTO v_tiered_rate
      FROM public.payout_rules
      WHERE NEW.price >= min_price AND NEW.price <= max_price
      AND is_active = true
      ORDER BY (max_price - min_price) ASC, created_at DESC
      LIMIT 1;

      IF v_tiered_rate IS NOT NULL THEN
          NEW.designer_fee := v_tiered_rate;
          RETURN NEW;
      END IF;
      -- Fallback to 0 or slab if no tiered rule matches
  END IF;

  -- STRATEGY: SLAB (Original Legacy Logic)
  IF NEW.account_id IS NULL THEN 
    RETURN NEW; 
  END IF;

  -- Fetch commission for the account
  SELECT pc.commission_percentage INTO v_commission_val
  FROM public.platform_commissions pc
  JOIN public.platform_commission_accounts pca ON pc.id = pca.platform_commission_id
  WHERE pca.account_id = NEW.account_id
  LIMIT 1;

  v_commission_val := COALESCE(v_commission_val, 0);
  IF v_commission_val > 1 THEN v_commission_factor := v_commission_val / 100.0;
  ELSE v_commission_factor := v_commission_val; END IF;

  v_net_amount := NEW.price - (NEW.price * v_commission_factor);

  -- Select matching slab
  SELECT freelancer_percentage, COUNT(*) OVER()
  INTO v_slab_freelancer_pct, v_slab_count
  FROM public.pricing_slabs
  WHERE NEW.price >= min_price AND NEW.price <= max_price
  LIMIT 1;

  IF v_slab_count IS NOT NULL AND v_slab_count > 0 THEN
    NEW.designer_fee := v_net_amount * (v_slab_freelancer_pct / 100.0);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. ENHANCED TEAM DESIGNER PAYOUT FUNCTION
CREATE OR REPLACE FUNCTION public.calculate_team_designer_payout()
RETURNS TRIGGER AS $$
DECLARE
    v_tl_id uuid;
    v_td_id uuid;
    v_td_strategy text := 'slab';
    v_td_fixed_rate numeric := 0;
    v_tiered_rate numeric := 0;
    v_slab_percentage numeric;
BEGIN
    -- Only run if a team designer is assigned
    IF NEW.team_designer_id IS NULL THEN
        RETURN NEW;
    END IF;

    v_tl_id := NEW.assignee_id;
    v_td_id := NEW.team_designer_id;

    -- Fetch Team Designer's strategy
    SELECT payout_strategy, fixed_payout_rate 
    INTO v_td_strategy, v_td_fixed_rate
    FROM public.profiles 
    WHERE id = v_td_id;

    -- STRATEGY: FIXED
    IF v_td_strategy = 'fixed' THEN
        NEW.team_designer_fee := COALESCE(v_td_fixed_rate, 0);
        NEW.team_payout := NEW.team_designer_fee;
        RETURN NEW;
    END IF;

    -- STRATEGY: TIERED
    IF v_td_strategy = 'tiered' THEN
        SELECT payout_amount INTO v_tiered_rate
        FROM public.payout_rules
        WHERE NEW.price >= min_price AND NEW.price <= max_price
        AND is_active = true
        ORDER BY (max_price - min_price) ASC, created_at DESC
        LIMIT 1;

        IF v_tiered_rate IS NOT NULL THEN
            NEW.team_designer_fee := v_tiered_rate;
            NEW.team_payout := NEW.team_designer_fee;
            RETURN NEW;
        END IF;
    END IF;

    -- STRATEGY: SLAB (Team Specific)
    -- Team slabs look at min_price/max_price for original designer_fee
    SELECT percentage INTO v_slab_percentage
    FROM public.team_pricing_slabs
    WHERE team_lead_id = v_tl_id
      AND NEW.designer_fee >= min_price 
      AND NEW.designer_fee <= max_price
      AND is_active = true
    LIMIT 1;

    IF v_slab_percentage IS NOT NULL THEN
        NEW.team_designer_fee := NEW.designer_fee * (v_slab_percentage / 100.0);
        NEW.team_payout := NEW.team_designer_fee;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RE-REGISTER TRIGGERS EXPLICITLY
CREATE TRIGGER trg_calculate_designer_fee
BEFORE INSERT OR UPDATE OF price, account_id, assignee_id, designer_fee ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.calculate_project_designer_fee();

CREATE TRIGGER trg_calculate_team_designer_payout
BEFORE INSERT OR UPDATE OF team_designer_id, designer_fee, assignee_id, price ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.calculate_team_designer_payout();

-- 5. RE-CALC FEES FOR IMPACTED PROJECTS (Force trigger run)
UPDATE projects 
SET price = price 
WHERE status NOT IN ('Approved', 'Delivered', 'Cancelled')
  AND price > 0;
