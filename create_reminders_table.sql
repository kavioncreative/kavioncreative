
-- Create reminders table
CREATE TABLE IF NOT EXISTS public.reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('refresher', 'task')),
    recurrence_type TEXT NOT NULL,
    recurrence_data JSONB NOT NULL,
    time TIME NOT NULL,
    project_managers UUID[] DEFAULT '{}',
    message TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all actions for authenticated users on their own reminders
-- (For now, we'll allow all authenticated users to see/manage all reminders or just their own?)
-- Typically system-wide reminders might need different policies, but we'll start with per-user.
CREATE POLICY "Users can manage their own reminders" ON public.reminders
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_reminders_updated_at
    BEFORE UPDATE ON public.reminders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
