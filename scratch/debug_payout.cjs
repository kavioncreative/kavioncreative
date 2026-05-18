
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://efrborampxloagtlphyf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcmJvcmFtcHhsb2FndGxwaHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MDg0MDYsImV4cCI6MjA4NDM4NDQwNn0.axCcmJDy-x-752VsC82_Qbg4YHJtsbQoQqNNCBYG188';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugProject() {
  console.log('--- Searching for Project YOU 459479 ---');
  
  // Try to find project by various possible columns
  const { data: projects, error } = await supabase
    .from('projects')
    .select('*');

  if (error) {
    console.error('Error fetching projects:', error);
    return;
  }

  // Manually find the one that looks like YOU 459479
  const project = projects.find(p => 
    (p.order_id && p.order_id.includes('459479')) || 
    (p.project_id && p.project_id.includes('459479')) ||
    (p.id && p.id.toString().includes('459479'))
  );

  if (!project) {
    console.log('Project not found in the first batch of projects.');
    console.log('Sample project data to see column names:', JSON.stringify(projects[0], null, 2));
    return;
  }

  console.log('MATCHED PROJECT DATA:');
  console.log(JSON.stringify(project, null, 2));

  if (project.assignee_id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('name, email, payout_strategy, fixed_payout_rate')
      .eq('id', project.assignee_id)
      .single();
    
    console.log('ASSIGNEE PROFILE:');
    console.log(JSON.stringify(profile, null, 2));
  }

  console.log('ACTIVE PAYOUT RULES:');
  const { data: rules } = await supabase.from('payout_rules').select('*').eq('is_active', true);
  console.table(rules);
}

debugProject();
