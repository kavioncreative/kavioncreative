-- Create bonus_structures table to configure role-based rewards
CREATE TABLE IF NOT EXISTS public.bonus_structures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL,
  name text NOT NULL,
  calc_type text NOT NULL CHECK (calc_type IN ('Volume', 'Percentage', 'Rating', 'Punctuality')),
  target numeric NOT NULL,
  amount numeric NOT NULL,
  currency text DEFAULT 'PKR' CHECK (currency IN ('PKR', 'USD')),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS and permissions
ALTER TABLE public.bonus_structures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read access to authenticated users" ON public.bonus_structures;
CREATE POLICY "Allow read access to authenticated users" ON public.bonus_structures FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow all access to admins" ON public.bonus_structures;
CREATE POLICY "Allow all access to admins" ON public.bonus_structures FOR ALL TO authenticated USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('Super Admin', 'Admin')
);
