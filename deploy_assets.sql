-- ============================================
-- DEPLOY: DIGITAL ASSETS SYSTEM
-- ============================================
-- 1. Create the assets table
CREATE TABLE IF NOT EXISTS assets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    file_type text NOT NULL,
    file_size text NOT NULL,
    account_id uuid REFERENCES accounts(id) ON DELETE SET NULL,
    storage_path text NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies
DROP POLICY IF EXISTS "Allow read for all authenticated" ON assets;
CREATE POLICY "Allow read for all authenticated" 
ON assets FOR SELECT 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Allow insert for admin" ON assets;
CREATE POLICY "Allow insert for admin" 
ON assets FOR INSERT 
TO authenticated 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND (role = 'Admin' OR role = 'admin')
    )
);

DROP POLICY IF EXISTS "Allow delete for admin" ON assets;
CREATE POLICY "Allow delete for admin" 
ON assets FOR DELETE 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND (role = 'Admin' OR role = 'admin')
    )
);

-- 4. Storage Bucket Setup (Instructions)
-- Note: Run the following in the Supabase SQL Editor if you have access to storage extensions, 
-- or manually create a 'digital-assets' bucket in the Storage tab.

/*
INSERT INTO storage.buckets (id, name, public) 
VALUES ('digital-assets', 'digital-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow public download" 
ON storage.objects FOR SELECT 
TO public 
USING (bucket_id = 'digital-assets');

CREATE POLICY "Allow admin upload" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (
    bucket_id = 'digital-assets' AND 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND (role = 'Admin' OR role = 'admin')
    )
);
*/
