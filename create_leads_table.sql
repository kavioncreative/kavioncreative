-- Create leads table
CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name text NOT NULL,
  project_title text,
  client_type text NOT NULL DEFAULT 'New', -- 'New' or 'Repeat'
  status text NOT NULL DEFAULT 'New',
  initial_message text,
  message_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Create policies for leads
DROP POLICY IF EXISTS "Allow all access for leads" ON leads;
CREATE POLICY "Allow all access for leads"
ON leads FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Create lead_comments table
CREATE TABLE IF NOT EXISTS lead_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  content text NOT NULL,
  author_name text,
  author_role text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE lead_comments ENABLE ROW LEVEL SECURITY;

-- Create policies for lead_comments
DROP POLICY IF EXISTS "Allow all access for lead_comments" ON lead_comments;
CREATE POLICY "Allow all access for lead_comments"
ON lead_comments FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_comments_lead_id ON lead_comments(lead_id);
