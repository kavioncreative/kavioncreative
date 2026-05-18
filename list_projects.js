import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://efrborampxloagtlphyf.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcmJvcmFtcHhsb2FndGxwaHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MDg0MDYsImV4cCI6MjA4NDM4NDQwNn0.axCcmJDy-x-752VsC82_Qbg4YHJtsbQoQqNNCBYG188'
);

async function listProjects() {
    const { data: projects, error } = await supabase
        .from('projects')
        .select('project_id, project_title, status, funds_status, assignee')
        .limit(20);

    if (error) {
        console.error('Error:', error);
    } else {
        console.table(projects);
    }
}

listProjects();
