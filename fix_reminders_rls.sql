
-- Fix RLS policies for reminders to allow project managers to see them
DROP POLICY IF EXISTS "Users can manage their own reminders" ON public.reminders;

CREATE POLICY "Users can manage their own reminders" ON public.reminders
    FOR ALL
    TO authenticated
    USING (
        auth.uid() = user_id 
        OR 
        auth.uid() = ANY(project_managers)
    )
    WITH CHECK (
        auth.uid() = user_id
    );

-- Also ensure RLS is enabled
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
