import fs from 'fs';

// 1. Patch CSS
let css = fs.readFileSync('css/styles.css', 'utf8');

// Replace the [data-theme="light"] variables
css = css.replace(
  /\[data-theme="light"\] \{\n\s*--cyan-text: #0099cc;\n\s*--bg: #f2f3f7;/,
  '[data-theme="light"] {\n  --cyan-text: #e01e5a;\n  --border-focus: #e01e5a;\n  --accent-2: #ff4757;\n  --bg: #f2f3f7;'
);

// We need to double check if `--accent-2: #00f0ff;` was already in the [data-theme="light"] block.
// Yes, it was there from the original CSS (line 35).
css = css.replace(
  /\[data-theme="light"\] \{([\s\S]*?)--accent-2: #00f0ff;/m,
  '[data-theme="light"] {$1--accent-2: #ff4757;'
);

fs.writeFileSync('css/styles.css', css);

// 2. Patch JS
let js = fs.readFileSync('js/app.js', 'utf8');
js = js.replace(/style="background:#00f0ff; border-color:#00f0ff; color:#111; width:100%;"/g, 'style="width:100%;"');
js = js.replace(/style="background:#00f0ff; border-color:#00f0ff; color:#111;"/g, '');
js = js.replace(/border-left: 2px solid #00f0ff;/g, 'border-left: 2px solid var(--accent-2);');
fs.writeFileSync('js/app.js', js);

console.log("Patched light mode to be red-themed.");
