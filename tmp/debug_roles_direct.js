import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://efrborampxloagtlphyf.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcmJvcmFtcHhsb2FndGxwaHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MDg0MDYsImV4cCI6MjA4NDM4NDQwNn0.axCcmJDy-x-752VsC82_Qbg4YHJtsbQoQqNNCBYG188'

const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
    console.log('Fetching roles from profiles...')
    const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('name, email, role')
    
    if (profileError) {
        console.error('Profile Error:', profileError)
    } else {
        const roles = [...new Set(profileData.map(p => p.role))]
        console.log('Unique roles in profiles:', roles)
        console.log('Sample profiles:', profileData.slice(0, 5))
    }

    const { data: inviteData, error: inviteError } = await supabase
        .from('member_invitations')
        .select('email, role')
    
    if (inviteError) {
        console.error('Invite Error:', inviteError)
    } else {
        const roles = [...new Set(inviteData.map(i => i.role))]
        console.log('Unique roles in invitations:', roles)
        console.log('Sample invitations:', inviteData.slice(0, 5))
    }
}

check()
