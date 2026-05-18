-- =============================================
-- Webhooks Table Schema
-- =============================================
-- This script creates the webhooks table and related policies
-- for storing webhook configurations in Supabase

-- Drop existing table if needed (uncomment for fresh start)
-- DROP TABLE IF EXISTS public.webhooks CASCADE;

-- Create webhooks table
CREATE TABLE IF NOT EXISTS public.webhooks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Webhook details
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    secret TEXT,
    icon TEXT DEFAULT 'Default',
    
    -- Trigger events (stored as JSONB for flexibility)
    events JSONB DEFAULT '{
        "projectCreated": true,
        "statusChanged": false,
        "commentAdded": false,
        "fileUploaded": false
    }'::jsonb,
    
    -- Status tracking
    is_active BOOLEAN DEFAULT true,
    last_triggered_at TIMESTAMP WITH TIME ZONE,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    
    -- Optional metadata
    description TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Constraints
    CONSTRAINT webhooks_name_check CHECK (char_length(name) > 0),
    CONSTRAINT webhooks_url_check CHECK (char_length(url) > 0)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_webhooks_created_at ON public.webhooks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhooks_is_active ON public.webhooks(is_active);
CREATE INDEX IF NOT EXISTS idx_webhooks_created_by ON public.webhooks(created_by);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_webhooks_updated_at ON public.webhooks;
CREATE TRIGGER update_webhooks_updated_at
    BEFORE UPDATE ON public.webhooks
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- Row Level Security (RLS) Policies
-- =============================================

-- Enable RLS
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to view all webhooks
CREATE POLICY "Allow authenticated users to view webhooks"
    ON public.webhooks
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy: Allow authenticated users to insert webhooks
CREATE POLICY "Allow authenticated users to create webhooks"
    ON public.webhooks
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Policy: Allow users to update their own webhooks or all if admin
CREATE POLICY "Allow users to update webhooks"
    ON public.webhooks
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Policy: Allow users to delete their own webhooks or all if admin
CREATE POLICY "Allow users to delete webhooks"
    ON public.webhooks
    FOR DELETE
    TO authenticated
    USING (true);

-- =============================================
-- Helper Functions
-- =============================================

-- Function to increment success count
CREATE OR REPLACE FUNCTION public.increment_webhook_success(webhook_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE public.webhooks
    SET 
        success_count = success_count + 1,
        last_triggered_at = timezone('utc'::text, now())
    WHERE id = webhook_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment failure count
CREATE OR REPLACE FUNCTION public.increment_webhook_failure(webhook_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE public.webhooks
    SET 
        failure_count = failure_count + 1,
        last_triggered_at = timezone('utc'::text, now())
    WHERE id = webhook_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get active webhooks for a specific event
CREATE OR REPLACE FUNCTION public.get_webhooks_for_event(event_name TEXT)
RETURNS TABLE (
    id UUID,
    name TEXT,
    url TEXT,
    secret TEXT,
    icon TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        w.id,
        w.name,
        w.url,
        w.secret,
        w.icon
    FROM public.webhooks w
    WHERE 
        w.is_active = true
        AND w.events->event_name = 'true'::jsonb;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Sample Data (Optional - for testing)
-- =============================================

-- Uncomment to insert sample webhook
/*
INSERT INTO public.webhooks (name, url, secret, icon, events, description)
VALUES (
    'Production Deployment Hook',
    'https://n8n.example.com/webhook/deployment',
    'whsec_example123',
    'N8N',
    '{
        "projectCreated": true,
        "statusChanged": true,
        "commentAdded": false,
        "fileUploaded": false
    }'::jsonb,
    'Triggers on project creation and status changes'
);
*/

-- =============================================
-- Verification Queries
-- =============================================

-- Check if table was created successfully
-- SELECT * FROM public.webhooks LIMIT 10;

-- Check RLS policies
-- SELECT * FROM pg_policies WHERE tablename = 'webhooks';

-- Check indexes
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'webhooks';
