
import { createClient } from '@supabase/supabase-js';
const url = "https://efrborampxloagtlphyf.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcmJvcmFtcHhsb2FndGxwaHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MDg0MDYsImV4cCI6MjA4NDM4NDQwNn0.axCcmJDy-x-752VsC82_Qbg4YHJtsbQoQqNNCBYG188";

const supabase = createClient(url, key);

async function compareColumns() {
    try {
        // Since we can't query information_schema easily, we'll try to get one row from each and compare keys.
        // We know we need auth for projects table, so we'll use a known ID if possible or just try.
        
        const { data: vData } = await supabase.from('projects_with_collaborators').select('*').limit(1);
        const vCols = vData && vData.length > 0 ? Object.keys(vData[0]) : [];
        console.log('VIEW_COLUMNS:' + JSON.stringify(vCols));

        // For projects table, we might get empty result but we can try to find one ID first
        if (vData && vData.length > 0) {
            const id = vData[0].project_id;
            // Try to fetch specific project from projects table
            const { data: pData } = await supabase.from('projects').select('*').eq('project_id', id);
            const pCols = pData && pData.length > 0 ? Object.keys(pData[0]) : [];
            console.log('TABLE_COLUMNS:' + JSON.stringify(pCols));
        }
    } catch (e) {
        console.error('Catch error:', e);
    }
}

compareColumns();
