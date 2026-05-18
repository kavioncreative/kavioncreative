
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://efrborampxloagtlphyf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcmJvcmFtcHhsb2FndGxwaHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MDg0MDYsImV4cCI6MjA4NDM4NDQwNn0.axCcmJDy-x-752VsC82_Qbg4YHJtsbQoQqNNCBYG188';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStatuses() {
    console.log('--- Logging in as Touseef ---');
    await supabase.auth.signInWithPassword({
        email: 'touseefahmed@codeslogic.com',
        password: '12345//'
    });

    const { data, error } = await supabase
        .from('projects')
        .select('status, funds_status, clearance_start_date, clearance_days');

    if (error) {
        console.error('Error fetching statuses:', error);
        return;
    }

    console.log(`Found ${data.length} projects.`);
    
    const counts = {};
    const funds_counts = {};
    data.forEach(p => {
        counts[p.status] = (counts[p.status] || 0) + 1;
        funds_counts[p.funds_status] = (funds_counts[p.funds_status] || 0) + 1;
    });

    console.log('Project Status Counts:');
    console.log(counts);
    console.log('Funds Status Counts:');
    console.log(funds_counts);

    const approvedWithClearance = data.filter(p => (p.status || '').toLowerCase().includes('approved') && p.clearance_start_date);
    console.log('Approved Projects with Clearance Start Date:', approvedWithClearance.length);
}

checkStatuses();
