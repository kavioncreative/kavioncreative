
import { read, utils } from 'xlsx';
import fs from 'fs';

function excelDateToJSDate(excelDate) {
    if (!excelDate) return new Date();
    // Excel dates are number of days since Jan 1, 1900.
    // 25569 is Jan 1, 1970 relative to Jan 1, 1900
    // Multiply by 86400 seconds * 1000 milliseconds
    return new Date(Math.round((excelDate - 25569) * 86400 * 1000));
}

function formatDate(date) {
    return date.toISOString().replace('T', ' ').replace('Z', '+00');
}

try {
    const filePath = 'public/Book 2.xlsx';
    const fileContent = fs.readFileSync(filePath);
    const workbook = read(fileContent, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = utils.sheet_to_json(worksheet, { raw: false }); // using raw false to get strings like dates if needed, but we probably want raw for actual calculations
    const dataRaw = utils.sheet_to_json(worksheet);

    console.log("Headers found:");
    if (dataRaw && dataRaw.length > 0) {
        console.log(Object.keys(dataRaw[0]));
    }

    let sqlQueries = `-- Auto-generated SQL insert queries from Book 2 Excel\n\n`;
    let count = 0;

    dataRaw.forEach((row, i) => {
        // Skip empty rows (using some common keys like Account or Client Name)
        if (!row.Account && !row['Client Name'] && !row.Client) return;

        count++;
        // Handle dates
        let createdAt = new Date();
        if (row.Date) {
            createdAt = excelDateToJSDate(row.Date);
        }

        const prefix = row.Account || 'UNKN';

        // Generate a random 6 digit string for the Project ID
        const randomNum = Math.floor(100000 + Math.random() * 900000);
        const projectId = `${prefix} ${randomNum}`;

        const clientType = 'new';
        const clientNameRaw = row['Client Name'] || row.Client || row['Client '] || '';
        const clientName = String(clientNameRaw).replace(/'/g, "''");

        const actionMove = 'Add';
        const status = row.Status || 'In Progress';
        const orderValueRaw = row['Order Value'] || row.Price || row['Total Price'] || 0;
        const price = Number(String(orderValueRaw).replace(/[^0-9.-]+/g, "")) || 0;
        const medium = String(row.Medium || '').replace(/'/g, "''");

        const sale = String(row.Sale || '').replace(/'/g, "''");
        const itemsSold = `{"items":["${sale}"]}`;
        const addons = `{"items":[]}`;
        const projectTitle = sale ? `${sale} Design`.replace(/'/g, "''") : 'Design Project';

        const assigneeRaw = row.Agent || row.Assignee || row.Freelancer || '';
        const assignee = String(assigneeRaw).replace(/'/g, "''");

        const orderType = row['Order Type'] || 'Direct';
        const convertedBy = orderType === 'Converted' ? assignee : null;

        // Account ID query
        const accountIdQuery = `(SELECT id FROM accounts WHERE prefix ILIKE '${prefix}' LIMIT 1)`;

        // Null checks
        const convertedByStr = convertedBy ? `'${convertedBy}'` : 'NULL';

        sqlQueries += `
INSERT INTO projects (
    project_id, 
    action_move, 
    project_title, 
    account, 
    account_id,
    client_type, 
    client_name, 
    items_sold, 
    addons, 
    medium, 
    price, 
    assignee, 
    converted_by, 
    status, 
    created_at, 
    updated_at
) VALUES (
    '${projectId}', 
    '${actionMove}', 
    '${projectTitle}', 
    '${prefix}', 
    ${accountIdQuery}, 
    '${clientType}', 
    '${clientName}', 
    '${itemsSold}', 
    '${addons}', 
    '${medium}', 
    ${price}, 
    '${assignee}', 
    ${convertedByStr}, 
    '${status}', 
    '${formatDate(createdAt)}', 
    '${formatDate(createdAt)}'
);
`;
    });

    fs.writeFileSync('insert_book2_sales.sql', sqlQueries);
    console.log(`Successfully generated ${count} valid INSERT queries in insert_book2_sales.sql`);

} catch (e) {
    console.error(e);
}
