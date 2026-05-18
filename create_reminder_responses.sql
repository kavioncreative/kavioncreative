
-- Create reminder_responses table
CREATE TABLE IF NOT EXISTS public.reminder_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reminder_id UUID REFERENCES public.reminders(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    message TEXT,
    file_urls TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.reminder_responses ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can create responses" ON public.reminder_responses
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own responses" ON public.reminder_responses
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

-- Storage for reminder files
-- We assume a bucket named 'reminders' exists or we'll use a generic one
-- For now, let's just make sure the table exists.
