
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import process from 'process';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkTeamsTable() {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error fetching from teams:', error);
  } else {
    console.log('Columns in teams table:', Object.keys(data[0] || {}));
  }
}

checkTeamsTable();
