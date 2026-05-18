
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://efrborampxloagtlphyf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcmJvcmFtcHhsb2FndGxwaHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MDg0MDYsImV4cCI6MjA4NDM4NDQwNn0.axCcmJDy-x-752VsC82_Qbg4YHJtsbQoQqNNCBYG188';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    await supabase.auth.signInWithPassword({
        email: 'touseefahmed@codeslogic.com',
        password: '12345//'
    });

    const { data: projects, error } = await supabase
        .from('projects')
        .select('project_id, assignee, price, status')
        .ilike('assignee', '%Sumaira%')
        .limit(10);

    if (error) {
        console.error(error);
        return;
    }
    console.log(JSON.stringify(projects, null, 2));
}

check();
