
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://efrborampxloagtlphyf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcmJvcmFtcHhsb2FndGxwaHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MDg0MDYsImV4cCI6MjA4NDM4NDQwNn0.axCcmJDy-x-752VsC82_Qbg4YHJtsbQoQqNNCBYG188';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixDataById() {
    const bruceIds = [
        'MAN 499847', // Juniper
        'MAN 759463', // IntakeOps
        'MAN 449954', // Bolt & Boom
        'MAN 265759', // Relaunch
        'MAN 865757'  // Talent Troll
    ];

    const kbearIds = [
        'MAN 542888'  // TR
    ];

    console.log('Updating bruce1423 by ID...');
    const { data: d1, error: error1 } = await supabase
        .from('projects')
        .update({ client_name: 'bruce1423' })
        .in('project_id', bruceIds)
        .select();
    
    console.log('Update result bruce:', d1, 'Error:', error1?.message);

    console.log('Updating kbear2197 by ID...');
    const { data: d2, error: error2 } = await supabase
        .from('projects')
        .update({ client_name: 'kbear2197' })
        .in('project_id', kbearIds)
        .select();

    console.log('Update result kbear:', d2, 'Error:', error2?.message);
}

fixDataById();
