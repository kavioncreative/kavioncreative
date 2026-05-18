
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://efrborampxloagtlphyf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcmJvcmFtcHhsb2FndGxwaHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MDg0MDYsImV4cCI6MjA4NDM4NDQwNn0.axCcmJDy-x-752VsC82_Qbg4YHJtsbQoQqNNCBYG188';

const supabase = createClient(supabaseUrl, supabaseKey);

async function findOriginalIds() {
    console.log('Searching for original IDs in notifications...');
    
    const randomIds = [
        'MAN 759463', 'MAN 737925', 'MAN 855024', 'MAN 479509', 
        'MAN 274610', 'MAN 713374', 'MAN 673272', 'MAN 274562'
    ];
    
    for (const rid of randomIds) {
        // 1. Get current project info
        const { data: project } = await supabase
            .from('projects')
            .select('project_title, id')
            .eq('project_id', rid)
            .single();
            
        if (!project) continue;
        
        console.log(`\nAnalyzing [${rid}] - ${project.project_title}`);
        
        // 2. Search notifications for this project title
        const { data: notes } = await supabase
            .from('notifications')
            .select('*')
            .ilike('message', `%${project.project_title}%`)
            .order('created_at', { ascending: true });
            
        if (notes && notes.length > 0) {
            console.log('Found related notifications:');
            notes.forEach(n => {
                console.log(` - Content: ${n.message}`);
                console.log(` - Ref ID:  ${n.reference_id}`);
                console.log(` - Date:    ${n.created_at}`);
            });
        } else {
            console.log('No notifications found for this title.');
        }
    }
}

findOriginalIds();
