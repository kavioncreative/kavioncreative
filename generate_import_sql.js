
import XLSX from 'xlsx';
import fs from 'fs';

const filePath = 'd:\\Kashif\\Apps\\CodesLogic-BMA-Main\\public\\Sales Records.xlsx';
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet);

console.log(`Total rows: ${data.length}`);
console.log('Columns:', Object.keys(data[0]));

const excelSerialToDate = (serial) => {
    if (!serial) return null;
    if (typeof serial === 'string') return serial.trim() || null;
    const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
    return date.toISOString().split('T')[0];
};

const escape = (str) => {
    if (str === null || str === undefined) return 'NULL';
    if (typeof str === 'number') return str;
    return `'${String(str).replace(/'/g, "''")}'`;
};

const jsonEscape = (obj) => {
    return escape(JSON.stringify(obj));
};

let sql = `-- ============================================
-- SALES DATA IMPORT FROM SALES RECORDS.XLSX
-- ============================================

-- ============================================
-- STEP 1: Ensure all required accounts exist
-- ============================================
INSERT INTO accounts (name, prefix, display_prefix) VALUES ('ARS Account', 'ARS', 'ARS-01') ON CONFLICT (display_prefix) DO NOTHING;
INSERT INTO accounts (name, prefix, display_prefix) VALUES ('GHA Account', 'GHA', 'GHA-01') ON CONFLICT (display_prefix) DO NOTHING;
INSERT INTO accounts (name, prefix, display_prefix) VALUES ('MAN Account', 'MAN', 'MAN-01') ON CONFLICT (display_prefix) DO NOTHING;

-- NOTE: Pricing slabs are NOT touched here (they already exist in your DB).
-- If the trigger fails with "No pricing slab" for a particular price, check your slabs in Settings.

-- ============================================
-- STEP 2: Ensure platform commissions are linked to accounts
-- (so the fee trigger can find the commission rate)
-- ============================================
DO $$
DECLARE
    v_direct_id uuid;
    v_ars_id uuid;
    v_gha_id uuid;
    v_man_id uuid;
BEGIN
    -- Get or create a "Direct / Fiverr" platform commission
    SELECT id INTO v_direct_id FROM platform_commissions WHERE platform_name = 'Fiverr' LIMIT 1;
    IF v_direct_id IS NULL THEN
        INSERT INTO platform_commissions (platform_name, commission_percentage, clearance_days)
        VALUES ('Fiverr', 20, 14) RETURNING id INTO v_direct_id;
    END IF;

    -- Link to each account if not already linked
    SELECT id INTO v_ars_id FROM accounts WHERE prefix = 'ARS' LIMIT 1;
    SELECT id INTO v_gha_id FROM accounts WHERE prefix = 'GHA' LIMIT 1;
    SELECT id INTO v_man_id FROM accounts WHERE prefix = 'MAN' LIMIT 1;

    IF v_ars_id IS NOT NULL THEN
        INSERT INTO platform_commission_accounts (platform_commission_id, account_id)
        VALUES (v_direct_id, v_ars_id) ON CONFLICT DO NOTHING;
    END IF;
    IF v_gha_id IS NOT NULL THEN
        INSERT INTO platform_commission_accounts (platform_commission_id, account_id)
        VALUES (v_direct_id, v_gha_id) ON CONFLICT DO NOTHING;
    END IF;
    IF v_man_id IS NOT NULL THEN
        INSERT INTO platform_commission_accounts (platform_commission_id, account_id)
        VALUES (v_direct_id, v_man_id) ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- ============================================
-- STEP 4: Insert Projects (Sales Records)
-- NOTE: The designer_fee is auto-calculated by the trigger on INSERT.
-- NOTE: We use the original project IDs from the Excel if available.
-- ============================================

`;

let counter = 100000;
let insertCount = 0;

data.forEach((row, idx) => {
    const prefix = (row['Account'] || '').trim();
    const pId = `${prefix} ${++counter}`;

    const agentName = (row['Agent'] || '').trim();
    const isDirect = !agentName || agentName === 'Direct';

    const convertedByVal = row['Converted By'] ? (row['Converted By'] || '').trim() : null;
    const orderType = row['Order Type'] ? (row['Order Type'] || '').trim() : (convertedByVal ? 'Converted' : 'Direct');

    const sale = (row['Sale'] || 'Logo').trim();
    const medium = (row['Medium'] || '').trim();
    const price = row['Order Value'] || 0;
    const status = (row['Status'] || 'Approved').trim();
    const clientName = row['Client'] ? (row['Client'] || '').trim() : null;
    const assignee = row['Freelancer'] ? (row['Freelancer'] || '').trim() : null;
    const projectTitle = row['Project Title'] ? (row['Project Title'] || '').trim() : null;

    const createdAt = excelSerialToDate(row['Date']);
    const approvedDate = excelSerialToDate(row['Project Approved Date']);

    // Map funds_status based on whether the project is approved (historical data = Cleared)
    const fundsStatus = status === 'Approved' ? 'Cleared' : 'Pending';

    // items_sold as JSON
    const itemsSold = { items: [sale], other: null };

    // primary_manager_id: subquery that resolves by name
    const managerSub = isDirect
        ? 'NULL'
        : `(SELECT id FROM profiles WHERE name = ${escape(agentName)} LIMIT 1)`;

    sql += `-- Row ${idx + 1}: ${projectTitle || 'No Title'} [${prefix}]\n`;
    sql += `INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    ${escape(pId)},
    'Add',
    ${escape(projectTitle)},
    ${escape(prefix)},
    (SELECT id FROM accounts WHERE prefix = ${escape(prefix)} LIMIT 1),
    ${escape(clientName)},
    ${escape(assignee)},
    ${managerSub},
    ${escape(convertedByVal)},
    ${escape(orderType)},
    ${jsonEscape(itemsSold)},
    ${escape(medium)},
    ${price},
    ${escape(status)},
    ${escape(fundsStatus)},
    ${escape(createdAt)},
    ${escape(approvedDate)},
    NOW()
) ON CONFLICT (project_id) DO NOTHING;\n\n`;
    insertCount++;
});

sql += `-- Total records inserted: ${insertCount}\n`;

fs.writeFileSync('d:\\Kashif\\Apps\\CodesLogic-BMA-Main\\import_sales.sql', sql);
console.log(`\nSQL generated: import_sales.sql`);
console.log(`Total INSERT statements: ${insertCount}`);
