
import { createClient } from '@supabase/supabase-js';

// V2 node --env-file will populate process.env
const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function run() {
    const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id, email, name, role');

    if (usersError) {
        console.error('Users Error:', JSON.stringify(usersError, null, 2));
    } else {
        console.log('User List Count:', users.length);
        users.forEach(u => {
            console.log(`ID: ${u.id} | Email: ${u.email} | Name: ${u.name} | Role: ${u.role}`);
        });
    }
}

run();
