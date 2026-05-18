-- Create enum type for ticket status if it doesn't already exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'capacity_ticket_status') THEN
        CREATE TYPE capacity_ticket_status AS ENUM ('pending', 'approved', 'rejected');
    END IF;
END $$;

-- Create freelancer_capacity_tickets table
CREATE TABLE IF NOT EXISTS public.freelancer_capacity_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    freelancer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    start_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    daily_capacity INTEGER NOT NULL,
    status capacity_ticket_status DEFAULT 'pending' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add indexes for optimized query performance
CREATE INDEX IF NOT EXISTS idx_freelancer_capacity_tickets_freelancer_id ON public.freelancer_capacity_tickets(freelancer_id);
CREATE INDEX IF NOT EXISTS idx_freelancer_capacity_tickets_status ON public.freelancer_capacity_tickets(status);

-- Enable Row Level Security (consistent with project standards)
ALTER TABLE public.freelancer_capacity_tickets ENABLE ROW LEVEL SECURITY;

-- Add RLS Policies
DROP POLICY IF EXISTS "Allow authenticated read freelancer_capacity_tickets" ON public.freelancer_capacity_tickets;
CREATE POLICY "Allow authenticated read freelancer_capacity_tickets"
    ON public.freelancer_capacity_tickets FOR SELECT
    TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow users to create their own tickets" ON public.freelancer_capacity_tickets;
CREATE POLICY "Allow users to create their own tickets"
    ON public.freelancer_capacity_tickets FOR INSERT
    TO authenticated WITH CHECK (auth.uid() = freelancer_id);

DROP POLICY IF EXISTS "Allow users to update their own pending tickets" ON public.freelancer_capacity_tickets;
CREATE POLICY "Allow users to update their own pending tickets"
    ON public.freelancer_capacity_tickets FOR UPDATE
    TO authenticated 
    USING (auth.uid() = freelancer_id AND status = 'pending')
    WITH CHECK (auth.uid() = freelancer_id AND status = 'pending');

-- Add trigger for updated_at
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_freelancer_capacity_tickets_updated_at') THEN
        CREATE TRIGGER update_freelancer_capacity_tickets_updated_at
            BEFORE UPDATE ON public.freelancer_capacity_tickets
            FOR EACH ROW
            EXECUTE PROCEDURE public.update_updated_at_column();
    END IF;
END $$;
