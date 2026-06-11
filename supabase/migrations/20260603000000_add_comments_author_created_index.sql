-- Migration: Add index to project_comments for OTD stats tracking
-- Created: 2026-06-03

CREATE INDEX IF NOT EXISTS idx_project_comments_otd_tracking 
ON public.project_comments(author_id, created_at)
WHERE content LIKE 'STATUS_CHANGED:%';
