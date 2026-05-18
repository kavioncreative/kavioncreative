
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://efrborampxloagtlphyf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcmJvcmFtcHhsb2FndGxwaHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MDg0MDYsImV4cCI6MjA4NDM4NDQwNn0.axCcmJDy-x-752VsC82_Qbg4YHJtsbQoQqNNCBYG188';
const supabase = createClient(supabaseUrl, supabaseKey);

async function probe() {
    console.log('Probing projects_with_collaborators...');
    const { data, error } = await supabase.from('projects_with_collaborators').select('*').limit(1);
    if (error) {
        console.error('Fetch error:', error);
    } else if (data && data.length > 0) {
        console.log('Columns:', Object.keys(data[0]));
        console.log('Sample Collaborators:', JSON.stringify(data[0].collaborators, null, 2));
    } else {
        console.log('No data found');
    }
}

probe();
