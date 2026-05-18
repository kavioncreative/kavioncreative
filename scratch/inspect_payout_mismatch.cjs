
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://efrborampxloagtlphyf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcmJvcmFtcHhsb2FndGxwaHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MDg0MDYsImV4cCI6MjA4NDM4NDQwNn0.axCcmJDy-x-752VsC82_Qbg4YHJtsbQoQqNNCBYG188';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectProject() {
  console.log('--- Inspecting Project MAN 900063 Raw Data ---');
  
  const { data: projects, error } = await supabase
    .from('projects')
    .select('*');

  if (error) {
    console.error('Error:', error);
    return;
  }

  const project = projects.find(p => p.order_id === 'MAN 900063' || (p.project_id && p.project_id.includes('900063')));

  if (!project) {
    console.log('Project MAN 900063 not found.');
    return;
  }

  console.log('PROJECT COLUMNS:');
  console.log({
      order_id: project.order_id,
      price: project.price,
      designer_fee: project.designer_fee,
      team_payout: project.team_payout,
      team_designer_fee: project.team_designer_fee,
      assignee_id: project.assignee_id,
      team_designer_id: project.team_designer_id,
      assignee: project.assignee
  });

  if (project.assignee_id) {
    const { data: profile } = await supabase.from('profiles').select('name, role, payout_strategy').eq('id', project.assignee_id).single();
    console.log('\nAssignee Profile:', profile);
  }
}

inspectProject();
