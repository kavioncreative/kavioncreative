
import { createClient } from '@supabase/supabase-js';
const url = "https://efrborampxloagtlphyf.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcmJvcmFtcHhsb2FndGxwaHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MDg0MDYsImV4cCI6MjA4NDM4NDQwNn0.axCcmJDy-x-752VsC82_Qbg4YHJtsbQoQqNNCBYG188";

const supabase = createClient(url, key);

async function testUpdate() {
    try {
        // Find a project ID
        const { data: proj } = await supabase.from('projects_with_collaborators').select('project_id').limit(1).single();
        if (!proj) return console.log('No project found');

        const id = proj.project_id;
        console.log('Testing update on project:', id);

        const { error } = await supabase.from('projects').update({ order_type: 'Converted' }).eq('project_id', id);
        
        if (error) {
            console.log('UPDATE_FAILED:' + error.message);
        } else {
            console.log('UPDATE_SUCCEEDED');
        }
    } catch (e) {
        console.error('Catch error:', e);
    }
}

testUpdate();
