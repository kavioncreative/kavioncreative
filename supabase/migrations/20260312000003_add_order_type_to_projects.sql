-- Add order_type column to projects table
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS order_type text DEFAULT 'Direct';

-- Update existing records to 'Converted' if they have a converted_by PM
UPDATE projects 
SET order_type = 'Converted' 
WHERE converted_by IS NOT NULL;
