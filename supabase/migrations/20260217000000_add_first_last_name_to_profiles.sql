-- Add first_name and last_name columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Update existing profiles by attempting to split the name field if first_name is null
UPDATE public.profiles
SET 
    first_name = split_part(name, ' ', 1),
    last_name = CASE 
        WHEN position(' ' in trim(name)) > 0 
        THEN substring(trim(name) from position(' ' in trim(name)) + 1)
        ELSE ''
    END
WHERE first_name IS NULL OR first_name = '';
