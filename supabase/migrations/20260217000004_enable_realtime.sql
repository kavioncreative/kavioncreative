-- ⚡ ENABLE REAL-TIME FOR PROFILES
-- This ensures that changes to user statuses are broadcast immediately.

-- 1. Enable replication for the profiles table
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;

-- 2. Ensure invitations are also real-time (optional but recommended)
-- ALTER PUBLICATION supabase_realtime ADD TABLE member_invitations;
