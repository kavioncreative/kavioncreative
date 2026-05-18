
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://efrborampxloagtlphyf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcmJvcmFtcHhsb2FndGxwaHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MDg0MDYsImV4cCI6MjA4NDM4NDQwNn0.axCcmJDy-x-752VsC82_Qbg4YHJtsbQoQqNNCBYG188';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fixAssignees() {
    try {
        // 1. Get all profiles
        const { data: profiles, error: pError } = await supabase.from('profiles').select('name, email');
        if (pError) throw pError;

        // Build a robust lookup: lowercased/trimmed name -> exact DB name
        const profileLookup = new Map();
        profiles.forEach(p => {
            if (p.name) {
                profileLookup.set(p.name.trim().toLowerCase(), p.name);
            }
        });

        // 2. Get all projects that have an assignee
        const { data: projects, error: prError } = await supabase
            .from('projects')
            .select('project_id, assignee');

        if (prError) throw prError;

        let fixCount = 0;
        const updates = [];

        for (const p of projects) {
            if (p.assignee) {
                const currentStr = p.assignee;
                const normalized = currentStr.trim().toLowerCase();
                
                // If it matches a profile when normalized, check if it's strictly equal to the exact profile name
                if (profileLookup.has(normalized)) {
                    const exactName = profileLookup.get(normalized);
                    if (currentStr !== exactName) {
                        console.log(`Mismatch: "${currentStr}" -> should be "${exactName}" (Project: ${p.project_id})`);
                        // Push to updates
                        updates.push({
                            project_id: p.project_id,
                            assignee: exactName
                        });
                    }
                }
            }
        }

        console.log(`Found ${updates.length} projects needing correction.`);

        // 3. Apply updates in batches
        const batchSize = 100;
        for (let i = 0; i < updates.length; i += batchSize) {
            const batch = updates.slice(i, i + batchSize);
            const { error: updError } = await supabase.from('projects').upsert(batch, { onConflict: 'project_id' });
            if (updError) {
                console.error("Batch update error:", updError);
            } else {
                console.log(`Successfully updated batch ${i / batchSize + 1}`);
            }
        }

        console.log("Fix complete.");
    } catch (error) {
        console.error('Error:', error.message);
    }
}

fixAssignees();
