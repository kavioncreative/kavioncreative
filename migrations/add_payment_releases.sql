-- Add payment release tracking to the system

-- 1. Create payment_releases table for tracking logs
CREATE TABLE IF NOT EXISTS payment_releases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id TEXT NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
    freelancer_email TEXT NOT NULL,
    freelancer_name TEXT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    release_date DATE NOT NULL DEFAULT CURRENT_DATE,
    released_by UUID REFERENCES profiles(id),
    released_by_name TEXT,
    payment_method TEXT,
    transaction_reference TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_payment_releases_freelancer ON payment_releases(freelancer_email);
CREATE INDEX IF NOT EXISTS idx_payment_releases_project ON payment_releases(project_id);
CREATE INDEX IF NOT EXISTS idx_payment_releases_date ON payment_releases(release_date);

-- 3. Add RLS policies
ALTER TABLE payment_releases ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read
CREATE POLICY "Allow authenticated users to read payment releases"
    ON payment_releases FOR SELECT
    TO authenticated
    USING (true);

-- Allow admins to insert/update
CREATE POLICY "Allow admins to manage payment releases"
    ON payment_releases FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('Admin', 'Super Admin')
        )
    );

-- 4. Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_payment_releases_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_payment_releases_updated_at
    BEFORE UPDATE ON payment_releases
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_releases_updated_at();

-- 5. Verify the table was created
SELECT 
    table_name, 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_name = 'payment_releases'
ORDER BY ordinal_position;
