-- Migration: Add Alert Management Columns to Projects
-- This allows tracking Art Help and Dispute workflows

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS alert_type text CHECK (alert_type IN ('arthelp', 'dispute')),
ADD COLUMN IF NOT EXISTS alert_status text CHECK (alert_status IN ('triggered', 'resolved', 'confirmed')),
ADD COLUMN IF NOT EXISTS alert_initiator_id uuid REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS alert_resolver_id uuid REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS alert_reason text,
ADD COLUMN IF NOT EXISTS alert_additional_message text;

-- Add index for performance on active alerts
CREATE INDEX IF NOT EXISTS idx_projects_alert_active ON projects(alert_type) WHERE alert_type IS NOT NULL;
