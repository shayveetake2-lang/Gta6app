import fs from 'fs';
let css = fs.readFileSync('css/styles.css', 'utf8');

// We only want to replace `color: var(--accent-2)` with `color: var(--cyan-text)`
css = css.replace(/color:\s*var\(--accent-2\)/g, 'color: var(--cyan-text)');

fs.writeFileSync('css/styles.css', css);
console.log("accent-2 colors patched.");
