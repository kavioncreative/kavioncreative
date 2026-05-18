
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://efrborampxloagtlphyf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcmJvcmFtcHhsb2FndGxwaHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MDg0MDYsImV4cCI6MjA4NDM4NDQwNn0.axCcmJDy-x-752VsC82_Qbg4YHJtsbQoQqNNCBYG188';

const supabase = createClient(supabaseUrl, supabaseKey);

async function findTheRootCause() {
  console.log('--- Diagnosing Low Payout Issues ---');
  
  // 1. Fetch the problematic users
  const { data: users, error: uErr } = await supabase
    .from('profiles')
    .select('id, name, email, payout_strategy, fixed_payout_rate')
    .or('name.ilike.%Chetan%,name.ilike.%Sumaira%');

  if (uErr) {
    console.error('Error fetching users:', uErr);
    return;
  }
  console.log('Problematic Users:');
  console.table(users);

  // 2. Fetch the problematic projects
  const orderIds = ['MAN 900077', 'MAN 900014', 'MAN 900063'];
  const { data: projects, error: pErr } = await supabase
    .from('projects')
    .select('*');

  if (pErr) {
    console.error('Error fetching projects:', pErr);
    return;
  }

  const targetProjects = projects.filter(p => 
    (p.order_id && orderIds.some(id => p.order_id.includes(id))) ||
    (p.project_id && orderIds.some(id => p.project_id.includes(id))) ||
    (p.id && orderIds.some(id => p.id.toString().includes(id)))
  );

  console.log('\nTarget Projects Data:');
  targetProjects.forEach(p => {
      console.log(`Order: ${p.order_id || p.project_id}, Price: ${p.price}, Fee: ${p.designer_fee}, Assignee ID: ${p.assignee_id}`);
  });

  // 3. Check for any other users with low payouts
  const lowPayouts = projects.filter(p => parseFloat(p.designer_fee) > 0 && parseFloat(p.designer_fee) < 3);
  console.log(`\nFound ${lowPayouts.length} projects with payouts < $3 (potential issues)`);
  if (lowPayouts.length > 0) {
      console.log('Sample Low Payouts (first 5):');
      console.table(lowPayouts.slice(0, 5).map(p => ({
          order_id: p.order_id || p.project_id,
          assignee: p.assignee,
          price: p.price,
          fee: p.designer_fee
      })));
  }
}

findTheRootCause();
