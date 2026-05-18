
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envLines = fs.readFileSync('.env', 'utf8').split('\n');
const env = {};
envLines.forEach(line => {
    if (line.includes('=')) {
        const parts = line.split('=');
        env[parts[0].trim()] = parts[1].trim();
    }
});

const supabase = createClient(env['VITE_SUPABASE_URL'], env['VITE_SUPABASE_ANON_KEY']);

async function findAnything() {
    // Try to count instead of select
    const { count, error } = await supabase.from('projects').select('*', { count: 'exact', head: true });
    console.log('Total Projects Count:', count);
    if (error) console.error('Error counting projects:', error);

    const { data: latest } = await supabase.from('projects').select('project_id, price, designer_fee, account_id').order('created_at', { ascending: false }).limit(1);
    console.log('Latest Project:', latest);
}

findAnything();
