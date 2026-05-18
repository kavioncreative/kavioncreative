
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Try to find .env file
const envPath = path.join(process.cwd(), '.env');
const envLocalPath = path.join(process.cwd(), '.env.local');
let envFile = fs.existsSync(envLocalPath) ? envLocalPath : envPath;

dotenv.config({ path: envFile });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase URL or Key missing in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAdmins() {
    const { data, error } = await supabase
        .from('profiles')
        .select('id, email, role, status')
        .ilike('role', 'admin');

    if (error) {
        console.error('Error fetching admins:', error);
    } else {
        console.log('Admins in database:');
        console.table(data);
    }
}

checkAdmins();
