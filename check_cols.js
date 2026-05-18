
import { createClient } from '@supabase/supabase-js';
const url = "https://efrborampxloagtlphyf.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcmJvcmFtcHhsb2FndGxwaHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MDg0MDYsImV4cCI6MjA4NDM4NDQwNn0.axCcmJDy-x-752VsC82_Qbg4YHJtsbQoQqNNCBYG188";

const supabase = createClient(url, key);

async function checkColumns() {
    try {
        const { data, error } = await supabase.from('projects').select('*').limit(1);
        
        if (error) {
            console.error('Error:', error);
        } else if (data && data.length > 0) {
            console.log('PROJECT_COLUMNS:' + JSON.stringify(Object.keys(data[0])));
        } else {
            console.log('No data found in projects table.');
        }
    } catch (e) {
        console.error('Catch error:', e);
    }
}

checkColumns();
