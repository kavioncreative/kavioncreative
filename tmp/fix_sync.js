
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://efrborampxloagtlphyf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcmJvcmFtcHhsb2FndGxwaHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MDg0MDYsImV4cCI6MjA4NDM4NDQwNn0.axCcmJDy-x-752VsC82_Qbg4YHJtsbQoQqNNCBYG188';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspectData() {
    try {
        const { data: profiles } = await supabase.from('profiles').select('id, name, email, role');
        const { data: projects } = await supabase.from('projects').select('project_id, assignee, status').neq('assignee', '').not('assignee', 'is', null);

        console.log("Total Profiles:", profiles.length);
        console.log("Total Assigned Projects:", projects.length);

        const profileNames = new Map();
        profiles.forEach(p => {
            if (p.name) profileNames.set(p.name.trim().toLowerCase(), p.name);
        });

        const exactNames = new Set(profiles.map(p => p.name));

        let mismatches = 0;
        let nullAssignees = 0;
        let notFound = 0;

        for (const p of projects) {
            if (!p.assignee) {
                nullAssignees++;
                continue;
            }
            if (!exactNames.has(p.assignee)) {
                // Not an exact match!
                const lower = p.assignee.trim().toLowerCase();
                if (profileNames.has(lower)) {
                    mismatches++;
                    console.log(`Mismatch (Case/Space): DB="${p.assignee}" Profile="${profileNames.get(lower)}" ID="${p.project_id}"`);
                } else {
                    notFound++;
                    console.log(`Not Found in Profiles: "${p.assignee}" ID="${p.project_id}"`);
                }
            }
        }
        console.log(`Mismatches: ${mismatches}, Not Found: ${notFound}, Empty: ${nullAssignees}`);

    } catch (e) {
        console.log(e);
    }
}
inspectData();
