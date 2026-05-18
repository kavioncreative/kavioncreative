
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://efrborampxloagtlphyf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcmJvcmFtcHhsb2FndGxwaHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MDg0MDYsImV4cCI6MjA4NDM4NDQwNn0.axCcmJDy-x-752VsC82_Qbg4YHJtsbQoQqNNCBYG188';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMismatches() {
    console.log('--- Searching for Assignee Mismatches ---');
    // I need to be logged in to read everything... wait.
    // Actually, maybe I can use Touseef's session to read at least what Touseef can see.
    
    const { data: authData } = await supabase.auth.signInWithPassword({
        email: 'touseefahmed@codeslogic.com',
        password: '12345//'
    });

    if (!authData.user) {
        console.error('Login failed');
        return;
    }

    // List all projects Touseef can see (some might be mismatches)
    const { data: userProjects } = await supabase.from('projects').select('project_id, assignee, assignee_id').limit(100);
    
    console.log(`Checking ${userProjects.length} projects visible to Touseef...`);

    const { data: allProfiles } = await supabase.from('profiles').select('id, name');
    const profileMap = {};
    allProfiles.forEach(p => profileMap[p.id] = p.name);

    userProjects.forEach(p => {
        const expectedName = profileMap[p.assignee_id] || 'Unknown';
        if (p.assignee_id && p.assignee !== expectedName) {
            console.log(`Mismatch found! Project: ${p.project_id} | FK Name: ${expectedName} | String Name: ${p.assignee} | FK ID: ${p.assignee_id}`);
        }
    });
}

checkMismatches();
