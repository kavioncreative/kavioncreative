import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

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

    let log = '';
    const print = (...args) => {
        log += args.join(' ') + '\n';
    };

    print('=== 1. user_account_access counts ===');
    const { data: access, error: err1 } = await supabase.from('user_account_access').select('*');
    if (err1) print('Error 1:', err1.message);
    else {
        print('Total Rows in user_account_access:', access.length);
        // Group by user_id
        const userGroups = {};
        access.forEach(a => {
            userGroups[a.user_id] = (userGroups[a.user_id] || 0) + 1;
        });
        print('Users with account access:', JSON.stringify(userGroups, null, 2));
    }

    print('\n=== 2. platform_commissions query test ===');
    const { data: commissions, error: err2 } = await supabase.from('platform_commissions').select('*, platform_commission_accounts(account_id)');
    if (err2) print('Error 2:', err2.message);
    else {
        print('Total platform_commissions:', commissions.length);
        commissions.forEach(c => {
            print(`Platform: ${c.platform_name} (${c.commission_percentage})`);
            print(`  Accounts linked count: ${c.platform_commission_accounts?.length || 0}`);
            print(`  Accounts linked detail: ${JSON.stringify(c.platform_commission_accounts)}`);
        });
    }

    print('\n=== 3. pricing_slabs query test ===');
    const { data: slabs, error: err3 } = await supabase.from('pricing_slabs').select('*').order('min_price', { ascending: true });
    if (err3) print('Error 3:', err3.message);
    else {
        print('Total pricing_slabs:', slabs.length);
        slabs.forEach(s => {
            print(`  Slab: $${s.min_price} to $${s.max_price} -> Freelancer: ${s.freelancer_percentage}%`);
        });
    }

    print('\n=== 4. projects count ===');
    const { count, error: err4 } = await supabase.from('projects').select('*', { count: 'exact', head: true });
    if (err4) print('Error 4:', err4.message);
    else print('Total Projects in DB:', count);

    fs.writeFileSync('scratch/query_summary.txt', log, 'utf8');
    console.log('Saved to scratch/query_summary.txt');
}

run();
