import fs from 'fs';
let css = fs.readFileSync('css/styles.css', 'utf8');

css = css.replace(
  /\.nav a:hover,\n\s*\.nav a\.active \{\n\s*box-shadow: none;\n\s*background: var\(--surface-2\);\n\s*border-color: var\(--border\);\n\s*color: var\(--text\);\n\s*\}/g,
  `.nav a:hover {
    box-shadow: none;
    background: var(--surface-2);
    border-color: var(--border);
    color: var(--text);
  }
  .nav a.active {
    box-shadow: none;
    background: color-mix(in srgb, var(--accent) 8%, transparent);
    border-color: var(--accent);
    color: var(--accent);
  }`
);

fs.writeFileSync('css/styles.css', css);
console.log("Nav active patched.");
