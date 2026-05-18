
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://efrborampxloagtlphyf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcmJvcmFtcHhsb2FndGxwaHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MDg0MDYsImV4cCI6MjA4NDM4NDQwNn0.axCcmJDy-x-752VsC82_Qbg4YHJtsbQoQqNNCBYG188';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    await supabase.auth.signInWithPassword({
        email: 'touseefahmed@codeslogic.com',
        password: '12345//'
    });

    const { data: commissions, error } = await supabase.from('platform_commissions').select('*');
    if (error) {
        console.error(error);
        return;
    }
    console.log('Commissions:', JSON.stringify(commissions, null, 2));

    const { data: links, error: error2 } = await supabase.from('platform_commission_accounts').select('*');
    if (error2) {
        console.error(error2);
        return;
    }
    console.log('Links:', JSON.stringify(links, null, 2));
}

check();
