
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkTeams() {
  const { data, error } = await supabase
    .from('teams')
    .select('name');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Existing teams:', data.map(t => t.name));
}

checkTeams();
