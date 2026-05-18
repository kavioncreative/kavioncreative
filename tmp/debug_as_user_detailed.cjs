
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://efrborampxloagtlphyf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcmJvcmFtcHhsb2FndGxwaHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MDg0MDYsImV4cCI6MjA4NDM4NDQwNn0.axCcmJDy-x-752VsC82_Qbg4YHJtsbQoQqNNCBYG188';

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
    }
});

async function debugAsUser() {
    console.log('--- Logging in as Touseef ---');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'touseefahmed@codeslogic.com',
        password: '12345//'
    });

    if (authError) {
        console.error('Login error:', authError);
        return;
    }

    const { user } = authData;
    console.log('Loggged in as:', user.id, user.email);

    console.log('\n--- Checking Profile ---');
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
    
    if (profileError) {
        console.error('Profile error:', profileError);
    } else {
        console.log('Profile Details:', {
            id: profile.id,
            name: profile.name,
            email: profile.email,
            role: profile.role
        });
    }

    console.log('\n--- Fetching Projects for MOS 124695 ---');
    const { data: visibleProjects, error: queryError } = await supabase
        .from('projects')
        .select('*')
        .ilike('project_id', '%MOS 124695%');

    if (queryError) {
        console.error('Query error:', queryError);
    } else {
        const project = visibleProjects[0];
        console.log('Project Details:', {
            project_id: project.project_id,
            project_title: project.project_title,
            assignee: project.assignee,
            assignee_id: project.assignee_id,
            team_designer_id: project.team_designer_id,
            team_designer_name: project.team_designer_name,
            account_id: project.account_id
        });

        const nameMatch = project.assignee === profile.name;
        const emailMatch = project.assignee === profile.email;
        const idMatch = project.assignee_id === profile.id;
        const teamIdMatch = project.team_designer_id === profile.id;

        console.log('\nMatches for Touseef:');
        console.log('Name Match:', nameMatch);
        console.log('Email Match:', emailMatch);
        console.log('ID Match (assignee_id):', idMatch);
        console.log('Team ID Match (team_designer_id):', teamIdMatch);
    }
}

debugAsUser();
