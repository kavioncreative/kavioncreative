
import { createClient } from '@supabase/supabase-js';
const url = "https://efrborampxloagtlphyf.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcmJvcmFtcHhsb2FndGxwaHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MDg0MDYsImV4cCI6MjA4NDM4NDQwNn0.axCcmJDy-x-752VsC82_Qbg4YHJtsbQoQqNNCBYG188";

const supabase = createClient(url, key);

async function listTables() {
    // There isn't a direct way to list tables via JS client without RPC or querying information_schema.
    // But we can try to hit some guessed tables.
    const tables = ['projects', 'projects_with_collaborators', 'sales'];
    for (const table of tables) {
        const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
        console.log(`Table ${table}: ${count} rows, error:`, error?.message);
    }
}

listTables();
