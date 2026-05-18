
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://efrborampxloagtlphyf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcmJvcmFtcHhsb2FndGxwaHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MDg0MDYsImV4cCI6MjA4NDM4NDQwNn0.axCcmJDy-x-752VsC82_Qbg4YHJtsbQoQqNNCBYG188';

const supabase = createClient(supabaseUrl, supabaseKey);

async function findStephen() {
    console.log('--- Searching for Stephen Designs ---');
    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, name, email, role')
        .or('name.ilike.%Stephen%,email.ilike.%stephen%');

    if (profileError) {
        console.error('Error fetching Stephen:', profileError);
        return;
    }

    console.log('Profiles Found:', profiles);
}

findStephen();
