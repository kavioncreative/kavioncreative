
-- Final Reminders System Setup

-- 1. Ensure reminders table is ready
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

-- 2. Create response table
CREATE TABLE IF NOT EXISTS public.reminder_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reminder_id UUID REFERENCES public.reminders(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    message TEXT,
    file_urls TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Storage Bucket for Reminder Attachments
-- Note: Buckets are often managed via the Supabase UI, but can be done via SQL in some setups
INSERT INTO storage.buckets (id, name, public) 
VALUES ('reminders', 'reminders', true)
ON CONFLICT (id) DO NOTHING;

-- 4. RLS for Responses
ALTER TABLE public.reminder_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create responses" ON public.reminder_responses
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users and admins can view responses" ON public.reminder_responses
    FOR SELECT TO authenticated
    USING (true); -- Simplified for demo, ideally filter by project_id/admin

-- 5. Storage Policies
CREATE POLICY "Authenticated users can upload reminder files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'reminders');

CREATE POLICY "Public can view reminder files"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'reminders');
