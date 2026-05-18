
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://efrborampxloagtlphyf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcmJvcmFtcHhsb2FndGxwaHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MDg0MDYsImV4cCI6MjA4NDM4NDQwNn0.axCcmJDy-x-752VsC82_Qbg4YHJtsbQoQqNNCBYG188';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCommissionSchema() {
    console.log('--- Logging in as Touseef ---');
    await supabase.auth.signInWithPassword({
        email: 'touseefahmed@codeslogic.com',
        password: '12345//'
    });

    const { data, error } = await supabase
        .from('platform_commissions')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching commissions:', error);
        return;
    }

    console.log('Platform Commission Schema:');
    console.log(JSON.stringify(data, null, 2));
}

checkCommissionSchema();
