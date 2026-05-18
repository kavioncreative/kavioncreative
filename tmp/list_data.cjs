
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://efrborampxloagtlphyf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcmJvcmFtcHhsb2FndGxwaHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MDg0MDYsImV4cCI6MjA4NDM4NDQwNn0.axCcmJDy-x-752VsC82_Qbg4YHJtsbQoQqNNCBYG188';

const supabase = createClient(supabaseUrl, supabaseKey);

async function listSome() {
    console.log('--- Listing 10 Users ---');
    const { data: users } = await supabase.from('profiles').select('email, name, role').limit(10);
    console.log(users);

    console.log('\n--- Listing 10 Projects ---');
    const { data: projects } = await supabase.from('projects').select('project_id, project_title, status, assignee').limit(10);
    console.log(projects);

    console.log('\n--- Searching for MOS ---');
    const { data: mos } = await supabase.from('projects').select('project_id').ilike('project_id', '%MOS%').limit(5);
    console.log(mos);
}

listSome();
