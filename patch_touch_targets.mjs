import fs from 'fs';
let css = fs.readFileSync('css/styles.css', 'utf8');

css = css.replace(
  /\.icon-btn \{\n  display: grid;\n  place-items: center;\n  width: 40px;\n  height: 40px;/g,
  `.icon-btn {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;`
);

fs.writeFileSync('css/styles.css', css);
console.log("Touch targets increased to 44px.");
