
import { createClient } from '@supabase/supabase-js';
const url = "https://efrborampxloagtlphyf.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcmJvcmFtcHhsb2FndGxwaHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MDg0MDYsImV4cCI6MjA4NDM4NDQwNn0.axCcmJDy-x-752VsC82_Qbg4YHJtsbQoQqNNCBYG188";

const supabase = createClient(url, key);

async function findProject() {
    // Search in projects_with_collaborators since we know it has data
    const { data, error } = await supabase.from('projects_with_collaborators').select('*').limit(5);
    console.log('Sample from view:', data?.map(p => p.project_id));

    // Search for a specific one from the view in the projects table
    if (data && data.length > 0) {
        const id = data[0].project_id;
        console.log('Searching for ID in projects table:', id);
        const { data: pData, error: pError } = await supabase.from('projects').select('*').eq('project_id', id);
        console.log('Projects table result:', pData, 'Error:', pError?.message);
    }
}

findProject();
