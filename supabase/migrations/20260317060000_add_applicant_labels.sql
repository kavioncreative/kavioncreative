-- Step 1: Create Labels and Label Assignments tables

-- Create table for storing custom labels
CREATE TABLE IF NOT EXISTS public.applicant_labels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL, -- Hex color or tailwind class
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create table for assigning labels to applicants (Many-to-Many)
CREATE TABLE IF NOT EXISTS public.applicant_label_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    applicant_id UUID NOT NULL REFERENCES public.applicants(id) ON DELETE CASCADE,
    label_id UUID NOT NULL REFERENCES public.applicant_labels(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(applicant_id, label_id)
);

-- Enable RLS (Assuming existing patterns)
ALTER TABLE public.applicant_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applicant_label_assignments ENABLE ROW LEVEL SECURITY;

-- Dynamic policies (Modify according to your project's roles)
-- For now, allow all authenticated users to manage labels
CREATE POLICY "Allow all authenticated users to read labels" ON public.applicant_labels
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow all authenticated users to insert labels" ON public.applicant_labels
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow all authenticated users to delete labels" ON public.applicant_labels
    FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow all authenticated users to read assignments" ON public.applicant_label_assignments
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow all authenticated users to update assignments" ON public.applicant_label_assignments
    FOR ALL TO authenticated USING (true);
