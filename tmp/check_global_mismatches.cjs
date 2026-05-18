
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://efrborampxloagtlphyf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcmJvcmFtcHhsb2FndGxwaHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MDg0MDYsImV4cCI6MjA4NDM4NDQwNn0.axCcmJDy-x-752VsC82_Qbg4YHJtsbQoQqNNCBYG188';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkGlobalMismatches() {
    console.log('--- Logging in as Touseef to get data access ---');
    const { data: authData } = await supabase.auth.signInWithPassword({
        email: 'touseefahmed@codeslogic.com',
        password: '12345//'
    });

    if (!authData.user) {
        console.error('Login failed');
        return;
    }

    console.log('--- Fetching all profiles and visible projects ---');
    const { data: profiles } = await supabase.from('profiles').select('id, name, email');
    const { data: projects } = await supabase.from('projects').select('project_id, assignee, assignee_id, team_designer_id');

    const profileMap = {};
    profiles.forEach(p => {
        profileMap[p.id] = p.name.trim().toLowerCase();
    });

    const mismatches = [];

    projects.forEach(p => {
        if (p.assignee && p.assignee_id) {
            const assigneeName = p.assignee.trim().toLowerCase();
            const expectedName = profileMap[p.assignee_id];
            
            if (expectedName && assigneeName !== expectedName) {
                // Check if assigneeName matches ANY other profile
                const otherProfile = profiles.find(pr => pr.name.trim().toLowerCase() === assigneeName);
                if (otherProfile && otherProfile.id !== p.assignee_id) {
                    mismatches.push({
                        project_id: p.project_id,
                        string_name: p.assignee,
                        fk_id_name: profiles.find(pr => pr.id === p.assignee_id)?.name,
                        intended_owner_name: otherProfile.name,
                        intended_owner_id: otherProfile.id,
                        current_fk_id: p.assignee_id
                    });
                }
            }
        }
    });

    console.log('\nFound Mismatches where String Assignee belongs to a different ID than FK ID:');
    console.log(JSON.stringify(mismatches, null, 2));
}

checkGlobalMismatches();
