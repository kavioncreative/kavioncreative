-- Migration: Create Seller Commissions and Seller Commission Accounts Tables
-- Created: 2026-06-08

-- 1. Create seller_commissions Table
CREATE TABLE IF NOT EXISTS public.seller_commissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    commission_percentage NUMERIC DEFAULT 0,
    clearance_days INTEGER DEFAULT 14,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create seller_commission_accounts Join Table
CREATE TABLE IF NOT EXISTS public.seller_commission_accounts (
    seller_commission_id UUID REFERENCES public.seller_commissions(id) ON DELETE CASCADE,
    account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
    PRIMARY KEY (seller_commission_id, account_id)
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.seller_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_commission_accounts ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies for seller_commissions
DROP POLICY IF EXISTS "Allow authenticated read seller_commissions" ON public.seller_commissions;
CREATE POLICY "Allow authenticated read seller_commissions"
    ON public.seller_commissions FOR SELECT
    TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated write seller_commissions" ON public.seller_commissions;
CREATE POLICY "Allow authenticated write seller_commissions"
    ON public.seller_commissions FOR ALL
    TO authenticated USING (true) WITH CHECK (true);

-- 5. Create RLS Policies for seller_commission_accounts
DROP POLICY IF EXISTS "Allow authenticated read seller_commission_accounts" ON public.seller_commission_accounts;
CREATE POLICY "Allow authenticated read seller_commission_accounts"
    ON public.seller_commission_accounts FOR SELECT
    TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated write seller_commission_accounts" ON public.seller_commission_accounts;
CREATE POLICY "Allow authenticated write seller_commission_accounts"
    ON public.seller_commission_accounts FOR ALL
    TO authenticated USING (true) WITH CHECK (true);
