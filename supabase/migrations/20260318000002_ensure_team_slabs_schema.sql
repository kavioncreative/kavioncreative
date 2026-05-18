-- Ensure Team Pricing Slabs and Teams table schema and permissions exist
-- This migration acts as a self-healing script for the Team Economy feature

-- 1. Ensure Team Pricing Slabs Table Exists
CREATE TABLE IF NOT EXISTS public.team_pricing_slabs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_lead_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    min_price DECIMAL(12,2) NOT NULL DEFAULT 0,
    max_price DECIMAL(12,2) NOT NULL DEFAULT 999999999,
    designer_payout DECIMAL(12,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Ensure slab_name column exists
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'team_pricing_slabs' AND column_name = 'slab_name') THEN
        ALTER TABLE public.team_pricing_slabs ADD COLUMN slab_name TEXT DEFAULT 'Standard Slab';
    END IF;
END $$;

-- 3. FIX Teams Table Schema (Add Missing leader_id needed for TeamDesignerEarnings.tsx)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'teams' AND column_name = 'leader_id') THEN
        ALTER TABLE public.teams ADD COLUMN leader_id UUID REFERENCES public.profiles(id);
    END IF;
END $$;

-- 4. Enable RLS on slabs
ALTER TABLE public.team_pricing_slabs ENABLE ROW LEVEL SECURITY;

-- 5. Recreate Slab Policies
DROP POLICY IF EXISTS "Team Leads can manage their own slabs" ON public.team_pricing_slabs;
CREATE POLICY "Team Leads can manage their own slabs" ON public.team_pricing_slabs
    FOR ALL TO authenticated
    USING (auth.uid() = team_lead_id)
    WITH CHECK (auth.uid() = team_lead_id);

DROP POLICY IF EXISTS "Anyone can view slabs assigned to them" ON public.team_pricing_slabs;
CREATE POLICY "Anyone can view slabs assigned to them" ON public.team_pricing_slabs
    FOR SELECT TO authenticated
    USING (true);

-- 6. CRITICAL: Grant Permissions to fix PGRST205
GRANT ALL ON TABLE public.team_pricing_slabs TO postgres;
GRANT ALL ON TABLE public.team_pricing_slabs TO anon;
GRANT ALL ON TABLE public.team_pricing_slabs TO authenticated;
GRANT ALL ON TABLE public.team_pricing_slabs TO service_role;

-- 7. Ensure project columns exist
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS team_designer_id UUID REFERENCES public.profiles(id);
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS team_payout DECIMAL(12,2) DEFAULT 0;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS team_slab_id UUID REFERENCES public.team_pricing_slabs(id);

-- 8. Payout Function & Trigger
CREATE OR REPLACE FUNCTION public.calculate_team_designer_payout()
RETURNS TRIGGER AS $$
DECLARE
    slab_payout DECIMAL(12,2);
BEGIN
    -- Only calculate if we have a team designer and project price
    IF NEW.team_designer_id IS NOT NULL AND NEW.price IS NOT NULL THEN
        -- Find the matching slab for this team lead and price point
        -- We use the primary_manager_id as the team_lead_id
        SELECT designer_payout INTO slab_payout
        FROM public.team_pricing_slabs
        WHERE team_lead_id = NEW.primary_manager_id
          AND NEW.price >= min_price
          AND NEW.price <= max_price
        LIMIT 1;

        IF slab_payout IS NOT NULL THEN
            NEW.team_payout := slab_payout;
            
            -- Also store the slab ID for reference if not manually set
            IF NEW.team_slab_id IS NULL THEN
                SELECT id INTO NEW.team_slab_id
                FROM public.team_pricing_slabs
                WHERE team_lead_id = NEW.primary_manager_id
                  AND NEW.price >= min_price
                  AND NEW.price <= max_price
                LIMIT 1;
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Re-attach trigger
DROP TRIGGER IF EXISTS trigger_calculate_team_payout ON public.projects;
CREATE TRIGGER trigger_calculate_team_payout
    BEFORE INSERT OR UPDATE OF price, team_designer_id, primary_manager_id
    ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION public.calculate_team_designer_payout();

-- 10. Indexes
CREATE INDEX IF NOT EXISTS idx_team_pricing_slabs_lead ON public.team_pricing_slabs(team_lead_id);
CREATE INDEX IF NOT EXISTS idx_projects_team_designer ON public.projects(team_designer_id) WHERE team_designer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_projects_team_slab ON public.projects(team_slab_id) WHERE team_slab_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_teams_leader ON public.teams(leader_id);
