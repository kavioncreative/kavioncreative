
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://efrborampxloagtlphyf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcmJvcmFtcHhsb2FndGxwaHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MDg0MDYsImV4cCI6MjA4NDM4NDQwNn0.axCcmJDy-x-752VsC82_Qbg4YHJtsbQoQqNNCBYG188';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAfterFix() {
    const ids = [
        'MAN 499847', 'MAN 759463', 'MAN 542888', 
        'MAN 865757', 'MAN 449954', 'MAN 265759'
    ];

    const { data } = await supabase
        .from('projects')
        .select('project_id, project_title, client_name, client_type')
        .in('project_id', ids);

    console.log('--- After Fix ---');
    if (data) {
        data.forEach(p => {
            console.log(`${p.project_id} | ${p.project_title} | Name: ${p.client_name} | Type: ${p.client_type}`);
        });
    } else {
        console.log('No data found.');
    }
}

checkAfterFix();
