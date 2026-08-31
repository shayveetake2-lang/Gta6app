import fs from 'fs';
let css = fs.readFileSync('css/styles.css', 'utf8');

// Remove the solid overrides
css = css.replace(/\.badge--missions \{ background: #007bff; color: var\(--text\); \}\n\.badge--races \{ background: #ff7f50; color: var\(--text\); \}\n\.badge--cars \{ background: #28a745; color: var\(--text\); \}\n\.badge--news \{ background: #6c757d; color: var\(--text\); \}\n\.badge--guides \{ background: #17a2b8; color: var\(--text\); \}\n\.badge--discussions \{ background: #6f42c1; color: var\(--text\); \}\n/g, '');

css = css.replace(/\.badge--missions \{ background: #007bff; color: var\(--text\); \}\n\.badge--races \{ background: #ff7f50; color: var\(--text\); \}\n\.badge--cars \{ background: #28a745; color: var\(--text\); \}\n\.badge--money \{ background: #FFD700; color: #111; \}\n/g, '');

// If the previous ones didn't match exactly because of spaces, we'll do line-by-line replace
let lines = css.split('\n');
lines = lines.filter(line => !line.startsWith('.badge--missions { background: #007bff;'));
lines = lines.filter(line => !line.startsWith('.badge--races { background: #ff7f50;'));
lines = lines.filter(line => !line.startsWith('.badge--cars { background: #28a745;'));
lines = lines.filter(line => !line.startsWith('.badge--news { background: #6c757d;'));
lines = lines.filter(line => !line.startsWith('.badge--guides { background: #17a2b8;'));
lines = lines.filter(line => !line.startsWith('.badge--discussions { background: #6f42c1;'));
lines = lines.filter(line => !line.startsWith('.badge--money { background: #FFD700;'));
css = lines.join('\n');

// Add light mode badge styles inside the [data-theme="light"] block
const lightBadges = `
  .badge--missions { background: rgba(0, 123, 255, 0.15); color: #0056b3; border: none; box-shadow: none; text-shadow: none; }
  .badge--cars { background: rgba(40, 167, 69, 0.15); color: #1e7e34; border: none; box-shadow: none; text-shadow: none; }
  .badge--races { background: rgba(255, 127, 80, 0.15); color: #cc5228; border: none; box-shadow: none; text-shadow: none; }
  .badge--money { background: rgba(34, 197, 94, 0.15); color: #15803d; border: none; box-shadow: none; text-shadow: none; }
  .badge--collectibles { background: rgba(168, 85, 247, 0.15); color: #7e22ce; border: none; box-shadow: none; text-shadow: none; }
  .badge--guides { background: rgba(14, 165, 233, 0.15); color: #0369a1; border: none; box-shadow: none; text-shadow: none; }
  .badge--tech { background: rgba(217, 70, 239, 0.15); color: #a21caf; border: none; box-shadow: none; text-shadow: none; }
  .badge--general { background: rgba(148, 163, 184, 0.2); color: #475569; border: none; box-shadow: none; text-shadow: none; }
  .badge--news { background: rgba(14, 165, 233, 0.15); color: #0369a1; border: none; box-shadow: none; text-shadow: none; }
  .badge--gta-online { background: rgba(249, 115, 22, 0.15); color: #c2410c; border: none; box-shadow: none; text-shadow: none; }
  .badge--off-topic { background: rgba(234, 179, 8, 0.2); color: #a16207; border: none; box-shadow: none; text-shadow: none; }
  .badge--official { background: rgba(16, 185, 129, 0.15); color: #047857; border: none; box-shadow: none; text-shadow: none; }
  .badge--gameplay { background: rgba(139, 92, 246, 0.15); color: #6d28d9; border: none; box-shadow: none; text-shadow: none; }
  .badge--rumour { background: rgba(249, 115, 22, 0.15); color: #c2410c; border: none; box-shadow: none; text-shadow: none; }
  .badge--trailer { background: rgba(236, 72, 153, 0.15); color: #be185d; border: none; box-shadow: none; text-shadow: none; }
  .badge--community { background: rgba(59, 130, 246, 0.15); color: #1d4ed8; border: none; box-shadow: none; text-shadow: none; }
  .badge--admin { background: rgba(255, 0, 127, 0.15); color: #be005e; border: none; box-shadow: none; text-shadow: none; }
  .badge--discussions { background: rgba(111, 66, 193, 0.15); color: #5a32a3; border: none; box-shadow: none; text-shadow: none; }
`;

css = css.replace(
  /\[data-theme="light"\] \{/,
  '[data-theme="light"] {\n' + lightBadges
);

fs.writeFileSync('css/styles.css', css);
console.log("badges fixed.");
