
-- 🛡️ SECURITY & CLEANUP: FIX USER DELETION & INVITATIONS (SUPER ADMIN ONLY)
-- This migration ensures that only Super Admins can manage users or invitations.
-- It also preserves historical data by setting references to NULL instead of cascading deletions.

-- 1. Helper Function: Is the user an Active Admin or Super Admin? (For general management)
CREATE OR REPLACE FUNCTION public.is_active_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND status = 'Active'
    AND (lower(role) = 'admin' OR lower(role) = 'super admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Helper Function: Is the user a Super Admin? (For destructive/sensitive operations)
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND status = 'Active'
    AND lower(role) = 'super admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Complete User Deletion RPC (Super Admin Only)
CREATE OR REPLACE FUNCTION public.delete_user_entirely(target_user_id uuid)
RETURNS void AS $$
BEGIN
  -- Validation: Only Super Admins can perform this action
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Only Super Admins can delete users permanently';
  END IF;

  -- Validation: Prevent self-deletion
  IF auth.uid() = target_user_id THEN
    RAISE EXCEPTION 'You cannot delete your own account. Please contact another Super Admin.';
  END IF;

  -- Step A: Delete from public.profiles
  DELETE FROM public.profiles WHERE id = target_user_id;

  -- Step B: Delete from auth.users (removes them from Supabase entirely)
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Bulk User Deletion RPC (Super Admin Only)
CREATE OR REPLACE FUNCTION public.delete_users_bulk(target_user_ids uuid[])
RETURNS void AS $$
BEGIN
  -- Validation: Only Super Admins can perform this action
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Only Super Admins can delete users permanently';
  END IF;

  -- Step A: Delete from public.profiles
  DELETE FROM public.profiles WHERE id = ANY(target_user_ids) AND id != auth.uid();

  -- Step B: Delete from auth.users
  DELETE FROM auth.users WHERE id = ANY(target_user_ids) AND id != auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Profiles Table: Restrict DELETE to Super Admin Only
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;
DROP POLICY IF EXISTS "Super Admins can delete profiles" ON profiles;
CREATE POLICY "Super Admins can delete profiles"
ON profiles FOR DELETE
TO authenticated
USING (is_super_admin());

-- 6. Member Invitations Table: Restrict ALL access to Super Admin Only
DROP POLICY IF EXISTS "Admins can manage invitations" ON member_invitations;
DROP POLICY IF EXISTS "Admins can view and edit invitations" ON member_invitations;
DROP POLICY IF EXISTS "Super Admins can delete invitations" ON member_invitations;
DROP POLICY IF EXISTS "Super Admins can manage invitations" ON member_invitations;

CREATE POLICY "Super Admins can manage invitations"
ON member_invitations FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- 7. Permissions System Cleanup
DELETE FROM public.role_permissions 
WHERE role_name = 'Admin' 
AND permission_code IN (
    'delete_users', 
    'create_users', 
    'manage_users'
);

-- 8. Data Preservation & FK Updates (SET NULL)
-- This ensures that historical data remains intact when a user is deleted.
DO $$ 
DECLARE
    v_constr_name text;
BEGIN
    -- Fix form_logs (The current error point)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'form_logs') THEN
        ALTER TABLE public.form_logs ALTER COLUMN user_id DROP NOT NULL;
        
        SELECT constraint_name INTO v_constr_name
        FROM information_schema.key_column_usage
        WHERE table_name = 'form_logs' AND column_name = 'user_id'
        LIMIT 1;
        
        IF v_constr_name IS NOT NULL THEN
            EXECUTE format('ALTER TABLE public.form_logs DROP CONSTRAINT %I', v_constr_name);
        END IF;
        
        ALTER TABLE public.form_logs ADD CONSTRAINT form_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;

    -- Fix form_assignments
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'form_assignments') THEN
        ALTER TABLE public.form_assignments ALTER COLUMN user_id DROP NOT NULL;
        
        SELECT constraint_name INTO v_constr_name
        FROM information_schema.key_column_usage
        WHERE table_name = 'form_assignments' AND column_name = 'user_id'
        LIMIT 1;
        
        IF v_constr_name IS NOT NULL THEN
            EXECUTE format('ALTER TABLE public.form_assignments DROP CONSTRAINT %I', v_constr_name);
        END IF;
        
        ALTER TABLE public.form_assignments ADD CONSTRAINT form_assignments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;

    -- Fix performance_metrics
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'performance_metrics') THEN
        ALTER TABLE public.performance_metrics ALTER COLUMN user_id DROP NOT NULL;
        
        SELECT constraint_name INTO v_constr_name
        FROM information_schema.key_column_usage
        WHERE table_name = 'performance_metrics' AND column_name = 'user_id'
        LIMIT 1;
        
        IF v_constr_name IS NOT NULL THEN
            EXECUTE format('ALTER TABLE public.performance_metrics DROP CONSTRAINT %I', v_constr_name);
        END IF;
        
        ALTER TABLE public.performance_metrics ADD CONSTRAINT performance_metrics_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;

    -- Fix tasks (assignee_id)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks') THEN
        ALTER TABLE public.tasks ALTER COLUMN assignee_id DROP NOT NULL;

        SELECT constraint_name INTO v_constr_name
        FROM information_schema.key_column_usage
        WHERE table_name = 'tasks' AND column_name = 'assignee_id'
        LIMIT 1;
        
        IF v_constr_name IS NOT NULL THEN
            EXECUTE format('ALTER TABLE public.tasks DROP CONSTRAINT %I', v_constr_name);
        END IF;
        
        ALTER TABLE public.tasks ADD CONSTRAINT tasks_assignee_id_fkey FOREIGN KEY (assignee_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;

    -- Fix tasks (created_by)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks') THEN
        ALTER TABLE public.tasks ALTER COLUMN created_by DROP NOT NULL;

        SELECT constraint_name INTO v_constr_name
        FROM information_schema.key_column_usage
        WHERE table_name = 'tasks' AND column_name = 'created_by'
        LIMIT 1;
        
        IF v_constr_name IS NOT NULL THEN
            EXECUTE format('ALTER TABLE public.tasks DROP CONSTRAINT %I', v_constr_name);
        END IF;
        
        ALTER TABLE public.tasks ADD CONSTRAINT tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;

    -- Fix projects (primary_manager_id)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'projects') THEN
        ALTER TABLE public.projects ALTER COLUMN primary_manager_id DROP NOT NULL;

        SELECT constraint_name INTO v_constr_name
        FROM information_schema.key_column_usage
        WHERE table_name = 'projects' AND column_name = 'primary_manager_id'
        LIMIT 1;
        
        IF v_constr_name IS NOT NULL THEN
            EXECUTE format('ALTER TABLE public.projects DROP CONSTRAINT %I', v_constr_name);
        END IF;
        
        ALTER TABLE public.projects ADD CONSTRAINT projects_primary_manager_id_fkey FOREIGN KEY (primary_manager_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
END $$;
