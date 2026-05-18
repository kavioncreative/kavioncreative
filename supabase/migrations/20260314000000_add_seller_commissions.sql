CREATE TABLE public.seller_commissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_name TEXT NOT NULL,
    logo_url TEXT,
    commission_percentage NUMERIC DEFAULT 0,
    clearance_days INTEGER DEFAULT 14,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.seller_commission_accounts (
    seller_commission_id UUID REFERENCES public.seller_commissions(id) ON DELETE CASCADE,
    account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
    PRIMARY KEY (seller_commission_id, account_id)
);

ALTER TABLE public.seller_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_commission_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read seller_commissions"
    ON public.seller_commissions FOR SELECT
    TO authenticated USING (true);

CREATE POLICY "Allow authenticated write seller_commissions"
    ON public.seller_commissions FOR ALL
    TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated read seller_commission_accounts"
    ON public.seller_commission_accounts FOR SELECT
    TO authenticated USING (true);

CREATE POLICY "Allow authenticated write seller_commission_accounts"
    ON public.seller_commission_accounts FOR ALL
    TO authenticated USING (true) WITH CHECK (true);
