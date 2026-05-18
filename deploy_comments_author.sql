-- Add author tracking to project_comments
ALTER TABLE project_comments
ADD COLUMN IF NOT EXISTS author_name text,
ADD COLUMN IF NOT EXISTS author_role text;
