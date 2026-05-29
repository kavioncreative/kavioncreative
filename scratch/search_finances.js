import fs from 'fs';
import path from 'path';

const filePath = path.resolve('sections', 'Finances.tsx');
const content = fs.readFileSync(filePath, 'utf8');

// Find lines containing 'company' or references to company earnings loading
const lines = content.split('\n');
console.log(`Total lines in Finances.tsx: ${lines.length}`);

lines.forEach((line, idx) => {
    if (line.toLowerCase().includes('company') || line.toLowerCase().includes('earnings')) {
        // Print matching lines with line numbers (1-indexed)
        if (line.includes('company') || line.includes('Earnings') || line.includes('earning')) {
            console.log(`${idx + 1}: ${line.trim()}`);
        }
    }
});
