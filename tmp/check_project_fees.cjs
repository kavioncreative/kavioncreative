
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://efrborampxloagtlphyf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcmJvcmFtcHhsb2FndGxwaHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MDg0MDYsImV4cCI6MjA4NDM4NDQwNn0.axCcmJDy-x-752VsC82_Qbg4YHJtsbQoQqNNCBYG188';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProjectFees() {
    const projectId = 'ARS 100661';
    const { data: project, error } = await supabase
        .from('projects')
        .select('project_id, team_payout, team_designer_fee, designer_fee, status')
        .eq('project_id', projectId)
        .maybeSingle();

    if (error) {
        console.error('Error fetching project:', error);
        return;
    }

    console.log('Project Details for ARS 100661:');
    console.log(JSON.stringify(project, null, 2));
}

checkProjectFees();
