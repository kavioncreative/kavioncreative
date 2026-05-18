alter table "public"."pricing_slabs" add column "is_active" boolean not null default false;

-- Create index for faster lookups
create index if not exists idx_pricing_slabs_is_active on "public"."pricing_slabs" using btree ("is_active");

-- Function to ensure mutually exclusive is_active
CREATE OR REPLACE FUNCTION public.enforce_single_active_slab()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = true THEN
    UPDATE public.pricing_slabs
    SET is_active = false
    WHERE id <> NEW.id AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
DROP TRIGGER IF EXISTS trigger_enforce_single_active_slab ON public.pricing_slabs;
CREATE TRIGGER trigger_enforce_single_active_slab
BEFORE INSERT OR UPDATE OF is_active ON public.pricing_slabs
FOR EACH ROW
WHEN (NEW.is_active = true)
EXECUTE FUNCTION public.enforce_single_active_slab();
