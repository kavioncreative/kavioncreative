
-- 1. IDENTIFY RENAMED PROJECTS
-- Since we don't have a reliable log for some, we can check for projects that 
-- might have mismatched formatting or just list all projects updated in the last 24h.
SELECT project_id, project_title, updated_at 
FROM projects 
WHERE updated_at > NOW() - INTERVAL '2 days'
ORDER BY updated_at DESC;

-- 2. ADD "ON UPDATE CASCADE" TO FOREIGN KEYS
-- This is CRITICAL. It ensures that if you rename a Project ID, 
-- everything (comments, collaborations, etc.) follows automatically.

-- Fix project_comments
ALTER TABLE project_comments 
DROP CONSTRAINT IF EXISTS project_comments_project_id_fkey;

ALTER TABLE project_comments 
ADD CONSTRAINT project_comments_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES projects(project_id) 
ON DELETE CASCADE ON UPDATE CASCADE;

-- Fix project_collaborators
ALTER TABLE project_collaborators 
DROP CONSTRAINT IF EXISTS project_collaborators_project_id_fkey;

ALTER TABLE project_collaborators 
ADD CONSTRAINT project_collaborators_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES projects(project_id) 
ON DELETE CASCADE ON UPDATE CASCADE;

-- If you have a payments or earnings table referencing project_id, repeat for that too.
-- Example:
-- ALTER TABLE payouts DROP CONSTRAINT IF EXISTS payouts_project_id_fkey;
-- ALTER TABLE payouts ADD CONSTRAINT payouts_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(project_id) ON UPDATE CASCADE;
