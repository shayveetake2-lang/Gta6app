import fs from 'fs';
let content = fs.readFileSync('css/styles.css', 'utf8');
content = content.replace(
  /\.auth-modal-overlay\s*\{\s*position:\s*fixed;\s*top:\s*0;\s*left:\s*0;\s*right:\s*0;\s*bottom:\s*0;\s*background:\s*var\(--bg\);/,
  `.auth-modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: color-mix(in srgb, var(--bg) 85%, transparent);`
);
fs.writeFileSync('css/styles.css', content);
console.log("Auth modal overlay patched.");
