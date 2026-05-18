
import XLSX from 'xlsx';

const filePath = 'd:\\Kashif\\Apps\\CodesLogic-BMA-Main\\public\\Sales Records.xlsx';
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet);

const accounts = new Set();
const agents = new Set();
const convertedBy = new Set();

data.forEach(row => {
    if (row['Account']) accounts.add(row['Account']);
    if (row['Agent']) agents.add(row['Agent']);
    if (row['Converted By']) convertedBy.add(row['Converted By']);
});

console.log('Unique Accounts (Prefixes):', Array.from(accounts));
console.log('Unique Agents (PMs):', Array.from(agents));
console.log('Unique Converted By:', Array.from(convertedBy));
