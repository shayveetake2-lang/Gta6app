const fs = require('fs');
let code = fs.readFileSync('js/data.js', 'utf8');

// Update matchesNews
code = code.replace(
  "n.title + ' ' + n.summary + ' ' + n.body",
  "n.title + ' ' + n.content"
);

// Update siteSearch localNews mapping
code = code.replace(
  /news: clone\(localNews\(\)\.filter\(\(n\) => matchesNews\(n, needle\)\)\.slice\(0, 6\)\)/,
  "news: clone(localNews().filter((n) => n.isApproved && matchesNews(n, needle)).slice(0, 6))"
);

// Update siteSearch firestore mapping
code = code.replace(
  /news: newsSnap\.docs\n\s*\.map\(\(d\) => \(\{ id: d\.id, \.\.\.d\.data\(\), createdAt: toDateString\(d\.data\(\)\.createdAt\) \}\)\)/,
  "news: newsSnap.docs\n          .map((d) => ({ id: d.id, ...d.data(), dateAdded: toDateString(d.data().dateAdded) }))\n          .filter((n) => n.isApproved)"
);

// Add export
code = code.replace(
  /createNews: \(input\) => backend\.createNews\(input\),/,
  `createNews: (input) => backend.createNews(input),\n  updateNews: (id, updates) => backend.updateNews(id, updates),`
);

fs.writeFileSync('js/data.js', code);
