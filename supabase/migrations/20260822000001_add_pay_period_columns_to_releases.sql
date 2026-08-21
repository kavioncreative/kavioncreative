-- Migration: Create payment_releases table and add payout_month / payout_year columns

-- 1. Create payment_releases table for tracking logs
CREATE TABLE IF NOT EXISTS public.payment_releases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id TEXT NULL, -- Nullable and unreferenced to support statement-based payouts (salary + bonuses)
    freelancer_email TEXT NOT NULL,
    freelancer_name TEXT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    release_date DATE NOT NULL DEFAULT CURRENT_DATE,
    released_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    released_by_name TEXT,
    payment_method TEXT,
    transaction_reference TEXT,
    notes TEXT,
    payout_month integer NOT NULL, -- Pay period month (0-indexed for JS alignment)
    payout_year integer NOT NULL,  -- Pay period year
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_payment_releases_freelancer ON public.payment_releases(freelancer_email);
CREATE INDEX IF NOT EXISTS idx_payment_releases_date ON public.payment_releases(release_date);

-- 3. Add RLS policies
ALTER TABLE public.payment_releases ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read
DROP POLICY IF EXISTS "Allow authenticated users to read payment releases" ON public.payment_releases;
CREATE POLICY "Allow authenticated users to read payment releases"
    ON public.payment_releases FOR SELECT
    TO authenticated
    USING (true);

-- Allow admins to insert/update
DROP POLICY IF EXISTS "Allow admins to manage payment releases" ON public.payment_releases;
CREATE POLICY "Allow admins to manage payment releases"
    ON public.payment_releases FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('Admin', 'Super Admin')
        )
    );

-- 4. Update trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_payment_releases_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_payment_releases_updated_at ON public.payment_releases;
CREATE TRIGGER trigger_update_payment_releases_updated_at
    BEFORE UPDATE ON public.payment_releases
    FOR EACH ROW
    EXECUTE FUNCTION public.update_payment_releases_updated_at();
