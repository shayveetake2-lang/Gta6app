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
  var achievementApi = window.ACHIEVEMENT_API_URL || '';

  var state = { difficulty: 'all', query: '', category: 'all', accountQuery: '', globalQuery: '' };

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
    var target = document.getElementById('guideResults') || document.getElementById('accountResults');
    if (target) target.innerHTML = errorState(err);
    else render(errorState(err));
  }

  var Data = {};
  ['listUsers', 'getProfile', 'getCurrentProfile', 'updateProfile', 'listWalkthroughs', 'getWalkthrough', 'listThreads',
    'getThread', 'createThread', 'addReply', 'categories', 'listContent'].forEach(function (method) {
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
          '</aside>' +
        '</div>');
    });
  }

  var views = {
    '/search': function () {
      var query = state.globalQuery.trim();
      if (!query) return render(emptyState('Enter a search term to search the app.'));
      var needle = query.toLowerCase();
      render('<div class="section-head"><h2>Search results</h2><span class="card__meta">Searching for “' + esc(query) + '”</span></div>' + emptyState('Searching…'));

      Promise.all([
        Data.listWalkthroughs({}),
        Data.listThreads(),
        Data.listUsers({}),
        Data.listContent()
      ]).then(function (res) {
        var guides = res[0].filter(function (w) { return (w.title + ' ' + w.summary + ' ' + (w.tags || []).join(' ')).toLowerCase().includes(needle); });
        var threads = res[1].filter(function (t) { return (t.title + ' ' + t.body + ' ' + t.category + ' ' + t.author).toLowerCase().includes(needle); });
        var users = res[2].filter(function (u) { return (u.username + ' ' + u.displayName + ' ' + (u.bio || '') + ' ' + (u.location || '')).toLowerCase().includes(needle); });
        var content = [];
        res[3].forEach(function (section) {
          section.items.forEach(function (item) {
            if ((item.title + ' ' + item.body + ' ' + item.meta + ' ' + section.title).toLowerCase().includes(needle)) {
              content.push({ section: section.title, title: item.title, body: item.body, meta: item.meta });
            }
          });
        });

        var total = guides.length + threads.length + users.length + content.length;
        var html = '<div class="section-head"><h2>Search results</h2><span class="card__meta">' + total + (total === 1 ? ' result' : ' results') + '</span></div>';
        if (!total) return render(html + emptyState('Nothing in the app matches “' + esc(query) + '”.'));
        if (guides.length) html += '<div class="section-head"><h3>Walkthroughs</h3></div><div class="grid">' + guides.map(walkthroughCard).join('') + '</div>';
        if (threads.length) html += '<div class="section-head"><h3>Forum discussions</h3></div><div class="stack">' + threads.map(threadRow).join('') + '</div>';
        if (users.length) html += '<div class="section-head"><h3>Accounts</h3></div><div class="grid">' + users.map(accountCard).join('') + '</div>';
        if (content.length) html += '<div class="section-head"><h3>GTA6 information</h3></div><div class="grid">' + content.map(contentCard).join('') + '</div>';
        render(html);
      });
    },
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
      Promise.all([Data.listWalkthroughs({}), Data.listThreads(), Data.listUsers({})]).then(function (res) {
        var guides = res[0].slice(0, 3);
        var threads = res[1].slice(0, 3);
        var members = res[2].slice(0, 4);
        render('' +
          '<section class="hero">' +
            '<h1>Every GTA6 walkthrough, in one place.</h1>' +
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
        if (id !== 'edit') return views['/']();
        Data.getCurrentProfile().then(function (user) {
          if (!user) return render(emptyState('No profile is available to edit.'));
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
              document.querySelector('.profile-btn__label').textContent = updated.displayName || updated.username;
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
        render('' +
          '<a class="btn btn--ghost" href="#/forum">← Back to forum</a>' +
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
          '<form class="stack" id="replyForm" style="margin-top:1.5rem">' +
            '<div class="field"><label for="replyBody">Your reply</label>' +
            '<textarea id="replyBody" required maxlength="2000"></textarea></div>' +
            '<div><button class="btn btn--primary" type="submit">Post reply</button></div>' +
          '</form>');

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
          '<p>GTA6 Walkthrough is a community library of game guides backed by a database of walkthroughs, steps and forum threads.</p>' +
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
    state.globalQuery = searchInput.value;
    if (parseHash().path === '/search') views['/search']();
    else location.hash = '#/search';
  });

  searchInput.addEventListener('input', debounce(function () {
    state.globalQuery = searchInput.value;
  }));

  document.getElementById('year').textContent = new Date().getFullYear();
  window.addEventListener('hashchange', route);

  main.innerHTML = emptyState('Loading…');
  dbReady.then(route, route);
})();
