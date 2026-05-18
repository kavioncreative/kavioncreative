
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function run() {
    console.log('--- ATTEMPTING DIRECT UPDATE BY EMAIL ---');
    const { data, error } = await supabase
        .from('profiles')
        .update({ role: 'Super Admin' })
        .eq('email', 'kashif@test.com')
        .select();

    if (error) {
        console.error('Update Error:', error);
    } else {
        console.log('Update Result:', data);
        if (data && data.length > 0) {
            console.log('Successfully updated Kashif!');
        } else {
            console.log('Update affected 0 rows. User might not exist or RLS blocked it.');
        }
    }
}

run();
