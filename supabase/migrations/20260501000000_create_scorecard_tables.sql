-- Create scorecard_categories table
CREATE TABLE IF NOT EXISTS scorecard_categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

-- Create scorecard_rules table
CREATE TABLE IF NOT EXISTS scorecard_rules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    action_type text NOT NULL,
    category_id uuid REFERENCES scorecard_categories(id) ON DELETE CASCADE,
    weight numeric NOT NULL DEFAULT 1,
    created_at timestamptz DEFAULT now()
);

-- Create scorecard_targets table
CREATE TABLE IF NOT EXISTS scorecard_targets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE, -- null means all users
    metric text NOT NULL,
    target_value numeric NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE scorecard_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE scorecard_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE scorecard_targets ENABLE ROW LEVEL SECURITY;

-- Policies for scorecard_categories
CREATE POLICY "Allow all access for authenticated users on scorecard_categories"
ON scorecard_categories FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Policies for scorecard_rules
CREATE POLICY "Allow all access for authenticated users on scorecard_rules"
ON scorecard_rules FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Policies for scorecard_targets
CREATE POLICY "Allow all access for authenticated users on scorecard_targets"
ON scorecard_targets FOR ALL TO authenticated USING (true) WITH CHECK (true);
