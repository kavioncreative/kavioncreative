import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://efrborampxloagtlphyf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcmJvcmFtcHhsb2FndGxwaHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MDg0MDYsImV4cCI6MjA4NDM4NDQwNn0.axCcmJDy-x-752VsC82_Qbg4YHJtsbQoQqNNCBYG188';

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
    }
});

const emails = [
    'poweredbykashif@gmail.com',     // Super Admin
    'mansoorulhassan83@gmail.com',  // Super Admin
    'saliskhan@codeslogic.com',     // Admin
    'zarakhan@codeslogic.com',      // PM
    'hyderaliazhar@codeslogic.com', // PM
    'saima@codeslogic.com',         // Finance Manager
    'accengsol@gmail.com'           // PM
];

async function run() {
    for (const email of emails) {
        console.log(`\nTrying login for: ${email}`);
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: email,
            password: '12345//'
        });

        if (authError) {
            console.log(`  Login FAILED: ${authError.message}`);
        } else {
            console.log(`  Login SUCCESS! User ID: ${authData.user.id}`);
            
            // Fetch profile
            const { data: profile } = await supabase.from('profiles').select('role').eq('id', authData.user.id).single();
            console.log(`  Profile Role: ${profile?.role}`);

            // Fetch projects count
            const { count, error: projErr } = await supabase.from('projects').select('*', { count: 'exact', head: true });
            if (projErr) console.log(`  Projects fetch error: ${projErr.message}`);
            else console.log(`  Visible projects count: ${count}`);
            
            // Clean up session
            await supabase.auth.signOut();
        }
    }
}

run();
