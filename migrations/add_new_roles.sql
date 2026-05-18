-- Add new roles: ORM Manager and Project Operations Manager
INSERT INTO roles (name, description) VALUES
  ('ORM Manager', 'Manage online reputation, reviews, and public perception'),
  ('Project Operations Manager', 'Oversee project workflows, operational efficiency, and delivery standards')
ON CONFLICT (name) DO NOTHING;
