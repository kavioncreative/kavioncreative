
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://efrborampxloagtlphyf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcmJvcmFtcHhsb2FndGxwaHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MDg0MDYsImV4cCI6MjA4NDM4NDQwNn0.axCcmJDy-x-752VsC82_Qbg4YHJtsbQoQqNNCBYG188';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkOrLogic() {
    try {
        // Query as freelancer
        const { data: profiles } = await supabase.from('profiles').select('id, name, email').ilike('role', '%freelancer%').limit(1);
        const profile = profiles[0];

        // Normal Or String:
        let filterStr = `assignee.eq."${profile.name}",assignee.eq."${profile.email}"`;
        
        let query = supabase.from('projects').select('project_id, assignee').or(filterStr).neq('status', 'Removed');
        
        const { data, error } = await query;
        console.log(`For Freelancer ${profile.name}: Found ${data?.length} projects via strictly assignee filtering`);
        
        if (data && data.length > 0) {
            console.log(data.slice(0, 2));
        }

        // What if we do the API call that the `Projects.tsx` table uses?
        // Note projects_with_collaborators!
        const { data: vwData, error: vwErr } = await supabase.from('projects_with_collaborators').select('project_id, assignee').or(filterStr).neq('status', 'Removed');
        
        console.log(`For Freelancer ${profile.name}: Found ${vwData?.length || 0} via projects_with_collaborators`);
        if (vwErr) console.error("View error:", vwErr.message);
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkOrLogic();
