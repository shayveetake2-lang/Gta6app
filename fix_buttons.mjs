import fs from 'fs';
let content = fs.readFileSync('js/app.js', 'utf8');
content = content.replace(
  /background-color: #e01e5a; color: var\(--text\); width: 100%;/g,
  'background-color: #e01e5a; color: #fff; width: 100%;'
);
content = content.replace(
  /background:#ff9900;color:var\(--text\);/g,
  'background:#ff9900;color:#fff;'
);
fs.writeFileSync('js/app.js', content);
