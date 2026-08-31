import fs from 'fs';
let js = fs.readFileSync('js/app.js', 'utf8');

const routeFix = `  function route() {
    // Global listener cleanup phase to prevent memory leaks
    if (window.feedUnsub) { window.feedUnsub(); window.feedUnsub = null; }
    if (window.manualAchUnsub) { window.manualAchUnsub(); window.manualAchUnsub = null; }

    var r = parseHash();`;

js = js.replace(/  function route\(\) {\n    var r = parseHash\(\);/g, routeFix);

fs.writeFileSync('js/app.js', js);
console.log("Memory leaks patched in route()");
