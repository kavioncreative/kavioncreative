
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://efrborampxloagtlphyf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcmJvcmFtcHhsb2FndGxwaHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MDg0MDYsImV4cCI6MjA4NDM4NDQwNn0.axCcmJDy-x-752VsC82_Qbg4YHJtsbQoQqNNCBYG188';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectProjects() {
    const { data: projects, error } = await supabase
        .from('projects')
        .select('id, project_id, project_title, created_at, updated_at')
        .order('created_at', { ascending: false })
        .limit(100);
        
    if (error) {
        console.error(error);
        return;
    }
    
    console.log('--- RECENT PROJECTS ---');
    projects.forEach(p => {
        console.log(`Date: ${p.created_at} | ID: ${p.project_id} | Title: ${p.project_title}`);
    });
}

inspectProjects();
