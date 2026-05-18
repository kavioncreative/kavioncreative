const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://efrborampxloagtlphyf.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcmJvcmFtcHhsb2FndGxwaHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MDg0MDYsImV4cCI6MjA4NDM4NDQwNn0.axCcmJDy-x-752VsC82_Qbg4YHJtsbQoQqNNCBYG188');

async function checkCols() {
    // Try to select columns using a query that might return an error with the column names
    const { error } = await supabase.from('projects').select('note').limit(1);
    if (error) {
        console.log('Column "note" does not exist:', error.message);
        const { error: error2 } = await supabase.from('projects').select('notes').limit(1);
        if (error2) console.log('Column "notes" does not exist:', error2.message);
        else console.log('Column "notes" EXISTS!');
    } else {
        console.log('Column "note" EXISTS!');
    }
}

checkCols();
