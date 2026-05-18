ALTER TABLE public.seller_commissions
DROP COLUMN seller_name,
ADD COLUMN seller_id UUID REFERENCES public.profiles(id);
