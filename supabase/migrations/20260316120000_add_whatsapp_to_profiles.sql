-- Add whatsapp_number to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;
