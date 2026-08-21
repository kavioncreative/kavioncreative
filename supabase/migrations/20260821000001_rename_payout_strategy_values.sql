-- MIGRATION: Rename payout_strategy values
-- 'fixed' -> 'basicplusbonus'
-- 'slab'  -> 'bonusonly'
-- Order: Recreate triggers FIRST, then update data rows

-- =============================================
-- STEP 1: Recreate calculate_project_designer_fee trigger
-- =============================================
CREATE OR REPLACE FUNCTION public.calculate_project_designer_fee()
RETURNS TRIGGER AS $$
DECLARE
  v_user_strategy text := 'bonusonly';
  v_user_fixed_rate numeric := 0;
  v_tiered_rate numeric := 0;
  v_commission_val numeric := 0;
  v_commission_factor numeric := 0;
  v_net_amount numeric;
  v_slab_freelancer_pct numeric;
  v_slab_id_found uuid;
BEGIN
  -- VALIDATION: Ensure price exists
  IF NEW.price IS NULL THEN 
    NEW.price := 0; 
  END IF;

  -- 0. Fetch User's Payout Configuration (Try ID first, then Name)
  IF NEW.assignee_id IS NOT NULL THEN
      SELECT payout_strategy, fixed_payout_rate 
      INTO v_user_strategy, v_user_fixed_rate
      FROM public.profiles 
      WHERE id = NEW.assignee_id;
  ELSIF NEW.assignee IS NOT NULL THEN
      -- Fallback for legacy projects with name only
      SELECT payout_strategy, fixed_payout_rate 
      INTO v_user_strategy, v_user_fixed_rate
      FROM public.profiles 
      WHERE name = NEW.assignee OR email = NEW.assignee
      LIMIT 1;
  END IF;

  -- STRATEGY: BASIC SALARY + BONUSES (formerly 'fixed')
  IF v_user_strategy = 'basicplusbonus' THEN
      NEW.designer_fee := COALESCE(v_user_fixed_rate, 0);
      RETURN NEW;
  END IF;

  -- STRATEGY: TIERED (Priority Logic)
  IF v_user_strategy = 'tiered' THEN
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
  END IF;

  -- STRATEGY: BONUS ONLY / SLAB (Original Legacy Logic)
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
  SELECT freelancer_percentage INTO v_slab_freelancer_pct
  FROM public.pricing_slabs
  WHERE NEW.price >= min_price AND NEW.price <= max_price
  LIMIT 1;

  IF v_slab_freelancer_pct IS NOT NULL THEN
    NEW.designer_fee := v_net_amount * (v_slab_freelancer_pct / 100.0);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =============================================
-- STEP 2: Recreate calculate_team_designer_payout trigger
-- =============================================
CREATE OR REPLACE FUNCTION public.calculate_team_designer_payout()
RETURNS TRIGGER AS $$
DECLARE
    v_tl_id uuid;
    v_td_id uuid;
    v_td_strategy text := 'bonusonly';
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

    -- Fetch Team Designer's strategy (Using ID)
    SELECT payout_strategy, fixed_payout_rate 
    INTO v_td_strategy, v_td_fixed_rate
    FROM public.profiles 
    WHERE id = v_td_id;

    -- STRATEGY: BASIC SALARY + BONUSES (formerly 'fixed')
    IF v_td_strategy = 'basicplusbonus' THEN
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

    -- STRATEGY: BONUS ONLY / SLAB (Team Specific)
    -- Recalculate TL ID from name if missing
    IF v_tl_id IS NULL AND NEW.assignee IS NOT NULL THEN
        SELECT id INTO v_tl_id FROM public.profiles WHERE name = NEW.assignee OR email = NEW.assignee LIMIT 1;
    END IF;

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


-- =============================================
-- STEP 3: Update existing profile rows
-- =============================================
UPDATE public.profiles 
SET payout_strategy = 'basicplusbonus' 
WHERE payout_strategy = 'fixed';

UPDATE public.profiles 
SET payout_strategy = 'bonusonly' 
WHERE payout_strategy = 'slab';


-- =============================================
-- STEP 4: Update column DEFAULT
-- =============================================
ALTER TABLE public.profiles 
ALTER COLUMN payout_strategy SET DEFAULT 'bonusonly';
