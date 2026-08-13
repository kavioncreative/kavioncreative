-- Add is_pinned column to lead_comments table to support pinning message requirements
ALTER TABLE lead_comments ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;
