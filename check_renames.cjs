
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://efrborampxloagtlphyf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcmJvcmFtcHhsb2FndGxwaHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MDg0MDYsImV4cCI6MjA4NDM4NDQwNn0.axCcmJDy-x-752VsC82_Qbg4YHJtsbQoQqNNCBYG188';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRenames() {
    console.log('Fetching logs...');
    const { data: logs, error } = await supabase
        .from('project_comments')
        .select('*')
        .contains('content', 'ID: ')
        .order('created_at', { ascending: false });
    
    if (error) {
        // contains might not work with partial matches in some versions of postgrest
        // falling back to ilike
        const { data: logs2, error: error2 } = await supabase
            .from('project_comments')
            .select('*')
            .ilike('content', '%ID: %→%')
            .order('created_at', { ascending: false });
        
        if (error2) {
             console.error('Error fetching logs:', error2);
             return;
        }
        processLogs(logs2);
    } else {
        processLogs(logs);
    }
}

function processLogs(logs) {
    if (!logs || logs.length === 0) {
        console.log('No ID change logs found.');
        return;
    }
    
    console.log('--- PROJECTS THAT WERE RENAMED ---');
    logs.forEach(log => {
        // Example: [Kashif] updated: ID: old-id → new-id | Title: ...
        const match = log.content.match(/ID:\s+(.*?)\s+→\s+(.*?)(?:\s+\||$)/);
        if (match) {
            console.log(`Date: ${log.created_at}`);
            console.log(`Original ID: ${match[1]}`);
            console.log(`New ID:      ${match[2]}`);
            console.log(`By:          ${log.author_name}`);
            console.log('-------------------');
        }
    });
}

checkRenames();
