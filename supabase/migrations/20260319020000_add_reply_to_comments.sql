-- Add parent_id to project_comments to support threaded replies
ALTER TABLE public.project_comments 
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.project_comments(id);

-- Add index for performance on threaded fetching
CREATE INDEX IF NOT EXISTS idx_project_comments_parent_id ON public.project_comments(parent_id);
