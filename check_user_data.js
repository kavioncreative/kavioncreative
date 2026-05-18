// Quick script to check user data structure
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function checkUserData() {
    const { data, error } = await supabase
        .from('profiles')
        .select('id, name, first_name, last_name, email, role')
        .limit(10);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('User Data Structure:');
    console.log(JSON.stringify(data, null, 2));

    // Check specifically for users with only name field
    const usersWithOnlyName = data.filter(u => u.name && (!u.first_name || !u.last_name));
    console.log('\n\nUsers with only "name" field (no first_name/last_name):');
    console.log(JSON.stringify(usersWithOnlyName, null, 2));
}

checkUserData();
