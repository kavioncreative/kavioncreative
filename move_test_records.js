import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://efrborampxloagtlphyf.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcmJvcmFtcHhsb2FndGxwaHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MDg0MDYsImV4cCI6MjA4NDM4NDQwNn0.axCcmJDy-x-752VsC82_Qbg4YHJtsbQoQqNNCBYG188'
);

async function moveRecords() {
    console.log('Searching for pending clearance projects...');

    // 1. Find some projects that are 'Approved' but 'Pending' clearance
    const { data: projects, error: fetchError } = await supabase
        .from('projects')
        .select('project_id, project_title, assignee, designer_fee')
        .eq('status', 'Approved')
        .eq('funds_status', 'Pending')
        .limit(3);

    if (fetchError) {
        console.error('Error fetching projects:', fetchError);
        return;
    }

    if (!projects || projects.length === 0) {
        console.log('No pending projects found to move.');
        return;
    }

    console.log(`Found ${projects.length} projects. Moving to Cleared...`);

    // 2. Update them to 'Cleared' and set backdate for clearance
    const ids = projects.map(p => p.project_id);
    const { error: updateError } = await supabase
        .from('projects')
        .update({
            funds_status: 'Cleared',
            clearance_start_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString() // 15 days ago
        })
        .in('project_id', ids);

    if (updateError) {
        console.error('Error updating projects:', updateError);
    } else {
        console.log('Successfully moved records to Available Amount!');
        projects.forEach(p => {
            console.log(`- [${p.project_id}] ${p.project_title} for ${p.assignee} ($${p.designer_fee})`);
        });
    }
}

moveRecords();
