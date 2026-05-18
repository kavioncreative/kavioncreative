
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://efrborampxloagtlphyf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcmJvcmFtcHhsb2FndGxwaHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MDg0MDYsImV4cCI6MjA4NDM4NDQwNn0.axCcmJDy-x-752VsC82_Qbg4YHJtsbQoQqNNCBYG188';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkChetan() {
  console.log('--- Checking Chetan Jhetwa Payout Config ---');
  
  const { data: users, error } = await supabase
    .from('profiles')
    .select('id, name, email, role, payout_strategy')
    .ilike('name', '%Chetan%');

  if (error || !users || users.length === 0) {
    console.log('User not found in remote DB. Checking projects for hints...');
    return;
  }

  console.table(users);
  
  // Also check projects assigned to him
  const userId = users[0].id;
  const { data: projects } = await supabase
    .from('projects')
    .select('order_id, price, designer_fee, team_designer_fee, team_designer_id, assignee_id')
    .or(`assignee_id.eq.${userId},team_designer_id.eq.${userId}`)
    .limit(5);

  if (projects) {
    console.log('\nProjects assigned to Chetan:');
    console.table(projects);
  }
}

checkChetan();
