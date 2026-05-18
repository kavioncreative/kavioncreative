-- ============================================
-- SEED DATA - Run this to avoid "No pricing slab" errors
-- ============================================

-- 1. Insert Standard Pricing Slabs (REQUIRED for fee calculation)
INSERT INTO pricing_slabs (slab_name, min_price, max_price, freelancer_percentage)
VALUES 
  ('Micro Project', 0, 100, 70),       -- 70% to freelancer for small jobs
  ('Standard', 101, 500, 80),          -- 80% to freelancer for standard jobs
  ('Premium', 501, 100000, 90)         -- 90% to freelancer for big jobs
ON CONFLICT DO NOTHING;

-- 2. Insert Common Platforms (Optional but creating projects fails if Account is linked to nothing)
INSERT INTO platform_commissions (platform_name, commission_percentage, clearance_days)
VALUES 
  ('Direct Client', 0, 0),
  ('Upwork', 10, 5),
  ('Fiverr', 20, 14)
ON CONFLICT DO NOTHING;

-- 3. Insert a Default Account (Needed because projects link to accounts)
INSERT INTO accounts (name, prefix, display_prefix)
VALUES 
  ('Main Account', 'MAIN', 'M-01')
ON CONFLICT (display_prefix) DO NOTHING;

-- 4. Link Platforms to Account (Optional)
-- This links "Upwork" (from above) to "Main Account" (from above)
-- You might need to adjust IDs if you use existing data, but this works for fresh dbs.
DO $$
DECLARE
  v_upwork_id uuid;
  v_account_id uuid;
BEGIN
  SELECT id INTO v_upwork_id FROM platform_commissions WHERE platform_name = 'Upwork';
  SELECT id INTO v_account_id FROM accounts WHERE name = 'Main Account';
  
  IF v_upwork_id IS NOT NULL AND v_account_id IS NOT NULL THEN
    INSERT INTO platform_commission_accounts (platform_commission_id, account_id)
    VALUES (v_upwork_id, v_account_id)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
