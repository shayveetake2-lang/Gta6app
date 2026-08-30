const fs = require('fs');
let code = fs.readFileSync('js/app.js', 'utf8');

// Remove import
code = code.replace(/import\s*\{\s*renderAtlas,\s*bindAtlasInteractions\s*\}\s*from\s*'\.\/atlas\.js';\s*/, '');

// Remove renderAtlasPage function
code = code.replace(/function renderAtlasPage\(\)\s*\{\s*render\(renderAtlas\(\)\);\s*bindAtlasInteractions\(\{\s*root:\s*main\s*\}\);\s*\}\s*/, '');

// Remove route
code = code.replace(/'\/atlas':\s*renderAtlasPage,\s*/, '');

fs.writeFileSync('js/app.js', code);
