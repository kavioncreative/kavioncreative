
-- PAYOUT RULES TABLE
CREATE TABLE IF NOT EXISTS public.payout_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    min_price NUMERIC NOT NULL,
    max_price NUMERIC NOT NULL,
    payout_amount NUMERIC NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payout_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated full access" ON public.payout_rules;
CREATE POLICY "Allow authenticated full access" ON public.payout_rules FOR ALL TO authenticated USING (true);

-- Initial Data: $5 -> $4 and >$5 -> $5
INSERT INTO public.payout_rules (min_price, max_price, payout_amount, description)
VALUES 
(0, 5, 4, 'Standard Low Tier ($5 projects pay $4)'),
(5.0001, 999999, 5, 'Standard Mid Tier (> $5 projects pay $5)');

-- UPDATE PROJECT DESIGNER FEE CALCULATION
CREATE OR REPLACE FUNCTION calculate_project_designer_fee()
RETURNS TRIGGER AS $$
DECLARE
  v_commission_val numeric := 0;
  v_commission_factor numeric := 0;
  v_net_amount numeric;
  v_slab_freelancer_pct numeric;
  v_slab_count int;
  v_user_strategy text := 'slab';
  v_user_fixed_rate numeric := 0;
  v_tiered_rate numeric := 0;
BEGIN
  -- VALIDATION
  IF NEW.price IS NULL THEN 
    NEW.price := 0; 
  END IF;
  
  -- 0. Check User's Payout Strategy (Priority)
  IF NEW.assignee_id IS NOT NULL THEN
      SELECT payout_strategy, fixed_payout_rate 
      INTO v_user_strategy, v_user_fixed_rate
      FROM public.profiles 
      WHERE id = NEW.assignee_id;
  END IF;

  -- Strategy: FIXED
  IF v_user_strategy = 'fixed' THEN
      NEW.designer_fee := COALESCE(v_user_fixed_rate, 0);
      RETURN NEW;
  END IF;

  -- Strategy: TIERED (New)
  IF v_user_strategy = 'tiered' THEN
      SELECT payout_amount INTO v_tiered_rate
      FROM public.payout_rules
      WHERE NEW.price >= min_price AND NEW.price <= max_price
      AND is_active = true
      ORDER BY created_at DESC
      LIMIT 1;

      NEW.designer_fee := COALESCE(v_tiered_rate, 0);
      RETURN NEW;
  END IF;

  -- Strategy: SLAB (Original Logic)
  IF NEW.account_id IS NULL THEN 
    RETURN NEW; 
  END IF;

  -- fetch commission with SECURITY DEFINER
  SELECT pc.commission_percentage
  INTO v_commission_val
  FROM public.platform_commissions pc
  JOIN public.platform_commission_accounts pca ON pc.id = pca.platform_commission_id
  WHERE pca.account_id = NEW.account_id
  LIMIT 1;

  IF v_commission_val IS NULL THEN v_commission_val := 0; END IF;

  -- NORMALIZE
  IF v_commission_val > 1 THEN v_commission_factor := v_commission_val / 100.0;
  ELSE v_commission_factor := v_commission_val; END IF;

  -- CALCULATION
  v_net_amount := NEW.price - (NEW.price * v_commission_factor);

  -- SLAB SELECTION
  SELECT freelancer_percentage, COUNT(*) OVER()
  INTO v_slab_freelancer_pct, v_slab_count
  FROM public.pricing_slabs
  WHERE NEW.price >= min_price AND NEW.price <= max_price;

  -- Check Slabs (Non-blocking fallback to 0 if no slab found)
  IF v_slab_count IS NOT NULL AND v_slab_count > 0 THEN
    NEW.designer_fee := v_net_amount * (v_slab_freelancer_pct / 100.0);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- UPDATE TEAM DESIGNER PAYOUT CALCULATION
CREATE OR REPLACE FUNCTION calculate_team_designer_payout()
RETURNS TRIGGER AS $$
DECLARE
    v_tl_id text;
    v_td_id text;
    v_slab_percentage numeric;
    v_td_strategy text := 'slab';
    v_td_fixed_rate numeric := 0;
    v_tiered_rate numeric := 0;
BEGIN
    -- 0. Identify Team Lead and Team Designer
    v_tl_id := NEW.assignee_id;
    v_td_id := NEW.team_designer_id;

    -- If no Team Designer, set fee to 0
    IF v_td_id IS NULL THEN
        NEW.team_designer_fee := 0;
        NEW.team_payout := 0;
        RETURN NEW;
    END IF;

    -- 1. Check Team Designer's Strategy
    SELECT payout_strategy, fixed_payout_rate 
    INTO v_td_strategy, v_td_fixed_rate
    FROM public.profiles 
    WHERE id = v_td_id;

    -- Strategy: FIXED
    IF v_td_strategy = 'fixed' THEN
        NEW.team_designer_fee := COALESCE(v_td_fixed_rate, 0);
        NEW.team_payout := NEW.team_designer_fee; -- Legacy support
        RETURN NEW;
    END IF;

    -- Strategy: TIERED (New)
    IF v_td_strategy = 'tiered' THEN
        SELECT payout_amount INTO v_tiered_rate
        FROM public.payout_rules
        WHERE NEW.price >= min_price AND NEW.price <= max_price
        AND is_active = true
        ORDER BY created_at DESC
        LIMIT 1;

        NEW.team_designer_fee := COALESCE(v_tiered_rate, 0);
        NEW.team_payout := NEW.team_designer_fee;
        RETURN NEW;
    END IF;

    -- Strategy: SLAB (Original Logic)
    -- Get slab calculation for the designer from the team's pricing slabs
    SELECT td_percentage INTO v_slab_percentage
    FROM public.team_pricing_slabs
    WHERE team_lead_id = v_tl_id
      AND NEW.designer_fee >= min_designer_fee 
      AND NEW.designer_fee <= max_designer_fee
    LIMIT 1;

    -- Update fee if slab exists
    IF v_slab_percentage IS NOT NULL THEN
        NEW.team_designer_fee := NEW.designer_fee * (v_slab_percentage / 100.0);
        NEW.team_payout := NEW.team_designer_fee; -- Legacy support
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
