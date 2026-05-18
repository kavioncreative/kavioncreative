
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://efrborampxloagtlphyf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcmJvcmFtcHhsb2FndGxwaHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MDg0MDYsImV4cCI6MjA4NDM4NDQwNn0.axCcmJDy-x-752VsC82_Qbg4YHJtsbQoQqNNCBYG188'; // Use the ANON key for now, maybe need service key?
const supabase = createClient(supabaseUrl, supabaseKey);

async function findSumaira() {
    const { data, error } = await supabase.from('profiles').select('*').ilike('name', '%Sumaira%');
    if (error) {
        console.error('Error:', error);
        return;
    }
    console.log(JSON.stringify(data, null, 2));
}

findSumaira();
