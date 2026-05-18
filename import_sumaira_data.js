
import { createClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';
import fs from 'fs';

const supabaseUrl = 'https://efrborampxloagtlphyf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcmJvcmFtcHhsb2FndGxwaHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MDg0MDYsImV4cCI6MjA4NDM4NDQwNn0.axCcmJDy-x-752VsC82_Qbg4YHJtsbQoQqNNCBYG188';

const supabase = createClient(supabaseUrl, supabaseKey);

const excelSerialToDate = (serial) => {
    if (!serial) return null;
    if (typeof serial === 'string') return serial.trim() || null;
    const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
    return date.toISOString();
};

async function run() {
    console.log('--- Logging in ---');
    const { error: authError } = await supabase.auth.signInWithPassword({
        email: 'touseefahmed@codeslogic.com',
        password: '12345//'
    });
    if (authError) {
        console.error('Auth Error:', authError);
        return;
    }

    console.log('--- Fetching Metadata ---');
    const { data: accounts } = await supabase.from('accounts').select('*');
    const { data: profiles } = await supabase.from('profiles').select('*');

    const accountMap = {};
    accounts.forEach(a => accountMap[a.prefix] = a.id);

    const profileMap = {};
    profiles.forEach(p => {
        if (p.name) profileMap[p.name.toLowerCase()] = p.id;
    });

    console.log('--- Reading Excel ---');
    const filePath = 'public/Sumaira Projects.xlsx';
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    console.log(`Processing ${data.length} rows...`);

    let successCount = 0;
    let errorCount = 0;
    let skipCount = 0;

    let counter = 900000; // Starting from a high number to avoid collisions

    for (const row of data) {
        const prefix = (row['Account'] || '').trim();
        const accountId = accountMap[prefix];
        if (!accountId) {
            console.warn(`Skipping row: Account prefix "${prefix}" not found.`);
            skipCount++;
            continue;
        }

        const project_id = `${prefix} ${++counter}`;
        const project_title = row['Project Title'] || 'Untitled';
        const client_name = row['Client'] || null;
        const assignee = row['Freelancer'] || null;
        const assignee_id = assignee ? profileMap[assignee.toLowerCase()] : null;
        const agent = row['Agent'] || null;
        const primary_manager_id = agent ? profileMap[agent.toLowerCase()] : null;
        const converted_by = row['Converted By'] || null;
        const sale = row['Sale'] || 'Logo';
        const medium = row['Medium'] || 'Direct';
        const order_type = row['Order Type'] || 'Direct';
        const price = parseFloat(row['Order Value']) || 0;
        const status = row['Status'] || 'In Progress';
        const created_at = excelSerialToDate(row['Date']) || new Date().toISOString();
        
        const items_sold = { items: [sale], other: null };
        const funds_status = status === 'Approved' ? 'Cleared' : 'Pending';
        const clearance_start_date = status === 'Approved' ? created_at : null;

        const insertData = {
            project_id,
            action_move: 'Add',
            project_title,
            account: prefix,
            account_id: accountId,
            client_name,
            assignee,
            assignee_id,
            primary_manager_id,
            converted_by,
            order_type,
            items_sold,
            medium,
            price,
            status,
            funds_status,
            created_at,
            clearance_start_date,
            updated_at: new Date().toISOString()
        };

        const { error } = await supabase.from('projects').insert(insertData);
        if (error) {
            console.error(`Error inserting ${project_id}:`, error.message);
            errorCount++;
        } else {
            successCount++;
            if (successCount % 10 === 0) console.log(`Inserted ${successCount} projects...`);
        }
    }

    console.log('\n--- Final Stats ---');
    console.log(`Success: ${successCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log(`Skipped: ${skipCount}`);
}

run();
