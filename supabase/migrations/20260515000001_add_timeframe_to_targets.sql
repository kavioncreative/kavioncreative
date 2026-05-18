ALTER TABLE public.scorecard_targets
ADD COLUMN IF NOT EXISTS timeframe VARCHAR(20) DEFAULT 'daily';
