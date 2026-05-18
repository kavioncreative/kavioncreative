
import XLSX from 'xlsx';
import path from 'path';

const filePath = 'd:\\Kashif\\Apps\\CodesLogic-BMA-Main\\public\\Sales Records.xlsx';
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

console.log(JSON.stringify(data.slice(0, 5), null, 2));
