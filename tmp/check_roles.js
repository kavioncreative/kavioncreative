import { createClient } from '@supabase/supabase-js';
const url = 'https://efrborampxloagtlphyf.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcmJvcmFtcHhsb2FndGxwaHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MDg0MDYsImV4cCI6MjA4NDM4NDQwNn0.axCcmJDy-x-752VsC82_Qbg4YHJtsbQoQqNNCBYG188';
const supabase = createClient(url, key);

async function check() {
    console.log('Fetching roles from profiles table...');
    const { data, error } = await supabase.from('profiles').select('name, role').limit(100);
    if (error) {
        console.error('Error fetching roles:', error);
        return;
    }
    const roles = [...new Set(data.map(p => p.role))];
    console.log('Unique Roles found in DB:', roles);
    
    const freelancers = data.filter(p => p.role === 'Freelancer').map(p => p.name);
    console.log('Sample Freelancers:', freelancers.slice(0, 5));
    
    const teamDesigners = data.filter(p => p.role === 'Team Designer').map(p => p.name);
    console.log('Sample Team Designers:', teamDesigners.slice(0, 5));
}

check();
