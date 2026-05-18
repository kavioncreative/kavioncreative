-- Add converted_by column to projects table
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS converted_by text;
