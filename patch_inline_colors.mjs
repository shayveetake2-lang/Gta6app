import fs from 'fs';
let js = fs.readFileSync('js/app.js', 'utf8');

js = js.replace(/border-left: 2px solid #FFD700;/g, 'border-left: 2px solid var(--atlas-warning);');
js = js.replace(/border-left: 2px solid #28a745;/g, 'border-left: 2px solid var(--atlas-success-border);');

fs.writeFileSync('js/app.js', js);
console.log("Inline colors adapted to theme.");
