const fs = require('fs');
let appCode = fs.readFileSync('js/app.js', 'utf8');

appCode = appCode.replace(
  /function newsCard\(n\) \{[\s\S]*?<\/article>';\n  \}/,
  `function newsCard(n) {
    var catClass = (n.category || 'official').toLowerCase().replace(/[^a-z0-9]/g, '-');
    var isAdmin = currentProfile && currentProfile.role === 'Admin';
    var bodyContent = (n.content ? '<div class="news-card__content">' + esc(n.content) + '</div>' : '');
    var sourceHtml = n.sourceLink ? '<a href="' + esc(n.sourceLink) + '" target="_blank" rel="noopener noreferrer" class="btn btn--sm btn--ghost">Source</a>' : '';

    return '' +
      '<article class="card card--news" data-news-id="' + esc(n.id) + '">' +
        '<div class="news-card__body">' +
          '<div class="news-card__header">' +
            '<div style="display:flex;gap:.35rem;align-items:center;">' +
              '<span class="badge badge--' + esc(catClass) + '">' + esc(n.category || 'News') + '</span>' +
              (!n.isApproved ? '<span class="badge" style="background:#ff9900;color:#fff;">PENDING</span>' : '') +
            '</div>' +
            '<span class="card__meta" style="font-size:.8rem">' + esc(n.dateAdded || '') + '</span>' +
          '</div>' +
          '<h3 class="news-card__title">' + esc(n.title) + '</h3>' +
          bodyContent +
          '<div class="news-card__footer">' +
             sourceHtml +
             '<div>' +
               (isAdmin ? '<button class="btn btn--sm btn--danger" onclick="window.deleteNews(\\'' + esc(n.id) + '\\')" style="margin-right:.5rem;">Delete</button>' : '') +
               (isAdmin && !n.isApproved ? '<button class="btn btn--sm btn--approve" onclick="window.approveNews(\\'' + esc(n.id) + '\\')">Approve</button>' : '') +
             '</div>' +
          '</div>' +
        '</div>' +
      '</article>';
  }`
);

appCode = appCode.replace(
  /window\.loadAccount = loadAccount;/,
  `window.loadAccount = loadAccount;
  window.deleteNews = function(id) {
    if (!confirm('Delete news?')) return;
    DB.deleteNews(id).then(function() { alert('Deleted'); route(); }).catch(function(e) { alert(e.message); });
  };
  window.approveNews = function(id) {
    DB.updateNews(id, { isApproved: true }).then(function() { alert('Approved'); route(); }).catch(function(e) { alert(e.message); });
  };
  window.submitNews = function(e) {
    e.preventDefault();
    var fd = new FormData(e.target);
    var isApp = currentProfile && currentProfile.role === 'Admin';
    DB.createNews({
      title: fd.get('title'),
      category: fd.get('category'),
      content: fd.get('content'),
      sourceLink: fd.get('sourceLink'),
      isApproved: isApp
    }).then(function() {
      alert(isApp ? 'News published!' : 'News submitted for approval!');
      e.target.reset();
      route();
    }).catch(function(err) {
      alert(err.message);
    });
  };`
);

let startIndex = appCode.indexOf('function renderAdminNewsPanel(items) {');
let endIndex = appCode.indexOf('setupAdminNewsSearch();', startIndex);
endIndex = appCode.indexOf('});', endIndex) + 3; // end of querySelectorAll forEach

let newRenderAdmin = `function renderAdminNewsPanel(items) {
          var el = document.getElementById('adminPanel-news');
          if (!el) return;
          var alertHtml = newsStatusMsg ? newsStatusMsg : '';
          var searchHtml = '<div class="admin-search"><input id="adminNewsSearch" placeholder="Search news by title, category, author, or source…" /></div>';

          if (!items.length) {
            el.innerHTML = alertHtml + searchHtml + emptyState('No news articles found.');
            setupAdminNewsSearch();
            return;
          }

          el.innerHTML = alertHtml + searchHtml +
            '<div class="stack">' + items.map(function (n) {
              var catClass = (n.category || 'official').toLowerCase().replace(/[^a-z0-9]/g, '-');
              return '<div class="admin-row">' +
                '<div class="admin-row__body">' +
                  '<h3>' + (!n.isApproved ? '<span class="badge" style="background:#ff9900;color:#fff;">PENDING</span> ' : '') + esc(n.title) + ' <span class="badge badge--' + esc(catClass) + '" style="vertical-align:middle;margin-left:.3rem;">' + esc(n.category || 'Official') + '</span></h3>' +
                  '<p class="admin-row__meta">By <strong>@' + esc(n.author) + '</strong> · Source: ' + esc(n.sourceLink || 'None') + ' · ' + esc(n.dateAdded) + '</p>' +
                '</div>' +
                '<div class="admin-row__actions">' +
                  (!n.isApproved ? '<button class="btn btn--approve btn--sm" onclick="window.approveNews(\\'' + esc(n.id) + '\\')">Approve</button>' : '') +
                  '<button class="btn btn--danger btn--sm" onclick="window.deleteNews(\\'' + esc(n.id) + '\\')">Remove</button>' +
                '</div>' +
              '</div>';
            }).join('') + '</div>';

          setupAdminNewsSearch();`;

if (startIndex !== -1) {
  appCode = appCode.substring(0, startIndex) + newRenderAdmin + appCode.substring(endIndex);
}

appCode = appCode.replace(
  /DB\.listNews\(\)\.then\(function \(items\)/,
  `DB.listNews({ includeUnapproved: true }).then(function (items)`
);

appCode = appCode.replace(
  /var newsFormHtml =[\s\S]*?<\/form>';/,
  `var newsFormHtml = '<form class="sidecard stack" onsubmit="window.submitNews(event)">' +
    '<h3>Submit News</h3>' +
    '<div class="field"><label>Title</label><input name="title" required /></div>' +
    '<div class="field"><label>Category</label><select name="category"><option>Official</option><option>Leaks</option><option>Rumour</option><option>Community</option></select></div>' +
    '<div class="field"><label>Content</label><textarea name="content" required></textarea></div>' +
    '<div class="field"><label>Source Link</label><input name="sourceLink" type="url" /></div>' +
    '<button type="submit" class="btn btn--primary">Submit</button>' +
  '</form>';`
);

fs.writeFileSync('js/app.js', appCode);

