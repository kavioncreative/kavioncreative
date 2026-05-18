-- Create performance_metrics table
CREATE TABLE IF NOT EXISTS performance_metrics (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    date date NOT NULL,
    success_score numeric,
    rating numeric,
    ctr numeric,
    conversion_rate numeric,
    impressions integer,
    clicks integer,
    orders integer,
    cancelled_orders integer,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;

-- Create Policies
DROP POLICY IF EXISTS "Allow all access for authenticated users" ON performance_metrics;
CREATE POLICY "Allow all access for authenticated users"
ON performance_metrics FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
