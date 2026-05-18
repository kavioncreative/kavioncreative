
-- SQL to create the tasks table in Supabase
-- Run this in the Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'In Progress' CHECK (status IN ('In Progress', 'Completed')),
    deadline_date DATE NOT NULL,
    deadline_time TIME NOT NULL,
    assignee_id UUID REFERENCES public.profiles(id),
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow individual read access" ON public.tasks FOR SELECT USING (true);
CREATE POLICY "Allow individual insert access" ON public.tasks FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow individual update access" ON public.tasks FOR UPDATE USING (true);
CREATE POLICY "Allow individual delete access" ON public.tasks FOR DELETE USING (true);
