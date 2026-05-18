
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envData = fs.readFileSync('.env', 'utf8');
const envLines = envData.split('\n');
const env = {};
envLines.forEach(line => {
    if (line.includes('=')) {
        const parts = line.split('=');
        const k = parts[0].trim();
        const v = parts.slice(1).join('=').trim();
        env[k] = v;
    }
});

const supabase = createClient(env['VITE_SUPABASE_URL'], env['VITE_SUPABASE_ANON_KEY']);

async function checkAllData() {
    const { data: accounts } = await supabase.from('accounts').select('*');
    console.log('Total Accounts:', accounts?.length || 0);

    const { data: profiles } = await supabase.from('profiles').select('*');
    console.log('Total Profiles:', profiles?.length || 0);

    const { data: access } = await supabase.from('user_account_access').select('*');
    console.log('Total Access Records:', access?.length || 0);

    // Check if Sara exists in user table too
    const { data: users, error: uError } = await supabase.from('users').select('*');
    if (!uError) console.log('Total users in users table:', users.length);
}

checkAllData();
