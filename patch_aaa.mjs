import fs from 'fs';
let js = fs.readFileSync('js/app.js', 'utf8');
js = js.replace(/color: #aaa;/g, 'color: var(--muted);');
js = js.replace(/color:#aaa;/g, 'color: var(--muted);');
fs.writeFileSync('js/app.js', js);
console.log("aaa colors patched.");
