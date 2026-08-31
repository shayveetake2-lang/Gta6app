import fs from 'fs';
let js = fs.readFileSync('js/app.js', 'utf8');

js = js.replace(
  /'<div class="post-card" style="margin-bottom: 2rem; border-top: 3px solid #00f0ff; background: linear-gradient\(180deg, rgba\(0,240,255,0\.05\) 0%, var\(--surface\) 100%\);">'/g,
  `'<div class="post-card" style="margin-bottom: 2rem; border-top: 3px solid var(--accent); background: linear-gradient(180deg, color-mix(in srgb, var(--accent) 8%, transparent) 0%, var(--surface) 100%);">'`
);

js = js.replace(
  /'<div style="margin-bottom: 1\.25rem;"><h2 style="color: var\(--cyan-text\); margin: 0; font-size: 1\.5rem; font-weight: 700; letter-spacing: -0\.02em;">Welcome to Vice City Companion<\/h2><\/div>'/g,
  `'<div style="margin-bottom: 1.25rem;"><h2 style="color: var(--text); margin: 0; font-size: 1.5rem; font-weight: 800; letter-spacing: -0.02em;">Welcome to <span style="color: var(--accent);">Vice City</span> Companion</h2></div>'`
);

fs.writeFileSync('js/app.js', js);
console.log("Welcome guide patched.");
