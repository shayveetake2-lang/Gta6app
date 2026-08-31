import fs from 'fs';
let css = fs.readFileSync('css/styles.css', 'utf8');

css = css.replace(
  /  width: 100vw;\n  margin-left: calc\(50% - 50vw\);\n  padding-inline: max\(1rem, calc\(\(100vw - var\(--container\)\) \/ 2\)\);/g,
  `  width: 100%;
  padding-inline: max(1rem, calc((100% - var(--container)) / 2));`
);

fs.writeFileSync('css/styles.css', css);
console.log("100vw horizontal overflow bug patched.");
