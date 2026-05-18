
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://efrborampxloagtlphyf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcmJvcmFtcHhsb2FndGxwaHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MDg0MDYsImV4cCI6MjA4NDM4NDQwNn0.axCcmJDy-x-752VsC82_Qbg4YHJtsbQoQqNNCBYG188';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const EMAIL = 'arsalanallishah@codeslogic.com';

async function checkUserProfile() {
    console.log(`Checking profile for: ${EMAIL}`);
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', EMAIL)
        .single();

    if (error) {
        console.error('Error fetching profile:', error);
        return;
    }

    console.log('\n--- User Profile Data ---');
    console.log(JSON.stringify(profile, null, 2));

    const role = profile.role?.toLowerCase().trim() || '';
    const status = profile.status?.trim() || '';
    const hasSeenWelcome = profile.has_seen_welcome;

    console.log('\n--- Routing Logic from App.tsx ---');
    console.log('Role:', role);
    console.log('Status:', status);
    console.log('Has Seen Welcome:', hasSeenWelcome);

    // Re-check App.tsx routing logic
    if (status.toLowerCase() === 'invited') {
        console.log('Routing Result: complete-profile (INVITED)');
    } else if (role === 'admin' || role === 'super admin') {
        console.log('Routing Result: dashboard (ADMIN)');
    } else if (status.toLowerCase() === 'pending') {
        console.log('Routing Result: pending-approval');
    } else if (status.toLowerCase() === 'disabled' || status.toLowerCase() === 'deactivated') {
        console.log('Routing Result: deactivated');
    } else if (status.toLowerCase() === 'active') {
        console.log('Routing Result:', hasSeenWelcome ? 'dashboard' : 'welcome');
    } else if (role) {
        console.log('Routing Result:', hasSeenWelcome ? 'dashboard' : 'welcome');
    } else {
        console.log('Routing Result: select-role');
    }
}

checkUserProfile();
