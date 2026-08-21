-- Create task_templates table
CREATE TABLE IF NOT EXISTS public.task_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task text NOT NULL,
  description text,
  assignee_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  frequency text NOT NULL CHECK (frequency IN ('Daily', 'Weekly', 'Monthly')),
  spawn_time time NOT NULL DEFAULT '09:00:00',
  deadline_time time NOT NULL DEFAULT '18:00:00',
  deadline_offset_days integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  last_spawned_date date,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;

-- Select policy
CREATE POLICY "Allow authenticated users to read task templates"
ON public.task_templates
FOR SELECT
TO authenticated
USING (true);

-- All policy (modify/delete)
CREATE POLICY "Allow authenticated users to modify task templates"
ON public.task_templates
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Create function to spawn recurring tasks
CREATE OR REPLACE FUNCTION public.spawn_recurring_tasks()
RETURNS void AS $$
DECLARE
  template_row record;
  target_deadline_date date;
BEGIN
  FOR template_row IN
    SELECT *
    FROM public.task_templates
    WHERE is_active = true
      AND (last_spawned_date IS NULL OR last_spawned_date < CURRENT_DATE)
      AND CURRENT_TIME >= spawn_time
  LOOP
    -- Calculate target deadline date
    target_deadline_date := CURRENT_DATE + template_row.deadline_offset_days;

    -- Insert into active tasks
    INSERT INTO public.tasks (
      task,
      description,
      assignee_id,
      created_by,
      deadline_date,
      deadline_time,
      status
    ) VALUES (
      template_row.task,
      template_row.description,
      template_row.assignee_id,
      template_row.created_by,
      target_deadline_date,
      template_row.deadline_time,
      'In Progress'
    );

    -- Update template last spawned date
    UPDATE public.task_templates
    SET last_spawned_date = CURRENT_DATE
    WHERE id = template_row.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable pg_cron extension if not enabled and schedule
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
  
  -- Schedule hourly task generator
  PERFORM cron.schedule(
    'spawn-recurring-tasks-hourly',
    '0 * * * *',
    'SELECT public.spawn_recurring_tasks();'
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not setup pg_cron automatically. Ensure it is enabled in your database provider.';
END;
$$;
