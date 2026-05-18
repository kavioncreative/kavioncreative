-- Add 'edit_projects' permission to the database
INSERT INTO permissions (code, name, category, description)
VALUES ('edit_projects', 'Edit Projects', 'Projects', 'Edit existing project properties and details')
ON CONFLICT (code) DO UPDATE
SET name = 'Edit Projects',
    category = 'Projects',
    description = 'Edit existing project properties and details';
