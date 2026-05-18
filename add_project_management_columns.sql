-- Add Project Management Columns to Projects Table
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS primary_manager_id uuid REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS collaborators jsonb DEFAULT '[]'::jsonb;

-- Update RLS policies to ensure these columns can be read/written
-- (Existing policies are already quite broad, but this is for completeness)
