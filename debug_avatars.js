
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env file
const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envLines = envContent.split('\n');

const getEnv = (key) => {
    const line = envLines.find(l => l.startsWith(key + '='));
    return line ? line.split('=')[1].trim() : null;
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseKey = getEnv('VITE_SUPABASE_ANON_KEY');

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUsers() {
    const { data, error } = await supabase
        .from('profiles')
        .select('name, email, avatar_url');

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(JSON.stringify(data, null, 2));
}

checkUsers();
