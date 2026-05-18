
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://efrborampxloagtlphyf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcmJvcmFtcHhsb2FndGxwaHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MDg0MDYsImV4cCI6MjA4NDM4NDQwNn0.axCcmJDy-x-752VsC82_Qbg4YHJtsbQoQqNNCBYG188';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixData() {
    const bruceClients = [
        'Juniper Healthcare Partners',
        'IntakeOps',
        'Bolt & Boom Advertising Co.',
        'Relaunch Counseling',
        'Talent Troll'
    ];

    const kbearClients = [
        'TR (Initials-Based Logo)'
    ];

    console.log('Updating projects for bruce1423...');
    const { error: error1 } = await supabase
        .from('projects')
        .update({ client_name: 'bruce1423' })
        .in('project_title', bruceClients);
    
    if (error1) console.error('Error updating bruce clients:', error1);

    console.log('Updating projects for kbear2197...');
    const { error: error2 } = await supabase
        .from('projects')
        .update({ client_name: 'kbear2197' })
        .in('project_title', kbearClients);

    if (error2) console.error('Error updating kbear clients:', error2);

    console.log('Done.');
}

fixData();
