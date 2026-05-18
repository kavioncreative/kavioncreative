
import XLSX from 'xlsx';
import fs from 'fs';

const filePath = 'd:\\Kashif\\Apps\\CodesLogic-BMA-Main\\public\\Sales Records.xlsx';
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet);

const escape = (str) => {
    if (str === null || str === undefined) return 'NULL';
    if (typeof str === 'number') return str;
    return `'${String(str).replace(/'/g, "''")}'`;
};

let sql = `-- ============================================
-- FIX NULL ASSIGNEES ON IMPORTED PROJECTS
-- Updates assignee for projects that were inserted without a freelancer.
-- Safe to run multiple times.
-- ============================================\n\n`;

let counter = 100000;
let updateCount = 0;

data.forEach((row, idx) => {
    const prefix = (row['Account'] || '').trim();
    const pId = `${prefix} ${++counter}`;
    const freelancer = row['Freelancer'] ? (row['Freelancer'] || '').trim() : null;

    if (freelancer) {
        sql += `UPDATE projects SET assignee = ${escape(freelancer)} WHERE project_id = ${escape(pId)} AND (assignee IS NULL OR assignee = '');\n`;
        updateCount++;
    }
});

sql += `\n-- Total UPDATE statements: ${updateCount}\n`;

fs.writeFileSync('d:\\Kashif\\Apps\\CodesLogic-BMA-Main\\fix_assignees.sql', sql);
console.log(`SQL generated: fix_assignees.sql`);
console.log(`Total UPDATE statements: ${updateCount}`);
