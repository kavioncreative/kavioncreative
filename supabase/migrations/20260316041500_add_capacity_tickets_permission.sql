-- Add permission for Capacity Tickets
INSERT INTO permissions (code, name, category, description) VALUES
  ('view_capacity_tickets', 'Capacity Tickets', 'Workload', 'Access to review and manage freelancer capacity requests')
ON CONFLICT (code) DO NOTHING;

-- Grant access to specified roles
-- Super Admin
INSERT INTO role_permissions (role_name, permission_code)
VALUES ('Super Admin', 'view_capacity_tickets')
ON CONFLICT DO NOTHING;

-- Project Manager
INSERT INTO role_permissions (role_name, permission_code)
VALUES ('Project Manager', 'view_capacity_tickets')
ON CONFLICT DO NOTHING;

-- Project Operations Manager
INSERT INTO role_permissions (role_name, permission_code)
VALUES ('Project Operations Manager', 'view_capacity_tickets')
ON CONFLICT DO NOTHING;
