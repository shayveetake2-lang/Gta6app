import fs from 'fs';
let content = fs.readFileSync('css/styles.css', 'utf8');

content = content.replace(
  /\.feed-tab\s*\{\s*display:\s*inline-block;\s*padding:\s*0\.4rem 1\.25rem;\s*border-radius:\s*9999px;\s*text-decoration:\s*none;\s*font-weight:\s*600;\s*font-size:\s*0\.85rem;\s*background:\s*transparent;\s*color:\s*#fff;/g,
  `.feed-tab {
  display: inline-block;
  padding: 0.4rem 1.25rem;
  border-radius: 9999px;
  text-decoration: none;
  font-weight: 600;
  font-size: 0.85rem;
  background: transparent;
  color: var(--text);`
);

content = content.replace(
  /\.feed-tab\.active\s*\{\s*background:\s*#e01e5a;\s*border-color:\s*#e01e5a;/g,
  `.feed-tab.active {
  background: #e01e5a;
  border-color: #e01e5a;
  color: #fff;`
);

fs.writeFileSync('css/styles.css', content);
console.log("feed tabs patched.");
