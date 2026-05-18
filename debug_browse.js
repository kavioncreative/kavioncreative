
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

async function browseAll() {
    const { data: projects } = await supabase.from('projects').select('*').limit(5);
    console.log(`- PROJECTS found: ${projects?.length || 0}`);
    projects?.forEach(p => console.log(`Project ID: ${p.project_id}, Price: ${p.price}, Fee: ${p.designer_fee}`));

    const { data: slabs } = await supabase.from('pricing_slabs').select('*');
    console.log(`- SLABS found: ${slabs?.length || 0}`);
}

browseAll();
