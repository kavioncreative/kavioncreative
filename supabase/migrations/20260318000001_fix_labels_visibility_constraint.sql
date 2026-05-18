-- Fix the visibility_type check constraint to include 'private'
-- This addresses the case where the constraint was created without 'private' in a previous run

ALTER TABLE public.labels DROP CONSTRAINT IF EXISTS labels_visibility_type_check;
ALTER TABLE public.labels ADD CONSTRAINT labels_visibility_type_check CHECK (visibility_type IN ('all', 'roles', 'users', 'private'));

-- Ensure visibility_type column has a default
ALTER TABLE public.labels ALTER COLUMN visibility_type SET DEFAULT 'all';
