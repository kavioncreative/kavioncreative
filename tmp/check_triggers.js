
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://efrborampxloagtlphyf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcmJvcmFtcHhsb2FndGxwaHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MDg0MDYsImV4cCI6MjA4NDM4NDQwNn0.axCcmJDy-x-752VsC82_Qbg4YHJtsbQoQqNNCBYG188';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkTriggers() {
    try {
        const { data, error } = await supabase.rpc('invoke_sql', {
            query: "SELECT trigger_name, event_manipulation, event_object_table, action_statement FROM information_schema.triggers WHERE event_object_table IN ('projects');"
        });
        
        console.log("Triggers:", data);
        if (error) {
            // let's do manual curl if RPC fails
            console.error(error.message);
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkTriggers();
