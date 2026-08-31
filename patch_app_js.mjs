import fs from 'fs';
let content = fs.readFileSync('js/app.js', 'utf8');

content = content.replace(
  /border: 1px solid #333/g,
  'border: 1px solid var(--border)'
);

content = content.replace(
  /background: #181820/g,
  'background: var(--surface)'
);

content = content.replace(
  /color: #fff; padding-right: 2rem;/g,
  'color: var(--text); padding-right: 2rem;'
);

fs.writeFileSync('js/app.js', content);
console.log("app.js patched.");
