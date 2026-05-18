
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://efrborampxloagtlphyf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcmJvcmFtcHhsb2FndGxwaHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MDg0MDYsImV4cCI6MjA4NDM4NDQwNn0.axCcmJDy-x-752VsC82_Qbg4YHJtsbQoQqNNCBYG188'
);

async function checkTeamsTable() {
  try {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Error fetching from teams:', error);
    } else {
      console.log('Columns in teams table:', Object.keys(data[0] || {}));
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

checkTeamsTable();
