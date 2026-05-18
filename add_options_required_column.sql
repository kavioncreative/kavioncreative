-- Add 'options_required' column to 'projects' table
-- This column stores the number of options (1-20) required for a project brief as an integer.

ALTER TABLE projects
ADD COLUMN options_required INT DEFAULT NULL;

-- Optional Comment for table documentation
COMMENT ON COLUMN projects.options_required IS 'Number of options required for the project brief (1-20)';
