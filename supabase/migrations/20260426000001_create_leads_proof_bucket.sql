-- ============================================
-- STORAGE SETUP: LEADS INTERACTION PROOFS
-- ============================================

-- 1. Create 'leads-proof' bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('leads-proof', 'leads-proof', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Create RLS Policies for the 'leads-proof' bucket

-- Allow public read access to proofs
DROP POLICY IF EXISTS "Leads Proof Public Access" ON storage.objects;
CREATE POLICY "Leads Proof Public Access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'leads-proof');

-- Allow authenticated users to upload proofs
DROP POLICY IF EXISTS "Leads Proof Authenticated Upload" ON storage.objects;
CREATE POLICY "Leads Proof Authenticated Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'leads-proof');

-- Allow authenticated users to update proofs (for overwriting if needed)
DROP POLICY IF EXISTS "Leads Proof Authenticated Update" ON storage.objects;
CREATE POLICY "Leads Proof Authenticated Update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'leads-proof');

-- Allow authenticated users to delete proofs
DROP POLICY IF EXISTS "Leads Proof Authenticated Delete" ON storage.objects;
CREATE POLICY "Leads Proof Authenticated Delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'leads-proof');
