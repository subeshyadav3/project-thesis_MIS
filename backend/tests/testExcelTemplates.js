const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

const templateDir = path.join(__dirname, '..', 'excel-templates');
const newTestDataDir = path.join(templateDir, 'New-Test-data');

function inspectExcel(filePath) {
  const relPath = path.relative(path.join(__dirname, '..', '..'), filePath);
  try {
    const wb = XLSX.readFile(filePath);
    const sheetNames = wb.SheetNames;
    const firstSheet = wb.Sheets[sheetNames[0]];
    const json = XLSX.utils.sheet_to_json(firstSheet);
    const headers = json.length > 0 ? Object.keys(json[0]) : [];
    return {
      success: true,
      file: relPath,
      sheets: sheetNames,
      rowCount: json.length,
      headers,
      sample: json[0] || null
    };
  } catch (err) {
    return {
      success: false,
      file: relPath,
      error: err.message
    };
  }
}

function getAllXlsx(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllXlsx(fullPath));
    } else if (file.endsWith('.xlsx')) {
      results.push(fullPath);
    }
  });
  return results;
}

console.log('\n========================================');
console.log(' INSPECTING ALL EXCEL TEMPLATES & DATASETS');
console.log('========================================\n');

const allFiles = getAllXlsx(templateDir);
let errorsFound = 0;

for (const file of allFiles) {
  const info = inspectExcel(file);
  if (!info.success) {
    console.error(`✗ ERROR reading ${info.file}: ${info.error}`);
    errorsFound++;
    continue;
  }
  console.log(`📄 File: ${info.file}`);
  console.log(`   Sheets: ${info.sheets.join(', ')}`);
  console.log(`   Rows: ${info.rowCount}`);
  console.log(`   Headers: [${info.headers.join(', ')}]`);
  if (info.sample) {
    console.log(`   Sample: ${JSON.stringify(info.sample).substring(0, 100)}...`);
  }
  console.log('');
}

console.log('========================================');
console.log(` TOTAL FILES INSPECTED: ${allFiles.length}, ERRORS: ${errorsFound}`);
console.log('========================================\n');
