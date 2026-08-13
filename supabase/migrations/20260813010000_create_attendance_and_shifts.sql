-- 1. Create user_shifts table to assign timings to staff members
CREATE TABLE IF NOT EXISTS public.user_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  start_time time NOT NULL,
  end_time time NOT NULL,
  timezone text DEFAULT 'Asia/Karachi',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS and permissions for user_shifts
ALTER TABLE public.user_shifts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read access to authenticated users" ON public.user_shifts;
CREATE POLICY "Allow read access to authenticated users" ON public.user_shifts FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow all access to admins" ON public.user_shifts;
CREATE POLICY "Allow all access to admins" ON public.user_shifts FOR ALL TO authenticated USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('Super Admin', 'Admin')
);

-- 2. Create attendance_records table to track sessions
CREATE TABLE IF NOT EXISTS public.attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  punch_in_at timestamptz NOT NULL DEFAULT now(),
  punch_out_at timestamptz,
  status text DEFAULT 'Active' CHECK (status IN ('Active', 'Idle', 'Break', 'Completed')),
  total_active_mins integer DEFAULT 0,
  total_break_mins integer DEFAULT 0,
  total_idle_mins integer DEFAULT 0,
  last_activity_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own attendance" ON public.attendance_records;
CREATE POLICY "Users can manage their own attendance" ON public.attendance_records FOR ALL TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all attendance" ON public.attendance_records;
CREATE POLICY "Admins can view all attendance" ON public.attendance_records FOR SELECT TO authenticated USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('Super Admin', 'Admin')
);

-- 3. Create active_checks table for random popups log
CREATE TABLE IF NOT EXISTS public.active_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  sent_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  status text DEFAULT 'Pending' CHECK (status IN ('Pending', 'Confirmed', 'Missed')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.active_checks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view and update their own active checks" ON public.active_checks;
CREATE POLICY "Users can view and update their own active checks" ON public.active_checks FOR ALL TO authenticated USING (user_id = auth.uid());
