import fs from 'fs';
let js = fs.readFileSync('js/app.js', 'utf8');

const routeFix = `  function route() {
    // Global listener cleanup phase to prevent memory leaks
    if (window.feedUnsub) { window.feedUnsub(); window.feedUnsub = null; }
    if (window.manualAchUnsub) { window.manualAchUnsub(); window.manualAchUnsub = null; }

    // Reset global state on tab navigation to prevent state bleed
    state.query = "";
    state.category = "all";
    state.game = "all";
    state.accountQuery = "";
    state.siteQuery = "";
    state.newsCategory = "all";
    state.newsQuery = "";

    var r = parseHash();`;

js = js.replace(/  function route\(\) \{\n    \/\/ Global listener cleanup phase to prevent memory leaks\n    if \(window\.feedUnsub\) \{ window\.feedUnsub\(\); window\.feedUnsub = null; \}\n    if \(window\.manualAchUnsub\) \{ window\.manualAchUnsub\(\); window\.manualAchUnsub = null; \}\n\n    var r = parseHash\(\);/g, routeFix);

fs.writeFileSync('js/app.js', js);
console.log("State bleed patched in route()");
