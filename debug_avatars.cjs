
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function run() {
    const envContent = fs.readFileSync('.env', 'utf8');
    const url = envContent.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
    const key = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

    const supabase = createClient(url, key);

    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('name, avatar_url');

    if (error) console.error(error);
    else console.log('Profiles data:', JSON.stringify(profiles, null, 2));
}

run();
