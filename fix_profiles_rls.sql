-- Complete RLS Reset and Fix for Profiles Table
-- Run this entire script in Supabase SQL Editor

-- Step 1: Drop ALL existing policies
DROP POLICY IF EXISTS "Allow all access for profiles" ON profiles;
DROP POLICY IF EXISTS "Allow read access for profiles" ON profiles;
DROP POLICY IF EXISTS "Allow insert own profile" ON profiles;
DROP POLICY IF EXISTS "Allow update own profile" ON profiles;
DROP POLICY IF EXISTS "Allow admin update all profiles" ON profiles;
DROP POLICY IF EXISTS "Allow admin delete profiles" ON profiles;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON profiles;

-- Step 2: Create a single permissive policy for all operations
-- This allows authenticated users to do everything
CREATE POLICY "Enable all access for authenticated users"
ON profiles
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Step 3: Verify RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
