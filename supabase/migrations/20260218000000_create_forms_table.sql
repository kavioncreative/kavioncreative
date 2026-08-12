
-- Create forms table
CREATE TABLE IF NOT EXISTS forms (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    status text DEFAULT 'active',
    fields jsonb DEFAULT '[]'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE forms ENABLE ROW LEVEL SECURITY;

-- Create Policies
DROP POLICY IF EXISTS "Allow all access for authenticated users" ON forms;
CREATE POLICY "Allow all access for authenticated users"
ON forms FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_forms_updated_at
    BEFORE UPDATE ON forms
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- Create form_assignments table
CREATE TABLE IF NOT EXISTS form_assignments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id text NOT NULL,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    trigger_time text DEFAULT '09:00',
    frequency text DEFAULT 'daily',
    is_mandatory boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create form_logs table
CREATE TABLE IF NOT EXISTS form_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id uuid REFERENCES form_assignments(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    form_id text NOT NULL,
    created_at timestamptz DEFAULT now()
);
