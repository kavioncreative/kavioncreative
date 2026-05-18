
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://efrborampxloagtlphyf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcmJvcmFtcHhsb2FndGxwaHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MDg0MDYsImV4cCI6MjA4NDM4NDQwNn0.axCcmJDy-x-752VsC82_Qbg4YHJtsbQoQqNNCBYG188';

// I need a service role key to bypass RLS for seeding IF I can't find it. 
// Since I don't have it, I'll hope 'anon' works or I'll just explain.
// Actually, I'll try to use the UI to do it if I can? No, script is better.
// Wait, I can just use 'supabase' in the app if I'm logged in as admin.

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
    console.log('Seeding permissions...');

    const perms = [
        { code: 'view_tasks', name: 'View Tasks', category: 'Tasks', description: 'Access to the tasks board' },
        { code: 'access_assets', name: 'Access Assets', category: 'Assets', description: 'Access to the cloud assets folder' },
        { code: 'view_channels', name: 'View Channels', category: 'Channels', description: 'Access to communication channels' },
        { code: 'view_forms', name: 'View Forms', category: 'Forms', description: 'Access to form management' },
        { code: 'view_settings', name: 'View Settings', category: 'General', description: 'Access to personal settings' },
        { code: 'access_control_panel', name: 'Access Control Panel', category: 'Accounts', description: 'Access to the Roles & Permissions management' },
        { code: 'view_dashboard', name: 'View Dashboard', category: 'General', description: 'Access to main overview' }
    ];

    for (const p of perms) {
        const { error } = await supabase.from('permissions').upsert(p, { onConflict: 'code' });
        if (error) console.error(`Error seeding ${p.code}:`, error);
        else console.log(`Seeded ${p.code}`);
    }

    // Default Freelancer perms
    const freelancerPerms = ['view_dashboard', 'view_projects', 'view_freelancer_earnings', 'access_assets', 'view_settings'];
    for (const code of freelancerPerms) {
        await supabase.from('role_permissions').upsert({ role_name: 'Freelancer', permission_code: code }, { onConflict: 'role_name,permission_code' });
    }

    // Ensure Super Admin has all
    const { data: allCodes } = await supabase.from('permissions').select('code');
    if (allCodes) {
        for (const { code } of allCodes) {
            await supabase.from('role_permissions').upsert({ role_name: 'Super Admin', permission_code: code }, { onConflict: 'role_name,permission_code' });
        }
    }

    console.log('Seed complete.');
}

seed();
