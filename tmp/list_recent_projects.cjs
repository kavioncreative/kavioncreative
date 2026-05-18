
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://efrborampxloagtlphyf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcmJvcmFtcHhsb2FndGxwaHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MDg0MDYsImV4cCI6MjA4NDM4NDQwNn0.axCcmJDy-x-752VsC82_Qbg4YHJtsbQoQqNNCBYG188';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRecentProjects() {
    console.log('--- Listing last 10 projects ---');
    const { data: projects, error } = await supabase
        .from('projects')
        .select('project_id, project_title, status, assignee, price, designer_fee, team_designer_fee, created_at')
        .order('created_at', { ascending: false })
        .limit(10);
    
    if (error) {
        console.error('Error:', error);
    } else {
        console.table(projects.map(p => ({
            ID: p.project_id,
            Title: p.project_title,
            Status: p.status,
            Assignee: p.assignee,
            Price: p.price,
            Fee: p.designer_fee,
            TeamFee: p.team_designer_fee
        })));
    }
}

checkRecentProjects();
