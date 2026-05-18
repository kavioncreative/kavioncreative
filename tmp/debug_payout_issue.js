
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://efrborampxloagtlphyf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcmJvcmFtcHhsb2FndGxwaHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MDg0MDYsImV4cCI6MjA4NDM4NDQwNn0.axCcmJDy-x-752VsC82_Qbg4YHJtsbQoQqNNCBYG188';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkRevisionProjects() {
    console.log('--- Searching for projects with status: Revision ---');
    // Search for the specific project from the screenshot
  const { data: projects, error: projectError } = await supabase
    .from('projects')
    .select('project_id, project_title, status, assignee, price, designer_fee, team_designer_id, team_designer_fee')
    .eq('project_id', 'MAN 217459');

  if (projectError) {
    console.error('Error searching for project:', projectError.message);
  } else {
    console.log('Project Matches:', projects);
  }

  // Search for Zeeshan Alam's profile to check his role
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, name, role, email')
    .ilike('name', '%Zeeshan%');

  if (profileError) {
    console.error('Error searching for profiles:', profileError.message);
  } else {
    console.log('Profile Matches:', profiles);
  }
}

checkRevisionProjects();
