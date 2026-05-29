import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://efrborampxloagtlphyf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcmJvcmFtcHhsb2FndGxwaHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MDg0MDYsImV4cCI6MjA4NDM4NDQwNn0.axCcmJDy-x-752VsC82_Qbg4YHJtsbQoQqNNCBYG188';

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
    }
});

async function run() {
    await supabase.auth.signInWithPassword({
        email: 'touseefahmed@codeslogic.com',
        password: '12345//'
    });

    console.log('Fetching projects and checking dates...');
    const { data: projects, error } = await supabase.from('projects').select('project_id, created_at, status');
    if (error) {
        console.error(error);
        return;
    }

    console.log('Total projects:', projects.length);

    const may2026Start = new Date(2026, 4, 1, 0, 0, 0, 0); // May is index 4
    const may2026End = new Date(2026, 4, 31, 23, 59, 59, 999);

    const mayProjects = [];
    const otherProjects = [];

    projects.forEach(p => {
        const d = new Date(p.created_at);
        if (d >= may2026Start && d <= may2026End) {
            mayProjects.push(p);
        } else {
            otherProjects.push(p);
        }
    });

    console.log('Projects created in May 2026:', mayProjects.length);
    console.log('Sample May 2026 projects:', mayProjects.slice(0, 5));
    
    // Check if there are other months
    const monthsMap = {};
    projects.forEach(p => {
        const d = new Date(p.created_at);
        const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
        monthsMap[key] = (monthsMap[key] || 0) + 1;
    });
    console.log('Projects distribution by month:', monthsMap);
}

run();
