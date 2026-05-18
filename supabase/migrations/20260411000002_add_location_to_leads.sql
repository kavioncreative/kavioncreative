-- Migration: Add Location to Leads
-- Description: Adds a location column to the leads table to store client geographical information.

ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS location text;
