-- Add alert columns to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS has_art_help BOOLEAN DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS has_dispute BOOLEAN DEFAULT false;
