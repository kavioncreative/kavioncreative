import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://efrborampxloagtlphyf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcmJvcmFtcHhsb2FndGxwaHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MDg0MDYsImV4cCI6MjA4NDM4NDQwNn0.axCcmJDy-x-752VsC82_Qbg4YHJtsbQoQqNNCBYG188';

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
    }
});

async function testQuery(name, selectStr) {
    console.log(`\n--- Test: ${name} ---`);
    console.time(name);
    const { data, error } = await supabase
        .from('projects')
        .select(selectStr)
        .neq('status', 'Removed')
        .neq('status', 'Cancelled')
        .order('created_at', { ascending: false });
    console.timeEnd(name);

    if (error) {
        console.error(`  FAILED: ${error.message}`);
    } else {
        console.log(`  SUCCESS! Fetched ${data.length} projects.`);
    }
}

async function run() {
    console.log('Logging in as Mansoor Hassan...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'mansoorulhassan83@gmail.com',
        password: '12345//'
    });

    if (authError) {
        console.error('Login failed:', authError.message);
        return;
    }

    // Run tests
    const selectedFields = 'project_id, project_title, status, price, tip_amount, account_id, account, designer_fee, clearance_start_date, client_name, order_type, converted_by, created_at, accounts(prefix)';
    await testQuery('Specific Required Fields with accounts prefix join', selectedFields);

    const selectedFieldsNoJoin = 'project_id, project_title, status, price, tip_amount, account_id, account, designer_fee, clearance_start_date, client_name, order_type, converted_by, created_at';
    await testQuery('Specific Required Fields without accounts join', selectedFieldsNoJoin);

    await supabase.auth.signOut();
}

run();
