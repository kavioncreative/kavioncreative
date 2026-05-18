
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function run() {
    console.log('--- FETCHING ROLES ---');
    const { data: roles, error: rolesError } = await supabase.from('roles').select('*');
    if (rolesError) console.error('Roles Error:', rolesError);
    else console.log('Roles:', roles);

    console.log('\n--- FETCHING KASHIF ---');
    // Searching for Kashif
    const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id, email, name, role')
        .or('name.ilike.%Kashif%,email.ilike.%Kashif%');

    if (usersError) console.error('Users Error:', usersError);
    else console.log('Found Users:', users);

    if (users && users.length > 0) {
        const kashif = users[0];
        console.log(`\nPromoting ${kashif.name} (${kashif.email}) to Super Admin...`);

        // Ensure Super Admin exists in roles table
        const superAdminExists = roles?.some(r => r.name === 'Super Admin');
        if (!superAdminExists) {
            console.log('Creating Super Admin role...');
            await supabase.from('roles').insert({ name: 'Super Admin', description: 'Maximum access level' });
        }

        const { error: updateError } = await supabase
            .from('profiles')
            .update({ role: 'Super Admin' })
            .eq('id', kashif.id);

        if (updateError) console.error('Update Error:', updateError);
        else console.log('Success! Role updated.');
    } else {
        console.log('Kashif not found.');
    }
}

run();
