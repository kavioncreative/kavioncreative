
-- Add 'decrease_capacity' to capacity_ticket_type enum
DO $$ 
BEGIN
    ALTER TYPE capacity_ticket_type ADD VALUE IF NOT EXISTS 'decrease_capacity';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
