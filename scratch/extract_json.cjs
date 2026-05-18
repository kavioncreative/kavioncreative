const fs = require('fs');

const overviewTxt = fs.readFileSync('C:/Users/ASUS/.gemini/antigravity/brain/0dfff979-cba3-44d5-b2dd-651b59674f12/.system_generated/logs/overview.txt', 'utf8');

// Find the last occurrence of the array
const searchStr = '[\n  {\n    "project_id": "MAN 684305",';
const start = overviewTxt.lastIndexOf(searchStr);

if (start !== -1) {
    const end = overviewTxt.indexOf('}\n]', start);
    if (end !== -1) {
        const jsonStr = overviewTxt.substring(start, end + 3);
        
        try {
            const data = JSON.parse(jsonStr);
            console.log("Successfully extracted array of length:", data.length);
            fs.writeFileSync('./scratch/extracted_projects.json', JSON.stringify(data, null, 2));
        } catch (e) {
            console.error("Parse error:", e.message);
        }
    } else {
        console.log("End bracket not found.");
    }
} else {
    console.log("Start string not found in overview.txt");
}
