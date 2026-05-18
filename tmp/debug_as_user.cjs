
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://efrborampxloagtlphyf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcmJvcmFtcHhsb2FndGxwaHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MDg0MDYsImV4cCI6MjA4NDM4NDQwNn0.axCcmJDy-x-752VsC82_Qbg4YHJtsbQoQqNNCBYG188';

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
    }
});

async function debugAsUser() {
    console.log('--- Logging in as Touseef ---');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'touseefahmed@codeslogic.com',
        password: '12345//'
    });

    if (authError) {
        console.error('Login error:', authError);
        return;
    }

    const { user } = authData;
    console.log('Loggged in as:', user.id, user.email);

    console.log('\n--- Checking Profile ---');
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
    
    if (profileError) {
        console.error('Profile error:', profileError);
    } else {
        console.log('Profile Role:', profile.role);
    }

    console.log('\n--- Fetching Projects for MOS 124695 ---');
    // Simulate frontend query
    const userRole = profile?.role || '';
    const isLeadRole = userRole.toLowerCase().includes('team lead') || userRole.toLowerCase().includes('team designer');
    const isPM = userRole.toLowerCase() === 'project manager' || isLeadRole;

    console.log('Identified as PM for permissions prefetch:', isPM);

    // Get perms
    const { data: collabProjects } = await supabase.from('project_collaborators').select('project_id').eq('member_id', user.id);
    const collabProjectIds = collabProjects?.map(p => p.project_id) || [];
    console.log('Collaborator Project IDs:', collabProjectIds);

    let pmAccountIds = [];
    if (isPM) {
        const { data: userTeams } = await supabase.from('team_members').select('team_id').eq('member_id', user.id);
        const teamIds = userTeams?.map(t => t.team_id) || [];
        console.log('Team IDs:', teamIds);
        if (teamIds.length > 0) {
            const { data: teamAccs } = await supabase
                .from('team_accounts').select('account_id').in('team_id', teamIds);
            pmAccountIds = [...new Set(teamAccs?.map(ta => ta.account_id) || [])];
        }
    }
    console.log('PM Account IDs:', pmAccountIds);

    // Main Query simulation
    let query = supabase.from('projects').select('project_id, project_title, account_id, assignee').ilike('project_id', '%MOS 124695%');
    
    // Applying filters as in Projects.tsx
    const accIds = isLeadRole ? pmAccountIds : [];
    let filterStr = `assignee_id.eq.${user.id},team_designer_id.eq.${user.id},assignee.ilike."${profile.name}",assignee.ilike."${profile.email}"`;
    if (collabProjectIds.length > 0) filterStr += `,project_id.in.(${collabProjectIds.map(id => `"${id}"`).join(',')})`;
    if (accIds.length > 0) filterStr += `,account_id.in.(${accIds.map(id => `"${id}"`).join(',')})`;
    
    query = query.or(filterStr);

    const { data: visibleProjects, error: queryError } = await query;
    if (queryError) {
        console.error('Query error:', queryError);
    } else {
        console.log('Visible project MOS 124695:', visibleProjects);
    }
}

debugAsUser();
