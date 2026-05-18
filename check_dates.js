
import { read, utils } from 'xlsx';
import fs from 'fs';

function excelDateToJSDate(excelDate) {
    if (!excelDate) return new Date();
    return new Date(Math.round((excelDate - 25569) * 86400 * 1000));
}

try {
    const filePath = 'public/Fiverr Sales 123.xlsx';
    const fileContent = fs.readFileSync(filePath);
    const workbook = read(fileContent, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = utils.sheet_to_json(worksheet);

    console.log("DATES IN EXCEL:");
    data.forEach((row) => {
        if (!row.Account && !row['Client Name']) return;
        if (row.Date) {
            console.log(excelDateToJSDate(row.Date).toISOString());
        }
    });

} catch (e) {
    console.error(e);
}
