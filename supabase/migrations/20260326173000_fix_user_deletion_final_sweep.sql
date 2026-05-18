-- 🛡️ FINAL FIX: USER DELETION RESILIENCE (PROJECTS & OTHERS)
-- This migration updates foreign keys in the projects, seller_commissions, and labels tables 
-- to ensure that deleting a user doesn't fail due to structural restrictions.
-- It preserves historical data by setting references to NULL instead of cascading deletions.

DO $$ 
DECLARE
    v_constr_name text;
BEGIN
    -- 1. Fix projects (team_designer_id) - Reported blocker
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'projects') THEN
        -- Ensure column is nullable (should already be, but for safety)
        ALTER TABLE public.projects ALTER COLUMN team_designer_id DROP NOT NULL;
        
        -- Identify existing constraint
        SELECT constraint_name INTO v_constr_name
        FROM information_schema.key_column_usage
        WHERE table_name = 'projects' AND column_name = 'team_designer_id'
        LIMIT 1;
        
        IF v_constr_name IS NOT NULL THEN
            EXECUTE format('ALTER TABLE public.projects DROP CONSTRAINT %I', v_constr_name);
        END IF;
        
        -- Apply SET NULL to allow profile deletion while keeping the project record
        ALTER TABLE public.projects 
        ADD CONSTRAINT projects_team_designer_id_fkey 
        FOREIGN KEY (team_designer_id) REFERENCES public.profiles(id) 
        ON DELETE SET NULL;
    END IF;

    -- 2. Fix projects (assignee_id)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'projects') THEN
        ALTER TABLE public.projects ALTER COLUMN assignee_id DROP NOT NULL;
        
        SELECT constraint_name INTO v_constr_name
        FROM information_schema.key_column_usage
        WHERE table_name = 'projects' AND column_name = 'assignee_id'
        LIMIT 1;
        
        IF v_constr_name IS NOT NULL THEN
            EXECUTE format('ALTER TABLE public.projects DROP CONSTRAINT %I', v_constr_name);
        END IF;
        
        ALTER TABLE public.projects 
        ADD CONSTRAINT projects_assignee_id_fkey 
        FOREIGN KEY (assignee_id) REFERENCES public.profiles(id) 
        ON DELETE SET NULL;
    END IF;

    -- 2.5 Fix projects (team_slab_id)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'projects') THEN
        SELECT constraint_name INTO v_constr_name
        FROM information_schema.key_column_usage
        WHERE table_name = 'projects' AND column_name = 'team_slab_id'
        LIMIT 1;
        
        IF v_constr_name IS NOT NULL THEN
            EXECUTE format('ALTER TABLE public.projects DROP CONSTRAINT %I', v_constr_name);
        END IF;
        
        ALTER TABLE public.projects 
        ADD CONSTRAINT projects_team_slab_id_fkey 
        FOREIGN KEY (team_slab_id) REFERENCES public.team_pricing_slabs(id) 
        ON DELETE SET NULL;
    END IF;

    -- 3. Fix seller_commissions (seller_id)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'seller_commissions') THEN
        ALTER TABLE public.seller_commissions ALTER COLUMN seller_id DROP NOT NULL;
        
        SELECT constraint_name INTO v_constr_name
        FROM information_schema.key_column_usage
        WHERE table_name = 'seller_commissions' AND column_name = 'seller_id'
        LIMIT 1;
        
        IF v_constr_name IS NOT NULL THEN
            EXECUTE format('ALTER TABLE public.seller_commissions DROP CONSTRAINT %I', v_constr_name);
        END IF;
        
        ALTER TABLE public.seller_commissions 
        ADD CONSTRAINT seller_commissions_seller_id_fkey 
        FOREIGN KEY (seller_id) REFERENCES public.profiles(id) 
        ON DELETE SET NULL;
    END IF;

    -- 4. Fix labels (created_by)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'labels') THEN
        ALTER TABLE public.labels ALTER COLUMN created_by DROP NOT NULL;
        
        SELECT constraint_name INTO v_constr_name
        FROM information_schema.key_column_usage
        WHERE table_name = 'labels' AND column_name = 'created_by'
        LIMIT 1;
        
        IF v_constr_name IS NOT NULL THEN
            EXECUTE format('ALTER TABLE public.labels DROP CONSTRAINT %I', v_constr_name);
        END IF;
        
        ALTER TABLE public.labels 
        ADD CONSTRAINT labels_created_by_fkey 
        FOREIGN KEY (created_by) REFERENCES auth.users(id) 
        ON DELETE SET NULL;
    END IF;

END $$;
