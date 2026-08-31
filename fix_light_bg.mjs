import fs from 'fs';
let css = fs.readFileSync('css/styles.css', 'utf8');

// Replace flat light grey variables with warm rosy variables
css = css.replace(/--bg: #f2f3f7;/g, '--bg: #f8f1f4;');
css = css.replace(/--surface: #ffffff;/g, '--surface: #fffdfd;');
css = css.replace(/--surface-2: #e4e5eb;/g, '--surface-2: #f2e3e9;');
css = css.replace(/--border: #dcdde1;/g, '--border: #e8d6de;');

// Append a beautiful radial gradient to the body in light mode
const bodyGlow = `
  body {
    background: radial-gradient(circle at top right, #fde4ec 0%, var(--bg) 70%);
    background-attachment: fixed;
  }
`;

// Insert it into [data-theme="light"]
css = css.replace(
  /\[data-theme="light"\] \{/,
  '[data-theme="light"] {\n' + bodyGlow
);

fs.writeFileSync('css/styles.css', css);
console.log("Light mode background enhanced.");
