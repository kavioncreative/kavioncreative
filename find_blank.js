import { createClient } from '@supabase/supabase-js';
const url = "https://efrborampxloagtlphyf.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcmJvcmFtcHhsb2FndGxwaHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MDg0MDYsImV4cCI6MjA4NDM4NDQwNn0.axCcmJDy-x-752VsC82_Qbg4YHJtsbQoQqNNCBYG188";
const supabase = createClient(url, key);
async function run() {
    const { data, error } = await supabase.from('projects').select('id, project_id, client_name, project_title').eq('client_name', 'Unknown');
    console.log("Found projects:", data);
}
run();
