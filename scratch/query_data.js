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

async function run() {
    await supabase.auth.signInWithPassword({
        email: 'touseefahmed@codeslogic.com',
        password: '12345//'
    });

    console.log('=== 1. user_account_access ===');
    const { data: access, error: err1 } = await supabase.from('user_account_access').select('*');
    if (err1) console.error('Error 1:', err1);
    else console.log('Rows:', access.length, access.slice(0, 5));

    console.log('=== 2. platform_commissions ===');
    const { data: commissions, error: err2 } = await supabase.from('platform_commissions').select('*, platform_commission_accounts(account_id)');
    if (err2) console.error('Error 2:', err2);
    else console.log('Rows:', commissions.length, JSON.stringify(commissions, null, 2));

    console.log('=== 3. pricing_slabs ===');
    const { data: slabs, error: err3 } = await supabase.from('pricing_slabs').select('*').order('min_price', { ascending: true });
    if (err3) console.error('Error 3:', err3);
    else console.log('Rows:', slabs.length, slabs);

    console.log('=== 4. projects count ===');
    const { count, error: err4 } = await supabase.from('projects').select('*', { count: 'exact', head: true });
    if (err4) console.error('Error 4:', err4);
    else console.log('Total Projects:', count);

    console.log('=== 5. projects sample ===');
    const { data: projects, error: err5 } = await supabase.from('projects').select('*, accounts(prefix)').limit(3);
    if (err5) console.error('Error 5:', err5);
    else console.log('Sample Projects:', JSON.stringify(projects, null, 2));
}

run();
