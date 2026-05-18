
-- SQL to add task_id support to project_comments
-- This allows comments to be linked to either projects or tasks

ALTER TABLE public.project_comments 
ADD COLUMN IF NOT EXISTS task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE;

-- Also add an index for performance when fetching task comments
CREATE INDEX IF NOT EXISTS idx_project_comments_task_id ON public.project_comments(task_id);
