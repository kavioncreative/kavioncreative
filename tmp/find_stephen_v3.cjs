
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

async function findStephenAsTouseef() {
    console.log('--- Logging in as Touseef ---');
    const { data: authData } = await supabase.auth.signInWithPassword({
        email: 'touseefahmed@codeslogic.com',
        password: '12345//'
    });

    if (!authData.user) {
        console.error('Login failed');
        return;
    }

    console.log('--- Searching for Stephen Designs ---');
    const { data: stephens, error: stephenError } = await supabase
        .from('profiles')
        .select('*')
        .or('name.ilike.%Stephen%,email.ilike.%stephen%');

    if (stephenError) {
        console.error('Error:', stephenError);
        return;
    }

    console.log('Profiles Found:', stephens);
}

findStephenAsTouseef();
