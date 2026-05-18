
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://efrborampxloagtlphyf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcmJvcmFtcHhsb2FndGxwaHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MDg0MDYsImV4cCI6MjA4NDM4NDQwNn0.axCcmJDy-x-752VsC82_Qbg4YHJtsbQoQqNNCBYG188';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixByUuid() {
    const data = [
        { id: "26e2a2be-af06-43ca-a97f-3cd083be4ff1", name: 'bruce1423' }, // MAN 499847
        { id: "9a56916c-88c1-40f2-9ca4-8eef45051a49", name: 'bruce1423' }, // MAN 759463
        { id: "e722ce4c-98f8-4946-917b-9797cfc1d00b", name: 'bruce1423' }, // MAN 449954
        { id: "5f251821-58d8-469f-85de-6a301c1b043f", name: 'bruce1423' }, // MAN 265759
        { id: "93d59c97-d3ca-440b-a1e2-a256cae696b2", name: 'bruce1423' }, // MAN 865757
        { id: "ef902a4d-f1dd-4f4c-a950-a6ff8baf8369", name: 'kbear2197' }  // MAN 542888
    ];

    for (const item of data) {
        console.log(`Updating ${item.id}...`);
        const { data: result, error } = await supabase
            .from('projects')
            .update({ client_name: item.name })
            .eq('id', item.id)
            .select();
        
        if (error) {
            console.log(`Error updating ${item.id}:`, error.message);
        } else {
            console.log(`Result for ${item.id}:`, result);
        }
    }
}

fixByUuid();
