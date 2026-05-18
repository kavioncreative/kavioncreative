const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://efrborampxloagtlphyf.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcmJvcmFtcHhsb2FndGxwaHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MDg0MDYsImV4cCI6MjA4NDM4NDQwNn0.axCcmJDy-x-752VsC82_Qbg4YHJtsbQoQqNNCBYG188');

async function checkCols() {
    const { data, error } = await supabase.from('projects').select('*').limit(1);
    if (error) {
        console.error(error);
        return;
    }
    if (data && data.length > 0) {
        console.log(Object.keys(data[0]));
    } else {
        console.log('No data found, trying to get table info via RPC...');
        // Fallback: try a common RPC or just list what we know
    }
}

checkCols();
