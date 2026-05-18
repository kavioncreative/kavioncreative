-- Remove trigger and function that enforced single active slab
DROP TRIGGER IF EXISTS trigger_enforce_single_active_slab ON public.pricing_slabs;
DROP FUNCTION IF EXISTS public.enforce_single_active_slab;
