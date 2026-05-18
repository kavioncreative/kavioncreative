import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

async function run() {
    const envContent = fs.readFileSync('.env', 'utf8');
    const env = {};
    envContent.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) env[parts[0].trim()] = parts.slice(1).join('=').trim();
    });

    const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
    
    console.log('--- ACCOUNTS ---');
    const { data: accounts } = await supabase.from('accounts').select('id, name, prefix, created_at').order('name');
    console.log(JSON.stringify(accounts, null, 2));

    console.log('\n--- PROFILES ---');
    const { data: profiles } = await supabase.from('profiles').select('id, name, role').or('name.ilike.%Arshiya%,name.ilike.%Abdul%,name.ilike.%Mansoor%');
    console.log(JSON.stringify(profiles, null, 2));
}

run();
