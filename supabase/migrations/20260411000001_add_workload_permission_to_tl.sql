-- Grant 'view_workload' and 'edit_workload' permission to 'Team Lead' role
INSERT INTO role_permissions (role_name, permission_code)
VALUES 
    ('Team Lead', 'view_workload'),
    ('Team Lead', 'edit_workload')
ON CONFLICT (role_name, permission_code) DO NOTHING;
