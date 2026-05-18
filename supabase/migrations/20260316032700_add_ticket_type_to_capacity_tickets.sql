-- Create enum type for capacity ticket type
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'capacity_ticket_type') THEN
        CREATE TYPE capacity_ticket_type AS ENUM ('initial_capacity', 'increase_capacity');
    END IF;
END $$;

-- Add ticket_type column to freelancer_capacity_tickets table
ALTER TABLE public.freelancer_capacity_tickets
ADD COLUMN IF NOT EXISTS ticket_type capacity_ticket_type DEFAULT 'initial_capacity' NOT NULL;

-- Add index for ticket_type to optimize filtering
CREATE INDEX IF NOT EXISTS idx_freelancer_capacity_tickets_ticket_type ON public.freelancer_capacity_tickets(ticket_type);
