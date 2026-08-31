import fs from 'fs';
let content = fs.readFileSync('js/app.js', 'utf8');

content = content.replace(
  /color:#fff;/g,
  'color:var(--text);'
);

fs.writeFileSync('js/app.js', content);
console.log("admin notice colors patched.");
