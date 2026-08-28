import { DB, dbReady } from './data.js';
import { isConfigured, onAuthChange, isEmailUser } from './firebase.js';

(function () {
  'use strict';

  var main = document.getElementById('main');
  var navToggle = document.getElementById('navToggle');
  var nav = document.getElementById('primaryNav');
  var scrim = document.getElementById('scrim');
  var searchForm = document.getElementById('globalSearch');
  var searchInput = document.getElementById('globalSearchInput');
  var achievementApi = window.ACHIEVEMENT_API_URL || '';

  var authArea = document.getElementById('authArea');
  var state = { game: 'all', query: '', category: 'all', accountQuery: '', siteQuery: '', newsCategory: 'all', newsQuery: '' };

  /* ---------- auth bar ---------- */

  var currentAuthUser = null;
  var currentProfile = null;

  function renderAuthArea() {
    if (!isConfigured) {
      authArea.innerHTML = '';
      return;
    }
    if (currentAuthUser && isEmailUser()) {
      var name = currentProfile ? currentProfile.username : (currentAuthUser.displayName || currentAuthUser.email || 'Account');
      var isAdmin = currentProfile && currentProfile.role === 'Admin';
      var adminBtn = isAdmin ? '<a class="btn btn--ghost" href="#/admin" style="font-size:.82rem; color: var(--color-primary); font-weight: bold;">Admin Panel</a>' : '';
      
      authArea.innerHTML =
        adminBtn +
        '<a class="btn btn--ghost" href="#/profile/edit" style="font-size:.82rem">@' + esc(name) + '</a>' +
        '<button class="btn btn--ghost" id="logoutBtn" style="font-size:.82rem">Log out</button>';
      document.getElementById('logoutBtn').addEventListener('click', function () {
        DB.logOut().then(function () {
          currentProfile = null;
          currentAuthUser = null;
          renderAuthArea();
          route();
        });
      });
    } else {
      authArea.innerHTML =
        '<a class="btn btn--ghost" href="#/login" style="font-size:.82rem">Log in</a>' +
        '<a class="btn btn--primary" href="#/register" style="font-size:.82rem">Register</a>';
    }
  }

  // Each debounced handler needs its own timer, or the search inputs cancel each other.
  function debounce(fn, wait) {
    var timer = null;
    return function () {
      clearTimeout(timer);
      timer = setTimeout(fn, wait || 200);
    };
  }

  /* ---------- helpers ---------- */

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function initials(name) {
    return esc(String(name).slice(0, 2).toUpperCase());
  }

  function render(html) {
    main.innerHTML = html;
    if (document.activeElement !== searchInput) {
      main.focus();
    }
  }

  function parseHash() {
    var raw = location.hash.replace(/^#/, '') || '/';
    var parts = raw.split('/').filter(Boolean);
    return { path: '/' + (parts[0] || ''), id: parts[1] || null };
  }

  /* ---------- shared partials ---------- */

  function newsCard(n) {
    var catClass = (n.category || 'official').toLowerCase().replace(/[^a-z0-9]/g, '-');
    var isAdmin = currentProfile && currentProfile.role === 'Admin';
    var isAuthor = currentProfile && n.authorUid && currentProfile.id === n.authorUid;

    var bodyContent = '';
    if (n.isSpoiler) {
      bodyContent = '<div class="spoiler-wrapper">' +
        '<button class="btn btn--sm btn--primary spoiler-btn" onclick="this.parentElement.classList.add(\'revealed\')">⚠️ Show Spoiler Content</button>' +
        '<div class="spoiler-content">' +
          (n.summary ? '<p class="news-card__summary">' + esc(n.summary) + '</p>' : '') +
          (n.body ? '<div class="news-card__content">' + esc(n.body) + '</div>' : '') +
        '</div>' +
      '</div>';
    } else {
      bodyContent = (n.summary ? '<p class="news-card__summary">' + esc(n.summary) + '</p>' : '') +
        (n.body ? '<div class="news-card__content">' + esc(n.body) + '</div>' : '');
    }

    return '' +
      '<article class="card card--news' + (n.category === 'Rumour' ? ' card--rumour' : '') + '" data-news-id="' + esc(n.id) + '">' +
        '<div class="news-card__body">' +
          '<div class="news-card__header">' +
            '<div style="display:flex;gap:.35rem;align-items:center;">' +
              '<span class="badge badge--' + esc(catClass) + '">' + esc(n.category || 'News') + '</span>' +
              (n.isSpoiler ? '<span class="badge badge--spoiler" style="background:#ff315d;color:#fff;">[SPOILER]</span>' : '') +
            '</div>' +
            '<span class="card__meta" style="font-size:.8rem">' + esc(n.publishedAt || n.createdAt || '') + '</span>' +
          '</div>' +
          '<h3 class="news-card__title">' + (n.cover ? '<span style="margin-right:.4rem;">' + esc(n.cover) + '</span>' : '') + esc(n.title) + '</h3>' +
          bodyContent +
          '<div class="news-card__footer">' +
            '<span>Source: <strong>' + esc(n.source || 'Community') + '</strong> (' + esc(n.sourceType || 'Community') + ') · By @' + esc(n.author || 'guest') + '</span>' +
            (isAdmin || isAuthor ? '<button class="btn btn--danger btn--sm" data-action="delete-news" data-id="' + esc(n.id) + '" data-title="' + esc(n.title) + '" style="padding:.2rem .55rem;min-height:26px;font-size:.75rem;">Delete</button>' : '') +
          '</div>' +
        '</div>' +
      '</article>';
  }

  function walkthroughCard(w) {
    var catClass = (w.category || 'Missions').toLowerCase().replace(/[^a-z0-9]/g, '-');
    return '' +
      '<a class="card" href="#/walkthroughs/' + esc(w.id) + '">' +
        '<div class="card__body">' +
          '<span class="badge badge--' + esc(catClass) + '">' + esc(w.category || 'Missions') + '</span>' +
          '<h3 class="card__title">' + esc(w.title) + '</h3>' +
          '<p class="card__meta">' + esc(w.duration) + ' min · by ' + esc(w.author) + ' · updated ' + esc(w.updatedAt) + '</p>' +
          '<ul class="tags">' + w.tags.map(function (t) {
            return '<li class="tag">#' + esc(t) + '</li>';
          }).join('') + '</ul>' +
        '</div>' +
      '</a>';
  }

  function threadRow(t) {
    var catClass = (t.category || 'general').toLowerCase().replace(/[^a-z0-9]/g, '-');
    return '' +
      '<a class="thread" href="#/thread/' + esc(t.id) + '">' +
        '<span class="avatar" aria-hidden="true">' + initials(t.author) + '</span>' +
        '<span class="thread__body">' +
          '<h3 class="thread__title">' + esc(t.title) + '</h3>' +
          '<p class="thread__meta"><span class="badge badge--' + esc(catClass) + '" style="margin-right:.4rem;">' + esc(t.category || 'General') + '</span>by <strong>@' + esc(t.author) + '</strong> · ' + esc(t.createdAt) + '</p>' +
        '</span>' +
        '<span class="thread__stats"><b>' + (t.replyCount || 0) + '</b>' + (t.replyCount === 1 ? 'reply' : 'replies') + '</span>' +
      '</a>';
  }

  function accountCard(u) {
    return '' +
      '<a class="card card--account" href="#/account/' + esc(u.id) + '">' +
        '<div class="account__head">' +
          '<span class="avatar avatar--lg" aria-hidden="true">' + initials(u.displayName || u.username) + '</span>' +
          '<div>' +
            '<h3 class="card__title">' + esc(u.displayName || u.username) + '</h3>' +
            '<p class="card__meta">@' + esc(u.username) + ' · ' + esc(u.role || 'Member') + '</p>' +
          '</div>' +
        '</div>' +
        '<p class="card__meta account__bio">' + esc(u.bio || '') + '</p>' +
      '</a>';
  }

  function contentCard(item) {
    return '<article class="card card--content">' +
      '<div class="card__body">' +
        '<p class="card__meta">' + esc(item.section) + ' · ' + esc(item.meta) + '</p>' +
        '<h3 class="card__title">' + esc(item.title) + '</h3>' +
        '<p>' + esc(item.body) + '</p>' +
      '</div>' +
    '</article>';
  }

  function achievementRow(item) {
    return '<article class="achievement-row">' +
      (item.iconUrl ? '<img class="achievement-row__icon" src="' + esc(item.iconUrl) + '" alt="" loading="lazy" />' : '<span class="achievement-row__icon achievement-row__icon--empty" aria-hidden="true">★</span>') +
      '<div class="achievement-row__body"><h3>' + esc(item.achievementName) + '</h3><p class="card__meta">' + esc(item.gameTitle) + ' · ' + esc(item.description || 'No description') + '</p></div>' +
      '<span class="badge achievement-status achievement-status--' + (item.unlocked ? 'unlocked' : 'locked') + '">' + (item.unlocked ? 'Unlocked' : 'Locked') + '</span>' +
      '</article>';
  }

  function emptyState(message) {
    return '<p class="empty">' + esc(message) + '</p>';
  }

  function errorState(err) {
    var message = err.message || '';
    var hint = message;
    if (/currently building/i.test(message)) {
      hint = 'A Firestore index is still building. This usually takes a few minutes — try again shortly.';
    } else if (/requires an index/i.test(message)) {
      hint = 'A Firestore index has not been deployed. Run: npx firebase deploy --only firestore:indexes';
    } else if (/permission|insufficient/i.test(message)) {
      hint = 'The security rules rejected this request.';
    }
    return '<p class="empty"><b>Could not load from the database.</b><br>' + esc(hint) + '</p>';
  }

  // Renders a failure instead of leaving a blank section, and stops the chain.
  // Views with a live results container keep their toolbar so filters stay usable.
  function renderError(err) {
    var target = document.getElementById('guideResults') || document.getElementById('accountResults') || document.getElementById('newsResults');
    if (target) target.innerHTML = errorState(err);
    else render(errorState(err));
  }

  var Data = {};
  ['listUsers', 'getProfile', 'getCurrentProfile', 'updateProfile', 'setUserRole', 'listWalkthroughs', 'getWalkthrough', 'listThreads',
    'getThread', 'createThread', 'createWalkthrough', 'listPendingWalkthroughs', 'approveWalkthrough', 'deletePendingWalkthrough', 'deleteWalkthrough', 'addReply', 'listNews', 'getNews', 'createNews', 'deleteNews', 'categories', 'listContent'].forEach(function (method) {
    Data[method] = function () {
      return DB[method].apply(DB, arguments).catch(function (err) {
        console.error('[db] ' + method + ' failed:', err);
        renderError(err);
        return new Promise(function () {});
      });
    };
  });
  Data.fetchAchievements = function (platform, params) {
    if (!achievementApi) return Promise.reject(new Error('Achievement API is not configured. Set window.ACHIEVEMENT_API_URL in index.html.'));
    var query = new URLSearchParams(params).toString();
    return fetch(achievementApi + '/api/achievements/' + encodeURIComponent(platform) + '?' + query)
      .then(function (response) {
        return response.json().then(function (body) {
          if (!response.ok) throw new Error(body.error || 'The achievement API could not be reached.');
          return body.achievements || [];
        });
      });
  };

  /* ---------- views ---------- */

  // Set by the accounts view so the header search can refresh it in place.
  var refreshAccounts = function () {};

  function walkthroughDetail(id) {
    Data.getWalkthrough(id).then(function (w) {
      if (!w) return render(emptyState('That walkthrough could not be found.'));
      var isAdmin = currentProfile && currentProfile.role === 'Admin';
      render('' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:.5rem;">' +
          '<a class="btn btn--ghost" href="#/walkthroughs">← Back to guides</a>' +
          (isAdmin ? '<button class="btn btn--danger btn--sm" id="adminDeleteWalkthroughBtn">Delete walkthrough (Admin)</button>' : '') +
        '</div>' +
        '<div class="section-head"><h2>' + esc(w.title) + '</h2></div>' +
        '<div class="detail">' +
          '<div>' +
            '<p class="card__meta">' + esc(w.summary) + '</p>' +
            '<h3>Steps</h3>' +
            '<ol class="steps">' + (w.steps || []).map(function (s) {
              return '<li>' + esc(s) + '</li>';
            }).join('') + '</ol>' +
          '</div>' +
          '<aside class="sidecard">' +
            '<span class="badge badge--' + esc((w.category || 'Missions').toLowerCase().replace(/[^a-z0-9]/g, '-')) + '">' + esc(w.category || 'Missions') + '</span>' +
            '<dl>' +
              '<dt>Game</dt><dd>' + esc(w.game) + '</dd>' +
              '<dt>Time</dt><dd>' + esc(w.duration) + ' min</dd>' +
              '<dt>Author</dt><dd>' + esc(w.author) + '</dd>' +
              '<dt>Updated</dt><dd>' + esc(w.updatedAt) + '</dd>' +
            '</dl>' +
            '<ul class="tags">' + (w.tags || []).map(function (t) {
              return '<li class="tag">#' + esc(t) + '</li>';
            }).join('') + '</ul>' +
          '</aside>' +
        '</div>');

      var delBtn = document.getElementById('adminDeleteWalkthroughBtn');
      if (delBtn) {
        delBtn.addEventListener('click', function () {
          if (!confirm('Permanently delete walkthrough "' + w.title + '"?')) return;
          delBtn.disabled = true;
          delBtn.textContent = 'Deleting…';
          DB.deleteWalkthrough(w.id).then(function () {
            location.hash = '#/walkthroughs';
          }).catch(function (err) {
            alert('Error deleting walkthrough: ' + (err.message || err));
            delBtn.disabled = false;
            delBtn.textContent = 'Delete walkthrough (Admin)';
          });
        });
      }
    });
  }

  var views = {
    '/achievements': function () {
      render('' +
        '<div class="section-head"><h2>Achievement tracker</h2><span class="card__meta">Steam · Xbox · PlayStation</span></div>' +
        '<p class="card__meta">Connect a platform account through the API to compare unlocked and locked achievements in one format.</p>' +
        '<form class="toolbar achievement-form" id="achievementForm">' +
          '<div class="field"><label for="achievementPlatform">Platform</label><select id="achievementPlatform">' +
            '<option value="steam">Steam</option><option value="xbox">Xbox</option><option value="playstation">PlayStation</option>' +
          '</select></div>' +
          '<div class="field field--grow"><label for="achievementAccount">Account ID</label><input id="achievementAccount" required placeholder="Steam ID, XUID, or PSN account ID" /></div>' +
          '<div class="field field--grow"><label for="achievementGame">Game ID</label><input id="achievementGame" required placeholder="Steam app ID or platform title ID" /></div>' +
          '<button class="btn btn--primary" type="submit">Load achievements</button>' +
        '</form>' +
        '<div id="achievementResults" aria-live="polite">' + emptyState('Enter an account and game ID to load achievements.') + '</div>');

      var form = document.getElementById('achievementForm');
      var platform = document.getElementById('achievementPlatform');
      var account = document.getElementById('achievementAccount');
      var game = document.getElementById('achievementGame');
      var results = document.getElementById('achievementResults');
      platform.addEventListener('change', function () {
        account.placeholder = platform.value === 'steam' ? '64-bit Steam ID' : platform.value === 'xbox' ? 'Xbox XUID' : 'PSN account ID';
      });
      form.addEventListener('submit', function (event) {
        event.preventDefault();
        var params = platform.value === 'steam' ? { steamId: account.value.trim(), appId: game.value.trim() }
          : platform.value === 'xbox' ? { xuid: account.value.trim(), titleId: game.value.trim() }
          : { accountId: account.value.trim(), titleId: game.value.trim() };
        results.innerHTML = emptyState('Loading achievements…');
        Data.fetchAchievements(platform.value, params).then(function (items) {
          var unlocked = items.filter(function (item) { return item.unlocked; }).length;
          results.innerHTML = '<div class="section-head"><h3>' + unlocked + ' of ' + items.length + ' unlocked</h3></div>' +
            (items.length ? '<div class="achievement-list">' + items.map(achievementRow).join('') + '</div>' : emptyState('No achievements were returned.'));
        }).catch(function (error) {
          results.innerHTML = errorState(error) + '<p class="card__meta achievement-help">Start the API with <code>npm run api</code>, then configure the platform values in <code>.env</code>.</p>';
        });
      });
    },
    '/': function () {
      Promise.all([Data.listNews({}), Data.listWalkthroughs({}), Data.listThreads(), Data.listUsers({}), Data.listContent()]).then(function (res) {
        var news = res[0].slice(0, 3);
        var guides = res[1].slice(0, 3);
        var threads = res[2].slice(0, 3);
        var members = res[3].slice(0, 4);
        var eventSection = res[4].find(function (section) { return section.id === 'gta-online-weekly'; });
        render('' +
          '<section class="hero">' +
            '<h1>Every GTA6 walkthrough, in one place.</h1>' +
            '<p>Step-by-step guides written and reviewed by the community, live GTA 6 news updates, plus a forum to discuss theories and strategies.</p>' +
            '<div class="toolbar">' +
              '<a class="btn btn--primary" href="#/walkthroughs">Browse walkthroughs</a>' +
              '<a class="btn btn--ghost" href="#/news">Latest GTA 6 news</a>' +
              '<a class="btn btn--ghost" href="#/forum">Visit forum</a>' +
            '</div>' +
          '</section>' +
          '<div class="section-head"><h2>Latest GTA 6 news</h2><a href="#/news">View all news</a></div>' +
          (news.length ? '<div class="grid">' + news.map(newsCard).join('') + '</div>'
            : emptyState('No news articles published yet.')) +
          '<div class="section-head"><h2>Latest guides</h2><a href="#/walkthroughs">View all</a></div>' +
          (guides.length ? '<div class="grid">' + guides.map(walkthroughCard).join('') + '</div>'
            : emptyState('No guides published yet.')) +
          (eventSection ? '<div class="section-head"><h2>' + esc(eventSection.title) + '</h2><span class="card__meta">' + esc(eventSection.label) + '</span></div>' +
            '<div class="grid">' + eventSection.items.map(function (item) { return contentCard({ section: eventSection.title, title: item.title, body: item.body, meta: item.meta }); }).join('') + '</div>' : '') +
          '<div class="section-head"><h2>Active discussions</h2><a href="#/forum">View all</a></div>' +
          (threads.length ? '<div class="stack">' + threads.map(threadRow).join('') + '</div>'
            : emptyState('No discussions yet — start the first thread.')) +
          '<div class="section-head"><h2>Members</h2><a href="#/accounts">Search accounts</a></div>' +
          (members.length ? '<div class="grid">' + members.map(accountCard).join('') + '</div>'
            : emptyState('No accounts yet.')) +
          '<section class="about-section" id="about-section">' +
            '<div class="about-hero">' +
              '<h2><span class="brand__mark" aria-hidden="true" style="display:inline-grid;width:28px;height:28px;font-size:.7rem;vertical-align:middle;">G6</span> About GTA6 Walkthrough</h2>' +
              '<p>GTA6 Walkthrough is the community-driven intelligence hub for Grand Theft Auto VI. Built by gamers and speedrunners to provide real-time news, verified mission guides, interactive trophy tracking, and strategy discussions.</p>' +
              '<div class="about-grid">' +
                '<div class="about-box">' +
                  '<h3><span class="news-icon" aria-hidden="true">▥</span> Live GTA 6 News</h3>' +
                  '<p>Community and official updates covering launch dates, trailers, map leaks, protagonist analysis, and hardware performance modes.</p>' +
                '</div>' +
                '<div class="about-box">' +
                  '<h3>🎮 Verified Guides</h3>' +
                  '<p>Step-by-step walkthroughs for story missions, side quests, 100% checklists, and secret vehicle locations with category filters.</p>' +
                '</div>' +
                '<div class="about-box">' +
                  '<h3>★ Trophy & Achievement Tracker</h3>' +
                  '<p>Cross-platform tracker integrating Steam, Xbox Live, and PlayStation Network API synchronization plus custom checklists.</p>' +
                '</div>' +
                '<div class="about-box">' +
                  '<h3>💬 Community Forum</h3>' +
                  '<p>Real-time threads and discussions where players share strategies, theorycrafting, and hardware optimization tips.</p>' +
                '</div>' +
              '</div>' +
              '<div class="about-disclaimer">' +
                '<p><strong>Database Backend:</strong> ' + (isConfigured ? 'Live Cloud Firestore' : 'Local offline browser storage (configure keys in js/firebase-config.js to go live)') + '.</p>' +
                '<p style="margin-top:.35rem;"><strong>Disclaimer & Legal:</strong> Grand Theft Auto, GTA VI, Vice City, and related trademarks belong to Take-Two Interactive Software, Inc. and Rockstar Games. This is an independent community resource.</p>' +
              '</div>' +
            '</div>' +
          '</section>');

        // Hook up delete buttons on home news cards
        main.querySelectorAll('[data-action="delete-news"]').forEach(function (btn) {
          btn.addEventListener('click', function (e) {
            e.stopPropagation();
            var id = btn.dataset.id;
            var title = btn.dataset.title;
            if (!confirm('Permanently delete news article "' + title + '"?')) return;
            btn.disabled = true;
            btn.textContent = 'Deleting…';
            DB.deleteNews(id).then(function () {
              views['/']();
            }).catch(function (err) {
              alert('Error deleting news: ' + (err.message || err));
              btn.disabled = false;
              btn.textContent = 'Delete';
            });
          });
        });
      });
    },

    '/walkthroughs': function (id) {
      if (id) return walkthroughDetail(id);

      var canCreate = isEmailUser();
      render('' +
        '<div id="wtStatusMessage"></div>' +
        '<div class="wt-toolbar">' +
          '<div class="section-head" style="margin:0"><h2>Walkthroughs</h2><span class="card__meta" id="guideCount"></span></div>' +
          (canCreate ? '<button class="btn btn--primary" id="createWtBtn">+ Create walkthrough</button>' : '') +
        '</div>' +
        '<form class="toolbar" id="guideSearchForm" role="search">' +
          '<div class="field field--grow">' +
            '<label class="sr-only" for="guideSearch">Search guides</label>' +
            '<input type="search" id="guideSearch" placeholder="Search guides…" autocomplete="off" />' +
          '</div>' +
        '</form>' +
        '<div class="toolbar" id="gameFilters">' + ['all', 'GTA 6', 'GTA Online'].map(function (game) {
          return '<button class="chip' + (state.game === game ? ' is-active' : '') + '" data-game="' + esc(game) + '">' +
            (game === 'all' ? 'All games' : esc(game)) + '</button>';
        }).join('') + '</div>' +
        '<div class="toolbar" id="filters"></div>' +
        '<div id="guideResults" aria-live="polite">' + emptyState('Loading…') + '</div>' +
        (canCreate ? '' +
          '<div class="modal-overlay" id="wtModal" hidden>' +
            '<div class="modal">' +
              '<div class="modal__head"><h2>Submit a walkthrough</h2><button class="modal__close" id="wtModalClose">✕</button></div>' +
              '<p class="card__meta" style="margin:0 0 1rem">Your walkthrough will be reviewed by an admin before going live.</p>' +
              '<div class="form-error" id="wtError"></div>' +
              '<form class="stack" id="wtForm">' +
                '<div class="field"><label for="wtTitle">Title</label><input id="wtTitle" required maxlength="120" placeholder="e.g. How to complete The Heist" /></div>' +
                '<div class="field"><label for="wtGame">Game</label><input id="wtGame" value="GTA 6" maxlength="60" /></div>' +
                '<div style="display:flex;gap:1rem;flex-wrap:wrap;">' +
                  '<div class="field" style="flex:1"><label for="wtCategory">Category</label><select id="wtCategory"><option>Missions</option><option>Cars</option><option>Races</option><option>Money</option><option>Collectibles</option><option value="__new__">+ Add New Category...</option></select></div>' +
                  '<div class="field" style="flex:1"><label for="wtDuration">Duration (mins)</label><input type="number" id="wtDuration" value="15" min="1" max="999" /></div>' +
                '</div>' +
                '<div class="field" id="wtNewCategoryField" style="display:none;"><label for="wtNewCategory">New Category Name</label><input id="wtNewCategory" placeholder="e.g. Combat, Secrets" maxlength="40" /></div>' +
                '<div class="field"><label for="wtSummary">Summary</label><textarea id="wtSummary" maxlength="400" placeholder="Brief overview…"></textarea></div>' +
                '<div class="field"><label for="wtSteps">Steps (one per line)</label><textarea id="wtSteps" required rows="6" placeholder="Step 1: Go to...&#10;Step 2: Talk to..."></textarea></div>' +
                '<div class="field"><label for="wtTags">Tags (comma separated)</label><input id="wtTags" placeholder="mission, stealth, weapons" /></div>' +
                '<div style="margin-top:1rem;display:flex;justify-content:flex-end;"><button class="btn btn--primary" type="submit">Submit for review</button></div>' +
              '</form>' +
            '</div>' +
          '</div>' : ''));

      var input = document.getElementById('guideSearch');
      var results = document.getElementById('guideResults');
      var count = document.getElementById('guideCount');
      if (input) input.value = state.query;

      function refresh() {
        Data.listWalkthroughs({ query: state.query, category: state.category, game: state.game }).then(function (items) {
          if (!results) return;
          count.textContent = '(' + items.length + ')';

          Data.listWalkthroughs({ query: state.query, game: state.game }).then(function (allItems) {
            var activeCats = new Set(['all', 'Missions', 'Cars', 'Races', 'Money', 'Collectibles']);
            allItems.forEach(function (w) {
              if (w.category) activeCats.add(w.category);
            });
            var categories = Array.from(activeCats);

            var filtersContainer = document.getElementById('filters');
            if (filtersContainer) {
              filtersContainer.innerHTML = categories.map(function (c) {
                return '<button class="chip' + (state.category === c ? ' is-active' : '') + '" data-category="' + esc(c) + '">' +
                  esc(c === 'all' ? 'All' : c) + '</button>';
              }).join('');
            }
          });

          if (!items.length) {
            results.innerHTML = emptyState(state.query ? 'No guides found matching "' + state.query + '"' : 'No walkthroughs yet.');
            return;
          }
          results.innerHTML = '<div class="grid">' + items.map(walkthroughCard).join('') + '</div>';
        });
      }

      refresh();

      if (input) {
        input.addEventListener('input', debounce(function () {
          state.query = input.value.trim().toLowerCase();
          refresh();
        }));
      }

      document.getElementById('filters').addEventListener('click', function (e) {
        if (!e.target.matches('.chip')) return;
        state.category = e.target.dataset.category;
        refresh();
      });

      document.getElementById('gameFilters').addEventListener('click', function (e) {
        if (!e.target.matches('.chip')) return;
        state.game = e.target.dataset.game;
        document.querySelectorAll('#gameFilters .chip').forEach(function (chip) { chip.classList.toggle('is-active', chip === e.target); });
        refresh();
      });

      var wtModal = document.getElementById('wtModal');
      var createBtn = document.getElementById('createWtBtn');
      if (createBtn) {
        createBtn.addEventListener('click', function () {
          wtModal.hidden = false;
          document.getElementById('wtError').classList.remove('is-visible');
        });
        document.getElementById('wtModalClose').addEventListener('click', function () { wtModal.hidden = true; });

        var catSelect = document.getElementById('wtCategory');
        var newCatField = document.getElementById('wtNewCategoryField');
        if (catSelect && newCatField) {
          catSelect.addEventListener('change', function () {
            newCatField.style.display = catSelect.value === '__new__' ? 'block' : 'none';
          });
        }

        document.getElementById('wtForm').addEventListener('submit', function (e) {
          e.preventDefault();
          var btn = e.target.querySelector('[type="submit"]');
          var errEl = document.getElementById('wtError');
          errEl.classList.remove('is-visible');
          btn.disabled = true;
          btn.textContent = 'Submitting…';

          var selectedCat = document.getElementById('wtCategory').value;
          if (selectedCat === '__new__') {
            selectedCat = document.getElementById('wtNewCategory').value.trim() || 'Missions';
          }

          var rawTags = document.getElementById('wtTags').value;
          var tags = rawTags.split(',').map(function (t) { return t.trim(); }).filter(Boolean);
          var steps = document.getElementById('wtSteps').value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
          DB.createWalkthrough({
            title: document.getElementById('wtTitle').value.trim(),
            game: document.getElementById('wtGame').value.trim(),
            summary: document.getElementById('wtSummary').value.trim(),
            steps: steps,
            category: selectedCat,
            duration: document.getElementById('wtDuration').value,
            tags: tags
          }).then(function () {
            wtModal.hidden = true;
            e.target.reset();
            if (newCatField) newCatField.style.display = 'none';
            btn.disabled = false;
            btn.textContent = 'Submit for review';
            var statusDiv = document.getElementById('wtStatusMessage');
            if (statusDiv) {
              statusDiv.innerHTML = '<div class="form-success is-visible" style="margin-bottom:1.5rem;display:flex;justify-content:space-between;align-items:center;">' +
                '<span>✅ Walkthrough submitted! It has been saved temporarily to Pending Walkthroughs and will be published once an admin approves it.</span>' +
                '<button onclick="this.parentElement.remove()" style="background:none;border:none;color:inherit;cursor:pointer;font-size:1.2rem;">✕</button></div>';
            }
          }).catch(function (err) {
            errEl.textContent = err.message || 'Could not submit.';
            errEl.classList.add('is-visible');
            btn.disabled = false;
            btn.textContent = 'Submit for review';
          });
        });
      }
    },

    '/accounts': function () {
      render('' +
        '<div class="section-head"><h2>Accounts</h2><span class="card__meta" id="accountCount"></span></div>' +
        '<form class="toolbar" id="accountSearchForm" role="search">' +
          '<div class="field field--grow">' +
            '<label class="sr-only" for="accountSearch">Search accounts</label>' +
            '<input type="search" id="accountSearch" placeholder="Search by username, name, bio or location…" autocomplete="off" />' +
          '</div>' +
        '</form>' +
        '<div id="accountResults" aria-live="polite">' + emptyState('Searching…') + '</div>');

      var input = document.getElementById('accountSearch');
      var results = document.getElementById('accountResults');
      var count = document.getElementById('accountCount');
      input.value = state.accountQuery;

      function update() {
        Data.listUsers({ query: state.accountQuery }).then(function (users) {
          count.textContent = users.length + (users.length === 1 ? ' account' : ' accounts');
          results.innerHTML = users.length
            ? '<div class="grid">' + users.map(accountCard).join('') + '</div>'
            : emptyState('No accounts match “' + state.accountQuery + '”.');
        });
      }

      document.getElementById('accountSearchForm').addEventListener('submit', function (e) { e.preventDefault(); });
      input.addEventListener('input', debounce(function () {
        state.accountQuery = input.value;
        searchInput.value = input.value; // keep the header field mirrored
        update();
      }));

      refreshAccounts = function () {
        if (input.value !== state.accountQuery) input.value = state.accountQuery;
        update();
      };
      update();
      if (state.accountQuery) input.focus();
    },

    '/account': function (id) {
      if (!id) return views['/accounts']();
      Promise.all([Data.getProfile(id), Data.listWalkthroughs({}), Data.listThreads()]).then(function (res) {
        var u = res[0];
        if (!u) return render(emptyState('That account could not be found.'));
        var guides = res[1].filter(function (w) { return w.author === u.username; });
        var threads = res[2].filter(function (t) { return t.author === u.username; });

        render('' +
          '<a class="btn btn--ghost" href="#/accounts">← Back to accounts</a>' +
          '<section class="profile">' +
            '<span class="avatar avatar--xl" aria-hidden="true">' + initials(u.displayName || u.username) + '</span>' +
            '<div>' +
              '<h2 class="profile__name">' + esc(u.displayName || u.username) + '</h2>' +
              '<p class="card__meta">@' + esc(u.username) + ' · ' + esc(u.role || 'Member') + '</p>' +
              '<p>' + esc(u.bio || '') + '</p>' +
              '<ul class="tags">' +
                '<li class="tag">Joined ' + esc(u.joinedAt) + '</li>' +
                (u.location ? '<li class="tag">' + esc(u.location) + '</li>' : '') +
                '<li class="tag">' + guides.length + ' guides</li>' +
                '<li class="tag">' + threads.length + ' threads</li>' +
              '</ul>' +
            '</div>' +
          '</section>' +
          '<div class="section-head"><h2>Guides by ' + esc(u.username) + '</h2></div>' +
          (guides.length ? '<div class="grid">' + guides.map(walkthroughCard).join('') + '</div>' : emptyState('No guides yet.')) +
          '<div class="section-head"><h2>Threads by ' + esc(u.username) + '</h2></div>' +
          (threads.length ? '<div class="stack">' + threads.map(threadRow).join('') + '</div>' : emptyState('No threads yet.')));
      });
    },

    '/profile': function (id) {
      Data.getCurrentProfile().then(function (user) {
        if (!user) return render(emptyState('No profile is available. <a href="#/login">Log in</a>'));
        if (id !== 'edit') return views['/account'](user.id);
        render('' +
          '<div class="section-head"><h2>Edit profile</h2><span class="card__meta">Your forum identity</span></div>' +
          '<form class="profile-form stack" id="profileForm">' +
            '<div class="field"><label for="profileUsername">Username</label><input id="profileUsername" required minlength="3" maxlength="24" pattern="[A-Za-z0-9_]+" value="' + esc(user.username) + '" /><span class="field__hint">Letters, numbers and underscores only.</span></div>' +
            '<div class="field"><label for="profileDisplayName">Display name</label><input id="profileDisplayName" required maxlength="60" value="' + esc(user.displayName || '') + '" /></div>' +
            '<div class="field"><label for="profileBio">Bio</label><textarea id="profileBio" maxlength="400" placeholder="Tell the forum what you play and write about...">' + esc(user.bio || '') + '</textarea></div>' +
            '<div class="field"><label for="profileLocation">Location</label><input id="profileLocation" maxlength="80" value="' + esc(user.location || '') + '" placeholder="Vice City, Leonida" /></div>' +
            '<div class="toolbar"><button class="btn btn--primary" type="submit">Save profile</button><a class="btn btn--ghost" href="#/account/' + esc(user.id) + '">Cancel</a></div>' +
            '<p class="empty profile-form__status" id="profileStatus" aria-live="polite" hidden></p>' +
          '</form>');

        document.getElementById('profileForm').addEventListener('submit', function (event) {
          event.preventDefault();
          var status = document.getElementById('profileStatus');
          var submit = event.target.querySelector('[type="submit"]');
          submit.disabled = true;
          Data.updateProfile({
            username: document.getElementById('profileUsername').value,
            displayName: document.getElementById('profileDisplayName').value,
            bio: document.getElementById('profileBio').value,
            location: document.getElementById('profileLocation').value
          }).then(function (updated) {
            status.hidden = false;
            status.textContent = 'Profile saved.';
            submit.disabled = false;
            currentProfile = updated;
            renderAuthArea();
          }).catch(function (error) {
            status.hidden = false;
            status.textContent = error.message || 'Could not save your profile.';
            submit.disabled = false;
          });
        });
      });
    },

    '/forum': function () {
      Promise.all([Data.listThreads(state.category), Data.categories()]).then(function (res) {
        var threads = res[0];
        var cats = ['all'].concat(res[1]);
        render('' +
          '<div class="section-head"><h2>Forum</h2><a href="#/new-thread">New thread</a></div>' +
          '<div class="toolbar" id="cats">' + cats.map(function (c) {
            return '<button class="chip' + (state.category === c ? ' is-active' : '') + '" data-cat="' + esc(c) + '">' + esc(c === 'all' ? 'All' : c) + '</button>';
          }).join('') + '</div>' +
          (threads.length
            ? '<div class="stack">' + threads.map(threadRow).join('') + '</div>'
            : emptyState('No threads in this category yet.')));

        document.getElementById('cats').addEventListener('click', function (e) {
          var btn = e.target.closest('[data-cat]');
          if (!btn) return;
          state.category = btn.dataset.cat;
          views['/forum']();
        });
      });
    },

    '/thread': function (id) {
      Data.getThread(id).then(function (t) {
        if (!t) return render(emptyState('That thread could not be found.'));
        var isAdmin = currentProfile && currentProfile.role === 'Admin';
        render('' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:.5rem;">' +
            '<a class="btn btn--ghost" href="#/forum">← Back to forum</a>' +
            (isAdmin ? '<button class="btn btn--danger btn--sm" id="adminDeleteThreadBtn">Delete thread (Admin)</button>' : '') +
          '</div>' +
          '<div class="section-head"><h2>' + esc(t.title) + '</h2></div>' +
          '<div class="post">' +
            '<span class="avatar" aria-hidden="true">' + initials(t.author) + '</span>' +
            '<div><p class="thread__meta">' + esc(t.author) + ' · ' + esc(t.createdAt) + '</p><p>' + esc(t.body) + '</p></div>' +
          '</div>' +
          t.replies.map(function (r) {
            return '<div class="post">' +
              '<span class="avatar" aria-hidden="true">' + initials(r.author) + '</span>' +
              '<div><p class="thread__meta">' + esc(r.author) + ' · ' + esc(r.createdAt) + '</p><p>' + esc(r.body) + '</p></div>' +
            '</div>';
          }).join('') +
          (isEmailUser()
            ? '<form class="stack" id="replyForm" style="margin-top:1.5rem">' +
                '<div class="field"><label for="replyBody">Your reply</label>' +
                '<textarea id="replyBody" required maxlength="2000"></textarea></div>' +
                '<div><button class="btn btn--primary" type="submit">Post reply</button></div>' +
              '</form>'
            : '<div style="margin-top:2rem;padding:1.5rem;text-align:center;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);">' +
                '<p style="color:var(--muted);margin:0 0 1rem;">Log in to join the discussion.</p>' +
                '<div class="toolbar" style="justify-content:center;">' +
                  '<a class="btn btn--primary" href="#/login">Log in</a>' +
                  '<a class="btn btn--ghost" href="#/register">Register</a>' +
                '</div>' +
              '</div>')
        );

        var delThreadBtn = document.getElementById('adminDeleteThreadBtn');
        if (delThreadBtn) {
          delThreadBtn.addEventListener('click', function () {
            if (!confirm('Permanently delete thread "' + t.title + '" and all its replies?')) return;
            delThreadBtn.disabled = true;
            delThreadBtn.textContent = 'Deleting…';
            DB.deleteThread(t.id).then(function () {
              location.hash = '#/forum';
            }).catch(function (err) {
              alert('Error deleting thread: ' + (err.message || err));
              delThreadBtn.disabled = false;
              delThreadBtn.textContent = 'Delete thread (Admin)';
            });
          });
        }

        var replyForm = document.getElementById('replyForm');
        if (replyForm) {
          replyForm.addEventListener('submit', function (e) {
            e.preventDefault();
            var body = document.getElementById('replyBody').value.trim();
            if (!body) return;
            var btn = e.target.querySelector('[type="submit"]');
            btn.disabled = true;
            btn.textContent = 'Posting…';
            Data.addReply(t.id, { body: body }).then(function () {
              views['/thread'](t.id);
            }).catch(function (err) {
              btn.disabled = false;
              btn.textContent = 'Post reply';
              console.error(err);
            });
          });
        }
      });
    },

    '/new-thread': function () {
      if (!isEmailUser()) {
        render('' +
          '<div class="section-head"><h2>Start a thread</h2></div>' +
          '<div class="auth-form" style="max-width:480px;margin:1.5rem auto;text-align:center;">' +
            '<p style="color:var(--muted);margin-bottom:1.25rem;">You must be logged in to post a thread.</p>' +
            '<div class="toolbar" style="justify-content:center;">' +
              '<a class="btn btn--primary" href="#/login">Log in</a>' +
              '<a class="btn btn--ghost" href="#/register">Create account</a>' +
            '</div>' +
          '</div>');
        return;
      }
      Data.categories().then(function (cats) {
        render('' +
          '<div class="section-head"><h2>Start a thread</h2></div>' +
          '<form class="stack" id="threadForm" style="max-width:640px">' +
            '<div class="field"><label for="tTitle">Title</label>' +
            '<input id="tTitle" required maxlength="120" /></div>' +
            '<div class="field"><label for="tCat">Category</label><select id="tCat">' +
              cats.map(function (c) { return '<option>' + esc(c) + '</option>'; }).join('') +
            '</select></div>' +
            '<div class="field"><label for="tBody">Message</label>' +
            '<textarea id="tBody" required maxlength="4000"></textarea></div>' +
            '<div class="toolbar"><button class="btn btn--primary" type="submit">Publish</button>' +
            '<a class="btn btn--ghost" href="#/forum">Cancel</a></div>' +
          '</form>');

        document.getElementById('threadForm').addEventListener('submit', function (e) {
          e.preventDefault();
          var btn = e.target.querySelector('[type="submit"]');
          btn.disabled = true;
          btn.textContent = 'Publishing…';
          Data.createThread({
            title: document.getElementById('tTitle').value.trim(),
            category: document.getElementById('tCat').value,
            body: document.getElementById('tBody').value.trim()
          }).then(function (t) { location.hash = '#/thread/' + t.id; })
            .catch(function (err) {
              btn.disabled = false;
              btn.textContent = 'Publish';
              console.error(err);
            });
        });
      });
    },

    '/news': function () {
      var cats = ['all', 'Official', 'Gameplay', 'Rumour', 'Trailer', 'Community'];
      var canCreate = isConfigured ? isEmailUser() : (currentProfile != null || true);

      render('' +
        '<div id="newsStatusMessage"></div>' +
        '<div class="news-toolbar">' +
          '<div class="section-head" style="margin:0"><h2>GTA 6 News & Intel</h2><span class="card__meta" id="newsCount"></span></div>' +
          (canCreate ? '<button class="btn btn--primary" id="createNewsBtn">+ Add News Article</button>' : '<a class="btn btn--ghost" href="#/login">Log in to post news</a>') +
        '</div>' +
        '<p class="card__meta" style="margin:-.5rem 0 1.25rem;">The latest official announcements, leaks, breakdowns, and community discoveries across Vice City and Leonida.</p>' +
        '<form class="toolbar" id="newsSearchForm" role="search">' +
          '<div class="field field--grow">' +
            '<label class="sr-only" for="newsSearch">Search news</label>' +
            '<input type="search" id="newsSearch" placeholder="Search news by title, summary, or source…" autocomplete="off" />' +
          '</div>' +
        '</form>' +
        '<div class="toolbar" id="newsFilters">' + cats.map(function (c) {
          return '<button class="chip' + (state.newsCategory === c ? ' is-active' : '') + '" data-category="' + esc(c) + '">' +
            esc(c === 'all' ? 'All' : c) + '</button>';
        }).join('') + '</div>' +
        '<div id="newsResults" aria-live="polite">' + emptyState('Loading news…') + '</div>' +
        '<div class="modal-overlay" id="newsModal" hidden>' +
          '<div class="modal">' +
            '<div class="modal__head"><h2>Submit GTA 6 News</h2><button class="modal__close" id="newsModalClose">✕</button></div>' +
            '<p class="card__meta" style="margin:0 0 1rem">Share verified news, trailer breakdowns, or gameplay findings with the community.</p>' +
            '<div class="form-error" id="newsError"></div>' +
            '<form class="stack" id="newsForm">' +
              '<div class="field"><label for="newsTitle">Headline</label><input id="newsTitle" required maxlength="160" placeholder="e.g. New Trailer Breakdown Reveals Hidden Vice City Locations" /></div>' +
              '<div style="display:flex;gap:1rem;flex-wrap:wrap;">' +
                '<div class="field" style="flex:1;min-width:140px;"><label for="newsCategory">Category</label><select id="newsCategory">' +
                  '<option>Official</option><option>Gameplay</option><option>Rumour</option><option>Trailer</option><option>Community</option>' +
                '</select></div>' +
                '<div class="field" style="flex:1;min-width:140px;"><label for="newsCover">Cover Emoji</label><select id="newsCover">' +
                  '<option value="📰">📰 News</option><option value="🌴">🌴 Vice City</option><option value="🎮">🎮 Gameplay</option><option value="🎯">🎯 Mission/Heist</option><option value="⚡">⚡ Tech/Performance</option><option value="🗺️">🗺️ Map</option><option value="🚗">🚗 Vehicles</option><option value="📻">📻 Soundtrack</option>' +
                '</select></div>' +
              '</div>' +
              '<div style="display:flex;gap:1rem;flex-wrap:wrap;">' +
                '<div class="field" style="flex:1;min-width:140px;"><label for="newsSourceType">Source Type</label><input id="newsSourceType" value="Community" placeholder="e.g. Official Rockstar Games" /></div>' +
                '<div class="field" style="flex:1;min-width:140px;"><label for="newsPublishedAt">Published Date</label><input type="date" id="newsPublishedAt" /></div>' +
              '</div>' +
              '<div class="field" style="flex-direction:row;align-items:center;gap:.5rem;"><input type="checkbox" id="newsIsSpoiler" /> <label for="newsIsSpoiler" style="margin:0;cursor:pointer;font-weight:600;">Contains spoilers</label></div>' +
              '<div class="field"><label for="newsSource">Source / Citation</label><input id="newsSource" placeholder="e.g. Rockstar Games, Take-Two Investor Call, Newswire" /></div>' +
              '<div class="field"><label for="newsSummary">Summary / Lead</label><textarea id="newsSummary" required maxlength="400" rows="2" placeholder="Brief 1-2 sentence overview of the news…"></textarea></div>' +
              '<div class="field"><label for="newsBody">Article Content & Details</label><textarea id="newsBody" required rows="6" maxlength="8000" placeholder="Write full details, breakdown points, timestamps, quotes, or sections here…"></textarea></div>' +
              '<div style="margin-top:1rem;display:flex;justify-content:flex-end;gap:.5rem;">' +
                '<button type="button" class="btn btn--ghost" id="newsModalCancel">Cancel</button>' +
                '<button class="btn btn--primary" type="submit">Publish news</button>' +
              '</div>' +
            '</form>' +
          '</div>' +
        '</div>');

      var input = document.getElementById('newsSearch');
      var results = document.getElementById('newsResults');
      var count = document.getElementById('newsCount');
      if (input) input.value = state.newsQuery || '';

      function refreshNews() {
        Data.listNews({ query: state.newsQuery || '', category: state.newsCategory || 'all' }).then(function (items) {
          if (!results) return;
          count.textContent = '(' + items.length + ')';

          var bannerHtml = '';
          if (state.newsCategory === 'Rumour') {
            bannerHtml += '<div class="news-banner news-banner--rumour">' +
              '<strong>⚠️ Rumour Notice:</strong> Posts below contain fan theories, predictions, and unverified community claims. They are not confirmed by Rockstar Games. Do not make purchasing decisions based on this content.' +
              '</div>';
          }
          bannerHtml += '<div class="news-banner news-banner--fact-check">' +
            '<h4>Know the difference</h4>' +
            '<p><strong>Official:</strong> Confirmed by Rockstar Games.</p>' +
            '<p><strong>Gameplay:</strong> An observation based on official footage. It is not necessarily a confirmed feature.</p>' +
            '<p><strong>Rumour:</strong> An unverified claim, prediction, or community theory.</p>' +
            '<p><strong>Community:</strong> A player discussion, poll, screenshot, or guide request.</p>' +
            '<p class="news-banner__footer">If Rockstar has not announced it, we do not label it as confirmed.</p>' +
            '</div>';

          if (!items.length) {
            var emptyMsg = 'No news articles in this category yet.';
            if (state.newsCategory === 'Official') {
              emptyMsg = 'No newer official GTA VI posts are available right now. Explore trailers, official media, character profiles, and the Leonida location guide while you wait.';
            } else if (state.newsCategory === 'Gameplay') {
              emptyMsg = 'No new gameplay analysis has been published. Revisit the official Extended Look or browse the trailer archive.';
            } else if (state.newsCategory === 'Rumour') {
              emptyMsg = 'No community rumours are currently trending. Check back later, or start a theory thread about Leonida, Jason, Lucia, or the supporting cast.';
            } else if (state.newsCategory === 'Trailer') {
              emptyMsg = 'No additional official GTA VI media has been added. Browse Rockstar’s existing trailer, screenshot, and artwork collection.';
            } else if (state.newsCategory === 'Community') {
              emptyMsg = 'No community posts yet. Be the first to start a conversation. Ask a question, create a poll, submit a theory, or request a launch-day guide.';
            } else if (state.newsQuery) {
              emptyMsg = 'No news articles found matching "' + state.newsQuery + '"';
            }
            results.innerHTML = bannerHtml + emptyState(emptyMsg);
            return;
          }
          results.innerHTML = bannerHtml + '<div class="grid">' + items.map(newsCard).join('') + '</div>';

          // Hook up delete buttons on news cards
          results.querySelectorAll('[data-action="delete-news"]').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
              e.stopPropagation();
              var id = btn.dataset.id;
              var title = btn.dataset.title;
              if (!confirm('Permanently delete news article "' + title + '"?')) return;
              btn.disabled = true;
              btn.textContent = 'Deleting…';
              DB.deleteNews(id).then(function () {
                refreshNews();
              }).catch(function (err) {
                alert('Error deleting news: ' + (err.message || err));
                btn.disabled = false;
                btn.textContent = 'Delete';
              });
            });
          });
        });
      }

      refreshNews();

      if (input) {
        input.addEventListener('input', debounce(function () {
          state.newsQuery = input.value.trim().toLowerCase();
          refreshNews();
        }));
      }

      document.getElementById('newsSearchForm').addEventListener('submit', function (e) { e.preventDefault(); });

      document.getElementById('newsFilters').addEventListener('click', function (e) {
        var chip = e.target.closest('.chip');
        if (!chip) return;
        state.newsCategory = chip.dataset.category;
        document.querySelectorAll('#newsFilters .chip').forEach(function (c) { c.classList.toggle('is-active', c === chip); });
        refreshNews();
      });

      var newsModal = document.getElementById('newsModal');
      var createBtn = document.getElementById('createNewsBtn');
      if (createBtn) {
        createBtn.addEventListener('click', function () {
          newsModal.hidden = false;
          document.getElementById('newsError').classList.remove('is-visible');
          var dateInput = document.getElementById('newsPublishedAt');
          if (dateInput) {
            dateInput.value = new Date().toISOString().split('T')[0];
          }
        });
        document.getElementById('newsModalClose').addEventListener('click', function () { newsModal.hidden = true; });
        document.getElementById('newsModalCancel').addEventListener('click', function () { newsModal.hidden = true; });

        document.getElementById('newsForm').addEventListener('submit', function (e) {
          e.preventDefault();
          var btn = e.target.querySelector('[type="submit"]');
          var errEl = document.getElementById('newsError');
          errEl.classList.remove('is-visible');
          btn.disabled = true;
          btn.textContent = 'Publishing…';

          DB.createNews({
            title: document.getElementById('newsTitle').value.trim(),
            category: document.getElementById('newsCategory').value,
            cover: document.getElementById('newsCover').value,
            source: document.getElementById('newsSource').value.trim(),
            summary: document.getElementById('newsSummary').value.trim(),
            body: document.getElementById('newsBody').value.trim(),
            sourceType: document.getElementById('newsSourceType').value.trim(),
            publishedAt: document.getElementById('newsPublishedAt').value || new Date().toISOString().split('T')[0],
            isSpoiler: document.getElementById('newsIsSpoiler').checked
          }).then(function () {
            newsModal.hidden = true;
            e.target.reset();
            btn.disabled = false;
            btn.textContent = 'Publish news';
            var statusDiv = document.getElementById('newsStatusMessage');
            if (statusDiv) {
              statusDiv.innerHTML = '<div class="form-success is-visible" style="margin-bottom:1.5rem;display:flex;justify-content:space-between;align-items:center;">' +
                '<span>✅ News article published successfully! It is now live in the database.</span>' +
                '<button onclick="this.parentElement.remove()" style="background:none;border:none;color:inherit;cursor:pointer;font-size:1.2rem;">✕</button></div>';
            }
            refreshNews();
          }).catch(function (err) {
            errEl.textContent = err.message || 'Could not publish news.';
            errEl.classList.add('is-visible');
            btn.disabled = false;
            btn.textContent = 'Publish news';
          });
        });
      }
    },

    '/about': function () {
      location.hash = '#/';
      setTimeout(function () {
        var el = document.getElementById('about-section');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    },

    '/register': function () {
      render('' +
        '<div class="auth-form">' +
          '<h2>Create account</h2>' +
          '<form class="stack" id="registerForm">' +
            '<div class="form-error" id="regError"></div>' +
            '<div class="field"><label for="regUsername">Username</label><input id="regUsername" required minlength="3" maxlength="24" pattern="[A-Za-z0-9_]+" placeholder="e.g. nova_gta6" /></div>' +
            '<div class="field"><label for="regDisplay">Display name</label><input id="regDisplay" required maxlength="60" placeholder="Your public name" /></div>' +
            '<div class="field"><label for="regEmail">Email</label><input id="regEmail" type="email" required placeholder="you@example.com" /></div>' +
            '<div class="field"><label for="regPassword">Password</label><input id="regPassword" type="password" required minlength="6" placeholder="At least 6 characters" /></div>' +
            '<button class="btn btn--primary" type="submit">Create account</button>' +
          '</form>' +
          '<p class="auth-switch">Already have an account? <a href="#/login">Log in</a></p>' +
        '</div>');
      document.getElementById('registerForm').addEventListener('submit', function (e) {
        e.preventDefault();
        var errEl = document.getElementById('regError');
        errEl.classList.remove('is-visible');
        var btn = e.target.querySelector('[type="submit"]');
        btn.disabled = true;
        btn.textContent = 'Creating…';
        var username = document.getElementById('regUsername').value.trim();
        var displayName = document.getElementById('regDisplay').value.trim() || username;
        var email = document.getElementById('regEmail').value.trim();
        var password = document.getElementById('regPassword').value;

        DB.createUserWithAuth({
          email: email,
          password: password,
          username: username,
          displayName: displayName
        }).then(async function (newProfile) {
          currentProfile = newProfile || await DB.getCurrentProfile();
          renderAuthArea();
          location.hash = '#/';
        }).catch(function (err) {
          errEl.textContent = err.message || 'Could not create account.';
          errEl.classList.add('is-visible');
          btn.disabled = false;
          btn.textContent = 'Create account';
        });
      });
    },

    '/login': function () {
      render('' +
        '<div class="auth-form">' +
          '<h2>Log in</h2>' +
          '<form class="stack" id="loginForm">' +
            '<div class="form-error" id="loginError"></div>' +
            '<div class="field"><label for="loginId">Username or email</label><input id="loginId" required autocomplete="username" placeholder="username or you@example.com" /></div>' +
            '<div class="field"><label for="loginPw">Password</label><input id="loginPw" type="password" required autocomplete="current-password" /></div>' +
            '<button class="btn btn--primary" type="submit">Log in</button>' +
          '</form>' +
          '<p class="auth-switch">No account yet? <a href="#/register">Register</a></p>' +
        '</div>');
      document.getElementById('loginForm').addEventListener('submit', function (e) {
        e.preventDefault();
        var errEl = document.getElementById('loginError');
        errEl.classList.remove('is-visible');
        var btn = e.target.querySelector('[type="submit"]');
        btn.disabled = true;
        btn.textContent = 'Logging in…';
        DB.loginWithUsernameOrEmail({
          usernameOrEmail: document.getElementById('loginId').value.trim(),
          password: document.getElementById('loginPw').value
        }).then(async function () {
          currentProfile = await DB.getCurrentProfile();
          renderAuthArea();
          location.hash = '#/';
        }).catch(function (err) {
          errEl.textContent = err.message || 'Login failed.';
          errEl.classList.add('is-visible');
          btn.disabled = false;
          btn.textContent = 'Log in';
        });
      });
    },

    '/search': function () {
      var q = state.siteQuery || searchInput.value.trim();
      state.siteQuery = q;
      if (searchInput.value !== q && document.activeElement !== searchInput) {
        searchInput.value = q;
      }
      
      if (!q) {
        render('<div class="section-head"><h2>Search</h2></div>' + emptyState('Type something in the search bar above to search across walkthroughs, news, forum threads, and accounts.'));
        return;
      }
      render('<div class="section-head"><h2>Results for "<em>' + esc(q) + '</em>"</h2></div>' +
        '<div id="searchResults" aria-live="polite">' + emptyState('Searching…') + '</div>');
      DB.siteSearch(q).then(function (res) {
        var html = '';
        if (res.news && res.news.length) {
          html += '<div class="search-section"><h3>News & Announcements (' + res.news.length + ')</h3>' +
            res.news.map(function (n) {
              var catClass = (n.category || 'news').toLowerCase().replace(/[^a-z0-9]/g, '-');
              return '<a class="search-hit" href="#/news">' +
                '<span class="search-hit__icon">' + esc(n.cover || '📰') + '</span>' +
                '<div class="search-hit__body">' +
                  '<p class="search-hit__title">' + esc(n.title) + '</p>' +
                  '<p class="search-hit__meta"><span class="badge badge--' + esc(catClass) + '" style="margin-right:.4rem;padding:.1rem .4rem;font-size:.68rem;">' + esc(n.category || 'News') + '</span>by @' + esc(n.author || 'guest') + ' · ' + esc(n.createdAt) + '</p>' +
                '</div>' +
              '</a>';
            }).join('') + '</div>';
        }
        if (res.walkthroughs && res.walkthroughs.length) {
          html += '<div class="search-section"><h3>Walkthroughs (' + res.walkthroughs.length + ')</h3>' +
            res.walkthroughs.map(function (w) {
              return '<a class="search-hit" href="#/walkthroughs/' + esc(w.id) + '">' +
                '<div class="search-hit__body">' +
                  '<p class="search-hit__title">' + esc(w.title) + '</p>' +
                  '<p class="search-hit__meta">' + esc(w.category || 'Missions') + ' · by ' + esc(w.author) + ' · ' + esc(w.updatedAt) + '</p>' +
                '</div>' +
              '</a>';
            }).join('') + '</div>';
        }
        if (res.threads && res.threads.length) {
          html += '<div class="search-section"><h3>Forum threads (' + res.threads.length + ')</h3>' +
            res.threads.map(function (t) {
              return '<a class="search-hit" href="#/thread/' + esc(t.id) + '">' +
                '<span class="search-hit__icon">💬</span>' +
                '<div class="search-hit__body">' +
                  '<p class="search-hit__title">' + esc(t.title) + '</p>' +
                  '<p class="search-hit__meta">' + esc(t.category) + ' · ' + esc(t.author) + ' · ' + esc(t.createdAt) + '</p>' +
                '</div>' +
              '</a>';
            }).join('') + '</div>';
        }
        if (res.users && res.users.length) {
          html += '<div class="search-section"><h3>Members (' + res.users.length + ')</h3>' +
            res.users.map(function (u) {
              return '<a class="search-hit" href="#/account/' + esc(u.id) + '">' +
                '<span class="search-hit__icon">👤</span>' +
                '<div class="search-hit__body">' +
                  '<p class="search-hit__title">' + esc(u.displayName || u.username) + '</p>' +
                  '<p class="search-hit__meta">@' + esc(u.username) + ' · ' + esc(u.role || 'Member') + '</p>' +
                '</div>' +
              '</a>';
            }).join('') + '</div>';
        }
        if (!html) html = emptyState('No results found for "' + esc(q) + '".');
        var resultsEl = document.getElementById('searchResults');
        if (resultsEl) resultsEl.innerHTML = html;
      }).catch(function (err) {
        var el = document.getElementById('searchResults');
        if (el) el.innerHTML = errorState(err);
      });
    },

    '/admin': function () {
      // Gate: only email-authenticated users with Admin role can see this.
      if (!isEmailUser() && isConfigured) {
        render('<div class="section-head"><h2>Admin</h2></div>' +
          emptyState('You must be logged in to access the admin dashboard.') +
          '<div class="toolbar" style="justify-content:center;margin-top:1rem">' +
            '<a class="btn btn--primary" href="#/login">Log in</a>' +
          '</div>');
        return;
      }
      DB.getCurrentProfile().then(function (profile) {
        if (!profile || profile.role !== 'Admin') {
          render('<div class="section-head"><h2>Admin</h2></div>' + emptyState('Access denied — Admin role required.'));
          return;
        }
        render('' +
          '<div class="section-head"><h2>Admin Dashboard</h2><span class="card__meta">Signed in as ' + esc(profile.displayName || profile.username) + ' (Admin)</span></div>' +
          '<div class="admin-tabs">' +
            '<button class="admin-tab is-active" data-tab="pending">Pending walkthroughs</button>' +
            '<button class="admin-tab" data-tab="walkthroughs">Live walkthroughs</button>' +
            '<button class="admin-tab" data-tab="news">News management</button>' +
            '<button class="admin-tab" data-tab="moderation">Forum moderation</button>' +
            '<button class="admin-tab" data-tab="users">User management</button>' +
          '</div>' +
          '<div id="adminPanel-pending" class="admin-panel is-active"><p class="empty">Loading…</p></div>' +
          '<div id="adminPanel-walkthroughs" class="admin-panel"><p class="empty">Loading…</p></div>' +
          '<div id="adminPanel-news" class="admin-panel"><p class="empty">Loading…</p></div>' +
          '<div id="adminPanel-moderation" class="admin-panel"><p class="empty">Loading…</p></div>' +
          '<div id="adminPanel-users" class="admin-panel"><p class="empty">Loading…</p></div>');

        // Tab switching
        document.querySelector('.admin-tabs').addEventListener('click', function (e) {
          var tab = e.target.closest('.admin-tab');
          if (!tab) return;
          document.querySelectorAll('.admin-tab').forEach(function (t) { t.classList.remove('is-active'); });
          document.querySelectorAll('.admin-panel').forEach(function (p) { p.classList.remove('is-active'); });
          tab.classList.add('is-active');
          var targetPanel = document.getElementById('adminPanel-' + tab.dataset.tab);
          if (targetPanel) targetPanel.classList.add('is-active');
        });

        // ==========================================
        // 1. Pending Walkthroughs Panel
        // ==========================================
        var pendingStatusMsg = '';
        function loadPending() {
          DB.listPendingWalkthroughs().then(function (items) {
            var el = document.getElementById('adminPanel-pending');
            if (!el) return;
            var alertHtml = pendingStatusMsg ? pendingStatusMsg : '';
            if (!items.length) {
              el.innerHTML = alertHtml + emptyState('No pending walkthroughs in the database.');
              return;
            }
            el.innerHTML = alertHtml +
              '<div class="section-meta" style="margin-bottom:1rem;color:var(--muted);font-size:.9rem;">Showing ' + items.length + ' pending submission' + (items.length === 1 ? '' : 's') + ' waiting for admin review:</div>' +
              '<div class="stack">' + items.map(function (w) {
                var stepsCount = (w.steps && w.steps.length) || 0;
                var stepsList = (w.steps || []).map(function (s, i) {
                  return '<div style="margin-top:.4rem;padding-left:.8rem;border-left:2px solid var(--accent);">' +
                    '<strong>Step ' + (i + 1) + (s.title ? ': ' + esc(s.title) : '') + '</strong>' +
                    '<div style="font-size:.85rem;color:var(--muted);white-space:pre-wrap;">' + esc(s.content || s) + '</div>' +
                  '</div>';
                }).join('');

                return '<div class="admin-row" data-wt-id="' + esc(w.id) + '">' +
                  '<div class="admin-row__body">' +
                    '<h3>' + esc(w.title) + '</h3>' +
                    '<p class="admin-row__meta">Submitted by <strong>@' + esc(w.author) + '</strong> · ' + esc(w.category || 'Missions') + ' · ' + esc(w.duration) + ' min · ' + esc(w.createdAt || w.updatedAt) + '</p>' +
                    '<p class="admin-row__meta" style="margin-top:.3rem">' + esc(w.summary || '') + '</p>' +
                    (stepsCount ? '<details style="margin-top:.6rem;cursor:pointer;"><summary style="font-size:.84rem;color:var(--accent);font-weight:600;">View ' + stepsCount + ' Step' + (stepsCount === 1 ? '' : 's') + '</summary><div style="margin-top:.5rem;">' + stepsList + '</div></details>' : '') +
                  '</div>' +
                  '<div class="admin-row__actions">' +
                    '<button class="btn btn--approve btn--sm" data-action="approve" data-id="' + esc(w.id) + '" data-title="' + esc(w.title) + '">Approve & Publish</button>' +
                    '<button class="btn btn--danger btn--sm" data-action="delete-pending-wt" data-id="' + esc(w.id) + '" data-title="' + esc(w.title) + '">Delete</button>' +
                  '</div>' +
                '</div>';
              }).join('') + '</div>';

            el.querySelectorAll('[data-action]').forEach(function (btn) {
              btn.addEventListener('click', function () {
                var action = btn.dataset.action;
                var id = btn.dataset.id;
                var title = btn.dataset.title;

                if (action === 'approve') {
                  btn.disabled = true;
                  btn.textContent = 'Approving…';
                  DB.approveWalkthrough(id).then(function () {
                    pendingStatusMsg = '<div class="admin-notice" style="margin-bottom:1.5rem;padding:1rem 1.25rem;border-radius:var(--radius-sm);background:rgba(34,197,94,0.15);border:1px solid #22c55e;color:#fff;">' +
                      '<div style="font-weight:bold;color:#4ade80;font-size:1rem;margin-bottom:.25rem;">✅ Walkthrough Approved and Published!</div>' +
                      '<p style="margin:0 0 .75rem;font-size:.9rem;color:var(--text);">“<strong>' + esc(title) + '</strong>” was moved from Pending Walkthroughs to the live Walkthroughs page for everyone to see.</p>' +
                      '<a class="btn btn--primary btn--sm" href="#/walkthroughs" style="font-size:.82rem;">View on Public Walkthroughs Page →</a>' +
                    '</div>';
                    loadPending();
                    loadPublished();
                  }).catch(function (err) {
                    pendingStatusMsg = '<div class="admin-notice form-error is-visible" style="margin-bottom:1.5rem;display:flex;justify-content:space-between;align-items:center;">' +
                      '<span>Error approving walkthrough: ' + esc(err.message || err) + '</span>' +
                      '<button onclick="this.parentElement.remove()" style="background:none;border:none;color:inherit;cursor:pointer;font-size:1.2rem;">✕</button></div>';
                    loadPending();
                  });
                } else if (action === 'delete-pending-wt') {
                  if (!confirm('Permanently delete pending walkthrough "' + title + '"?')) return;
                  btn.disabled = true;
                  btn.textContent = 'Deleting…';
                  DB.deletePendingWalkthrough(id).then(function () {
                    pendingStatusMsg = '<div class="admin-notice" style="margin-bottom:1.5rem;padding:.85rem 1.15rem;border-radius:var(--radius-sm);background:rgba(239,68,68,0.15);border:1px solid #ef4444;color:#fff;">' +
                      '<div style="font-weight:bold;color:#f87171;font-size:.92rem;">🗑️ Pending Walkthrough Deleted</div>' +
                      '<p style="margin:0;font-size:.88rem;color:var(--text);">“' + esc(title) + '” was removed from the database.</p>' +
                    '</div>';
                    loadPending();
                  }).catch(function (err) {
                    pendingStatusMsg = '<div class="admin-notice form-error is-visible" style="margin-bottom:1.5rem;display:flex;justify-content:space-between;align-items:center;">' +
                      '<span>Error deleting walkthrough: ' + esc(err.message || err) + '</span>' +
                      '<button onclick="this.parentElement.remove()" style="background:none;border:none;color:inherit;cursor:pointer;font-size:1.2rem;">✕</button></div>';
                    loadPending();
                  });
                }
              });
            });
          });
        }
        loadPending();

        // ==========================================
        // 2. Published Walkthroughs Panel
        // ==========================================
        var publishedStatusMsg = '';
        function renderPublishedPanel(items) {
          var el = document.getElementById('adminPanel-walkthroughs');
          if (!el) return;
          var alertHtml = publishedStatusMsg ? publishedStatusMsg : '';
          var searchHtml = '<div class="admin-search"><input id="adminPublishedSearch" placeholder="Search published walkthroughs by title, game, or author…" /></div>';
          
          if (!items.length) {
            el.innerHTML = alertHtml + searchHtml + emptyState('No published walkthroughs found.');
            setupPublishedSearch();
            return;
          }

          el.innerHTML = alertHtml + searchHtml +
            '<div class="stack">' + items.map(function (w) {
              return '<div class="admin-row">' +
                '<div class="admin-row__body">' +
                  '<h3><a href="#/walkthroughs/' + esc(w.id) + '" style="color:var(--accent);text-decoration:none;">' + esc(w.title) + '</a> <span class="badge badge--' + esc((w.category || 'Missions').toLowerCase().replace(/[^a-z0-9]/g, '-')) + '" style="vertical-align:middle;margin-left:.3rem;">' + esc(w.category || 'Missions') + '</span></h3>' +
                  '<p class="admin-row__meta">By <strong>@' + esc(w.author) + '</strong> · ' + esc(w.game || 'GTA 6') + ' · ' + esc(w.duration) + ' min · ' + (w.likes || 0) + ' likes · ' + esc(w.updatedAt || w.createdAt || '') + '</p>' +
                  '<p class="admin-row__meta" style="margin-top:.25rem">' + esc(w.summary || '') + '</p>' +
                '</div>' +
                '<div class="admin-row__actions">' +
                  '<a class="btn btn--ghost btn--sm" href="#/walkthroughs/' + esc(w.id) + '">View</a>' +
                  '<button class="btn btn--danger btn--sm" data-action="delete-published-wt" data-id="' + esc(w.id) + '" data-title="' + esc(w.title) + '">Remove</button>' +
                '</div>' +
              '</div>';
            }).join('') + '</div>';

          setupPublishedSearch();

          el.querySelectorAll('[data-action="delete-published-wt"]').forEach(function (btn) {
            btn.addEventListener('click', function () {
              var id = btn.dataset.id;
              var title = btn.dataset.title;
              if (!confirm('Permanently remove published walkthrough "' + title + '" from the site?')) return;
              btn.disabled = true;
              btn.textContent = 'Removing…';
              DB.deleteWalkthrough(id).then(function () {
                publishedStatusMsg = '<div class="admin-notice" style="margin-bottom:1.5rem;padding:.85rem 1.15rem;border-radius:var(--radius-sm);background:rgba(239,68,68,0.15);border:1px solid #ef4444;color:#fff;">' +
                  '<div style="font-weight:bold;color:#f87171;font-size:.92rem;">🗑️ Walkthrough Removed</div>' +
                  '<p style="margin:0;font-size:.88rem;color:var(--text);">“' + esc(title) + '” was permanently removed from live walkthroughs.</p>' +
                '</div>';
                loadPublished();
              }).catch(function (err) {
                publishedStatusMsg = '<div class="admin-notice form-error is-visible" style="margin-bottom:1.5rem;display:flex;justify-content:space-between;align-items:center;">' +
                  '<span>Error removing walkthrough: ' + esc(err.message || err) + '</span>' +
                  '<button onclick="this.parentElement.remove()" style="background:none;border:none;color:inherit;cursor:pointer;font-size:1.2rem;">✕</button></div>';
                loadPublished();
              });
            });
          });
        }

        function setupPublishedSearch() {
          var input = document.getElementById('adminPublishedSearch');
          if (!input) return;
          input.addEventListener('input', debounce(function () {
            var needle = input.value.trim().toLowerCase();
            DB.listWalkthroughs({ query: needle }).then(renderPublishedPanel);
          }));
        }

        function loadPublished() {
          DB.listWalkthroughs({}).then(renderPublishedPanel);
        }
        loadPublished();

        // ==========================================
        // 3. News Management Panel
        // ==========================================
        var newsStatusMsg = '';
        function renderAdminNewsPanel(items) {
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
                  '<h3>' + (n.cover ? esc(n.cover) + ' ' : '') + esc(n.title) + ' <span class="badge badge--' + esc(catClass) + '" style="vertical-align:middle;margin-left:.3rem;">' + esc(n.category || 'Official') + '</span></h3>' +
                  '<p class="admin-row__meta">By <strong>@' + esc(n.author) + '</strong> · Source: ' + esc(n.source || 'Community') + ' · ' + esc(n.createdAt) + '</p>' +
                  '<p class="admin-row__meta" style="margin-top:.25rem">' + esc(n.summary || '') + '</p>' +
                '</div>' +
                '<div class="admin-row__actions">' +
                  '<a class="btn btn--ghost btn--sm" href="#/news">View page</a>' +
                  '<button class="btn btn--danger btn--sm" data-action="delete-admin-news" data-id="' + esc(n.id) + '" data-title="' + esc(n.title) + '">Remove news</button>' +
                '</div>' +
              '</div>';
            }).join('') + '</div>';

          setupAdminNewsSearch();

          el.querySelectorAll('[data-action="delete-admin-news"]').forEach(function (btn) {
            btn.addEventListener('click', function () {
              var id = btn.dataset.id;
              var title = btn.dataset.title;
              if (!confirm('Permanently remove news article "' + title + '" from the database?')) return;
              btn.disabled = true;
              btn.textContent = 'Removing…';
              DB.deleteNews(id).then(function () {
                newsStatusMsg = '<div class="admin-notice" style="margin-bottom:1.5rem;padding:.85rem 1.15rem;border-radius:var(--radius-sm);background:rgba(239,68,68,0.15);border:1px solid #ef4444;color:#fff;">' +
                  '<div style="font-weight:bold;color:#f87171;font-size:.92rem;">🗑️ News Article Removed</div>' +
                  '<p style="margin:0;font-size:.88rem;color:var(--text);">“' + esc(title) + '” was deleted from the database.</p>' +
                '</div>';
                loadAdminNews();
              }).catch(function (err) {
                newsStatusMsg = '<div class="admin-notice form-error is-visible" style="margin-bottom:1.5rem;display:flex;justify-content:space-between;align-items:center;">' +
                  '<span>Error removing news: ' + esc(err.message || err) + '</span>' +
                  '<button onclick="this.parentElement.remove()" style="background:none;border:none;color:inherit;cursor:pointer;font-size:1.2rem;">✕</button></div>';
                loadAdminNews();
              });
            });
          });
        }

        function setupAdminNewsSearch() {
          var input = document.getElementById('adminNewsSearch');
          if (!input) return;
          input.addEventListener('input', debounce(function () {
            var needle = input.value.trim().toLowerCase();
            DB.listNews({ query: needle }).then(renderAdminNewsPanel);
          }));
        }

        function loadAdminNews() {
          DB.listNews({}).then(renderAdminNewsPanel);
        }
        loadAdminNews();

        // ==========================================
        // 4. Forum Moderation Panel (Threads)
        // ==========================================
        var moderationStatusMsg = '';
        function renderModerationPanel(threads) {
          var el = document.getElementById('adminPanel-moderation');
          if (!el) return;
          var alertHtml = moderationStatusMsg ? moderationStatusMsg : '';
          var searchHtml = '<div class="admin-search"><input id="adminThreadSearch" placeholder="Search threads by title, author, or category…" /></div>';
          
          if (!threads.length) {
            el.innerHTML = alertHtml + searchHtml + emptyState('No threads found.');
            setupThreadSearch();
            return;
          }

          el.innerHTML = alertHtml + searchHtml +
            '<div class="stack">' + threads.map(function (t) {
              var catClass = (t.category || 'general').toLowerCase().replace(/[^a-z0-9]/g, '-');
              return '<div class="admin-row">' +
                '<div class="admin-row__body">' +
                  '<h3><a href="#/thread/' + esc(t.id) + '" style="color:var(--accent-2)">' + esc(t.title) + '</a> <span class="badge badge--' + esc(catClass) + '" style="vertical-align:middle;margin-left:.3rem;">' + esc(t.category || 'General') + '</span></h3>' +
                  '<p class="admin-row__meta">By <strong>@' + esc(t.author) + '</strong> · ' + esc(t.createdAt) + ' · ' + (t.replyCount || 0) + ' replies</p>' +
                  '<p class="admin-row__meta" style="margin-top:.2rem;font-style:italic">' + esc((t.body || '').slice(0, 140)) + (t.body && t.body.length > 140 ? '…' : '') + '</p>' +
                '</div>' +
                '<div class="admin-row__actions">' +
                  '<a class="btn btn--ghost btn--sm" href="#/thread/' + esc(t.id) + '">View</a>' +
                  '<button class="btn btn--danger btn--sm" data-action="delete-thread" data-id="' + esc(t.id) + '" data-title="' + esc(t.title) + '">Delete thread</button>' +
                '</div>' +
              '</div>';
            }).join('') + '</div>';

          setupThreadSearch();

          el.querySelectorAll('[data-action="delete-thread"]').forEach(function (btn) {
            btn.addEventListener('click', function () {
              var id = btn.dataset.id;
              var title = btn.dataset.title;
              if (!confirm('Permanently delete thread "' + title + '" and all its replies?')) return;
              btn.disabled = true;
              btn.textContent = 'Deleting…';
              DB.deleteThread(id).then(function () {
                moderationStatusMsg = '<div class="admin-notice" style="margin-bottom:1.5rem;padding:.85rem 1.15rem;border-radius:var(--radius-sm);background:rgba(239,68,68,0.15);border:1px solid #ef4444;color:#fff;">' +
                  '<div style="font-weight:bold;color:#f87171;font-size:.92rem;">🗑️ Thread Deleted</div>' +
                  '<p style="margin:0;font-size:.88rem;color:var(--text);">“' + esc(title) + '” and its replies were deleted.</p>' +
                '</div>';
                loadThreads();
              }).catch(function (err) {
                moderationStatusMsg = '<div class="admin-notice form-error is-visible" style="margin-bottom:1.5rem;display:flex;justify-content:space-between;align-items:center;">' +
                  '<span>Error deleting thread: ' + esc(err.message || err) + '</span>' +
                  '<button onclick="this.parentElement.remove()" style="background:none;border:none;color:inherit;cursor:pointer;font-size:1.2rem;">✕</button></div>';
                loadThreads();
              });
            });
          });
        }

        function setupThreadSearch() {
          var input = document.getElementById('adminThreadSearch');
          if (!input) return;
          input.addEventListener('input', debounce(function () {
            var needle = input.value.trim().toLowerCase();
            DB.listThreads().then(function (all) {
              var filtered = all.filter(function (t) {
                return (t.title && t.title.toLowerCase().includes(needle)) ||
                  (t.author && t.author.toLowerCase().includes(needle)) ||
                  (t.category && t.category.toLowerCase().includes(needle)) ||
                  (t.body && t.body.toLowerCase().includes(needle));
              });
              renderModerationPanel(filtered);
            });
          }));
        }

        function loadThreads() {
          DB.listThreads().then(renderModerationPanel);
        }
        loadThreads();

        // ==========================================
        // 5. Users Panel (with Admin Promotion & Demotion)
        // ==========================================
        var userStatusMsg = '';
        function renderUsersPanel(users) {
          var el = document.getElementById('adminPanel-users');
          if (!el) return;
          var alertHtml = userStatusMsg ? userStatusMsg : '';
          var searchHtml = '<div class="admin-search"><input id="adminUserSearch" placeholder="Filter by username or name…" /></div>';
          
          if (!users.length) {
            el.innerHTML = alertHtml + searchHtml + emptyState('No users found.');
            setupUserSearch();
            return;
          }
          el.innerHTML = alertHtml + searchHtml +
            '<div id="userList" class="stack">' + users.map(function (u) {
              var isCurrent = (currentProfile && (u.id === currentProfile.id || u.username === currentProfile.username));
              var isAdminUser = (u.role === 'Admin');
              var roleBadgeClass = isAdminUser ? 'badge--admin' : 'badge--general';
              
              var roleActions = '';
              if (!isCurrent) {
                if (isAdminUser) {
                  roleActions += '<button class="btn btn--demote btn--sm" data-action="remove-admin" data-id="' + esc(u.id) + '" data-username="' + esc(u.username) + '">Remove Admin</button>';
                } else {
                  roleActions += '<button class="btn btn--promote btn--sm" data-action="make-admin" data-id="' + esc(u.id) + '" data-username="' + esc(u.username) + '">Make Admin</button>';
                }
                roleActions += '<button class="btn btn--danger btn--sm" data-action="delete-user" data-id="' + esc(u.id) + '" data-username="' + esc(u.username) + '">Delete user</button>';
              } else {
                roleActions += '<span class="card__meta" style="font-size:.8rem;font-style:italic;align-self:center;">(Current session)</span>';
              }

              return '<div class="admin-row">' +
                '<div class="admin-row__body">' +
                  '<h3>' + esc(u.displayName || u.username) + ' <span class="badge ' + roleBadgeClass + '" style="vertical-align:middle;margin-left:.3rem;">' + esc(u.role || 'Member') + '</span></h3>' +
                  '<p class="admin-row__meta">@' + esc(u.username) + (u.email ? ' · ' + esc(u.email) : '') + ' · joined ' + esc(u.joinedAt) + '</p>' +
                '</div>' +
                '<div class="admin-row__actions">' +
                  roleActions +
                '</div>' +
              '</div>';
            }).join('') + '</div>';

          setupUserSearch();

          el.querySelectorAll('[data-action="make-admin"]').forEach(function (btn) {
            btn.addEventListener('click', function () {
              var id = btn.dataset.id;
              var username = btn.dataset.username;
              if (!confirm('Promote @' + username + ' to Admin? They will have full administrative access until an admin revokes it.')) return;
              btn.disabled = true;
              btn.textContent = 'Updating…';
              DB.setUserRole(id, 'Admin').then(function () {
                userStatusMsg = '<div class="admin-notice" style="margin-bottom:1.5rem;padding:.85rem 1.15rem;border-radius:var(--radius-sm);background:rgba(34,197,94,0.15);border:1px solid #22c55e;color:#fff;">' +
                  '<div style="font-weight:bold;color:#4ade80;font-size:.92rem;">👑 Admin Role Granted</div>' +
                  '<p style="margin:0;font-size:.88rem;color:var(--text);"><strong>@' + esc(username) + '</strong> is now an Admin with full administrative privileges.</p>' +
                '</div>';
                loadUsers();
              }).catch(function (err) {
                userStatusMsg = '<div class="admin-notice form-error is-visible" style="margin-bottom:1.5rem;display:flex;justify-content:space-between;align-items:center;">' +
                  '<span>Error promoting user: ' + esc(err.message || err) + '</span>' +
                  '<button onclick="this.parentElement.remove()" style="background:none;border:none;color:inherit;cursor:pointer;font-size:1.2rem;">✕</button></div>';
                loadUsers();
              });
            });
          });

          el.querySelectorAll('[data-action="remove-admin"]').forEach(function (btn) {
            btn.addEventListener('click', function () {
              var id = btn.dataset.id;
              var username = btn.dataset.username;
              if (!confirm('Remove Admin role from @' + username + '? They will be demoted to Member.')) return;
              btn.disabled = true;
              btn.textContent = 'Updating…';
              DB.setUserRole(id, 'Member').then(function () {
                userStatusMsg = '<div class="admin-notice" style="margin-bottom:1.5rem;padding:.85rem 1.15rem;border-radius:var(--radius-sm);background:rgba(245,158,11,0.15);border:1px solid #f59e0b;color:#fff;">' +
                  '<div style="font-weight:bold;color:#fbbf24;font-size:.92rem;">👤 Admin Role Removed</div>' +
                  '<p style="margin:0;font-size:.88rem;color:var(--text);"><strong>@' + esc(username) + '</strong> has been reverted to Member.</p>' +
                '</div>';
                loadUsers();
              }).catch(function (err) {
                userStatusMsg = '<div class="admin-notice form-error is-visible" style="margin-bottom:1.5rem;display:flex;justify-content:space-between;align-items:center;">' +
                  '<span>Error updating user role: ' + esc(err.message || err) + '</span>' +
                  '<button onclick="this.parentElement.remove()" style="background:none;border:none;color:inherit;cursor:pointer;font-size:1.2rem;">✕</button></div>';
                loadUsers();
              });
            });
          });

          el.querySelectorAll('[data-action="delete-user"]').forEach(function (btn) {
            btn.addEventListener('click', function () {
              var id = btn.dataset.id;
              var username = btn.dataset.username;
              if (!confirm('Delete user @' + username + '? This cannot be undone.')) return;
              btn.disabled = true;
              btn.textContent = 'Deleting…';
              DB.deleteUser(id).then(function () {
                userStatusMsg = '<div class="admin-notice" style="margin-bottom:1.5rem;padding:.85rem 1.15rem;border-radius:var(--radius-sm);background:rgba(239,68,68,0.15);border:1px solid #ef4444;color:#fff;">' +
                  '<div style="font-weight:bold;color:#f87171;font-size:.92rem;">🗑️ User Deleted</div>' +
                  '<p style="margin:0;font-size:.88rem;color:var(--text);">User @' + esc(username) + ' was permanently deleted.</p>' +
                '</div>';
                loadUsers();
              }).catch(function (err) {
                userStatusMsg = '<div class="admin-notice form-error is-visible" style="margin-bottom:1.5rem;display:flex;justify-content:space-between;align-items:center;">' +
                  '<span>Error deleting user: ' + esc(err.message || err) + '</span>' +
                  '<button onclick="this.parentElement.remove()" style="background:none;border:none;color:inherit;cursor:pointer;font-size:1.2rem;">✕</button></div>';
                loadUsers();
              });
            });
          });
        }

        function setupUserSearch() {
          var input = document.getElementById('adminUserSearch');
          if (!input) return;
          input.addEventListener('input', debounce(function () {
            var needle = input.value.trim().toLowerCase();
            DB.listUsers({ query: needle }).then(renderUsersPanel);
          }));
        }

        function loadUsers() {
          DB.listUsers({}).then(renderUsersPanel);
        }
        loadUsers();
      });
    }
  };

  /* ---------- router ---------- */

  function setActiveLinks(path) {
    var map = {
      '/thread': '/forum', '/new-thread': '/forum', '/account': '/accounts',
      '/login': '/', '/register': '/', '/search': '/', '/admin': '/', '/profile': '/',
      '/about': '/'
    };
    var linkPath = map[path] || path;
    document.querySelectorAll('[data-route-link]').forEach(function (a) {
      a.classList.toggle('is-active', a.dataset.routeLink === linkPath);
    });
  }

  function route() {
    var r = parseHash();
    var isSearchTyping = document.activeElement === searchInput;
    var view = views[r.path] || views['/'];
    setActiveLinks(views[r.path] ? r.path : '/');
    closeMenu();
    if (!isSearchTyping) {
      window.scrollTo(0, 0);
    }
    view(r.id);
  }

  /* ---------- menu ---------- */

  function openMenu() {
    nav.classList.add('is-open');
    navToggle.setAttribute('aria-expanded', 'true');
    scrim.hidden = false;
  }

  function closeMenu() {
    nav.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
    scrim.hidden = true;
  }

  navToggle.addEventListener('click', function () {
    nav.classList.contains('is-open') ? closeMenu() : openMenu();
  });
  scrim.addEventListener('click', closeMenu);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeMenu();
  });

  /* ---------- theme ---------- */

  var savedTheme = null;
  try { savedTheme = localStorage.getItem('gta6.theme'); } catch (e) { /* storage blocked */ }
  if (savedTheme) document.documentElement.dataset.theme = savedTheme;

  document.querySelectorAll('.theme-toggle').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
      document.documentElement.dataset.theme = next;
      try { localStorage.setItem('gta6.theme', next); } catch (e) { /* storage blocked */ }
    });
  });

  /* ---------- search ---------- */

  searchForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var q = searchInput.value.trim();
    if (!q) return;
    state.siteQuery = q;
    if (parseHash().path !== '/search') location.hash = '#/search';
    else if (views['/search']) views['/search']();
  });

  searchInput.addEventListener('input', debounce(function () {
    var q = searchInput.value;
    state.siteQuery = q.trim();
    if (q.trim().length >= 1) {
      var currentPath = parseHash().path;
      if (currentPath !== '/search') {
        var start = searchInput.selectionStart;
        var end = searchInput.selectionEnd;
        location.hash = '#/search';
        // Ensure searchInput preserves focus and cursor position after hash change and render
        setTimeout(function () {
          searchInput.focus();
          if (start !== null && end !== null) {
            try { searchInput.setSelectionRange(start, end); } catch (err) {}
          }
        }, 0);
      } else if (views['/search']) {
        views['/search']();
      }
    } else if (parseHash().path === '/search') {
      if (views['/search']) views['/search']();
    }
  }, 120));

  document.getElementById('year').textContent = new Date().getFullYear();
  window.addEventListener('hashchange', route);

  // Auth state listener — updates the topbar and re-renders the current view on sign-in/out.
  onAuthChange(async function (user) {
    currentAuthUser = user;
    if (isEmailUser() && user) {
      currentProfile = await DB.getCurrentProfile();
    } else {
      currentProfile = null;
    }
    renderAuthArea();
  });

  main.innerHTML = emptyState('Loading…');
  dbReady.then(route, route);
})();
