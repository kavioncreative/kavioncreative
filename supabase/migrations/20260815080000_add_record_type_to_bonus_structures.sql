-- Migration: Add record_type column to bonus_structures
-- Separates bonus structures from penalty rules in the same table

-- Step 1: Add record_type column
ALTER TABLE public.bonus_structures
ADD COLUMN IF NOT EXISTS record_type text
    NOT NULL DEFAULT 'bonus'
    CHECK (record_type IN ('bonus', 'penalty'));

-- Step 2: Existing records are all bonuses by default (handled by DEFAULT 'bonus')

-- Step 3: Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
