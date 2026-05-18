
import XLSX from 'xlsx';
import path from 'path';

const filePath = 'public/Sumaira Projects.xlsx';
try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    console.log('Sheet Name:', sheetName);
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    console.log('--- HEADERS ---');
    console.log(data[0]);

    console.log('\n--- FIRST 3 ROWS OF DATA ---');
    console.log(data.slice(1, 4));

    const jsonObjects = XLSX.utils.sheet_to_json(worksheet);
    console.log('\n--- FIRST 2 JSON OBJECTS ---');
    console.log(jsonObjects.slice(0, 2));
} catch (error) {
    console.error('Error reading Excel file:', error);
}
