
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://efrborampxloagtlphyf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcmJvcmFtcHhsb2FndGxwaHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MDg0MDYsImV4cCI6MjA4NDM4NDQwNn0.axCcmJDy-x-752VsC82_Qbg4YHJtsbQoQqNNCBYG188';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function findUnassigned() {
    try {
        // 1. Get freelancers
        const { data: freelancers, error: fError } = await supabase
            .from('profiles')
            .select('name, email')
            .ilike('role', '%freelancer%');

        if (fError) throw fError;

        const freelancerNames = new Set(freelancers.map(f => (f.name || '').toLowerCase()));
        const freelancerEmails = new Set(freelancers.map(f => (f.email || '').toLowerCase()));

        // 2. Get active projects (In Progress or Urgent)
        const { data: projects, error: pError } = await supabase
            .from('projects')
            .select('project_id, assignee, status')
            .in('status', ['In Progress', 'Urgent']);

        if (pError) throw pError;

        const unassigned = projects.filter(p => {
            if (!p.assignee) return true;
            const assigneeLower = p.assignee.toLowerCase();
            return !freelancerNames.has(assigneeLower) && !freelancerEmails.has(assigneeLower);
        });

        console.log(`Found ${unassigned.length} unassigned/other projects:`);
        unassigned.forEach(p => {
            console.log(`ID: ${p.project_id} | Assignee: ${p.assignee || 'NONE'} | Status: ${p.status}`);
        });

    } catch (error) {
        console.error('Error:', error.message);
    }
}

findUnassigned();
