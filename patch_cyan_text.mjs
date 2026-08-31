import fs from 'fs';
let css = fs.readFileSync('css/styles.css', 'utf8');

// Add var(--cyan-text)
css = css.replace(
  /--accent-2: #00f0ff;/g,
  '--accent-2: #00f0ff;\n  --cyan-text: #00f0ff;'
);
css = css.replace(
  /\[data-theme="light"\] \{\n  --bg:/,
  '[data-theme="light"] {\n  --cyan-text: #0099cc;\n  --bg:'
);

// Replace hardcoded color: #00f0ff; with color: var(--cyan-text);
css = css.replace(/color: #00f0ff;/g, 'color: var(--cyan-text);');
fs.writeFileSync('css/styles.css', css);

let js = fs.readFileSync('js/app.js', 'utf8');
js = js.replace(/color: #00f0ff;/g, 'color: var(--cyan-text);');
fs.writeFileSync('js/app.js', js);
console.log("cyan text patched.");
