
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://efrborampxloagtlphyf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcmJvcmFtcHhsb2FndGxwaHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MDg0MDYsImV4cCI6MjA4NDM4NDQwNn0.axCcmJDy-x-752VsC82_Qbg4YHJtsbQoQqNNCBYG188';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkClearanceAges() {
    console.log('--- Logging in as Touseef ---');
    await supabase.auth.signInWithPassword({
        email: 'touseefahmed@codeslogic.com',
        password: '12345//'
    });

    const { data: projects, error } = await supabase
        .from('projects')
        .select('project_id, status, funds_status, clearance_start_date, clearance_days')
        .not('clearance_start_date', 'is', null);

    if (error) {
        console.error('Error fetching projects:', error);
        return;
    }

    const now = new Date();
    const results = projects.map(p => {
        const startDate = new Date(p.clearance_start_date);
        const diffTime = Math.abs(now - startDate);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const daysLeft = Math.max(0, (p.clearance_days || 14) - diffDays);
        return {
            id: p.project_id,
            start: p.clearance_start_date,
            daysPassed: diffDays,
            daysLeft: daysLeft
        };
    });

    console.log('Sample Projects Clearance Age:');
    console.log(JSON.stringify(results.slice(0, 10), null, 2));

    const totalWithDaysLeftLessThan14 = results.filter(r => r.daysLeft < 14).length;
    console.log('Total projects with Days Left < 14:', totalWithDaysLeftLessThan14);
}

checkClearanceAges();
