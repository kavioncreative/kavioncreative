
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://efrborampxloagtlphyf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcmJvcmFtcHhsb2FndGxwaHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MDg0MDYsImV4cCI6MjA4NDM4NDQwNn0.axCcmJDy-x-752VsC82_Qbg4YHJtsbQoQqNNCBYG188';

const supabase = createClient(supabaseUrl, supabaseKey);

async function listRecentProjects() {
    console.log('--- Logging in as Touseef ---');
    await supabase.auth.signInWithPassword({
        email: 'touseefahmed@codeslogic.com',
        password: '12345//'
    });

    const { data: projects, error } = await supabase
        .from('projects')
        .select('project_id, team_payout, team_designer_fee, designer_fee, status')
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error('Error listing projects:', error);
        return;
    }

    console.log('10 Recent Projects:');
    console.log(JSON.stringify(projects, null, 2));
}

listRecentProjects();
