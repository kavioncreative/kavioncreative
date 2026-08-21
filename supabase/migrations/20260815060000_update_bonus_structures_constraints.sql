-- Migration: Update bonus_structures table
-- 1. Add missing description column
-- 2. Update calc_type CHECK constraint to include 'Penalties' and 'OTD Score'
-- 3. Reload PostgREST schema cache

-- Step 1: Add description column (safe if already exists)
ALTER TABLE public.bonus_structures
ADD COLUMN IF NOT EXISTS description text;

-- Step 2: Drop old CHECK constraint and recreate with all valid types
ALTER TABLE public.bonus_structures
DROP CONSTRAINT IF EXISTS bonus_structures_calc_type_check;

ALTER TABLE public.bonus_structures
ADD CONSTRAINT bonus_structures_calc_type_check
CHECK (calc_type IN (
    'Volume',
    'Percentage',
    'Rating',
    'Punctuality',
    'Penalties',
    'OTD Score'
));

-- Step 3: Reload PostgREST schema cache so API picks up new column
NOTIFY pgrst, 'reload schema';
