-- Migration: Add Team Lead Economy Support with Automated Calculations
-- Created: 2026-03-17 18:30:00

-- 1. Create team_pricing_slabs table
CREATE TABLE IF NOT EXISTS public.team_pricing_slabs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_lead_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    min_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    max_price NUMERIC(10, 2) NOT NULL DEFAULT 999999,
    percentage NUMERIC(5, 2) NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Add columns to projects table for internal team tracking
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS assignee_id UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS team_designer_id UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS team_payout NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS team_slab_id UUID REFERENCES public.team_pricing_slabs(id);

-- 3. Enable RLS on team_pricing_slabs
ALTER TABLE public.team_pricing_slabs ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for team_pricing_slabs
DROP POLICY IF EXISTS "Team Leads can manage their own slabs" ON public.team_pricing_slabs;
CREATE POLICY "Team Leads can manage their own slabs" 
ON public.team_pricing_slabs 
FOR ALL 
USING (auth.uid() = team_lead_id)
WITH CHECK (auth.uid() = team_lead_id);

DROP POLICY IF EXISTS "Team Designers can view their TL's slabs" ON public.team_pricing_slabs;
CREATE POLICY "Team Designers can view their TL's slabs" 
ON public.team_pricing_slabs 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.team_members tm
        JOIN public.teams t ON tm.team_id = t.id
        WHERE tm.member_id = auth.uid()
        AND t.leader_id = public.team_pricing_slabs.team_lead_id
    )
);

-- 5. Calculation Function for Team Designer Payout
CREATE OR REPLACE FUNCTION public.calculate_team_designer_payout()
RETURNS TRIGGER AS $$
DECLARE
    v_slab_percentage NUMERIC;
    v_slab_id UUID;
    v_tl_id UUID;
BEGIN
    -- Only calculate if there is a team designer assigned
    IF NEW.team_designer_id IS NULL THEN
        NEW.team_payout := NULL;
        NEW.team_slab_id := NULL;
        RETURN NEW;
    END IF;

    -- The Team Lead is the assignee of the project
    v_tl_id := NEW.assignee_id;

    -- If no assignee_id, we can't find the TL's slabs
    IF v_tl_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Find the TL's slab that covers the project's freelancer payout (designer_fee)
    -- As requested: "jo freelancer payout hoga hamare project ka wo consider hoga team lead ka project price"
    SELECT percentage, id INTO v_slab_percentage, v_slab_id
    FROM public.team_pricing_slabs
    WHERE team_lead_id = v_tl_id
      AND NEW.designer_fee >= min_price 
      AND NEW.designer_fee <= max_price
      AND is_active = true
    LIMIT 1;

    -- If slab found, calculate payout (percentage of TL's designer_fee)
    IF v_slab_id IS NOT NULL THEN
        NEW.team_payout := NEW.designer_fee * (v_slab_percentage / 100.0);
        NEW.team_slab_id := v_slab_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Trigger for Team Designer Payout
DROP TRIGGER IF EXISTS trg_calculate_team_designer_payout ON public.projects;
CREATE TRIGGER trg_calculate_team_designer_payout
BEFORE INSERT OR UPDATE OF team_designer_id, designer_fee, assignee_id ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.calculate_team_designer_payout();

-- 7. Trigger for updated_at on slabs
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON public.team_pricing_slabs;
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.team_pricing_slabs
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
