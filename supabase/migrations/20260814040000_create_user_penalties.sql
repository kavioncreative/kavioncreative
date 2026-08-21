-- Create user_penalties table
CREATE TABLE IF NOT EXISTS public.user_penalties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason text NOT NULL,
  details text,
  status text DEFAULT 'Valid' CHECK (status IN ('Valid', 'Waived')),
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.user_penalties ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all authenticated users to read penalties (to track their own)
CREATE POLICY "Allow authenticated users to read penalties" 
ON public.user_penalties 
FOR SELECT 
TO authenticated 
USING (true);

-- Create policy to allow all authenticated users to insert/update penalties
-- Access checking is enforced at the application level via role permissions
CREATE POLICY "Allow authenticated users to modify penalties" 
ON public.user_penalties 
FOR ALL 
TO authenticated 
USING (true)
WITH CHECK (true);
