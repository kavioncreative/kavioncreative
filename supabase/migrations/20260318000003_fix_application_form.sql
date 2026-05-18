-- =============================================
-- FIX DESIGNER APPLICATION FORM SYSTEM
-- =============================================

-- 1. Ensure applicants table and necessary permissions
-- Assuming the table exists, but we want to make sure anon and authenticated can insert
GRANT INSERT ON TABLE applicants TO anon, authenticated;
GRANT SELECT ON TABLE applicants TO authenticated;

-- Ensure RLS is enabled and policies are correct
ALTER TABLE applicants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public/anon to submit applications" ON applicants;
CREATE POLICY "Allow public/anon to submit applications"
ON applicants FOR INSERT
TO public
WITH CHECK (true);

-- 2. Ensure Storage Bucket for CVs/Documents
-- Supabase storage uses the storage schema
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage Policies for 'documents' bucket
-- These policies use storage.objects

-- Allow anyone to upload documents (for applications)
DROP POLICY IF EXISTS "Allow public uploads to documents" ON storage.objects;
CREATE POLICY "Allow public uploads to documents"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'documents');

-- Allow authenticated users to read/manage documents
DROP POLICY IF EXISTS "Allow authenticated to view documents" ON storage.objects;
CREATE POLICY "Allow authenticated to view documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'documents');

-- Allow anon to view documents (if needed, or only for public bucket URL)
DROP POLICY IF EXISTS "Allow public to view documents" ON storage.objects;
CREATE POLICY "Allow public to view documents"
ON storage.objects FOR SELECT
TO anon
USING (bucket_id = 'documents');

-- Ensure storage has proper permissions for public/anon
GRANT ALL ON storage.objects TO postgres;
GRANT ALL ON storage.buckets TO postgres;
-- Storage usually handles its own role mapping, but let's confirm common ones
GRANT INSERT ON storage.objects TO anon, authenticated;
GRANT SELECT ON storage.objects TO anon, authenticated;
