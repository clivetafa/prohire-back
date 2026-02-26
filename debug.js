const fs = require('fs');
const path = require('path');

console.log('=== DEBUG INFO ===');
console.log('Current directory:', process.cwd());
console.log('Files in root:', fs.readdirSync('.'));
console.log('Does dist exist?', fs.existsSync('./dist'));
if (fs.existsSync('./dist')) {
  console.log('Files in dist:', fs.readdirSync('./dist'));
}
console.log('=== END DEBUG ===');