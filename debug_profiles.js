
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envData = fs.readFileSync('.env', 'utf8');
const envLines = envData.split('\n');
const env = {};
envLines.forEach(line => {
    const [key, value] = line.split('=');
    if (line.includes('=')) {
        const parts = line.split('=');
        const k = parts[0].trim();
        const v = parts.slice(1).join('=').trim();
        env[k] = v;
    }
});

const supabase = createClient(env['VITE_SUPABASE_URL'], env['VITE_SUPABASE_ANON_KEY']);

async function checkCount() {
    const { count, error } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
    if (error) console.error('Supabase Error:', error);
    console.log(`Profiles Count: ${count}`);

    const { data: profiles } = await supabase.from('profiles').select('*');
    console.log('Raw Profiles Data:', JSON.stringify(profiles, null, 2));
}

checkCount();
