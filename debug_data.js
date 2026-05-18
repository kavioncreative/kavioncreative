import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://efrborampxloagtlphyf.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcmJvcmFtcHhsb2FndGxwaHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MDg0MDYsImV4cCI6MjA4NDM4NDQwNn0.axCcmJDy-x-752VsC82_Qbg4YHJtsbQoQqNNCBYG188'
);

async function checkData() {
    const { count: projectCount } = await supabase.from('projects').select('*', { count: 'exact', head: true });
    const { count: profileCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });

    console.log('Project Count:', projectCount);
    console.log('Profile Count:', profileCount);

    const { data: profiles } = await supabase.from('profiles').select('name, email, role').limit(5);
    console.log('Sample Profiles:');
    console.table(profiles);
}

checkData();
