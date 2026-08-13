-- Add new columns to performance_metrics table
ALTER TABLE public.performance_metrics ADD COLUMN IF NOT EXISTS on_time_delivery numeric;
ALTER TABLE public.performance_metrics ADD COLUMN IF NOT EXISTS avg_selling_price numeric;
ALTER TABLE public.performance_metrics ADD COLUMN IF NOT EXISTS response_rate numeric;
ALTER TABLE public.performance_metrics ADD COLUMN IF NOT EXISTS repeat_business_score numeric;
ALTER TABLE public.performance_metrics ADD COLUMN IF NOT EXISTS fos integer;
ALTER TABLE public.performance_metrics ADD COLUMN IF NOT EXISTS cancellation_rate numeric;
