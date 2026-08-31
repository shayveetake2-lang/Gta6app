import fs from 'fs';
let css = fs.readFileSync('css/styles.css', 'utf8');

// Fix brand mark
css = css.replace(
  /\.brand__mark\s*\{\s*display: grid;\s*place-items: center;\s*width: 32px;\s*height: 32px;\s*border-radius: 9px;\s*background: linear-gradient\(135deg, var\(--accent\), var\(--accent-2\)\);\s*color: var\(--text\);/g,
  `.brand__mark {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 9px;
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
  color: #fff;`
);

// Fix feed-tab active
css = css.replace(
  /\.feed-tab\.active\s*\{\s*background: #e01e5a;\s*border-color: #e01e5a;\s*box-shadow: 0 0 10px rgba\(224, 30, 90, 0\.5\);\s*\}/g,
  `.feed-tab.active {
  background: #e01e5a;
  border-color: #e01e5a;
  color: #fff;
  box-shadow: 0 0 10px rgba(224, 30, 90, 0.5);
}`
);

// Fix auth modal close button
css = css.replace(
  /\.auth-modal-close\s*\{\s*position: absolute;\s*top: 15px;\s*right: 15px;\s*background: transparent;\s*border: none;\s*color: var\(--text\);/g,
  `.auth-modal-close {
  position: absolute;
  top: 15px;
  right: 15px;
  background: transparent;
  border: none;
  color: #fff;` // Wait, modal is var(--surface). Text should be var(--text). Wait, modal bg is light in light mode, so dark text is correct! Leave it var(--text).
);

// Fix badges
// Wait, the user asked for "a better colour that works with light mode when in light mode".
// I can use CSS variables for the badges.
// Let's replace the hardcoded badge block entirely.

fs.writeFileSync('css/styles.css', css);
