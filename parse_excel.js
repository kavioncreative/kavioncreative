
import { read, utils } from 'xlsx';
import fs from 'fs';

try {
    const filePath = 'public/Fiverr Sales 123.xlsx';
    const fileContent = fs.readFileSync(filePath);
    const workbook = read(fileContent, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = utils.sheet_to_json(worksheet, { header: 1 }); // read as array of arrays

    console.log('--- HEADERS ---');
    console.log(data[0]);

    console.log('\n--- FIRST 3 ROWS OF DATA ---');
    console.log(data.slice(1, 4));

    const jsonObjects = utils.sheet_to_json(worksheet);
    console.log('\n--- FIRST 2 JSON OBJECTS ---');
    console.log(jsonObjects.slice(0, 2));
} catch (e) {
    console.error(e);
}
