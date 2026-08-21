-- Migration: Add penalty_effect and waived_bonus_id columns to bonus_structures
-- Run this in Supabase Dashboard > SQL Editor

-- Step 1: Add penalty_effect column with CHECK constraint
ALTER TABLE public.bonus_structures
ADD COLUMN IF NOT EXISTS penalty_effect text
    NOT NULL DEFAULT 'deduction'
    CHECK (penalty_effect IN ('deduction', 'waive_all', 'waive_specific'));

-- Step 2: Add waived_bonus_id column (self-referencing FK, nullable)
ALTER TABLE public.bonus_structures
ADD COLUMN IF NOT EXISTS waived_bonus_id uuid
    REFERENCES public.bonus_structures(id)
    ON DELETE SET NULL;

-- Step 3: Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
