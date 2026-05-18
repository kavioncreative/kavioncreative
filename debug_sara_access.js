
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Helper to manually read .env file
const envData = fs.readFileSync('.env', 'utf8');
const envLines = envData.split('\n');
const env = {};
envLines.forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        env[key.trim()] = value.trim();
    }
});

const supabase = createClient(env['VITE_SUPABASE_URL'], env['VITE_SUPABASE_ANON_KEY']);

async function diagnose() {
    const email = 'sara.khan.pm@gmail.com';

    const { data: profile, error: pError } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('email', email)
        .single();

    if (pError || !profile) {
        console.log(`Profile not found for ${email}`);
        return;
    }

    console.log(`User ID: ${profile.id}, Role: ${profile.role}`);

    const { data: access, error: aError } = await supabase
        .from('user_account_access')
        .select('*')
        .eq('user_id', profile.id);

    if (aError) {
        console.error('Error checking user_account_access:', aError.message);
    } else {
        console.log(`Access Records Count: ${access?.length || 0}`);
        if (access && access.length > 0) {
            console.log('Account IDs Found:', access.map(a => a.account_id));
        }
    }

    const { count } = await supabase.from('accounts').select('*', { count: 'exact', head: true });
    console.log(`Total System Accounts: ${count}`);
}

diagnose();
