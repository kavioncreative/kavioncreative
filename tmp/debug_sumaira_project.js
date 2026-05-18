
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://efrborampxloagtlphyf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcmJvcmFtcHhsb2FndGxwaHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MDg0MDYsImV4cCI6MjA4NDM4NDQwNn0.axCcmJDy-x-752VsC82_Qbg4YHJtsbQoQqNNCBYG188'
);

async function checkProject() {
  // 1. Get Project Details
  const { data: project, error: pError } = await supabase
    .from('projects')
    .select('*')
    .eq('project_id', 'GHA 164979')
    .single();

  if (pError) {
    console.error('Error fetching project:', pError);
  } else {
    console.log('Project Details:', JSON.stringify(project, null, 2));
  }

  // 2. Get Sumaira Khan's Profile
  const { data: profile, error: prError } = await supabase
    .from('profiles')
    .select('*')
    .ilike('name', '%Sumaira Khan%')
    .single();

  if (prError) {
    console.error('Error fetching Sumaira profile:', prError);
  } else {
    console.log('Sumaira Profile:', JSON.stringify(profile, null, 2));
  }

  // 3. Check Collaborators
  if (project) {
    const { data: collaborators, error: cError } = await supabase
      .from('project_collaborators')
      .select('*')
      .eq('project_id', project.id);
    
    if (cError) {
      console.error('Error fetching collaborators:', cError);
    } else {
      console.log('Collaborators:', JSON.stringify(collaborators, null, 2));
    }
  }
}

checkProject();
