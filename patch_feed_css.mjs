import fs from 'fs';
let content = fs.readFileSync('css/styles.css', 'utf8');

// The CSS is at the very end of the file.
// We can just use string replace.

const replacements = [
  {
    search: `background: #181820;`,
    replace: `background: var(--surface);`
  },
  {
    search: `border: 1px solid #333;`,
    replace: `border: 1px solid var(--border);`
  },
  {
    search: `color: #fff;`,
    replace: `color: var(--text);`
  },
  {
    search: `border-top: 1px solid #333;`,
    replace: `border-top: 1px solid var(--border);`
  },
  {
    search: `background: #0d0d11;`,
    replace: `background: var(--bg);`
  },
  {
    search: `color: #888;`,
    replace: `color: var(--muted);`
  },
  {
    search: `color: #ddd;`,
    replace: `color: var(--text);`
  },
  {
    search: `background: #333;`,
    replace: `background: var(--border);`
  }
];

let changed = content;
// We only want to run these replacements in the bottom section (e.g. from `.post-card` down)
// Actually we can just apply these to the `.post-card` and `.skeleton-post` blocks directly to be safer.

// Safer regex replacements:
changed = changed.replace(
  /\.post-card\s*\{\s*background:\s*#181820;\s*border-radius:\s*8px;\s*padding:\s*1\.25rem;\s*margin-bottom:\s*1\.5rem;\s*border:\s*1px solid #333;\s*\}/g,
  `.post-card {
  background: var(--surface);
  border-radius: 8px;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
  border: 1px solid var(--border);
}`
);

changed = changed.replace(
  /\.post-form-textarea\s*\{\s*width:\s*100%;\s*background:\s*transparent;\s*border:\s*none;\s*color:\s*#fff;/g,
  `.post-form-textarea {
  width: 100%;
  background: transparent;
  border: none;
  color: var(--text);`
);

changed = changed.replace(
  /\.post-form-footer\s*\{\s*display:\s*flex;\s*justify-content:\s*space-between;\s*align-items:\s*center;\s*border-top:\s*1px solid #333;/g,
  `.post-form-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid var(--border);`
);

changed = changed.replace(
  /\.post-form-select\s*\{\s*background:\s*#0d0d11;\s*color:\s*#fff;\s*border:\s*1px solid #333;/g,
  `.post-form-select {
  background: var(--bg);
  color: var(--text);
  border: 1px solid var(--border);`
);

changed = changed.replace(
  /\.post-author\s*\{\s*font-weight:\s*bold;\s*color:\s*#fff;\s*\}/g,
  `.post-author {
  font-weight: bold;
  color: var(--text);
}`
);

changed = changed.replace(
  /\.post-time\s*\{\s*font-size:\s*0\.8rem;\s*color:\s*#888;\s*\}/g,
  `.post-time {
  font-size: 0.8rem;
  color: var(--muted);
}`
);

changed = changed.replace(
  /\.post-body\s*\{\s*color:\s*#ddd;\s*line-height:\s*1\.5;\s*margin-bottom:\s*1rem;\s*white-space:\s*pre-wrap;\s*\}/g,
  `.post-body {
  color: var(--text);
  line-height: 1.5;
  margin-bottom: 1rem;
  white-space: pre-wrap;
}`
);

changed = changed.replace(
  /\.empty-feed\s*\{\s*background:\s*#181820;/g,
  `.empty-feed {
  background: var(--surface);`
);

changed = changed.replace(
  /\.skeleton-post\s*\{\s*background:\s*#181820;/g,
  `.skeleton-post {
  background: var(--surface);`
);

changed = changed.replace(
  /\.skeleton-avatar\s*\{\s*width:\s*40px;\s*height:\s*40px;\s*border-radius:\s*50%;\s*background:\s*#333;\s*margin-right:\s*1rem;\s*\}/g,
  `.skeleton-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--border);
  margin-right: 1rem;
}`
);

changed = changed.replace(
  /\.skeleton-line\s*\{\s*height:\s*1rem;\s*background:\s*#333;\s*border-radius:\s*4px;\s*margin-bottom:\s*0\.5rem;\s*\}/g,
  `.skeleton-line {
  height: 1rem;
  background: var(--border);
  border-radius: 4px;
  margin-bottom: 0.5rem;
}`
);

changed = changed.replace(
  /\.auth-modal\s*\{\s*background:\s*#181820;/g,
  `.auth-modal {
  background: var(--surface);`
);

changed = changed.replace(
  /\.auth-modal-overlay\s*\{\s*position:\s*fixed;\s*top:\s*0;\s*left:\s*0;\s*right:\s*0;\s*bottom:\s*0;\s*background:\s*rgba\(13, 13, 17, 0\.85\);/g,
  `.auth-modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: var(--bg);`
);

fs.writeFileSync('css/styles.css', changed);
console.log("Feed CSS variables patched.");
