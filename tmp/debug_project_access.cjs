
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://efrborampxloagtlphyf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcmJvcmFtcHhsb2FndGxwaHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MDg0MDYsImV4cCI6MjA4NDM4NDQwNn0.axCcmJDy-x-752VsC82_Qbg4YHJtsbQoQqNNCBYG188';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debug() {
    console.log('--- Checking Users ---');
    const { data: users, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .in('email', ['touseefahmed@codeslogic.com', 'stephen@codeslogic.com']);

    if (userError) {
        console.error('Error fetching users:', userError);
        return;
    }

    console.log('Users found:', users.map(u => ({ id: u.id, email: u.email, role: u.role, name: u.name })));

    const touseef = users.find(u => u.email === 'touseefahmed@codeslogic.com');
    const stephen = users.find(u => u.email === 'stephen@codeslogic.com');

    console.log('\n--- Checking Project MOS 124695 ---');
    const { data: projects, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .ilike('project_id', '%MOS 124695%');

    if (projectError) {
        console.error('Error fetching project:', projectError);
        return;
    }

    if (projects.length === 0) {
        console.log('Project not found');
        return;
    }

    const project = projects[0];
    console.log('Project Details:', {
        project_id: project.project_id,
        project_title: project.project_title,
        status: project.status,
        assignee_id: project.assignee_id,
        team_designer_id: project.team_designer_id,
        assignee: project.assignee,
        account_id: project.account_id
    });

    console.log('\n--- Checking Collaborators ---');
    const { data: collabs, error: collabError } = await supabase
        .from('project_collaborators')
        .select('*')
        .eq('project_id', project.project_id);

    if (collabError) {
        console.error('Error fetching collaborators:', collabError);
    } else {
        console.log('Collaborators:', collabs.map(c => c.member_id));
    }

    console.log('\n--- Checking Account Access ---');
    if (touseef) {
        const { data: access, error: accessError } = await supabase
            .from('user_account_access')
            .select('*')
            .eq('user_id', touseef.id);
        
        if (accessError) {
            console.error('Error fetching access:', accessError);
        } else {
            console.log('Touseef Account Access IDs:', access.map(a => a.account_id));
            if (project.account_id && access.some(a => a.account_id === project.account_id)) {
                console.log('MATCH FOUND: Touseef has access to project account via user_account_access');
            }
        }

        const { data: teamMembers, error: teamMemberError } = await supabase
            .from('team_members')
            .select('team_id')
            .eq('member_id', touseef.id);

        if (teamMemberError) {
            console.error('Error fetching team memberships:', teamMemberError);
        } else {
            const teamIds = teamMembers.map(tm => tm.team_id);
            console.log('Touseef Team IDs:', teamIds);
            if (teamIds.length > 0) {
                const { data: teamAccs, error: teamAccError } = await supabase
                    .from('team_accounts')
                    .select('account_id')
                    .in('team_id', teamIds);
                
                if (teamAccError) {
                    console.error('Error fetching team accounts:', teamAccError);
                } else {
                    const teamAccIds = teamAccs.map(ta => ta.account_id);
                    console.log('Touseef Team Account IDs:', teamAccIds);
                    if (project.account_id && teamAccIds.some(aid => aid === project.account_id)) {
                        console.log('MATCH FOUND: Touseef has access to project account via team_accounts');
                    }
                }
            }
        }
    }
}

debug();
