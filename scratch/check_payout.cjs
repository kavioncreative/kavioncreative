
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://efrborampxloagtlphyf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcmJvcmFtcHhsb2FndGxwaHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MDg0MDYsImV4cCI6MjA4NDM4NDQwNn0.axCcmJDy-x-752VsC82_Qbg4YHJtsbQoQqNNCBYG188';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRules() {
  console.log('--- Checking ALL Payout Rules ---');
  const { data: rules, error } = await supabase
    .from('payout_rules')
    .select('*');

  if (error) {
    console.error('Error:', error);
  } else {
    console.table(rules);
  }
  
  console.log('--- Checking Project Specifics ---');
  const { data: projects, error: pErr } = await supabase
    .from('projects')
    .select('id, price, designer_fee, order_id')
    .ilike('order_id', '%459479%');
    
  if (pErr) console.error('P Error:', pErr);
  else console.table(projects);
}

checkRules();
