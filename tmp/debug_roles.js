import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
    console.log('Fetching roles from profiles...')
    const { data, error } = await supabase
        .from('profiles')
        .select('role')
    
    if (error) {
        console.error('Error:', error)
        return
    }

    const roles = [...new Set(data.map(p => p.role))]
    console.log('Unique roles:', roles)

    const teamDesigners = data.filter(p => p.role?.toLowerCase().trim() === 'team designer')
    console.log('Count of Team Designers:', teamDesigners.length)

    const freelancers = data.filter(p => p.role?.toLowerCase().trim() === 'freelancer')
    console.log('Count of Freelancers:', freelancers.length)
}

check()
