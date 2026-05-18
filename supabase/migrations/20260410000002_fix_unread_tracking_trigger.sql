-- Migration: Fix Project Unread Tracking Trigger
-- Description: Ensures system logs and non-discussion comments do not trigger the unread blue dot.
-- Also cleans up any existing stale data where system logs erroneously populated latest_comment_at.

-- 1. Update the trigger function to be more strict
CREATE OR REPLACE FUNCTION public.handle_update_project_latest_comment()
RETURNS TRIGGER AS $$
BEGIN
    -- Only trigger Blue Dot for genuine Discussion messages
    -- 1. Category must be 'discussion'
    -- 2. Content must NOT be a system log prefix
    -- 3. MUST NOT be an internal/QA comment
    IF NEW.category = 'discussion' 
       AND NEW.is_internal = false
       AND NEW.content NOT LIKE 'PROJECT_ASSIGNED%'
       AND NEW.content NOT LIKE 'STATUS_CHANGED%'
       AND NEW.content NOT LIKE 'QA_STATUS_CHANGED%'
       AND NEW.content NOT LIKE 'FILE_SUBMITTED%'
    THEN
        UPDATE public.projects 
        SET 
            latest_comment_at = NEW.created_at,
            latest_comment_author_id = NEW.author_id, -- Use the author_id from the comment
            updated_at = now()
        WHERE project_id = NEW.project_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Clean up existing projects that were triggered by system logs
-- We set latest_comment_at to NULL if the latest comment for that project is NOT a discussion message
UPDATE public.projects p
SET 
    latest_comment_at = sub.last_disc_at,
    latest_comment_author_id = sub.last_disc_author
FROM (
    -- Find the latest genuine discussion message for each project
    SELECT DISTINCT ON (project_id)
        project_id,
        created_at as last_disc_at,
        author_id as last_disc_author
    FROM public.project_comments
    WHERE category = 'discussion' 
      AND is_internal = false
      AND content NOT LIKE 'PROJECT_ASSIGNED%'
      AND content NOT LIKE 'STATUS_CHANGED%'
    ORDER BY project_id, created_at DESC
) sub
WHERE p.project_id = sub.project_id;

-- Clear latest_comment_at for projects that have NO discussion messages (only system logs)
UPDATE public.projects
SET 
    latest_comment_at = NULL,
    latest_comment_author_id = NULL
WHERE project_id NOT IN (
    SELECT DISTINCT project_id 
    FROM public.project_comments 
    WHERE category = 'discussion'
);
