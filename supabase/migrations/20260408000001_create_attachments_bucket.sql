-- ============================================
-- STORAGE SETUP: PROJECT ATTACHMENTS
-- ============================================

-- 1. Create 'attachments' bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Enable RLS on storage.objects (usually enabled by default in Supabase)

-- 3. Create RLS Policies for the 'attachments' bucket

-- Allow public read access to attachments
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'attachments');

-- Allow authenticated users to upload attachments
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'attachments');

-- Allow authenticated users to delete their own uploads (optional but good practice)
DROP POLICY IF EXISTS "Authenticated Delete" ON storage.objects;
CREATE POLICY "Authenticated Delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'attachments');
