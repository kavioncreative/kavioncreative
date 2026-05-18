-- ============================================
-- ACCOUNT CONSOLIDATION & CLEANUP (FIXED)
-- ============================================
-- Re-links all projects and permissions from redundant entries
-- to the full-name account entries.

DO $$
DECLARE
    v_ars_keep_id uuid;
    v_ars_remove_id uuid;
    v_gha_keep_id uuid;
    v_gha_remove_id uuid;
    v_man_keep_id uuid;
    v_man_remove_id uuid;
BEGIN
    -- 1. IDENTIFY THE IDS
    SELECT id INTO v_ars_keep_id FROM public.accounts WHERE name ILIKE 'Arshiya Azhar' LIMIT 1;
    SELECT id INTO v_ars_remove_id FROM public.accounts WHERE name ILIKE 'ARS Account' LIMIT 1;
    
    SELECT id INTO v_gha_keep_id FROM public.accounts WHERE name ILIKE 'Abdul Ghani' LIMIT 1;
    SELECT id INTO v_gha_remove_id FROM public.accounts WHERE name ILIKE 'GHA Account' LIMIT 1;
    
    SELECT id INTO v_man_keep_id FROM public.accounts WHERE name ILIKE 'Mansoor Hassan' OR name ILIKE 'Mmansoor Hassan' LIMIT 1;
    SELECT id INTO v_man_remove_id FROM public.accounts WHERE name ILIKE 'MAN Account' LIMIT 1;

    -- 2. CONSOLIDATE ARS
    IF v_ars_keep_id IS NOT NULL AND v_ars_remove_id IS NOT NULL THEN
        UPDATE public.projects SET account_id = v_ars_keep_id, account = 'Arshiya Azhar' WHERE account_id = v_ars_remove_id OR account = 'ARS Account';
        
        -- user_account_access (Unique on user_id, account_id)
        DELETE FROM public.user_account_access WHERE account_id = v_ars_remove_id AND user_id IN (SELECT user_id FROM public.user_account_access WHERE account_id = v_ars_keep_id);
        UPDATE public.user_account_access SET account_id = v_ars_keep_id WHERE account_id = v_ars_remove_id;
        
        -- team_accounts (Unique on team_id, account_id)
        DELETE FROM public.team_accounts WHERE account_id = v_ars_remove_id AND team_id IN (SELECT team_id FROM public.team_accounts WHERE account_id = v_ars_keep_id);
        UPDATE public.team_accounts SET account_id = v_ars_keep_id WHERE account_id = v_ars_remove_id;
        
        -- performance_metrics
        UPDATE public.performance_metrics SET account_id = v_ars_keep_id WHERE account_id = v_ars_remove_id;
        
        -- platform_commission_accounts (Unique on platform_commission_id, account_id)
        DELETE FROM public.platform_commission_accounts WHERE account_id = v_ars_remove_id AND platform_commission_id IN (SELECT platform_commission_id FROM public.platform_commission_accounts WHERE account_id = v_ars_keep_id);
        UPDATE public.platform_commission_accounts SET account_id = v_ars_keep_id WHERE account_id = v_ars_remove_id;
        
        DELETE FROM public.accounts WHERE id = v_ars_remove_id;
    END IF;

    -- 3. CONSOLIDATE GHA
    IF v_gha_keep_id IS NOT NULL AND v_gha_remove_id IS NOT NULL THEN
        UPDATE public.projects SET account_id = v_gha_keep_id, account = 'Abdul Ghani' WHERE account_id = v_gha_remove_id OR account = 'GHA Account';
        
        DELETE FROM public.user_account_access WHERE account_id = v_gha_remove_id AND user_id IN (SELECT user_id FROM public.user_account_access WHERE account_id = v_gha_keep_id);
        UPDATE public.user_account_access SET account_id = v_gha_keep_id WHERE account_id = v_gha_remove_id;
        
        DELETE FROM public.team_accounts WHERE account_id = v_gha_remove_id AND team_id IN (SELECT team_id FROM public.team_accounts WHERE account_id = v_gha_keep_id);
        UPDATE public.team_accounts SET account_id = v_gha_keep_id WHERE account_id = v_gha_remove_id;
        
        UPDATE public.performance_metrics SET account_id = v_gha_keep_id WHERE account_id = v_gha_remove_id;
        
        DELETE FROM public.platform_commission_accounts WHERE account_id = v_gha_remove_id AND platform_commission_id IN (SELECT platform_commission_id FROM public.platform_commission_accounts WHERE account_id = v_gha_keep_id);
        UPDATE public.platform_commission_accounts SET account_id = v_gha_keep_id WHERE account_id = v_gha_remove_id;
        
        DELETE FROM public.accounts WHERE id = v_gha_remove_id;
    END IF;

    -- 4. CONSOLIDATE MAN
    IF v_man_keep_id IS NOT NULL AND v_man_remove_id IS NOT NULL THEN
        UPDATE public.projects SET account_id = v_man_keep_id, account = 'Mansoor Hassan' WHERE account_id = v_man_remove_id OR account = 'MAN Account';
        
        DELETE FROM public.user_account_access WHERE account_id = v_man_remove_id AND user_id IN (SELECT user_id FROM public.user_account_access WHERE account_id = v_man_keep_id);
        UPDATE public.user_account_access SET account_id = v_man_keep_id WHERE account_id = v_man_remove_id;
        
        DELETE FROM public.team_accounts WHERE account_id = v_man_remove_id AND team_id IN (SELECT team_id FROM public.team_accounts WHERE account_id = v_man_keep_id);
        UPDATE public.team_accounts SET account_id = v_man_keep_id WHERE account_id = v_man_remove_id;
        
        UPDATE public.performance_metrics SET account_id = v_man_keep_id WHERE account_id = v_man_remove_id;
        
        DELETE FROM public.platform_commission_accounts WHERE account_id = v_man_remove_id AND platform_commission_id IN (SELECT platform_commission_id FROM public.platform_commission_accounts WHERE account_id = v_man_keep_id);
        UPDATE public.platform_commission_accounts SET account_id = v_man_keep_id WHERE account_id = v_man_remove_id;
        
        DELETE FROM public.accounts WHERE id = v_man_remove_id;
    END IF;
END $$;
