
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

async function fixSlabs() {
    console.log('--- ENABLING PRICING SLABS ---');
    // Using service role key or higher would be better if RLS blocks this, 
    // but typically these tables should be editable by admins.
    // However, I'll try with the anon/provided key.
    const { data, error } = await supabase
        .from('pricing_slabs')
        .update({ is_active: true })
        .eq('is_active', false);

    if (error) {
        console.error('Error updating pricing slabs:', error);
    } else {
        console.log('Success: All pricing slabs are now active.');
    }

    // Attempt to recalculate fees for existing projects if they are 0
    const { data: projects, error: pErr } = await supabase
        .from('projects')
        .select('project_id, price')
        .or('designer_fee.eq.0,designer_fee.is.null');

    if (projects && projects.length > 0) {
        console.log(`Found ${projects.length} projects with 0 fee. Triggering recalculation...`);
        for (const project of projects) {
            // Updating the price to itself should trigger the (updated) trigger if we applied the SQL
            await supabase.from('projects').update({ price: project.price }).eq('project_id', project.project_id);
        }
    }
}

fixSlabs();
