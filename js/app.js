import { DB, dbReady } from './data.js';
import { isConfigured, onAuthChange, isEmailUser } from './firebase.js';

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

  var authArea = document.getElementById('authArea');
  var state = { difficulty: 'all', query: '', category: 'all', accountQuery: '', siteQuery: '' };

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
    var target = document.getElementById('guideResults') || document.getElementById('accountResults');
    if (target) target.innerHTML = errorState(err);
    else render(errorState(err));
  }

  var Data = {};
  ['listUsers', 'getProfile', 'getCurrentProfile', 'updateProfile', 'listWalkthroughs', 'getWalkthrough', 'listThreads',
    'getThread', 'createThread', 'createWalkthrough', 'listPendingWalkthroughs', 'approveWalkthrough', 'deletePendingWalkthrough', 'deleteWalkthrough', 'addReply', 'categories', 'listContent'].forEach(function (method) {
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
        '<div class="toolbar" id="filters">' + levels.map(function (l) {
          return '<button class="chip' + (state.difficulty === l ? ' is-active' : '') + '" data-difficulty="' + l + '">' +
            l.charAt(0).toUpperCase() + l.slice(1) + '</button>';
        }).join('') + '</div>' +
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
                '<div class="field"><label for="wtSummary">Summary</label><textarea id="wtSummary" maxlength="400" placeholder="Brief overview…"></textarea></div>' +
                '<div class="field"><label for="wtSteps">Steps (one per line)</label><textarea id="wtSteps" required rows="6" placeholder="Step 1: Go to...&#10;Step 2: Talk to..."></textarea></div>' +
                '<div style="display:flex;gap:1rem;">' +
                  '<div class="field" style="flex:1"><label for="wtDifficulty">Difficulty</label><select id="wtDifficulty"><option>easy</option><option>medium</option><option>hard</option></select></div>' +
                  '<div class="field" style="flex:1"><label for="wtDuration">Duration (mins)</label><input type="number" id="wtDuration" value="15" min="1" max="999" /></div>' +
                '</div>' +
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
        Data.listWalkthroughs({ query: state.query, difficulty: state.difficulty }).then(function (items) {
          if (!results) return;
          count.textContent = '(' + items.length + ')';
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
        state.difficulty = e.target.dataset.difficulty;
        document.querySelectorAll('#filters .chip').forEach(function (c) { c.classList.toggle('is-active', c === e.target); });
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
        document.getElementById('wtForm').addEventListener('submit', function (e) {
          e.preventDefault();
          var btn = e.target.querySelector('[type="submit"]');
          var errEl = document.getElementById('wtError');
          errEl.classList.remove('is-visible');
          btn.disabled = true;
          btn.textContent = 'Submitting…';
          var rawTags = document.getElementById('wtTags').value;
          var tags = rawTags.split(',').map(function (t) { return t.trim(); }).filter(Boolean);
          var steps = document.getElementById('wtSteps').value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
          DB.createWalkthrough({
            title: document.getElementById('wtTitle').value.trim(),
            game: document.getElementById('wtGame').value.trim(),
            summary: document.getElementById('wtSummary').value.trim(),
            steps: steps,
            difficulty: document.getElementById('wtDifficulty').value,
            duration: document.getElementById('wtDuration').value,
            tags: tags
          }).then(function () {
            wtModal.hidden = true;
            e.target.reset();
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

    '/about': function () {
      render('' +
        '<div class="section-head"><h2>About</h2></div>' +
        '<div class="sidecard" style="max-width:640px">' +
          '<p>GTA6 Walkthrough is a community library of game guides backed by a database of walkthroughs, steps and forum threads.</p>' +
          '<p class="card__meta">Backend: ' + (isConfigured ? 'Cloud Firestore' : 'local browser storage — add your project keys in js/firebase-config.js to go live') + '.</p>' +
        '</div>');
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
      searchInput.value = q;
      
      if (!q) {
        render('<div class="section-head"><h2>Search</h2></div>' + emptyState('Type something in the search bar above.'));
        return;
      }
      render('<div class="section-head"><h2>Results for "<em>' + esc(q) + '</em>"</h2></div>' +
        '<div id="searchResults" aria-live="polite">' + emptyState('Searching…') + '</div>');
      DB.siteSearch(q).then(function (res) {
        var html = '';
        if (res.walkthroughs.length) {
          html += '<div class="search-section"><h3>Walkthroughs</h3>' +
            res.walkthroughs.map(function (w) {
              return '<a class="search-hit" href="#/walkthroughs/' + esc(w.id) + '">' +
                '<span class="search-hit__icon">' + esc(w.cover || '🎮') + '</span>' +
                '<div class="search-hit__body">' +
                  '<p class="search-hit__title">' + esc(w.title) + '</p>' +
                  '<p class="search-hit__meta">' + esc(w.difficulty) + ' · by ' + esc(w.author) + ' · ' + esc(w.updatedAt) + '</p>' +
                '</div>' +
              '</a>';
            }).join('') + '</div>';
        }
        if (res.threads.length) {
          html += '<div class="search-section"><h3>Forum threads</h3>' +
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
        if (res.users.length) {
          html += '<div class="search-section"><h3>Members</h3>' +
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
        document.getElementById('searchResults').innerHTML = html;
      }).catch(function (err) {
        var el = document.getElementById('searchResults');
        if (el) el.innerHTML = errorState(err);
      });
    },

    '/admin': function () {
      // Gate: only email-authenticated users with Admin role can see this.
      if (!isEmailUser()) {
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
          '<div class="section-head"><h2>Admin Dashboard</h2><span class="card__meta">Signed in as ' + esc(profile.displayName || profile.username) + '</span></div>' +
          '<div class="admin-tabs">' +
            '<button class="admin-tab is-active" data-tab="walkthroughs">Pending walkthroughs</button>' +
            '<button class="admin-tab" data-tab="users">User management</button>' +
            '<button class="admin-tab" data-tab="moderation">Forum moderation</button>' +
          '</div>' +
          '<div id="adminPanel-walkthroughs" class="admin-panel is-active"><p class="empty">Loading…</p></div>' +
          '<div id="adminPanel-users" class="admin-panel"><p class="empty">Loading…</p></div>' +
          '<div id="adminPanel-moderation" class="admin-panel"><p class="empty">Loading…</p></div>');

        // Tab switching
        document.querySelector('.admin-tabs').addEventListener('click', function (e) {
          var tab = e.target.closest('.admin-tab');
          if (!tab) return;
          document.querySelectorAll('.admin-tab').forEach(function (t) { t.classList.remove('is-active'); });
          document.querySelectorAll('.admin-panel').forEach(function (p) { p.classList.remove('is-active'); });
          tab.classList.add('is-active');
          document.getElementById('adminPanel-' + tab.dataset.tab).classList.add('is-active');
        });

        // -- Walkthroughs panel --
        var pendingStatusMsg = '';

        function loadPending() {
          DB.listPendingWalkthroughs().then(function (items) {
            var el = document.getElementById('adminPanel-walkthroughs');
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
                    '<div style="font-size:.85rem;color:var(--muted);white-space:pre-wrap;">' + esc(s.content || '') + '</div>' +
                  '</div>';
                }).join('');

                return '<div class="admin-row" data-wt-id="' + esc(w.id) + '">' +
                  '<div class="admin-row__body">' +
                    '<h3>' + esc(w.title) + '</h3>' +
                    '<p class="admin-row__meta">Submitted by <strong>@' + esc(w.author) + '</strong> · ' + esc(w.difficulty) + ' · ' + esc(w.duration) + ' min · ' + esc(w.createdAt || w.updatedAt) + '</p>' +
                    '<p class="admin-row__meta" style="margin-top:.3rem">' + esc(w.summary || '') + '</p>' +
                    (stepsCount ? '<details style="margin-top:.6rem;cursor:pointer;"><summary style="font-size:.84rem;color:var(--accent);font-weight:600;">View ' + stepsCount + ' Step' + (stepsCount === 1 ? '' : 's') + '</summary><div style="margin-top:.5rem;">' + stepsList + '</div></details>' : '') +
                  '</div>' +
                  '<div class="admin-row__actions">' +
                    '<button class="btn btn--approve btn--sm" data-action="approve" data-id="' + esc(w.id) + '" data-title="' + esc(w.title) + '">Approve & Publish</button>' +
                    '<button class="btn btn--danger btn--sm" data-action="delete-wt" data-id="' + esc(w.id) + '" data-title="' + esc(w.title) + '">Delete</button>' +
                  '</div>' +
                '</div>';
              }).join('') + '</div>';

            el.querySelectorAll('[data-action]').forEach(function (btn) {
              btn.addEventListener('click', function (ev) {
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
                  }).catch(function (err) {
                    pendingStatusMsg = '<div class="admin-notice form-error is-visible" style="margin-bottom:1.5rem;display:flex;justify-content:space-between;align-items:center;">' +
                      '<span>Error approving walkthrough: ' + esc(err.message || err) + '</span>' +
                      '<button onclick="this.parentElement.remove()" style="background:none;border:none;color:inherit;cursor:pointer;font-size:1.2rem;">✕</button></div>';
                    loadPending();
                    // button state is reset on next render via loadPending
                  });
                } else if (action === 'delete-wt') {
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

        // -- Users panel --
        function renderUsersPanel(users) {
          var el = document.getElementById('adminPanel-users');
          if (!el) return;
          if (!users.length) { el.innerHTML = emptyState('No users found.'); return; }
          el.innerHTML = '<div class="admin-search"><input id="adminUserSearch" placeholder="Filter by username or name…" /></div>' +
            '<div id="userList">' + users.map(function (u) {
              return '<div class="admin-row">' +
                '<div class="admin-row__body">' +
                  '<h3>' + esc(u.displayName || u.username) + ' <span class="badge" style="vertical-align:middle">' + esc(u.role || 'Member') + '</span></h3>' +
                  '<p class="admin-row__meta">@' + esc(u.username) + ' · ' + esc(u.email || '') + ' · joined ' + esc(u.joinedAt) + '</p>' +
                '</div>' +
                '<div class="admin-row__actions">' +
                  (u.role !== 'Admin' ? '<button class="btn btn--danger btn--sm" data-action="delete-user" data-id="' + esc(u.id) + '">Delete</button>' : '') +
                '</div>' +
              '</div>';
            }).join('') + '</div>';
          document.getElementById('adminUserSearch').addEventListener('input', debounce(function () {
            var needle = document.getElementById('adminUserSearch').value.trim().toLowerCase();
            DB.listUsers({ query: needle }).then(function (filtered) { renderUsersPanel(filtered); });
          }));
          el.addEventListener('click', function (ev) {
            var btn = ev.target.closest('[data-action="delete-user"]');
            if (!btn) return;
            if (confirm('Delete this user? This cannot be undone.')) {
              DB.deleteUser(btn.dataset.id).then(function () {
                DB.listUsers({}).then(renderUsersPanel);
              });
            }
          });
        }
        DB.listUsers({}).then(renderUsersPanel);

        // -- Moderation panel --
        function renderModerationPanel(threads) {
          var el = document.getElementById('adminPanel-moderation');
          if (!el) return;
          if (!threads.length) { el.innerHTML = emptyState('No threads found.'); return; }
          el.innerHTML = threads.map(function (t) {
            return '<div class="admin-row">' +
              '<div class="admin-row__body">' +
                '<h3><a href="#/thread/' + esc(t.id) + '" style="color:var(--accent-2)">' + esc(t.title) + '</a></h3>' +
                '<p class="admin-row__meta">' + esc(t.category) + ' · by ' + esc(t.author) + ' · ' + esc(t.createdAt) + ' · ' + (t.replyCount || 0) + ' replies</p>' +
                '<p class="admin-row__meta" style="margin-top:.2rem;font-style:italic">' + esc((t.body || '').slice(0, 120)) + (t.body && t.body.length > 120 ? '…' : '') + '</p>' +
              '</div>' +
              '<div class="admin-row__actions">' +
                '<button class="btn btn--danger btn--sm" data-action="delete-thread" data-id="' + esc(t.id) + '">Delete thread</button>' +
              '</div>' +
            '</div>';
          }).join('');
          el.addEventListener('click', function (ev) {
            var btn = ev.target.closest('[data-action="delete-thread"]');
            if (!btn) return;
            if (confirm('Delete this thread and all its replies?')) {
              DB.deleteThread(btn.dataset.id).then(function () {
                DB.listThreads().then(renderModerationPanel);
              });
            }
          });
        }
        DB.listThreads().then(renderModerationPanel);
      });
    }
  };

  /* ---------- router ---------- */

  function setActiveLinks(path) {
    var map = {
      '/thread': '/forum', '/new-thread': '/forum', '/account': '/accounts',
      '/login': '/', '/register': '/', '/search': '/', '/admin': '/', '/profile': '/'
    };
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
    var q = searchInput.value.trim();
    if (!q) return;
    state.siteQuery = q;
    location.hash = '#/search';
  });

  searchInput.addEventListener('input', debounce(function () {
    var q = searchInput.value.trim();
    if (q.length >= 2) {
      state.siteQuery = q;
      if (parseHash().path !== '/search') location.hash = '#/search';
      else if (views['/search']) views['/search']();
    }
  }));

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
