
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function run() {
    console.log('--- CHECKING INVITATIONS ---');
    const { data: invites, error: inviteError } = await supabase.from('member_invitations').select('*');
    if (inviteError) console.error('Invite Error:', inviteError);
    else {
        console.log('Invites:', invites);
    }

    console.log('\n--- CHECKING PROFILES ---');
    const { data: profiles, error: profileError } = await supabase.from('profiles').select('*');
    if (profileError) console.error('Profile Error:', profileError);
    else {
        console.log('Profiles Found:', profiles.length);
        profiles.forEach(p => console.log(`- ${p.email} (${p.name})`));
    }
}

run();
