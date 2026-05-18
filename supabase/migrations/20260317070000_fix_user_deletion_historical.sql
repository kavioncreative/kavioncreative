-- 🛡️ FIX USER DELETION: PRESERVE HISTORICAL RECORDS (SET NULL)
-- This migration updates foreign keys to ensure that deleting a user
-- doesn't fail due to existing records, and preserves those records
-- by setting their user references to NULL instead of cascading or blocking.

DO $$ 
DECLARE
    v_constr_name text;
BEGIN
    -- 1. Fix notifications (Primary blocker found in screenshot)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
        -- Ensure column is nullable
        ALTER TABLE public.notifications ALTER COLUMN user_id DROP NOT NULL;
        
        -- Find and drop existing constraint referencing auth.users or profiles
        SELECT constraint_name INTO v_constr_name
        FROM information_schema.key_column_usage
        WHERE table_name = 'notifications' AND column_name = 'user_id'
        LIMIT 1;
        
        IF v_constr_name IS NOT NULL THEN
            EXECUTE format('ALTER TABLE public.notifications DROP CONSTRAINT %I', v_constr_name);
        END IF;
        
        -- Add back with SET NULL pointing to profiles
        -- This ensures that if the profile is deleted, the notification record stays with user_id = null
        ALTER TABLE public.notifications ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;

    -- 2. Fix member_invitations (invited_by)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'member_invitations') THEN
        ALTER TABLE public.member_invitations ALTER COLUMN invited_by DROP NOT NULL;
        
        SELECT constraint_name INTO v_constr_name
        FROM information_schema.key_column_usage
        WHERE table_name = 'member_invitations' AND column_name = 'invited_by'
        LIMIT 1;
        
        IF v_constr_name IS NOT NULL THEN
            EXECUTE format('ALTER TABLE public.member_invitations DROP CONSTRAINT %I', v_constr_name);
        END IF;
        
        ALTER TABLE public.member_invitations ADD CONSTRAINT member_invitations_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;

    -- 3. Fix freelancer_capacity_tickets (freelancer_id)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'freelancer_capacity_tickets') THEN
        -- Make nullable to allow SET NULL
        ALTER TABLE public.freelancer_capacity_tickets ALTER COLUMN freelancer_id DROP NOT NULL;
        
        SELECT constraint_name INTO v_constr_name
        FROM information_schema.key_column_usage
        WHERE table_name = 'freelancer_capacity_tickets' AND column_name = 'freelancer_id'
        LIMIT 1;
        
        IF v_constr_name IS NOT NULL THEN
            EXECUTE format('ALTER TABLE public.freelancer_capacity_tickets DROP CONSTRAINT %I', v_constr_name);
        END IF;
        
        ALTER TABLE public.freelancer_capacity_tickets ADD CONSTRAINT freelancer_capacity_tickets_freelancer_id_fkey FOREIGN KEY (freelancer_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;

    -- 4. Fix project_collaborators (member_id)
    -- Even though this is a join table, we might want to keep the entry with a NULL member_id 
    -- to show 'Former Member' in logs, or just CASCADE it.
    -- However, PROJECT_COLLABORATORS has a Primary Key on (project_id, member_id).
    -- Setting member_id to NULL would violate the Primary Key.
    -- Therefore, CASCADE is the only viable option for project_collaborators to avoid errors.
    -- It is likely already CASCADE, but let's ensure it doesn't block deletion.
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_collaborators') THEN
        SELECT constraint_name INTO v_constr_name
        FROM information_schema.key_column_usage
        WHERE table_name = 'project_collaborators' AND column_name = 'member_id'
        LIMIT 1;
        
        IF v_constr_name IS NOT NULL THEN
            EXECUTE format('ALTER TABLE public.project_collaborators DROP CONSTRAINT %I', v_constr_name);
        END IF;
        
        ALTER TABLE public.project_collaborators ADD CONSTRAINT project_collaborators_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;

    -- 5. Fix teams (leader_id)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'teams') THEN
        -- Ensure column is nullable
        ALTER TABLE public.teams ALTER COLUMN leader_id DROP NOT NULL;
        
        -- Find and drop existing constraint
        SELECT constraint_name INTO v_constr_name
        FROM information_schema.key_column_usage
        WHERE table_name = 'teams' AND column_name = 'leader_id'
        LIMIT 1;
        
        IF v_constr_name IS NOT NULL THEN
            EXECUTE format('ALTER TABLE public.teams DROP CONSTRAINT %I', v_constr_name);
        END IF;
        
        -- Add back with SET NULL
        ALTER TABLE public.teams ADD CONSTRAINT teams_leader_id_fkey FOREIGN KEY (leader_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;

    -- 6. Fix payment_releases (released_by)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_releases') THEN
        -- Ensure column is nullable
        ALTER TABLE public.payment_releases ALTER COLUMN released_by DROP NOT NULL;
        
        -- Find and drop existing constraint
        SELECT constraint_name INTO v_constr_name
        FROM information_schema.key_column_usage
        WHERE table_name = 'payment_releases' AND column_name = 'released_by'
        LIMIT 1;
        
        IF v_constr_name IS NOT NULL THEN
            EXECUTE format('ALTER TABLE public.payment_releases DROP CONSTRAINT %I', v_constr_name);
        END IF;
        
        -- Add back with SET NULL
        ALTER TABLE public.payment_releases ADD CONSTRAINT payment_releases_released_by_fkey FOREIGN KEY (released_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;

END $$;
