-- Add preferred_payment_method column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS preferred_payment_method text;
