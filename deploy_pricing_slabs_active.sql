-- Add is_active column to pricing_slabs table
ALTER TABLE pricing_slabs
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT false;
