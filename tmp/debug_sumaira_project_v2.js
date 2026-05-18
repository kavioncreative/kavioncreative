
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://efrborampxloagtlphyf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcmJvcmFtcHhsb2FndGxwaHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MDg0MDYsImV4cCI6MjA4NDM4NDQwNn0.axCcmJDy-x-752VsC82_Qbg4YHJtsbQoQqNNCBYG188'
);

async function checkProject() {
  console.log('--- Projects ---');
  const { data: projects, error: pError } = await supabase
    .from('projects')
    .select('id, project_id, project_title, status, assignee, assignee_id, team_designer_id')
    .ilike('project_id', '%164979%');

  if (pError) console.error('PError:', pError);
  console.log(JSON.stringify(projects, null, 2));

  console.log('--- Profiles ---');
  const { data: profiles, error: prError } = await supabase
    .from('profiles')
    .select('id, name, email, role')
    .ilike('name', '%Sumaira%');

  if (prError) console.error('PrError:', prError);
  console.log(JSON.stringify(profiles, null, 2));

  // Also check project collaborators if project found
  if (projects?.[0]) {
    console.log('--- Collaborators ---');
    const { data: collaborators } = await supabase
      .from('project_collaborators')
      .select('*')
      .eq('project_id', projects[0].id);
    console.log(JSON.stringify(collaborators, null, 2));
  }
}

checkProject();
