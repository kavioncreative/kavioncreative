-- ============================================
-- CODESLOGIC - USER DETAILS ENHANCEMENT
-- ============================================

-- Add new fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS payment_email text,
ADD COLUMN IF NOT EXISTS cnic_front_url text,
ADD COLUMN IF NOT EXISTS cnic_back_url text,
ADD COLUMN IF NOT EXISTS cnic_number text;

-- Update existing profiles with some dummy data for demonstration
UPDATE profiles 
SET 
    phone = '+1 (555) 0123-4567', 
    payment_email = email
WHERE phone IS NULL;
