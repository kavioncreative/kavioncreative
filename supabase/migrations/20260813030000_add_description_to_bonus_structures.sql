-- Add description column to bonus_structures table
ALTER TABLE public.bonus_structures ADD COLUMN IF NOT EXISTS description text;
