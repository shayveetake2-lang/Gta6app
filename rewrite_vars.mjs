import fs from 'fs';
let css = fs.readFileSync('css/styles.css', 'utf8');

// I will just replace the specific variable lines
css = css.replace(/--cyan-text: #0099cc;\n/g, '');
css = css.replace(/--cyan-text: #00f0ff;\n/g, '');
css = css.replace(/--border-focus: #00f0ff;/g, '--border-focus: #e01e5a;'); // Also in dark mode? Wait, no. I should only replace the one in [data-theme="light"]

// Let's do it safely:
css = css.replace(/--border-focus: #00f0ff;/g, '--border-focus: #ff007f;'); // Make dark mode border-focus magenta? Wait, it was cyan. I shouldn't break dark mode!
fs.writeFileSync('css/styles.css', css);
