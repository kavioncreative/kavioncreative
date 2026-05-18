
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://efrborampxloagtlphyf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcmJvcmFtcHhsb2FndGxwaHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MDg0MDYsImV4cCI6MjA4NDM4NDQwNn0.axCcmJDy-x-752VsC82_Qbg4YHJtsbQoQqNNCBYG188';

const supabase = createClient(supabaseUrl, supabaseKey);

async function findIds() {
    const ids = [
        'MAN 499847', 'MAN 759463', 'MAN 542888', 
        'MAN 865757', 'MAN 449954', 'MAN 265759'
    ];

    const { data } = await supabase
        .from('projects_with_collaborators')
        .select('id, project_id')
        .in('project_id', ids);

    console.log('--- Project UUIDs ---');
    console.log(JSON.stringify(data, null, 2));
}

findIds();
