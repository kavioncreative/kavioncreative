-- Migration: Global Activity Logs
-- Created: 2026-04-10
-- Description: Centralized logging for all project activities using database triggers.

-- 1. Create activity_logs table
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id TEXT,
    user_id UUID REFERENCES auth.users(id),
    user_name TEXT,
    action_type TEXT NOT NULL, -- 'status_change', 'qa_status_change', 'comment', 'assignee_change'
    old_value JSONB DEFAULT '{}'::jsonb,
    new_value JSONB DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Performance Optimization: Indexing
CREATE INDEX IF NOT EXISTS idx_activity_logs_project_id ON activity_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action_type ON activity_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);

-- 2. Security: Enable RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Only Admins and Super Admins can view activity logs
DROP POLICY IF EXISTS "Admins can view all logs" ON public.activity_logs;
CREATE POLICY "Admins can view all logs" ON public.activity_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND (role = 'Admin' OR role = 'Super Admin')
        )
    );

-- 3. Trigger Function: Log Project Changes (INSERT and UPDATE)
CREATE OR REPLACE FUNCTION public.handle_project_changes_logging()
RETURNS TRIGGER AS $$
DECLARE
    current_uid UUID;
    current_user_name TEXT;
BEGIN
    current_uid := auth.uid();
    
    -- Resolve user name
    IF current_uid IS NOT NULL THEN
        SELECT name INTO current_user_name FROM profiles WHERE id = current_uid;
    ELSE
        current_user_name := 'System';
    END IF;

    -- A. Handle INSERT (Project Creation) - Capture full initial state
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.activity_logs (
            project_id, user_id, user_name, action_type, new_value, metadata
        ) VALUES (
            NEW.project_id, current_uid, current_user_name, 'project_created',
            jsonb_build_object(
                'status', NEW.status,
                'assignee', NEW.assignee,
                'price', NEW.price,
                'qa_status', NEW.qa_status
            ),
            jsonb_build_object('project_title', NEW.project_title)
        );
        RETURN NEW;
    END IF;

    -- B. Handle UPDATE (Changes)
    IF (TG_OP = 'UPDATE') THEN
        -- Log Status Changes
        IF (OLD.status IS DISTINCT FROM NEW.status) THEN
            INSERT INTO public.activity_logs (
                project_id, user_id, user_name, action_type, old_value, new_value, metadata
            ) VALUES (
                NEW.project_id, current_uid, current_user_name, 'status_change',
                jsonb_build_object('status', OLD.status),
                jsonb_build_object('status', NEW.status),
                jsonb_build_object('project_title', NEW.project_title)
            );
        END IF;

        -- Log QA Status Changes
        IF (OLD.qa_status IS DISTINCT FROM NEW.qa_status) THEN
            INSERT INTO public.activity_logs (
                project_id, user_id, user_name, action_type, old_value, new_value, metadata
            ) VALUES (
                NEW.project_id, current_uid, current_user_name, 'qa_status_change',
                jsonb_build_object('qa_status', OLD.qa_status),
                jsonb_build_object('qa_status', NEW.qa_status),
                jsonb_build_object('project_title', NEW.project_title)
            );
        END IF;

        -- Log Assignee Changes
        IF (OLD.assignee_id IS DISTINCT FROM NEW.assignee_id OR OLD.assignee IS DISTINCT FROM NEW.assignee) THEN
            INSERT INTO public.activity_logs (
                project_id, user_id, user_name, action_type, old_value, new_value, metadata
            ) VALUES (
                NEW.project_id, current_uid, current_user_name, 'assignee_change',
                jsonb_build_object('assignee', OLD.assignee),
                jsonb_build_object('assignee', NEW.assignee),
                jsonb_build_object('project_title', NEW.project_title)
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for Projects (INSERT/UPDATE)
DROP TRIGGER IF EXISTS tr_log_project_changes ON projects;
CREATE TRIGGER tr_log_project_changes
    AFTER INSERT OR UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION handle_project_changes_logging();

-- 4. Trigger Function: Log New Comments (Handling System Logs)
CREATE OR REPLACE FUNCTION public.handle_new_comment_logging()
RETURNS TRIGGER AS $$
DECLARE
    project_title_val TEXT;
    project_created_at TIMESTAMPTZ;
    current_uid UUID;
    display_name TEXT;
BEGIN
    current_uid := auth.uid();
    
    -- Get project details
    SELECT project_title, created_at 
    INTO project_title_val, project_created_at 
    FROM projects WHERE project_id = NEW.project_id;
    
    display_name := NEW.author_name;

    -- Detect System-Generated Logs: Assignment (PROJECT_ASSIGNED|... or PROJECT_ASSIGNED:...)
    IF NEW.content LIKE 'PROJECT_ASSIGNED|%' OR NEW.content LIKE 'PROJECT_ASSIGNED:%' THEN
        -- SKIP if the project was created less than 30 seconds ago (already in project_created log)
        IF (now() - project_created_at) < interval '30 seconds' THEN
            RETURN NEW;
        END IF;

        INSERT INTO public.activity_logs (
            project_id, user_id, user_name, action_type, new_value, metadata
        ) VALUES (
            NEW.project_id, current_uid, display_name, 'assignee_change',
            jsonb_build_object('assignee', COALESCE(split_part(NEW.content, '|', 3), split_part(NEW.content, ':', 3))),
            jsonb_build_object('project_title', project_title_val, 'is_system_log', true)
        );
        RETURN NEW;
    END IF;

    -- Ignore Technical Status Change Comments (Source of truth is the projects table)
    -- This prevents the "COMMENT: STATUS_CHANGED:..." duplicate entry
    IF NEW.content LIKE 'STATUS_CHANGED:%' OR NEW.content LIKE 'STATUS_CHANGED|%' THEN
        RETURN NEW;
    END IF;

    -- Default: Normal Comment
    INSERT INTO public.activity_logs (
        project_id, user_id, user_name, action_type, new_value, metadata
    ) VALUES (
        NEW.project_id, current_uid, display_name,
        CASE WHEN NEW.is_internal THEN 'qa_comment' ELSE 'comment' END,
        jsonb_build_object('content', NEW.content),
        jsonb_build_object('project_title', project_title_val, 'is_internal', NEW.is_internal)
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for Comments
DROP TRIGGER IF EXISTS tr_log_new_comment ON project_comments;
CREATE TRIGGER tr_log_new_comment
    AFTER INSERT ON project_comments
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_comment_logging();

-- 5. Permissions: Register and Grant view_activity_logs
-- First register the permission in the main permissions table
INSERT INTO public.permissions (code, name, category, description)
VALUES ('view_activity_logs', 'View Activity Logs', 'System', 'Allows users to view the global system activity and audit logs.')
ON CONFLICT (code) DO NOTHING;

-- Then grant it to the Admin role
INSERT INTO public.role_permissions (role_name, permission_code)
VALUES ('Admin', 'view_activity_logs')
ON CONFLICT DO NOTHING;
