const fs = require('fs');
let code = fs.readFileSync('js/app.js', 'utf8');

code = code.replace(
  /setupAdminNewsSearch\(\);\n            \}\);\n          \}\);\n        \}/,
  "setupAdminNewsSearch();\n        }"
);

fs.writeFileSync('js/app.js', code);
