-- =============================================
-- FIX RELAX APPLICANTS CONSTRAINTS
-- =============================================

-- Make whatsapp nullable as it's been removed from the UI
ALTER TABLE applicants ALTER COLUMN whatsapp DROP NOT NULL;

-- Ensure cv_file_url is also nullable (it already is, but just in case)
ALTER TABLE applicants ALTER COLUMN cv_file_url DROP NOT NULL;
