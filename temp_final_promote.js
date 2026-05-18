
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function run() {
    // 1. Ensure Super Admin exists in roles
    console.log('--- SYNCING ROLES ---');
    const { data: roles } = await supabase.from('roles').select('name');
    if (!roles?.some(r => r.name === 'Super Admin')) {
        console.log('Creating Super Admin role...');
        await supabase.from('roles').insert({ name: 'Super Admin', description: 'Maximum system authority' });
    }

    // 2. Search for Kashif in all profiles
    console.log('\n--- SEARCHING FOR KASHIF ---');
    const { data: allProfiles, error: fetchError } = await supabase
        .from('profiles')
        .select('id, name, email, role');

    if (fetchError) {
        console.error('Fetch Error:', fetchError);
        return;
    }

    const kashif = allProfiles?.find(p =>
        (p.name?.toLowerCase().includes('kashif')) ||
        (p.email?.toLowerCase().includes('kashif'))
    );

    if (kashif) {
        console.log(`Found: ${kashif.name} | ${kashif.email} | Current Role: ${kashif.role}`);
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ role: 'Super Admin' })
            .eq('id', kashif.id);

        if (updateError) console.error('Update Error:', updateError);
        else console.log('Successfully promoted Kashif to Super Admin!');
    } else {
        console.log('Kashif not found in profiles. Please provide an email or ID.');
        console.log('Profiles currently in system:', allProfiles?.length || 0);
        allProfiles?.forEach(p => console.log(`- ${p.name} (${p.email})` || 'Anonymous'));
    }
}

run();
