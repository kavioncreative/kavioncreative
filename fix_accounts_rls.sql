-- ============================================
-- FIX: ADD MISSING RLS POLICIES FOR ACCOUNTS
-- ============================================
-- This script adds INSERT, UPDATE, and DELETE permissions for authenticated users on the accounts table.
-- Deployment: Run this script in the Supabase SQL Editor.

-- 1. Enable RLS (just in case)
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

-- 2. SELECT Policy (ensure it exists)
DROP POLICY IF EXISTS "Allow read access for accounts" ON accounts;
CREATE POLICY "Allow read access for accounts" ON accounts 
FOR SELECT TO authenticated USING (true);

-- 3. INSERT Policy
DROP POLICY IF EXISTS "Allow insert access for accounts" ON accounts;
CREATE POLICY "Allow insert access for accounts" 
ON accounts FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- 4. UPDATE Policy
DROP POLICY IF EXISTS "Allow update access for accounts" ON accounts;
CREATE POLICY "Allow update access for accounts" 
ON accounts FOR UPDATE 
TO authenticated 
USING (true);

-- 5. DELETE Policy
DROP POLICY IF EXISTS "Allow delete access for accounts" ON accounts;
CREATE POLICY "Allow delete access for accounts" 
ON accounts FOR DELETE 
TO authenticated 
USING (true);

-- 6. Verify existence of display_prefix column (if not already handled by main schema)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='accounts' AND column_name='display_prefix') THEN
        ALTER TABLE accounts ADD COLUMN display_prefix text UNIQUE;
    END IF;
END $$;
