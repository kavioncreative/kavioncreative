
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://efrborampxloagtlphyf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcmJvcmFtcHhsb2FndGxwaHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MDg0MDYsImV4cCI6MjA4NDM4NDQwNn0.axCcmJDy-x-752VsC82_Qbg4YHJtsbQoQqNNCBYG188'
);

async function checkTeams() {
  try {
    const { data, error } = await supabase
      .from('teams')
      .select('name');

    if (error) {
      console.error('Error:', error);
      return;
    }

    console.log('Existing teams:', data.map(t => t.name));
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

checkTeams();
