import fs from 'fs';
let js = fs.readFileSync('js/app.js', 'utf8');

js = js.replace(
  /DB\.listWalkthroughs\(\{ query: needle \}\)\.then\(renderPublishedPanel\);/g,
  'DB.listWalkthroughs({ query: needle }).then(renderPublishedPanel).catch(function(err){ console.error(err); alert("Error loading walkthroughs: " + (err.message || err)); });'
);

js = js.replace(
  /DB\.listWalkthroughs\(\{\}\)\.then\(renderPublishedPanel\);/g,
  'DB.listWalkthroughs({}).then(renderPublishedPanel).catch(function(err){ console.error(err); alert("Error loading walkthroughs: " + (err.message || err)); });'
);

fs.writeFileSync('js/app.js', js);
console.log("listWalkthroughs catch blocks added.");
