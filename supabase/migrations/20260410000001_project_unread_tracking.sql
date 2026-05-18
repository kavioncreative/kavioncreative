-- Migration: Project Unread Tracking (Blue Dot System)
-- Created: 2026-04-10
-- Description: Tracks the latest message in a project and per-user read states to show a blue dot notification.

-- 1. Add tracking columns to projects
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS latest_comment_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS latest_comment_author_id UUID;

-- 2. Add author_id to project_comments for robust tracking
ALTER TABLE public.project_comments 
ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES auth.users(id);

-- 3. Create project_read_states table
CREATE TABLE IF NOT EXISTS public.project_read_states (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id TEXT, -- matches projects.project_id
    last_read_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (user_id, project_id)
);

-- Enable RLS for read states
ALTER TABLE public.project_read_states ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see/update their own read states
DROP POLICY IF EXISTS "Users can manage own read states" ON public.project_read_states;
CREATE POLICY "Users can manage own read states"
    ON public.project_read_states
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 4. Trigger Function: Update project latest message info (ONLY FOR DISCUSSION)
CREATE OR REPLACE FUNCTION public.handle_update_project_latest_comment()
RETURNS TRIGGER AS $$
BEGIN
    -- Only trigger Blue Dot for Discussion messages as per user requirement
    IF NEW.category = 'discussion' THEN
        UPDATE public.projects 
        SET 
            latest_comment_at = NEW.created_at,
            latest_comment_author_id = auth.uid(),
            updated_at = now()
        WHERE project_id = NEW.project_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for Project Comments
DROP TRIGGER IF EXISTS tr_update_project_latest_comment ON project_comments;
CREATE TRIGGER tr_update_project_latest_comment
    AFTER INSERT ON project_comments
    FOR EACH ROW
    EXECUTE FUNCTION handle_update_project_latest_comment();

-- 5. Backfill: Set initial latest_comment_at for existing projects
UPDATE public.projects p
SET latest_comment_at = (
    SELECT MAX(created_at) 
    FROM public.project_comments 
    WHERE project_id = p.project_id
)
WHERE latest_comment_at IS NULL;
