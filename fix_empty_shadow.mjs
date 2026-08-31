import fs from 'fs';
let css = fs.readFileSync('css/styles.css', 'utf8');

css = css.replace(
  /\[data-theme="light"\] \{/,
  '[data-theme="light"] {\n  .empty, .empty-feed { text-shadow: none; }'
);

fs.writeFileSync('css/styles.css', css);
console.log("Empty shadow removed in light mode.");
