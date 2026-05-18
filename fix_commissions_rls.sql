-- Fix RLS policies for platform_commissions and pricing_slabs
-- This ensures that deletions and updates are allowed for authenticated active users.

-- 1. Platform Commissions
ALTER TABLE platform_commissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Access Commissions" ON platform_commissions;
CREATE POLICY "Access Commissions" ON platform_commissions 
FOR ALL TO authenticated 
USING (is_active_user());

-- 2. Platform Commission Accounts (Join Table)
ALTER TABLE platform_commission_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Access Commission Accounts" ON platform_commission_accounts;
CREATE POLICY "Access Commission Accounts" ON platform_commission_accounts 
FOR ALL TO authenticated 
USING (is_active_user());

-- 3. Pricing Slabs
ALTER TABLE pricing_slabs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Access Pricing Slabs" ON pricing_slabs;
CREATE POLICY "Access Pricing Slabs" ON pricing_slabs 
FOR ALL TO authenticated 
USING (is_active_user());
