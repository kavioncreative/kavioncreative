-- Migration: Add slab_name to team_pricing_slabs
-- Created: 2026-03-17 19:00:00

ALTER TABLE public.team_pricing_slabs 
ADD COLUMN IF NOT EXISTS slab_name TEXT;

-- Update existing records if any (though there shouldn't be yet)
UPDATE public.team_pricing_slabs SET slab_name = 'Tier ' || min_price::text WHERE slab_name IS NULL;

-- Make it NOT NULL for future entries if desired, but for now we'll just use it in the UI
