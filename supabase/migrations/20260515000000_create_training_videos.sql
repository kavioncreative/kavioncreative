CREATE TABLE IF NOT EXISTS public.training_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    youtube_id TEXT NOT NULL,
    role TEXT NOT NULL,
    module TEXT,
    documentation TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.training_videos ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow public read access" ON public.training_videos
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to insert" ON public.training_videos
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update" ON public.training_videos
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to delete" ON public.training_videos
    FOR DELETE TO authenticated USING (true);
