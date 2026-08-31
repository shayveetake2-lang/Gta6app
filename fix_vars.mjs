import fs from 'fs';
let lines = fs.readFileSync('css/styles.css', 'utf8').split('\n');

let inLightMode = false;
let braceCount = 0;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('[data-theme="light"] {')) {
    inLightMode = true;
    braceCount = 1;
    continue;
  }
  
  if (inLightMode) {
    if (lines[i].includes('{')) braceCount++;
    if (lines[i].includes('}')) braceCount--;
    
    // We are inside the main [data-theme="light"] block
    if (braceCount === 1) {
      if (lines[i].includes('--cyan-text:')) lines[i] = '  --cyan-text: #e01e5a;';
      if (lines[i].includes('--border-focus:')) lines[i] = '  --border-focus: #e01e5a;';
      if (lines[i].includes('--accent-2:')) lines[i] = '  --accent-2: #ff4757;';
    }
    
    if (braceCount === 0) {
      inLightMode = false;
    }
  }
}

// Ensure there are no duplicate --cyan-text in that block.
// Actually just replace all --cyan-text in that block and then dedup.
fs.writeFileSync('css/styles.css', lines.join('\n'));
console.log("Vars fixed.");
