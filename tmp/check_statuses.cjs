
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://efrborampxloagtlphyf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcmJvcmFtcHhsb2FndGxwaHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MDg0MDYsImV4cCI6MjA4NDM4NDQwNn0.axCcmJDy-x-752VsC82_Qbg4YHJtsbQoQqNNCBYG188';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStatuses() {
    const { data, error } = await supabase
        .from('projects')
        .select('status');

    if (error) {
        console.error('Error fetching statuses:', error);
        return;
    }

    const counts = {};
    data.forEach(p => {
        counts[p.status] = (counts[p.status] || 0) + 1;
    });

    console.log('Project Status Counts:');
    console.log(counts);
}

checkStatuses();
