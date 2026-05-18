-- Migration: Add Missing Columns to Leads Table
-- Description: Adds previous_order_id and account columns to the leads table for better tracking.

ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS previous_order_id TEXT,
ADD COLUMN IF NOT EXISTS account TEXT,
ADD COLUMN IF NOT EXISTS source TEXT,
ADD COLUMN IF NOT EXISTS client_message_screenshot TEXT,
ADD COLUMN IF NOT EXISTS response_screenshot TEXT,
ADD COLUMN IF NOT EXISTS client_message_time TEXT,
ADD COLUMN IF NOT EXISTS response_time TEXT,
ADD COLUMN IF NOT EXISTS client_message_text TEXT,
ADD COLUMN IF NOT EXISTS response_text TEXT,
ADD COLUMN IF NOT EXISTS automation_result TEXT;
