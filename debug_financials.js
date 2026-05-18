
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

async function checkSlabsAndProject() {
    // 1. Check Pricing Slabs
    const { data: slabs, error: sError } = await supabase.from('pricing_slabs').select('*');
    console.log('--- PRICING SLABS ---');
    if (sError) console.error(sError);
    else console.log(JSON.stringify(slabs, null, 2));

    // 2. Check the Project in question
    const projectId = 'AR5-101307';
    const { data: project, error: pError } = await supabase
        .from('projects')
        .select('*')
        .or(`project_id.eq."${projectId}",project_id.eq."${projectId.replace(/-/g, ' ')}"`)
        .single();

    console.log('\n--- PROJECT DETAILS ---');
    if (pError) console.error(pError);
    else console.log(JSON.stringify(project, null, 2));

    // 3. Check Platform Commissions for this account
    if (project?.account_id) {
        const { data: comms, error: cError } = await supabase
            .from('platform_commission_accounts')
            .select('platform_commission_id, platform_commissions(*)')
            .eq('account_id', project.account_id);

        console.log('\n--- PLATFORM COMMISSIONS ---');
        if (cError) console.error(cError);
        else console.log(JSON.stringify(comms, null, 2));
    }
}

checkSlabsAndProject();
