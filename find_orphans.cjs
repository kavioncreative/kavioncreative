
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://efrborampxloagtlphyf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcmJvcmFtcHhsb2FndGxwaHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MDg0MDYsImV4cCI6MjA4NDM4NDQwNn0.axCcmJDy-x-752VsC82_Qbg4YHJtsbQoQqNNCBYG188';

const supabase = createClient(supabaseUrl, supabaseKey);

async function findOrphans() {
    console.log('Finding orphaned comments...');
    
    // 1. Get all project IDs from projects table
    const { data: projects, error: pError } = await supabase.from('projects').select('project_id');
    if (pError) { console.error(pError); return; }
    const validIds = new Set(projects.map(p => p.project_id));
    
    // 2. Get all distinct project IDs from comments table
    const { data: commentIds, error: cError } = await supabase.from('project_comments').select('project_id');
    if (cError) { console.error(cError); return; }
    
    const orphans = new Set();
    commentIds.forEach(c => {
        if (!validIds.has(c.project_id)) {
            orphans.add(c.project_id);
        }
    });
    
    if (orphans.size === 0) {
        console.log('No orphaned comments found. references are intact.');
    } else {
        console.log('--- ORPHANED PROJECT IDS FOUND ---');
        console.log('These IDs exist in comments but NOT in projects table:');
        orphans.forEach(id => console.log(` - ${id}`));
        console.log('\nThis suggests these projects were renamed but the references did not follow.');
    }
}

findOrphans();
