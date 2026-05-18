
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://efrborampxloagtlphyf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcmJvcmFtcHhsb2FndGxwaHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MDg0MDYsImV4cCI6MjA4NDM4NDQwNn0.axCcmJDy-x-752VsC82_Qbg4YHJtsbQoQqNNCBYG188';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixProjectData() {
    console.log('--- Logging in as Touseef ---');
    const { data: authData, error: loginError } = await supabase.auth.signInWithPassword({
        email: 'touseefahmed@codeslogic.com',
        password: '12345//'
    });

    if (loginError || !authData.user) {
        console.error('Login failed:', loginError);
        return;
    }

    const projectId = 'MOS 124695';
    const correctAssigneeId = '69546c0c-eb8f-4547-af25-e4c09a22b236'; // Stephen's ID

    console.log(`--- Updating project ${projectId} to correct assignee_id ---`);
    const { error: updateError } = await supabase
        .from('projects')
        .update({ assignee_id: correctAssigneeId })
        .eq('project_id', projectId);

    if (updateError) {
        console.error('Update failed (this is likely due to RLS constraints):', updateError);
        console.log('If update failed, an Admin must perform this fix in the Supabase Dashboard.');
    } else {
        console.log('SUCCESS! Project assignee_id updated.');
    }
}

fixProjectData();
