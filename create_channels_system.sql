-- 1. Create Channels Table
CREATE TABLE IF NOT EXISTS public.channels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    created_by UUID REFERENCES auth.users(id),
    is_private BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Create Channel Members Table (For permissions and user selection)
CREATE TABLE IF NOT EXISTS public.channel_members (
    channel_id UUID REFERENCES public.channels(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (channel_id, user_id)
);

-- 3. Create Channel Messages Table (The Inbox)
CREATE TABLE IF NOT EXISTS public.channel_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id UUID REFERENCES public.channels(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- NULL if system/bot message
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb, -- To store MCC specific data (job number, counters)
    is_system_message BOOLEAN DEFAULT false, -- True for MCC bot alerts
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Row Level Security (RLS)
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_messages ENABLE ROW LEVEL SECURITY;

-- Basic Policies (You can adjust these later based on your roles)
CREATE POLICY "Enable read access for all authenticated users" ON public.channels FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert for authenticated users" ON public.channels FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable read access for all authenticated users" ON public.channel_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert for authenticated users" ON public.channel_messages FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable read access for all authenticated users" ON public.channel_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert for authenticated users" ON public.channel_members FOR INSERT TO authenticated WITH CHECK (true);
