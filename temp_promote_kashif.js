
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function run() {
    const targetEmail = 'kashif@test.com';
    const targetId = '04b9236d-5924-4fd4-adeb-873e7baeb8d5';

    console.log(`--- TARGETING ${targetEmail} / ${targetId} ---`);

    // 1. Try to find by email
    const { data: byEmail, error: errorEmail } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', targetEmail);

    console.log('Search by Email result:', byEmail);
    if (errorEmail) console.error('Error by Email:', errorEmail);

    // 2. Try to find by ID
    const { data: byId, error: errorId } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetId);

    console.log('Search by ID result:', byId);
    if (errorId) console.error('Error by ID:', errorId);

    // 3. If found, update
    const user = (byEmail && byEmail[0]) || (byId && byId[0]);
    if (user) {
        console.log(`Found user: ${user.name} (${user.email}). Promoting...`);
        const { data: updateData, error: updateError } = await supabase
            .from('profiles')
            .update({ role: 'Super Admin' })
            .eq('id', user.id)
            .select();

        if (updateError) console.error('Update Error:', updateError);
        else console.log('Update Successful:', updateData);
    } else {
        console.log('User not found in profiles table using either Email or ID.');

        // 4. Check if we can see ANY data in ANY table to confirm connectivity
        const { data: sampleTask, error: sampleError } = await supabase.from('projects').select('id').limit(1);
        console.log('Sample connectivity check (projects):', sampleTask ? 'Success' : 'Failed', sampleError || '');
    }
}

run();
