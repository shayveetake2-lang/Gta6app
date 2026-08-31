import fs from 'fs';

// --- STYLES.CSS PATCHES ---
let css = fs.readFileSync('css/styles.css', 'utf8');

// 1. Add var(--cyan-text)
css = css.replace(
  /--accent-2: #00f0ff;/g,
  '--accent-2: #00f0ff;\n  --cyan-text: #00f0ff;'
);
css = css.replace(
  /\[data-theme="light"\] \{\n  --cyan-text: #0099cc;\n  --bg:/,
  '[data-theme="light"] {\n  --cyan-text: #0099cc;\n  --bg:'
); // Just in case it was already there, but since we restored, it's not.
css = css.replace(
  /\[data-theme="light"\] \{\n  --bg:/,
  '[data-theme="light"] {\n  --cyan-text: #0099cc;\n  --bg:'
);

// 2. Fix feed block hardcoded dark colors
css = css.replace(
  /\.post-card\s*\{\s*background:\s*#181820;\s*border-radius:\s*8px;\s*padding:\s*1\.25rem;\s*margin-bottom:\s*1\.5rem;\s*border:\s*1px solid #333;\s*\}/g,
  `.post-card {
  background: var(--surface);
  border-radius: 8px;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
  border: 1px solid var(--border);
}`
);

css = css.replace(
  /\.post-form-textarea\s*\{\s*width:\s*100%;\s*background:\s*transparent;\s*border:\s*none;\s*color:\s*#fff;/g,
  `.post-form-textarea {
  width: 100%;
  background: transparent;
  border: none;
  color: var(--text);`
);

css = css.replace(
  /\.post-form-footer\s*\{\s*display:\s*flex;\s*justify-content:\s*space-between;\s*align-items:\s*center;\s*border-top:\s*1px solid #333;/g,
  `.post-form-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid var(--border);`
);

css = css.replace(
  /\.post-form-select\s*\{\s*background:\s*#0d0d11;\s*color:\s*#fff;\s*border:\s*1px solid #333;/g,
  `.post-form-select {
  background: var(--bg);
  color: var(--text);
  border: 1px solid var(--border);`
);

css = css.replace(
  /\.post-author\s*\{\s*font-weight:\s*bold;\s*color:\s*#fff;\s*\}/g,
  `.post-author {
  font-weight: bold;
  color: var(--text);
}`
);

css = css.replace(
  /\.post-time\s*\{\s*font-size:\s*0\.8rem;\s*color:\s*#888;\s*\}/g,
  `.post-time {
  font-size: 0.8rem;
  color: var(--muted);
}`
);

css = css.replace(
  /\.post-body\s*\{\s*color:\s*#ddd;\s*line-height:\s*1\.5;\s*margin-bottom:\s*1rem;\s*white-space:\s*pre-wrap;\s*\}/g,
  `.post-body {
  color: var(--text);
  line-height: 1.5;
  margin-bottom: 1rem;
  white-space: pre-wrap;
}`
);

css = css.replace(
  /\.empty-feed\s*\{\s*background:\s*#181820;/g,
  `.empty-feed {
  background: var(--surface);`
);

// 3. Fix cyan text where it touches light background
css = css.replace(
  /\.empty-feed \{\n  background: var\(--surface\);\n  border: 1px solid #00f0ff;\n  box-shadow: inset 0 0 15px rgba\(0, 240, 255, 0\.1\);\n  padding: 3rem 1\.5rem;\n  text-align: center;\n  border-radius: 8px;\n  color: #00f0ff;/g,
  `.empty-feed {
  background: var(--surface);
  border: 1px solid #00f0ff;
  box-shadow: inset 0 0 15px rgba(0, 240, 255, 0.1);
  padding: 3rem 1.5rem;
  text-align: center;
  border-radius: 8px;
  color: var(--cyan-text);`
);
css = css.replace(
  /\.auth-modal h3 \{\n  margin-top: 0;\n  color: #00f0ff;/g,
  `.auth-modal h3 {\n  margin-top: 0;\n  color: var(--cyan-text);`
);

// 4. Skeleton Loading Fix
css = css.replace(
  /\.skeleton-post\s*\{\s*background:\s*#181820;/g,
  `.skeleton-post {
  background: var(--surface);`
);
css = css.replace(
  /\.skeleton-avatar\s*\{\s*width:\s*40px;\s*height:\s*40px;\s*border-radius:\s*50%;\s*background:\s*#333;\s*margin-right:\s*1rem;\s*\}/g,
  `.skeleton-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--border);
  margin-right: 1rem;
}`
);
css = css.replace(
  /\.skeleton-line\s*\{\s*height:\s*1rem;\s*background:\s*#333;\s*border-radius:\s*4px;\s*margin-bottom:\s*0\.5rem;\s*\}/g,
  `.skeleton-line {
  height: 1rem;
  background: var(--border);
  border-radius: 4px;
  margin-bottom: 0.5rem;
}`
);

// 5. Auth modal overlay fix
css = css.replace(
  /\.auth-modal\s*\{\s*background:\s*#181820;/g,
  `.auth-modal {
  background: var(--surface);`
);
css = css.replace(
  /\.auth-modal-overlay\s*\{\s*position:\s*fixed;\s*top:\s*0;\s*left:\s*0;\s*right:\s*0;\s*bottom:\s*0;\s*background:\s*rgba\(13, 13, 17, 0\.85\);/g,
  `.auth-modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: color-mix(in srgb, var(--bg) 85%, transparent);`
);

// 6. Feed Tabs fix
css = css.replace(
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

// We leave .feed-tab.active as is, it's magenta background and white text. It's fine.

fs.writeFileSync('css/styles.css', css);


// --- APP.JS PATCHES ---
let js = fs.readFileSync('js/app.js', 'utf8');

// 1. Cyan text
js = js.replace(/color: #00f0ff;/g, 'color: var(--cyan-text);');

// 2. Muted text (replace #aaa)
js = js.replace(/color: #aaa;/g, 'color: var(--muted);');
js = js.replace(/color:#aaa;/g, 'color: var(--muted);');

// 3. Fix manual tracker empty states
js = js.replace(
  /border: 1px solid #333/g,
  'border: 1px solid var(--border)'
);
js = js.replace(
  /background: #181820/g,
  'background: var(--surface)'
);
js = js.replace(
  /color: #fff; padding-right: 2rem;/g,
  'color: var(--text); padding-right: 2rem;'
);

// 4. Admin notices (replace color:#fff; with color:var(--text);)
// The admin notices have light green/red/orange backgrounds that make white text unreadable in light mode.
js = js.replace(
  /color:#fff;/g,
  'color:var(--text);'
);

// But we broke buttons and badges with the previous replace! Re-fix them:
js = js.replace(
  /background-color: #e01e5a; color: var\(--text\); width: 100%;/g,
  'background-color: #e01e5a; color: #fff; width: 100%;'
);
js = js.replace(
  /background:#ff9900;color:var\(--text\);/g,
  'background:#ff9900;color:#fff;'
);

fs.writeFileSync('js/app.js', js);
console.log("All patches applied.");
