
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function run() {
    const email = 'sara@test.com';
    console.log(`--- CHECKING FOR USER: ${email} ---`);

    // Check profiles
    const { data: profile, error: pError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email);

    if (pError) console.error('Profile Check Error:', pError);
    else console.log('Profile Record:', profile);

    if (profile && profile.length === 0) {
        console.log('\nResult: User is NOT in the "profiles" table.');
        console.log('Reason: The previous attempt created the AUTH account but failed to create the PROFILE due to RLS.');
        console.log('Action: Go to Supabase Dashboard -> Authentication -> Users, and delete "sara@test.com" manually. Then try again with the new fix I applied.');
    }
}

run();
