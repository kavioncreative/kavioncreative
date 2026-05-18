
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://efrborampxloagtlphyf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcmJvcmFtcHhsb2FndGxwaHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MDg0MDYsImV4cCI6MjA4NDM4NDQwNn0.axCcmJDy-x-752VsC82_Qbg4YHJtsbQoQqNNCBYG188';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function inspectColumns() {
    // try to insert an invalid record to get error with columns, or just use RPC
    const { data: accounts } = await supabase.from('accounts').select('id, prefix, name');
    console.log('ACCOUNTS:', accounts);
}

inspectColumns();
