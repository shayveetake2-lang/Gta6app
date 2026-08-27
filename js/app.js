import { DB, dbReady } from './data.js';
import { isConfigured } from './firebase.js';

(function () {
  'use strict';

  var main = document.getElementById('main');
  var navToggle = document.getElementById('navToggle');
  var nav = document.getElementById('primaryNav');
  var scrim = document.getElementById('scrim');
  var themeToggle = document.getElementById('themeToggle');
  var searchForm = document.getElementById('globalSearch');
  var searchInput = document.getElementById('globalSearchInput');

  var state = { difficulty: 'all', query: '', category: 'all', accountQuery: '' };
  var trophyState = {};
  try { trophyState = JSON.parse(localStorage.getItem('gta6.trophies.v1') || '{}'); } catch (e) { /* storage blocked */ }

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

  function communityStats(username, guides, threads) {
    var authoredGuides = guides.filter(function (w) { return w.author === username; });
    var authoredThreads = threads.filter(function (t) { return t.author === username; });
    var authoredReplies = threads.reduce(function (total, t) {
      return total + (t.replies || []).filter(function (r) { return r.author === username; }).length;
    }, 0);
    var posts = authoredGuides.length + authoredThreads.length + authoredReplies;
    var likes = authoredGuides.concat(authoredThreads).reduce(function (total, item) {
      return total + (Number(item.likes) || 0);
    }, 0);
    var points = posts * 10 + likes * 5;
    return { posts: posts, likes: likes, points: points, level: Math.min(10, 1 + Math.floor(points / 50)) };
  }

  function levelTag(stats) {
    return '<li class="tag tag--level">Level ' + stats.level + '</li>';
  }

  function decorateUsers(users, guides, threads) {
    return users.map(function (u) {
      return Object.assign({}, u, { community: communityStats(u.username, guides, threads) });
    });
  }

  function render(html) {
    main.innerHTML = html;
    main.focus();
  }

  function parseHash() {
    var raw = location.hash.replace(/^#/, '') || '/';
    var parts = raw.split('/').filter(Boolean);
    return { path: '/' + (parts[0] || ''), id: parts[1] || null };
  }

  /* ---------- shared partials ---------- */

  function walkthroughCard(w) {
    return '' +
      '<a class="card" href="#/walkthroughs/' + esc(w.id) + '">' +
        '<div class="card__media" aria-hidden="true">' + esc(w.cover) + '</div>' +
        '<div class="card__body">' +
          '<span class="badge badge--' + esc(w.difficulty) + '">' + esc(w.difficulty) + '</span>' +
          '<h3 class="card__title">' + esc(w.title) + '</h3>' +
          '<p class="card__meta">' + esc(w.duration) + ' min · by ' + esc(w.author) + ' · updated ' + esc(w.updatedAt) + '</p>' +
          '<p class="card__meta card__likes">♥ ' + (Number(w.likes) || 0) + ' likes</p>' +
          '<ul class="tags">' + w.tags.map(function (t) {
            return '<li class="tag">#' + esc(t) + '</li>';
          }).join('') + '</ul>' +
        '</div>' +
      '</a>';
  }

  function threadRow(t) {
    return '' +
      '<a class="thread" href="#/thread/' + esc(t.id) + '">' +
        '<span class="avatar" aria-hidden="true">' + initials(t.author) + '</span>' +
        '<span class="thread__body">' +
          '<h3 class="thread__title">' + esc(t.title) + '</h3>' +
          '<p class="thread__meta">' + esc(t.category) + ' · ' + esc(t.author) + ' · ' + esc(t.createdAt) + '</p>' +
        '</span>' +
          '<span class="thread__stats"><b>' + (t.replyCount || 0) + '</b>' + (t.replyCount === 1 ? 'reply' : 'replies') + '<small>♥ ' + (Number(t.likes) || 0) + '</small></span>' +
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
        (u.community ? '<ul class="tags account__stats">' + levelTag(u.community) + '<li class="tag">' + u.community.posts + ' posts</li><li class="tag">' + u.community.likes + ' likes</li></ul>' : '') +
      '</a>';
  }

  function emptyState(message) {
    return '<p class="empty">' + esc(message) + '</p>';
  }

  function saveTrophyState() {
    try { localStorage.setItem('gta6.trophies.v1', JSON.stringify(trophyState)); } catch (e) { /* storage blocked */ }
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
    var target = document.getElementById('guideResults') || document.getElementById('accountResults');
    if (target) target.innerHTML = errorState(err);
    else render(errorState(err));
  }

  var Data = {};
  ['listUsers', 'getProfile', 'listWalkthroughs', 'getWalkthrough', 'listThreads',
    'getThread', 'createThread', 'likeThread', 'likeWalkthrough', 'addReply', 'categories', 'listTrophies', 'listContent'].forEach(function (method) {
    Data[method] = function () {
      return DB[method].apply(DB, arguments).catch(function (err) {
        console.error('[db] ' + method + ' failed:', err);
        renderError(err);
        return new Promise(function () {});
      });
    };
  });

  /* ---------- views ---------- */

  // Set by the accounts view so the header search can refresh it in place.
  var refreshAccounts = function () {};

  function walkthroughDetail(id) {
    Data.getWalkthrough(id).then(function (w) {
      if (!w) return render(emptyState('That walkthrough could not be found.'));
      render('' +
        '<a class="btn btn--ghost" href="#/walkthroughs">← Back to guides</a>' +
        '<div class="section-head"><h2>' + esc(w.title) + '</h2></div>' +
        '<div class="detail">' +
          '<div>' +
            '<p class="card__meta">' + esc(w.summary) + '</p>' +
            '<h3>Steps</h3>' +
            '<ol class="steps">' + w.steps.map(function (s) {
              return '<li>' + esc(s) + '</li>';
            }).join('') + '</ol>' +
          '</div>' +
          '<aside class="sidecard">' +
            '<span class="badge badge--' + esc(w.difficulty) + '">' + esc(w.difficulty) + '</span>' +
            '<dl>' +
              '<dt>Game</dt><dd>' + esc(w.game) + '</dd>' +
              '<dt>Time</dt><dd>' + esc(w.duration) + ' min</dd>' +
              '<dt>Author</dt><dd>' + esc(w.author) + '</dd>' +
              '<dt>Updated</dt><dd>' + esc(w.updatedAt) + '</dd>' +
            '</dl>' +
            '<ul class="tags">' + w.tags.map(function (t) {
              return '<li class="tag">#' + esc(t) + '</li>';
            }).join('') + '</ul>' +
            '<button class="btn btn--ghost like-button" data-like-guide="' + esc(w.id) + '" type="button">♥ Like (' + (Number(w.likes) || 0) + ')</button>' +
          '</aside>' +
        '</div>');
      document.querySelector('[data-like-guide]').addEventListener('click', function () {
        Data.likeWalkthrough(w.id).then(function () { walkthroughDetail(w.id); });
      });
    });
  }

  var views = {
    '/': function () {
      Promise.all([Data.listWalkthroughs({}), Data.listThreads(), Data.listUsers({})]).then(function (res) {
        var guides = res[0].slice(0, 3);
        var threads = res[1].slice(0, 3);
        var members = decorateUsers(res[2], res[0], res[1]).slice(0, 4);
        render('' +
          '<section class="hero">' +
            '<h1>Every GTA6 guide, in one place.</h1>' +
            '<p>Step-by-step guides written and reviewed by the community, plus a forum to ask what the guides do not cover.</p>' +
            '<div class="toolbar">' +
              '<a class="btn btn--primary" href="#/walkthroughs">Browse walkthroughs</a>' +
              '<a class="btn btn--ghost" href="#/forum">Visit the forum</a>' +
            '</div>' +
          '</section>' +
          '<div class="section-head"><h2>Latest guides</h2><a href="#/walkthroughs">View all</a></div>' +
          (guides.length ? '<div class="grid">' + guides.map(walkthroughCard).join('') + '</div>'
            : emptyState('No guides published yet.')) +
          '<div class="section-head"><h2>Active discussions</h2><a href="#/forum">View all</a></div>' +
          (threads.length ? '<div class="stack">' + threads.map(threadRow).join('') + '</div>'
            : emptyState('No discussions yet — start the first thread.')) +
          '<div class="section-head"><h2>Members</h2><a href="#/accounts">Search accounts</a></div>' +
          (members.length ? '<div class="grid">' + members.map(accountCard).join('') + '</div>'
            : emptyState('No accounts yet.')));
      });
    },

    '/walkthroughs': function (id) {
      if (id) return walkthroughDetail(id);

      var levels = ['all', 'easy', 'medium', 'hard'];
      render('' +
        '<div class="section-head"><h2>Walkthroughs</h2><span class="card__meta" id="guideCount"></span></div>' +
        '<form class="toolbar" id="guideSearchForm" role="search">' +
          '<div class="field field--grow">' +
            '<label class="sr-only" for="guideSearch">Search guides</label>' +
            '<input type="search" id="guideSearch" placeholder="Search guides…" autocomplete="off" />' +
          '</div>' +
        '</form>' +
        '<div class="toolbar" id="filters">' + levels.map(function (l) {
          return '<button class="chip' + (state.difficulty === l ? ' is-active' : '') + '" data-difficulty="' + l + '">' +
            l.charAt(0).toUpperCase() + l.slice(1) + '</button>';
        }).join('') + '</div>' +
        '<div id="guideResults" aria-live="polite">' + emptyState('Loading…') + '</div>');

      var input = document.getElementById('guideSearch');
      var results = document.getElementById('guideResults');
      var count = document.getElementById('guideCount');
      var filters = document.getElementById('filters');
      input.value = state.query;

      function update() {
        Data.listWalkthroughs({ difficulty: state.difficulty, query: state.query }).then(function (items) {
          count.textContent = items.length + (items.length === 1 ? ' guide' : ' guides');
          results.innerHTML = items.length
            ? '<div class="grid">' + items.map(walkthroughCard).join('') + '</div>'
            : emptyState('No walkthroughs match your filters.');
        });
      }

      document.getElementById('guideSearchForm').addEventListener('submit', function (e) { e.preventDefault(); });
      input.addEventListener('input', debounce(function () {
        state.query = input.value;
        update();
      }));

      filters.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-difficulty]');
        if (!btn) return;
        state.difficulty = btn.dataset.difficulty;
        filters.querySelectorAll('.chip').forEach(function (chip) {
          chip.classList.toggle('is-active', chip === btn);
        });
        update();
      });

      update();
    },

    '/trophies': function () {
      Data.listTrophies().then(function (trophies) {
        var categories = ['all'].concat(trophies.reduce(function (list, trophy) {
          if (list.indexOf(trophy.category) === -1) list.push(trophy.category);
          return list;
        }, []));
        var activeCategory = state.trophyCategory || 'all';

        function update() {
          var visible = trophies.filter(function (trophy) {
            return activeCategory === 'all' || trophy.category === activeCategory;
          });
          var completed = trophies.filter(function (trophy) { return trophyState[trophy.id]; }).length;
          var total = trophies.length;
          document.getElementById('trophyProgress').textContent = completed + ' of ' + total + ' complete';
          document.getElementById('trophyBar').style.width = (total ? completed / total * 100 : 0) + '%';
          document.getElementById('trophyResults').innerHTML = visible.map(function (trophy) {
            return '<label class="trophy' + (trophyState[trophy.id] ? ' is-complete' : '') + '">' +
              '<input type="checkbox" data-trophy-id="' + esc(trophy.id) + '"' + (trophyState[trophy.id] ? ' checked' : '') + ' />' +
              '<span class="trophy__icon" aria-hidden="true">' + (trophy.tier === 'Gold' ? '★' : trophy.tier === 'Silver' ? '◆' : '●') + '</span>' +
              '<span class="trophy__body"><strong>' + esc(trophy.title) + '</strong><span>' + esc(trophy.description) + '</span></span>' +
              '<span class="trophy__tier">' + esc(trophy.tier) + '</span>' +
            '</label>';
          }).join('') || emptyState('No achievements in this category.');
        }

        render('' +
          '<section class="trophy-hero">' +
            '<div><p class="eyebrow">Progress tracker</p><h2>Achievement tracker</h2><p>Keep track of every challenge, collectible and story milestone.</p></div>' +
            '<div class="trophy-summary"><strong id="trophyProgress">0 of ' + trophies.length + ' complete</strong><div class="progress"><span id="trophyBar"></span></div></div>' +
          '</section>' +
          '<div class="toolbar" id="trophyFilters">' + categories.map(function (category) {
            return '<button class="chip' + (activeCategory === category ? ' is-active' : '') + '" data-trophy-category="' + esc(category) + '">' + esc(category === 'all' ? 'All achievements' : category) + '</button>';
          }).join('') + '</div>' +
          '<div class="trophy-list" id="trophyResults" aria-live="polite"></div>');

        document.getElementById('trophyFilters').addEventListener('click', function (event) {
          var button = event.target.closest('[data-trophy-category]');
          if (!button) return;
          activeCategory = button.dataset.trophyCategory;
          state.trophyCategory = activeCategory;
          document.querySelectorAll('[data-trophy-category]').forEach(function (item) {
            item.classList.toggle('is-active', item === button);
          });
          update();
        });
        document.getElementById('trophyResults').addEventListener('change', function (event) {
          var checkbox = event.target.closest('[data-trophy-id]');
          if (!checkbox) return;
          trophyState[checkbox.dataset.trophyId] = checkbox.checked;
          saveTrophyState();
          update();
        });
        update();
      });
    },

    '/news': function () {
      Data.listContent().then(function (sections) {
        render('<section class="content-hero"><p class="eyebrow">Companion intelligence</p><h2>News &amp; Intel</h2><p>Official details, character files, locations, achievement guidance and clearly marked community speculation.</p></section>' +
          '<div class="content-sections">' + sections.map(function (section) {
            return '<section class="content-section" id="' + esc(section.id) + '"><div class="section-head"><div><p class="eyebrow">' + esc(section.label) + '</p><h2>' + esc(section.title) + '</h2></div></div><div class="content-grid">' + section.items.map(function (item) {
              return '<article class="content-card"><h3>' + esc(item.title) + '</h3><p>' + esc(item.body) + '</p><small>' + esc(item.meta) + '</small></article>';
            }).join('') + '</div></section>';
          }).join('') + '</div>');
      });
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
        Promise.all([Data.listUsers({ query: state.accountQuery }), Data.listWalkthroughs({}), Data.listThreads()]).then(function (res) {
          var users = decorateUsers(res[0], res[1], res[2]);
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
        var community = communityStats(u.username, res[1], res[2]);

        render('' +
          '<a class="btn btn--ghost" href="#/accounts">← Back to accounts</a>' +
          '<section class="profile">' +
            '<span class="avatar avatar--xl" aria-hidden="true">' + initials(u.displayName || u.username) + '</span>' +
            '<div>' +
              '<h2 class="profile__name">' + esc(u.displayName || u.username) + '</h2>' +
              '<p class="card__meta">@' + esc(u.username) + ' · ' + esc(u.role || 'Member') + '</p>' +
              '<p>' + esc(u.bio || '') + '</p>' +
              '<ul class="tags">' +
                levelTag(community) +
                '<li class="tag">Joined ' + esc(u.joinedAt) + '</li>' +
                (u.location ? '<li class="tag">' + esc(u.location) + '</li>' : '') +
                '<li class="tag">' + guides.length + ' guides</li>' +
                '<li class="tag">' + threads.length + ' threads</li>' +
                '<li class="tag">' + community.likes + ' likes</li>' +
              '</ul>' +
            '</div>' +
          '</section>' +
          '<div class="section-head"><h2>Guides by ' + esc(u.username) + '</h2></div>' +
          (guides.length ? '<div class="grid">' + guides.map(walkthroughCard).join('') + '</div>' : emptyState('No guides yet.')) +
          '<div class="section-head"><h2>Threads by ' + esc(u.username) + '</h2></div>' +
          (threads.length ? '<div class="stack">' + threads.map(threadRow).join('') + '</div>' : emptyState('No threads yet.')));
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
        render('' +
          '<a class="btn btn--ghost" href="#/forum">← Back to forum</a>' +
          '<div class="section-head"><h2>' + esc(t.title) + '</h2></div>' +
          '<div class="post">' +
            '<span class="avatar" aria-hidden="true">' + initials(t.author) + '</span>' +
            '<div><p class="thread__meta">' + esc(t.author) + ' · ' + esc(t.createdAt) + '</p><p>' + esc(t.body) + '</p><button class="btn btn--ghost like-button" data-like-thread="' + esc(t.id) + '" type="button">♥ Like (' + (Number(t.likes) || 0) + ')</button></div>' +
          '</div>' +
          t.replies.map(function (r) {
            return '<div class="post">' +
              '<span class="avatar" aria-hidden="true">' + initials(r.author) + '</span>' +
              '<div><p class="thread__meta">' + esc(r.author) + ' · ' + esc(r.createdAt) + '</p><p>' + esc(r.body) + '</p></div>' +
            '</div>';
          }).join('') +
          '<form class="stack" id="replyForm" style="margin-top:1.5rem">' +
            '<div class="field"><label for="replyBody">Your reply</label>' +
            '<textarea id="replyBody" required maxlength="2000"></textarea></div>' +
            '<div><button class="btn btn--primary" type="submit">Post reply</button></div>' +
          '</form>');

        document.querySelector('[data-like-thread]').addEventListener('click', function () {
          Data.likeThread(t.id).then(function () { views['/thread'](t.id); });
        });

        document.getElementById('replyForm').addEventListener('submit', function (e) {
          e.preventDefault();
          var body = document.getElementById('replyBody').value.trim();
          if (!body) return;
          Data.addReply(t.id, { body: body }).then(function () { views['/thread'](t.id); });
        });
      });
    },

    '/new-thread': function () {
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
          Data.createThread({
            title: document.getElementById('tTitle').value.trim(),
            category: document.getElementById('tCat').value,
            body: document.getElementById('tBody').value.trim()
          }).then(function (t) { location.hash = '#/thread/' + t.id; });
        });
      });
    },

    '/about': function () {
      render('' +
        '<div class="section-head"><h2>About</h2></div>' +
        '<div class="sidecard" style="max-width:640px">' +
          '<p>Companion for GTA6 is a community library of game guides backed by a database of walkthroughs, steps and forum threads.</p>' +
          '<p class="card__meta">Backend: ' + (isConfigured ? 'Cloud Firestore' : 'local browser storage — add your project keys in js/firebase-config.js to go live') + '.</p>' +
        '</div>');
    }
  };

  /* ---------- router ---------- */

  function setActiveLinks(path) {
    var map = { '/thread': '/forum', '/new-thread': '/forum', '/account': '/accounts' };
    var linkPath = map[path] || path;
    document.querySelectorAll('[data-route-link]').forEach(function (a) {
      a.classList.toggle('is-active', a.dataset.routeLink === linkPath);
    });
  }

  function route() {
    var r = parseHash();
    var view = views[r.path] || views['/'];
    setActiveLinks(views[r.path] ? r.path : '/');
    closeMenu();
    window.scrollTo(0, 0);
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

  themeToggle.addEventListener('click', function () {
    var next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('gta6.theme', next); } catch (e) { /* storage blocked */ }
  });

  /* ---------- search ---------- */

  searchForm.addEventListener('submit', function (e) {
    e.preventDefault();
    state.accountQuery = searchInput.value;
    if (parseHash().path === '/accounts') refreshAccounts();
    else location.hash = '#/accounts';
  });

  searchInput.addEventListener('input', debounce(function () {
    state.accountQuery = searchInput.value;
    if (parseHash().path === '/accounts') refreshAccounts();
    else if (state.accountQuery.trim()) location.hash = '#/accounts';
  }));

  document.getElementById('year').textContent = new Date().getFullYear();
  window.addEventListener('hashchange', route);

  main.innerHTML = emptyState('Loading…');
  dbReady.then(route, route);
})();
