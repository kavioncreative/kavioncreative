-- Restore daily_capacity for existing freelancers who were established before the capacity system launch
-- This prevents the onboarding modal from appearing for "already users"
UPDATE public.profiles
SET daily_capacity = 5
WHERE role = 'Freelancer' 
  AND daily_capacity IS NULL
  AND created_at < '2026-03-16 00:00:00+00';
