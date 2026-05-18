-- Description: Adds an added_by column to the leads table to track which user created the lead.

ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS added_by TEXT;
