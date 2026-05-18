-- Add has_seen_welcome column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS has_seen_welcome BOOLEAN DEFAULT FALSE;

-- Ensure all current active admins have seen it to avoid annoying them
UPDATE public.profiles 
SET has_seen_welcome = TRUE 
WHERE status = 'Active' AND lower(role) = 'admin';
