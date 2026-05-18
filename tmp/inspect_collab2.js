
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://efrborampxloagtlphyf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcmJvcmFtcHhsb2FndGxwaHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MDg0MDYsImV4cCI6MjA4NDM4NDQwNn0.axCcmJDy-x-752VsC82_Qbg4YHJtsbQoQqNNCBYG188';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspectSchema() {
    try {
        const { data, error } = await supabase.from('project_collaborators').insert([{ project_id: 'test', user_id: '123' }]);
        console.log("Insert 1 error:", error);

        const { data: data2, error: err2 } = await supabase.from('project_collaborators').insert([{ project_id: 'test', member_id: '123' }]);
        console.log("Insert 2 error:", err2);
    } catch (err) {
        console.error("Exception:", err);
    }
}

inspectSchema();
