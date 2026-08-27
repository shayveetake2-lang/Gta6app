import { DB, dbReady } from './data.js?v=20260827-polish2';
import { isConfigured } from './firebase.js';

(function () {
  'use strict';

  var main = document.getElementById('main');
  var navToggle = document.getElementById('navToggle');
  var nav = document.getElementById('primaryNav');
  var scrim = document.getElementById('scrim');
  var backButton = document.getElementById('backButton');
  var themeToggle = document.getElementById('themeToggle');
  var searchForm = document.getElementById('globalSearch');
  var searchInput = document.getElementById('globalSearchInput');
  var achievementMenuToggle = document.getElementById('achievementMenuToggle');
  var achievementMenu = document.getElementById('achievementMenu');
  var siteFooter = document.getElementById('siteFooter');
  var tabbar = document.querySelector('.tabbar');
  var localApiDefault = location.hostname === 'localhost' || location.hostname === '127.0.0.1' ? 'http://localhost:8787' : '';
  var achievementApi = String(window.ACHIEVEMENT_API_URL || localApiDefault).replace(/\/+$/, '');

  var state = { difficulty: 'all', query: '', category: 'all', accountQuery: '', trophyCategory: 'all' };
  var trophyState = {};
  try { trophyState = JSON.parse(localStorage.getItem('gta6.trophies.v1') || '{}'); } catch (e) { /* storage blocked */ }
  var routeHistory = [];
  var routeSequence = 0;
  var activeRouteContext = null;
  var menuReturnFocus = null;
  var menuKeydownHandler = null;

  // Each debounced handler needs its own timer, or the search inputs cancel each other.
  function debounce(fn, wait) {
    var timer = null;
    return function () {
      var args = arguments;
      var context = this;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(context, args); }, wait || 200);
    };
  }

  /* ---------- helpers ---------- */

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function initials(name) {
    return esc(String(name || 'guest').slice(0, 2).toUpperCase());
  }

  function formatCount(value, singular, plural) {
    var count = Number(value) || 0;
    return count + ' ' + (count === 1 ? singular : (plural || singular + 's'));
  }

  function safeImageUrl(value) {
    var url = String(value || '');
    return /^https?:\/\//i.test(url) ? url : '';
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

  function currentContext(context) {
    return context || activeRouteContext;
  }

  function isCurrentRoute(context) {
    return !!context && context.sequence === routeSequence && activeRouteContext === context && context.hash === (location.hash || '#/');
  }

  function render(html, context) {
    if (context && !isCurrentRoute(context)) return false;
    main.innerHTML = html;
    main.focus();
    return true;
  }

  function parseHash() {
    var raw = location.hash.replace(/^#/, '') || '/';
    var parts = raw.split('/').filter(Boolean);
    return { path: '/' + (parts[0] || ''), id: parts[1] || null };
  }

  function friendlyErrorMessage(error, fallback) {
    if (error && error.name === 'AbortError') return '';
    var message = String(error && error.message || '').toLowerCase();
    if (/failed to fetch|network|timed out|503|502/.test(message)) {
      return fallback || 'We couldn’t connect right now. Check your connection and try again.';
    }
    if (/permission|insufficient|unauthenticated/.test(message)) {
      return 'This action is not available for the current session. Please try again.';
    }
    if (/currently building|requires an index/.test(message)) {
      return 'This content is temporarily unavailable while the community index updates.';
    }
    return fallback || 'We couldn’t load this content right now. Please try again.';
  }

  function logDataError(scope, error) {
    if (error && error.name !== 'AbortError') console.error('[data] ' + scope + ' failed:', error);
  }

  function stateMarkup(kind, message, includeRetry) {
    var retry = includeRetry ? '<div class="state__actions"><button class="btn btn--ghost" type="button" data-state-retry>Retry</button></div>' : '';
    if (kind === 'loading') {
      return '<div class="state state--loading" role="status"><p>' + esc(message || 'Loading…') + '</p><div class="skeleton-list" aria-hidden="true"><span class="skeleton skeleton--long"></span><span class="skeleton skeleton--medium"></span><span class="skeleton skeleton--short"></span></div></div>';
    }
    if (kind === 'error') {
      return '<div class="state state--error" role="alert"><strong>Temporarily unavailable</strong><p>' + esc(message || 'We couldn’t load this content right now. Please try again.') + '</p>' + retry + '</div>';
    }
    return '<div class="state state--empty" role="status"><p>' + esc(message || 'Nothing to show yet.') + '</p>' + retry + '</div>';
  }

  function setRegionState(region, kind, message, retry) {
    if (!region) return;
    region.setAttribute('aria-busy', kind === 'loading' ? 'true' : 'false');
    region.innerHTML = stateMarkup(kind, message, !!retry);
    if (retry) {
      var button = region.querySelector('[data-state-retry]');
      if (button) button.addEventListener('click', retry);
    }
  }

  function setPageError(context, error, retry, fallback) {
    if (!isCurrentRoute(context)) return;
    logDataError('route', error);
    render(stateMarkup('error', friendlyErrorMessage(error, fallback), !!retry), context);
    if (retry) {
      var button = main.querySelector('[data-state-retry]');
      if (button) button.addEventListener('click', retry);
    }
  }

  function setActionStatus(target, kind, message) {
    if (!target) return;
    target.className = 'action-status' + (kind ? ' action-status--' + kind : '');
    target.textContent = message || '';
  }

  function setFormStatus(target, kind, message) {
    if (!target) return;
    target.className = 'form-status' + (kind ? ' form-status--' + kind : '');
    target.textContent = message || '';
  }

  function setActionPending(button, pendingLabel) {
    if (!button || button.disabled) return false;
    if (!button.dataset.idleLabel) button.dataset.idleLabel = button.textContent;
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    button.textContent = pendingLabel;
    return true;
  }

  function restoreAction(button) {
    if (!button) return;
    button.disabled = false;
    button.removeAttribute('aria-busy');
    if (button.dataset.idleLabel) {
      button.textContent = button.dataset.idleLabel;
      delete button.dataset.idleLabel;
    }
  }

  function saveTrophyState() {
    try { localStorage.setItem('gta6.trophies.v1', JSON.stringify(trophyState)); } catch (e) { /* storage blocked */ }
  }

  function routeRule(count) {
    return '<div class="route-rule">' + (count ? '<span class="route-rule__count">' + esc(count) + '</span>' : '') + '</div>';
  }

  function routeLoading(message) {
    return stateMarkup('loading', message || 'Loading…');
  }

  /* ---------- data boundary ---------- */

  var Data = {};
  [
    'listUsers', 'getProfile', 'createUser', 'listManualAchievements',
    'createManualAchievement', 'setManualAchievementCompleted',
    'listWalkthroughs', 'getWalkthrough', 'listThreads', 'getThread',
    'createThread', 'likeThread', 'likeWalkthrough', 'addReply',
    'categories', 'listTrophies', 'listContent'
  ].forEach(function (method) {
    Data[method] = function () {
      return DB[method].apply(DB, arguments).catch(function (error) {
        logDataError(method, error);
        throw error;
      });
    };
  });

  Data.fetchAchievements = function (platform, params, signal) {
    if (!achievementApi) return Promise.reject(new Error('Platform import is not configured.'));
    var query = new URLSearchParams(params).toString();
    var url = achievementApi + '/api/achievements/' + encodeURIComponent(platform) + (query ? '?' + query : '');
    return fetch(url, { signal: signal }).then(function (response) {
      return response.text().then(function (raw) {
        var body = {};
        try { body = raw ? JSON.parse(raw) : {}; } catch (e) { /* handled by the friendly response below */ }
        if (!response.ok) throw new Error(body.error || 'Achievement import is unavailable.');
        return Array.isArray(body.achievements) ? body.achievements : [];
      });
    });
  };

  /* ---------- shared partials ---------- */

  function walkthroughCard(w) {
    var tags = Array.isArray(w.tags) ? w.tags : [];
    return '' +
      '<a class="card card--walkthrough" href="#/walkthroughs/' + esc(w.id) + '">' +
        '<div class="card__media" aria-hidden="true"><span class="card__media-glyph">' + esc(w.cover || '•') + '</span></div>' +
        '<div class="card__body">' +
          '<div class="card__topline"><span class="badge badge--' + esc(w.difficulty) + '">' + esc(w.difficulty) + '</span><span class="card__duration">' + esc(w.duration) + ' min</span></div>' +
          '<h3 class="card__title">' + esc(w.title) + '</h3>' +
          '<p class="card__meta">by ' + esc(w.author) + ' · updated ' + esc(w.updatedAt) + '</p>' +
          '<div class="card__foot"><span class="card__meta card__likes">♥ ' + formatCount(w.likes, 'like') + '</span><ul class="tags">' + tags.map(function (t) {
            return '<li class="tag">#' + esc(t) + '</li>';
          }).join('') + '</ul></div>' +
        '</div>' +
      '</a>';
  }

  function indexItem(w) {
    return '<div class="index-item"><a class="index-item__title" href="#/walkthroughs/' + esc(w.id) + '">' + esc(w.title) + '</a><span class="index-item__meta">' + esc(w.difficulty) + ' · ' + esc(w.duration) + ' min</span></div>';
  }

  function threadRow(t) {
    var replies = Number(t.replyCount) || (Array.isArray(t.replies) ? t.replies.length : 0);
    return '' +
      '<a class="thread" href="#/thread/' + esc(t.id) + '">' +
        '<span class="avatar" aria-hidden="true">' + initials(t.author) + '</span>' +
        '<span class="thread__body">' +
          '<h3 class="thread__title">' + esc(t.title) + '</h3>' +
          '<p class="thread__meta">' + esc(t.category) + ' · ' + esc(t.author) + ' · ' + esc(t.createdAt) + ' · <span class="thread__reply-count">' + formatCount(replies, 'reply') + '</span></p>' +
        '</span>' +
        '<span class="thread__stats"><b>' + replies + '</b>' + (replies === 1 ? 'reply' : 'replies') + '<small>♥ ' + (Number(t.likes) || 0) + '</small></span>' +
      '</a>';
  }

  function accountCard(u) {
    var community = u.community;
    return '' +
      '<a class="card card--account" href="#/account/' + esc(u.id) + '">' +
        '<div class="account__head">' +
          '<span class="avatar avatar--lg" aria-hidden="true">' + initials(u.displayName || u.username) + '</span>' +
          '<div><h3 class="card__title">' + esc(u.displayName || u.username) + '</h3><p class="card__meta">@' + esc(u.username) + ' · ' + esc(u.role || 'Member') + '</p></div>' +
        '</div>' +
        '<p class="account__bio">' + esc(u.bio || 'No bio added yet.') + '</p>' +
        (community ? '<ul class="tags account__stats">' + levelTag(community) + '<li class="tag">' + formatCount(community.posts, 'post') + '</li><li class="tag">' + formatCount(community.likes, 'like') + '</li></ul>' : '') +
      '</a>';
  }

  function achievementRow(item) {
    var image = safeImageUrl(item.iconUrl);
    return '<article class="achievement-row">' +
      (image ? '<img class="achievement-row__icon" src="' + esc(image) + '" alt="" loading="lazy" />' : '<span class="achievement-row__icon achievement-row__icon--empty" aria-hidden="true">★</span>') +
      '<div class="achievement-row__body"><h3>' + esc(item.achievementName) + '</h3><p class="card__meta">' + esc(item.gameTitle) + ' · ' + esc(item.description || 'No description') + '</p></div>' +
      '<span class="badge achievement-status achievement-status--' + (item.unlocked ? 'unlocked' : 'locked') + '">' + (item.unlocked ? 'Unlocked' : 'Locked') + '</span>' +
    '</article>';
  }

  function manualAchievementRow(item) {
    return '<article class="achievement-row">' +
      '<span class="achievement-row__icon achievement-row__icon--empty" aria-hidden="true">★</span>' +
      '<div class="achievement-row__body"><h3>' + esc(item.achievementName) + '</h3><p class="card__meta">' + esc(item.gameTitle) + (item.description ? ' · ' + esc(item.description) : '') + '</p></div>' +
      '<button class="btn ' + (item.unlocked ? 'btn--ghost' : 'btn--primary') + '" type="button" data-manual-achievement="' + esc(item.id) + '" data-unlocked="' + (!item.unlocked) + '">' +
        (item.unlocked ? 'Mark incomplete' : 'Mark complete') + '</button>' +
    '</article>';
  }

  /* ---------- views ---------- */

  function walkthroughDetail(id, context) {
    context = currentContext(context);
    render(routeLoading('Loading guide…'), context);
    Data.getWalkthrough(id).then(function (w) {
      if (!isCurrentRoute(context)) return;
      if (!w) return render(stateMarkup('empty', 'That walkthrough could not be found.'), context);
      var tags = Array.isArray(w.tags) ? w.tags : [];
      render('' +
        '<a class="btn btn--ghost" href="#/walkthroughs">← Back to guides</a>' +
        '<div class="section-head"><h1 class="page-title">' + esc(w.title) + '</h1></div>' +
        '<div class="detail">' +
          '<div class="detail__main">' +
            '<p>' + esc(w.summary) + '</p>' +
            routeRule('Route steps') +
            '<h2>Steps</h2>' +
            '<ol class="steps">' + (Array.isArray(w.steps) ? w.steps : []).map(function (step) {
              return '<li>' + esc(step) + '</li>';
            }).join('') + '</ol>' +
          '</div>' +
          '<aside class="sidecard detail__aside">' +
            '<span class="badge badge--' + esc(w.difficulty) + '">' + esc(w.difficulty) + '</span>' +
            '<dl>' +
              '<dt>Game</dt><dd>' + esc(w.game) + '</dd>' +
              '<dt>Time</dt><dd>' + esc(w.duration) + ' min</dd>' +
              '<dt>Author</dt><dd>' + esc(w.author) + '</dd>' +
              '<dt>Updated</dt><dd>' + esc(w.updatedAt) + '</dd>' +
            '</dl>' +
            '<ul class="tags">' + tags.map(function (t) { return '<li class="tag">#' + esc(t) + '</li>'; }).join('') + '</ul>' +
            '<button class="btn btn--ghost like-button" data-like-guide="' + esc(w.id) + '" type="button">♥ Like (' + (Number(w.likes) || 0) + ')</button>' +
            '<p class="action-status" id="guideActionStatus" aria-live="polite"></p>' +
          '</aside>' +
        '</div>', context);
      var likeButton = document.querySelector('[data-like-guide]');
      if (!likeButton) return;
      likeButton.addEventListener('click', function () {
        if (!setActionPending(likeButton, 'Liking…')) return;
        var status = document.getElementById('guideActionStatus');
        Data.likeWalkthrough(w.id).then(function () {
          if (!isCurrentRoute(context)) return;
          walkthroughDetail(w.id, context);
        }).catch(function (error) {
          setActionStatus(status, 'error', friendlyErrorMessage(error, 'We couldn’t like this guide. Please try again.'));
        }).finally(function () {
          restoreAction(likeButton);
        });
      });
    }).catch(function (error) {
      setPageError(context, error, function () { walkthroughDetail(id, context); }, 'We couldn’t load this guide right now.');
    });
  }

  var views = {
    '/': function (_id, context) {
      context = currentContext(context);
      render(routeLoading('Loading the latest guides…'), context);
      Promise.all([Data.listWalkthroughs({}), Data.listThreads(), Data.listUsers({})]).then(function (res) {
        if (!isCurrentRoute(context)) return;
        var guides = res[0].slice(0, 3);
        var threads = res[1].slice(0, 3);
        var members = decorateUsers(res[2], res[0], res[1]).slice(0, 4);
        render('' +
          '<section class="hero">' +
            '<div class="hero__content">' +
              '<h1>Every GTA6 guide, in one place.</h1>' +
              '<p>Step-by-step guides written and reviewed by the community, plus a forum to ask what the guides do not cover.</p>' +
              '<div class="toolbar"><a class="btn btn--primary" href="#/walkthroughs">Browse walkthroughs</a><a class="btn btn--ghost" href="#/forum">Visit the forum</a></div>' +
            '</div>' +
            '<aside class="hero__index"><div class="hero__index-head"><h2>Latest guide index</h2><span class="card__duration">' + formatCount(guides.length, 'guide') + '</span></div>' +
              (guides.length ? '<div class="index-list">' + guides.map(indexItem).join('') + '</div>' : stateMarkup('empty', 'No guides published yet.')) +
            '</aside>' +
          '</section>' +
          routeRule('Community index') +
          '<section class="home-section"><div class="section-head"><h2>Active discussions</h2><a href="#/forum">View all</a></div>' +
            (threads.length ? '<div class="thread-list">' + threads.map(threadRow).join('') + '</div>' : stateMarkup('empty', 'No discussions yet — start the first thread.')) +
          '</section>' +
          '<section class="home-section"><div class="section-head"><h2>Members</h2><a href="#/accounts">Search accounts</a></div>' +
            (members.length ? '<div class="grid">' + members.map(accountCard).join('') + '</div>' : stateMarkup('empty', 'No accounts yet.')) +
          '</section>', context);
      }).catch(function (error) {
        setPageError(context, error, function () { views['/'](null, context); }, 'We couldn’t load the community index right now.');
      });
    },

    '/walkthroughs': function (id, context) {
      context = currentContext(context);
      if (id) return walkthroughDetail(id, context);
      var levels = ['all', 'easy', 'medium', 'hard'];
      render('' +
        '<div class="section-head"><div><h1 class="page-title">Walkthroughs</h1><p class="section-intro" id="guideCount">Loading guides…</p></div></div>' +
        '<form class="toolbar" id="guideSearchForm" role="search">' +
          '<div class="field field--grow"><label class="sr-only" for="guideSearch">Search guides</label><input type="search" id="guideSearch" placeholder="Search guides…" autocomplete="off" /></div>' +
        '</form>' +
        '<div class="toolbar" id="filters" role="group" aria-label="Filter guides">' + levels.map(function (level) {
          return '<button class="chip" type="button" aria-pressed="' + (state.difficulty === level) + '" data-difficulty="' + level + '">' + level.charAt(0).toUpperCase() + level.slice(1) + '</button>';
        }).join('') + '</div>' +
        '<div id="guideResults" aria-live="polite">' + routeLoading('Loading guides…') + '</div>', context);

      var input = document.getElementById('guideSearch');
      var results = document.getElementById('guideResults');
      var count = document.getElementById('guideCount');
      var filters = document.getElementById('filters');
      input.value = state.query;
      var requestSequence = 0;

      function update() {
        var requestId = ++requestSequence;
        setRegionState(results, 'loading', 'Loading guides…');
        Data.listWalkthroughs({ difficulty: state.difficulty, query: state.query }).then(function (items) {
          if (!isCurrentRoute(context) || requestId !== requestSequence) return;
          count.textContent = formatCount(items.length, 'guide');
          results.innerHTML = items.length
            ? '<div class="grid walkthrough-grid">' + items.map(walkthroughCard).join('') + '</div>'
            : stateMarkup('empty', 'No walkthroughs match your filters.');
          results.setAttribute('aria-busy', 'false');
        }).catch(function (error) {
          if (!isCurrentRoute(context) || requestId !== requestSequence) return;
          setRegionState(results, 'error', friendlyErrorMessage(error, 'We couldn’t load the guides right now.'), update);
        });
      }

      document.getElementById('guideSearchForm').addEventListener('submit', function (event) { event.preventDefault(); });
      input.addEventListener('input', debounce(function () {
        state.query = input.value.trim();
        update();
      }));
      filters.addEventListener('click', function (event) {
        var button = event.target.closest('[data-difficulty]');
        if (!button) return;
        state.difficulty = button.dataset.difficulty;
        filters.querySelectorAll('[data-difficulty]').forEach(function (item) {
          item.setAttribute('aria-pressed', item === button ? 'true' : 'false');
        });
        update();
      });
      update();
    },

    '/trophies': function (_id, context) {
      context = currentContext(context);
      render(routeLoading('Loading checklist…'), context);
      Data.listTrophies().then(function (trophies) {
        if (!isCurrentRoute(context)) return;
        var categories = ['all'].concat(trophies.reduce(function (list, trophy) {
          if (list.indexOf(trophy.category) === -1) list.push(trophy.category);
          return list;
        }, []));
        var activeCategory = state.trophyCategory || 'all';

        render('' +
          '<section class="trophy-hero">' +
            '<div><h1 class="page-title">Achievement tracker</h1><p>Keep track of every challenge, collectible and story milestone.</p><p class="section-intro"><a href="#/achievements">Import platform achievements</a> when you want to compare an external account.</p></div>' +
            '<div class="trophy-summary"><strong id="trophyProgress">0 of ' + trophies.length + ' complete</strong><div class="progress" role="progressbar" aria-label="Achievement completion" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-valuetext="0 of ' + trophies.length + ' complete"><span id="trophyBar"></span></div></div>' +
          '</section>' +
          routeRule(formatCount(trophies.length, 'achievement')) +
          '<div class="toolbar" id="trophyFilters" role="group" aria-label="Filter achievements">' + categories.map(function (category) {
            return '<button class="chip" type="button" aria-pressed="' + (activeCategory === category) + '" data-trophy-category="' + esc(category) + '">' + esc(category === 'all' ? 'All achievements' : category) + '</button>';
          }).join('') + '</div>' +
          '<div class="trophy-list" id="trophyResults" aria-live="polite"></div>', context);

        var progressText = document.getElementById('trophyProgress');
        var progressBar = document.getElementById('trophyBar');
        var progressRegion = document.querySelector('.progress');
        var trophyResults = document.getElementById('trophyResults');
        var trophyFilters = document.getElementById('trophyFilters');

        function update() {
          var visible = trophies.filter(function (trophy) {
            return activeCategory === 'all' || trophy.category === activeCategory;
          });
          var completed = trophies.filter(function (trophy) { return trophyState[trophy.id]; }).length;
          var total = trophies.length;
          var percentage = total ? Math.min(100, Math.max(0, completed / total * 100)) : 0;
          var progressLabel = completed + ' of ' + total + ' complete';
          progressText.textContent = progressLabel;
          progressBar.style.setProperty('--progress', percentage / 100);
          progressRegion.setAttribute('aria-valuenow', String(Math.round(percentage)));
          progressRegion.setAttribute('aria-valuetext', progressLabel);
          trophyResults.innerHTML = visible.map(function (trophy) {
            return '<label class="trophy' + (trophyState[trophy.id] ? ' is-complete' : '') + '">' +
              '<input type="checkbox" data-trophy-id="' + esc(trophy.id) + '"' + (trophyState[trophy.id] ? ' checked' : '') + ' />' +
              '<span class="trophy__icon" aria-hidden="true">' + (trophy.tier === 'Gold' ? '★' : trophy.tier === 'Silver' ? '◆' : '●') + '</span>' +
              '<span class="trophy__body"><strong>' + esc(trophy.title) + '</strong><span>' + esc(trophy.description) + '</span></span>' +
              '<span class="trophy__tier">' + esc(trophy.tier) + '</span>' +
            '</label>';
          }).join('') || stateMarkup('empty', 'No achievements in this category.');
        }

        trophyFilters.addEventListener('click', function (event) {
          var button = event.target.closest('[data-trophy-category]');
          if (!button) return;
          activeCategory = button.dataset.trophyCategory;
          state.trophyCategory = activeCategory;
          trophyFilters.querySelectorAll('[data-trophy-category]').forEach(function (item) {
            item.setAttribute('aria-pressed', item === button ? 'true' : 'false');
          });
          update();
        });
        trophyResults.addEventListener('change', function (event) {
          var checkbox = event.target.closest('[data-trophy-id]');
          if (!checkbox) return;
          trophyState[checkbox.dataset.trophyId] = checkbox.checked;
          saveTrophyState();
          update();
        });
        update();
      }).catch(function (error) {
        setPageError(context, error, function () { views['/trophies'](null, context); }, 'We couldn’t load the checklist right now.');
      });
    },

    '/news': function (_id, context) {
      context = currentContext(context);
      render(routeLoading('Loading news and intel…'), context);
      Data.listContent().then(function (sections) {
        if (!isCurrentRoute(context)) return;
        render('<section class="content-hero"><h1 class="page-title">News &amp; Intel</h1><p class="page-intro">Official details, character files, locations, achievement guidance and clearly marked community speculation.</p></section>' +
          routeRule('Editorial index') +
          '<div class="content-sections">' + sections.map(function (section) {
            return '<section class="content-section" id="' + esc(section.id) + '"><div class="section-head content-section__heading"><p class="section-label">' + esc(section.label) + '</p><div><h2>' + esc(section.title) + '</h2><p class="section-intro">' + formatCount(section.items.length, 'entry') + '</p></div></div><div class="content-grid">' + section.items.map(function (item) {
              return '<article class="content-card"><h3>' + esc(item.title) + '</h3><p>' + esc(item.body) + '</p><small>' + esc(item.meta) + '</small></article>';
            }).join('') + '</div></section>';
          }).join('') + '</div>', context);
      }).catch(function (error) {
        setPageError(context, error, function () { views['/news'](null, context); }, 'We couldn’t load the news and intel right now.');
      });
    },

    '/achievements': function (_id, context) {
      context = currentContext(context);
      render('' +
        '<div class="section-head"><div><h1 class="page-title">Platform import</h1><p class="section-intro">Optional comparison for Steam, Xbox and PlayStation accounts.</p></div><a href="#/trophies">GTA VI checklist</a></div>' +
        '<p class="page-intro">Import is optional. Your local checklist works without a platform connection, and your account details stay with the service you connect.</p>' +
        routeRule('Import details') +
        '<form class="form-panel" id="achievementForm" aria-busy="false">' +
          '<fieldset class="field-grid"><legend class="sr-only">Platform details</legend>' +
            '<div class="field"><label for="achievementPlatform">Platform</label><select id="achievementPlatform"><option value="steam">Steam</option><option value="xbox">Xbox</option><option value="playstation">PlayStation</option></select></div>' +
            '<div class="field"><label for="achievementAccount">Account ID</label><input id="achievementAccount" required placeholder="64-bit Steam ID" aria-describedby="achievementAccountHelp" /></div>' +
            '<div class="field"><label for="achievementGame">Game ID</label><input id="achievementGame" required placeholder="Platform title ID" aria-describedby="achievementGameHelp" /></div>' +
          '</fieldset>' +
          '<p class="field-help" id="achievementAccountHelp">Use the identifier supplied by your platform, not your password.</p>' +
          '<p class="field-help" id="achievementGameHelp">The title or app ID for the game you want to compare.</p>' +
          '<div class="form-actions"><button class="btn btn--primary" type="submit">Load achievements</button><p class="form-status" id="achievementFormStatus" aria-live="polite"></p></div>' +
        '</form>' +
        '<div id="achievementResults" aria-live="polite">' + stateMarkup('empty', 'Enter an account and game ID to load achievements.') + '</div>' +
        routeRule('Personal list') +
        '<section><div class="section-head"><h2>Manual achievements</h2></div>' +
          '<form class="stack measure-form" id="manualAchievementForm" aria-busy="false">' +
            '<div class="field"><label for="manualGameTitle">Game</label><input id="manualGameTitle" required maxlength="120" /></div>' +
            '<div class="field"><label for="manualAchievementName">Achievement</label><input id="manualAchievementName" required maxlength="120" /></div>' +
            '<div class="field"><label for="manualAchievementDescription">Notes</label><textarea id="manualAchievementDescription" maxlength="500"></textarea></div>' +
            '<div class="form-actions"><button class="btn btn--primary" type="submit">Add achievement</button><p class="form-status" id="manualAchievementStatus" aria-live="polite"></p></div>' +
          '</form>' +
          '<div id="manualAchievementResults" aria-live="polite">' + stateMarkup('loading', 'Loading manual achievements…') + '</div>' +
        '</section>', context);

      var form = document.getElementById('achievementForm');
      var platform = document.getElementById('achievementPlatform');
      var account = document.getElementById('achievementAccount');
      var game = document.getElementById('achievementGame');
      var results = document.getElementById('achievementResults');
      var formStatus = document.getElementById('achievementFormStatus');
      var importRequest = 0;

      platform.addEventListener('change', function () {
        account.placeholder = platform.value === 'steam' ? '64-bit Steam ID' : platform.value === 'xbox' ? 'Xbox XUID' : 'PSN account ID';
        game.placeholder = platform.value === 'steam' ? 'Steam app ID' : 'Platform title ID';
      });
      form.addEventListener('submit', function (event) {
        event.preventDefault();
        var submit = form.querySelector('button[type="submit"]');
        if (!setActionPending(submit, 'Loading…')) return;
        var requestId = ++importRequest;
        form.setAttribute('aria-busy', 'true');
        setFormStatus(formStatus, '', '');
        setRegionState(results, 'loading', 'Loading achievements…');
        var params = platform.value === 'steam' ? { steamId: account.value.trim(), appId: game.value.trim() }
          : platform.value === 'xbox' ? { xuid: account.value.trim(), titleId: game.value.trim() }
          : { accountId: account.value.trim(), titleId: game.value.trim() };
        Data.fetchAchievements(platform.value, params, context.controller.signal).then(function (items) {
          if (!isCurrentRoute(context) || requestId !== importRequest) return;
          var unlocked = items.filter(function (item) { return item.unlocked; }).length;
          results.setAttribute('aria-busy', 'false');
          results.innerHTML = '<div class="section-head"><h2>' + unlocked + ' of ' + items.length + ' unlocked</h2></div>' +
            (items.length ? '<div class="achievement-list">' + items.map(achievementRow).join('') + '</div>' : stateMarkup('empty', 'No achievements were returned for these details.'));
          setFormStatus(formStatus, 'success', 'Import complete.');
        }).catch(function (error) {
          if (!isCurrentRoute(context) || requestId !== importRequest || error.name === 'AbortError') return;
          logDataError('achievement import', error);
          setRegionState(results, 'error', friendlyErrorMessage(error, 'Platform imports are unavailable right now. You can continue with manual tracking.'), function () { form.requestSubmit(); });
          setFormStatus(formStatus, 'error', 'Import could not be completed.');
        }).finally(function () {
          if (isCurrentRoute(context) && requestId === importRequest) {
            form.setAttribute('aria-busy', 'false');
            restoreAction(submit);
          }
        });
      });

      var manualForm = document.getElementById('manualAchievementForm');
      var manualResults = document.getElementById('manualAchievementResults');
      var manualStatus = document.getElementById('manualAchievementStatus');

      function loadManualAchievements() {
        if (!isCurrentRoute(context)) return;
        setRegionState(manualResults, 'loading', 'Loading manual achievements…');
        Data.listManualAchievements().then(function (items) {
          if (!isCurrentRoute(context)) return;
          manualResults.innerHTML = items.length
            ? '<div class="achievement-list">' + items.map(manualAchievementRow).join('') + '</div>'
            : stateMarkup('empty', 'No manual achievements added yet.');
          manualResults.setAttribute('aria-busy', 'false');
        }).catch(function (error) {
          if (!isCurrentRoute(context)) return;
          setRegionState(manualResults, 'error', friendlyErrorMessage(error, 'We couldn’t load your manual achievements.'), loadManualAchievements);
        });
      }

      manualForm.addEventListener('submit', function (event) {
        event.preventDefault();
        var submit = manualForm.querySelector('button[type="submit"]');
        if (!setActionPending(submit, 'Saving…')) return;
        manualForm.setAttribute('aria-busy', 'true');
        setFormStatus(manualStatus, '', '');
        Data.createManualAchievement({
          gameTitle: document.getElementById('manualGameTitle').value.trim(),
          achievementName: document.getElementById('manualAchievementName').value.trim(),
          description: document.getElementById('manualAchievementDescription').value.trim()
        }).then(function () {
          if (!isCurrentRoute(context)) return;
          manualForm.reset();
          setFormStatus(manualStatus, 'success', 'Achievement added.');
          loadManualAchievements();
        }).catch(function (error) {
          setFormStatus(manualStatus, 'error', friendlyErrorMessage(error, 'We couldn’t add that achievement. Please try again.'));
        }).finally(function () {
          manualForm.setAttribute('aria-busy', 'false');
          restoreAction(submit);
        });
      });

      manualResults.addEventListener('click', function (event) {
        var button = event.target.closest('[data-manual-achievement]');
        if (!button) return;
        if (!setActionPending(button, 'Saving…')) return;
        var id = button.dataset.manualAchievement;
        Data.setManualAchievementCompleted(id, button.dataset.unlocked === 'true').then(function () {
          if (!isCurrentRoute(context)) return;
          setFormStatus(manualStatus, 'success', 'Achievement updated.');
          loadManualAchievements();
        }).catch(function (error) {
          restoreAction(button);
          setFormStatus(manualStatus, 'error', friendlyErrorMessage(error, 'We couldn’t update that achievement. Please try again.'));
        });
      });
      loadManualAchievements();
    },

    '/accounts': function (_id, context) {
      context = currentContext(context);
      render('' +
        '<div class="section-head"><div><h1 class="page-title">Accounts</h1><p class="section-intro" id="accountCount">Loading accounts…</p></div><a href="#/create-account">Create account</a></div>' +
        '<form class="toolbar" id="accountSearchForm" role="search"><div class="field field--grow"><label class="sr-only" for="accountSearch">Search accounts</label><input type="search" id="accountSearch" placeholder="Search by username, name, bio or location…" autocomplete="off" /></div></form>' +
        '<div id="accountResults" aria-live="polite">' + routeLoading('Loading accounts…') + '</div>', context);

      var input = document.getElementById('accountSearch');
      var results = document.getElementById('accountResults');
      var count = document.getElementById('accountCount');
      input.value = state.accountQuery;
      searchInput.value = state.accountQuery;
      var requestSequence = 0;

      function update() {
        var requestId = ++requestSequence;
        setRegionState(results, 'loading', 'Searching accounts…');
        Promise.all([Data.listUsers({ query: state.accountQuery }), Data.listWalkthroughs({}), Data.listThreads()]).then(function (res) {
          if (!isCurrentRoute(context) || requestId !== requestSequence) return;
          var users = decorateUsers(res[0], res[1], res[2]);
          count.textContent = formatCount(users.length, 'account');
          results.innerHTML = users.length
            ? '<div class="grid">' + users.map(accountCard).join('') + '</div>'
            : stateMarkup('empty', state.accountQuery ? 'No accounts match your search.' : 'No accounts yet.');
          results.setAttribute('aria-busy', 'false');
        }).catch(function (error) {
          if (!isCurrentRoute(context) || requestId !== requestSequence) return;
          setRegionState(results, 'error', friendlyErrorMessage(error, 'We couldn’t load the accounts right now.'), update);
        });
      }

      document.getElementById('accountSearchForm').addEventListener('submit', function (event) { event.preventDefault(); });
      input.addEventListener('input', debounce(function () {
        state.accountQuery = input.value.trim();
        searchInput.value = state.accountQuery;
        update();
      }));
      update();
      if (state.accountQuery) input.focus();
    },

    '/create-account': function (_id, context) {
      context = currentContext(context);
      render('' +
        '<div class="section-head"><h1 class="page-title">Create account</h1></div>' +
        '<form class="stack measure-form" id="accountForm" aria-busy="false">' +
          '<div class="field"><label for="accountUsername">Username</label><input id="accountUsername" required minlength="3" maxlength="24" pattern="[A-Za-z0-9_]+" autocomplete="username" /></div>' +
          '<div class="field"><label for="accountDisplayName">Display name</label><input id="accountDisplayName" required maxlength="60" autocomplete="nickname" /></div>' +
          '<div class="field"><label for="accountLocation">Location</label><input id="accountLocation" maxlength="80" autocomplete="address-level2" /></div>' +
          '<div class="field"><label for="accountBio">Bio</label><textarea id="accountBio" maxlength="400"></textarea></div>' +
          '<p class="form-status" id="accountFormStatus" aria-live="polite"></p>' +
          '<div class="form-actions"><button class="btn btn--primary" type="submit">Create account</button><a class="btn btn--ghost" href="#/accounts">Cancel</a></div>' +
        '</form>', context);

      document.getElementById('accountForm').addEventListener('submit', function (event) {
        event.preventDefault();
        var form = event.currentTarget;
        var submit = form.querySelector('button[type="submit"]');
        var status = document.getElementById('accountFormStatus');
        if (!setActionPending(submit, 'Creating…')) return;
        form.setAttribute('aria-busy', 'true');
        setFormStatus(status, '', 'Creating account…');
        Data.createUser({
          username: document.getElementById('accountUsername').value.trim(),
          displayName: document.getElementById('accountDisplayName').value.trim(),
          location: document.getElementById('accountLocation').value.trim(),
          bio: document.getElementById('accountBio').value.trim()
        }).then(function (user) {
          if (!isCurrentRoute(context)) return;
          location.hash = '#/account/' + encodeURIComponent(user.id);
        }).catch(function (error) {
          setFormStatus(status, 'error', friendlyErrorMessage(error, 'We couldn’t create the account. Please try again.'));
        }).finally(function () {
          form.setAttribute('aria-busy', 'false');
          restoreAction(submit);
        });
      });
    },

    '/account': function (id, context) {
      context = currentContext(context);
      if (!id) return views['/accounts'](null, context);
      render(routeLoading('Loading account…'), context);
      Promise.all([Data.getProfile(id), Data.listWalkthroughs({}), Data.listThreads()]).then(function (res) {
        if (!isCurrentRoute(context)) return;
        var user = res[0];
        if (!user) return render(stateMarkup('empty', 'That account could not be found.'), context);
        var guides = res[1].filter(function (w) { return w.author === user.username; });
        var threads = res[2].filter(function (t) { return t.author === user.username; });
        var community = communityStats(user.username, res[1], res[2]);
        render('' +
          '<a class="btn btn--ghost" href="#/accounts">← Back to accounts</a>' +
          '<section class="profile">' +
            '<div class="profile__identity"><span class="avatar avatar--xl" aria-hidden="true">' + initials(user.displayName || user.username) + '</span><div><h1 class="profile__name">' + esc(user.displayName || user.username) + '</h1><p class="card__meta">@' + esc(user.username) + ' · ' + esc(user.role || 'Member') + '</p></div></div>' +
            '<div><p class="profile__bio">' + esc(user.bio || 'No bio added yet.') + '</p><ul class="tags">' + levelTag(community) + '<li class="tag">Joined ' + esc(user.joinedAt) + '</li>' + (user.location ? '<li class="tag">' + esc(user.location) + '</li>' : '') + '<li class="tag">' + formatCount(guides.length, 'guide') + '</li><li class="tag">' + formatCount(threads.length, 'thread') + '</li><li class="tag">' + formatCount(community.likes, 'like') + '</li></ul></div>' +
          '</section>' +
          routeRule('Published work') +
          '<section><div class="section-head"><h2>Guides by ' + esc(user.username) + '</h2></div>' + (guides.length ? '<div class="grid walkthrough-grid">' + guides.map(walkthroughCard).join('') + '</div>' : stateMarkup('empty', 'No guides yet.')) + '</section>' +
          '<section><div class="section-head"><h2>Threads by ' + esc(user.username) + '</h2></div>' + (threads.length ? '<div class="thread-list">' + threads.map(threadRow).join('') + '</div>' : stateMarkup('empty', 'No threads yet.')) + '</section>', context);
      }).catch(function (error) {
        setPageError(context, error, function () { views['/account'](id, context); }, 'We couldn’t load this account right now.');
      });
    },

    '/forum': function (_id, context) {
      context = currentContext(context);
      var requestSequence = 0;
      var loadForum = function () {
        var requestId = ++requestSequence;
        render(routeLoading('Loading discussions…'), context);
        Promise.all([Data.listThreads(state.category), Data.categories()]).then(function (res) {
          if (!isCurrentRoute(context) || requestId !== requestSequence) return;
          var threads = res[0];
          var categories = ['all'].concat(res[1]);
          render('' +
            '<div class="section-head"><div><h1 class="page-title">Forum</h1><p class="section-intro">' + formatCount(threads.length, 'discussion') + '</p></div><a href="#/new-thread">New thread</a></div>' +
            '<div class="toolbar" id="cats" role="group" aria-label="Filter discussions">' + categories.map(function (category) {
              return '<button class="chip" type="button" aria-pressed="' + (state.category === category) + '" data-cat="' + esc(category) + '">' + esc(category === 'all' ? 'All' : category) + '</button>';
            }).join('') + '</div>' +
            routeRule('Discussion ledger') +
            (threads.length ? '<div class="thread-list">' + threads.map(threadRow).join('') + '</div>' : stateMarkup('empty', 'No discussions in this category yet.')), context);
          document.getElementById('cats').addEventListener('click', function (event) {
            var button = event.target.closest('[data-cat]');
            if (!button) return;
            state.category = button.dataset.cat;
            loadForum();
          });
        }).catch(function (error) {
          if (!isCurrentRoute(context) || requestId !== requestSequence) return;
          setPageError(context, error, loadForum, 'We couldn’t load the discussions right now.');
        });
      };
      loadForum();
    },

    '/thread': function (id, context) {
      context = currentContext(context);
      render(routeLoading('Loading thread…'), context);
      Data.getThread(id).then(function (thread) {
        if (!isCurrentRoute(context)) return;
        if (!thread) return render(stateMarkup('empty', 'That thread could not be found.'), context);
        render('' +
          '<a class="btn btn--ghost" href="#/forum">← Back to forum</a>' +
          '<div class="section-head"><h1 class="page-title">' + esc(thread.title) + '</h1></div>' +
          '<article class="post post--original"><span class="avatar" aria-hidden="true">' + initials(thread.author) + '</span><div class="post__content"><p class="thread__meta">' + esc(thread.author) + ' · ' + esc(thread.createdAt) + '</p><p>' + esc(thread.body) + '</p><button class="btn btn--ghost like-button" data-like-thread="' + esc(thread.id) + '" type="button">♥ Like (' + (Number(thread.likes) || 0) + ')</button><p class="action-status" id="threadActionStatus" aria-live="polite"></p></div></article>' +
          (thread.replies || []).map(function (reply) {
            return '<article class="post"><span class="avatar" aria-hidden="true">' + initials(reply.author) + '</span><div class="post__content"><p class="thread__meta">' + esc(reply.author) + ' · ' + esc(reply.createdAt) + '</p><p>' + esc(reply.body) + '</p></div></article>';
          }).join('') +
          routeRule('Join the discussion') +
          '<form class="stack measure-form form-stack--spaced" id="replyForm" aria-busy="false"><div class="field"><label for="replyBody">Your reply</label><textarea id="replyBody" required maxlength="2000"></textarea></div><div class="form-actions"><button class="btn btn--primary" type="submit">Post reply</button><p class="form-status" id="replyStatus" aria-live="polite"></p></div></form>', context);

        var likeButton = document.querySelector('[data-like-thread]');
        likeButton.addEventListener('click', function () {
          if (!setActionPending(likeButton, 'Liking…')) return;
          var status = document.getElementById('threadActionStatus');
          Data.likeThread(thread.id).then(function () {
            if (!isCurrentRoute(context)) return;
            views['/thread'](thread.id, context);
          }).catch(function (error) {
            setActionStatus(status, 'error', friendlyErrorMessage(error, 'We couldn’t like this thread. Please try again.'));
          }).finally(function () {
            restoreAction(likeButton);
          });
        });

        document.getElementById('replyForm').addEventListener('submit', function (event) {
          event.preventDefault();
          var form = event.currentTarget;
          var submit = form.querySelector('button[type="submit"]');
          var status = document.getElementById('replyStatus');
          var body = document.getElementById('replyBody').value.trim();
          if (!body || !setActionPending(submit, 'Posting…')) return;
          form.setAttribute('aria-busy', 'true');
          setFormStatus(status, '', 'Posting reply…');
          Data.addReply(thread.id, { body: body }).then(function () {
            if (!isCurrentRoute(context)) return;
            views['/thread'](thread.id, context);
          }).catch(function (error) {
            setFormStatus(status, 'error', friendlyErrorMessage(error, 'We couldn’t post your reply. Your text is still here.'));
          }).finally(function () {
            form.setAttribute('aria-busy', 'false');
            restoreAction(submit);
          });
        });
      }).catch(function (error) {
        setPageError(context, error, function () { views['/thread'](id, context); }, 'We couldn’t load this thread right now.');
      });
    },

    '/new-thread': function (_id, context) {
      context = currentContext(context);
      render(routeLoading('Loading thread form…'), context);
      Data.categories().then(function (categories) {
        if (!isCurrentRoute(context)) return;
        render('' +
          '<div class="section-head"><h1 class="page-title">Start a thread</h1></div>' +
          '<form class="stack measure-form" id="threadForm" aria-busy="false"><div class="field"><label for="tTitle">Title</label><input id="tTitle" required maxlength="120" /></div><div class="field"><label for="tCat">Category</label><select id="tCat">' + categories.map(function (category) { return '<option>' + esc(category) + '</option>'; }).join('') + '</select></div><div class="field"><label for="tBody">Message</label><textarea id="tBody" required maxlength="4000"></textarea></div><div class="form-actions"><button class="btn btn--primary" type="submit">Publish</button><a class="btn btn--ghost" href="#/forum">Cancel</a><p class="form-status" id="threadFormStatus" aria-live="polite"></p></div></form>', context);
        document.getElementById('threadForm').addEventListener('submit', function (event) {
          event.preventDefault();
          var form = event.currentTarget;
          var submit = form.querySelector('button[type="submit"]');
          var status = document.getElementById('threadFormStatus');
          if (!setActionPending(submit, 'Publishing…')) return;
          form.setAttribute('aria-busy', 'true');
          setFormStatus(status, '', 'Publishing thread…');
          Data.createThread({
            title: document.getElementById('tTitle').value.trim(),
            category: document.getElementById('tCat').value,
            body: document.getElementById('tBody').value.trim()
          }).then(function (thread) {
            if (!isCurrentRoute(context)) return;
            location.hash = '#/thread/' + thread.id;
          }).catch(function (error) {
            setFormStatus(status, 'error', friendlyErrorMessage(error, 'We couldn’t publish the thread. Your draft is still here.'));
          }).finally(function () {
            form.setAttribute('aria-busy', 'false');
            restoreAction(submit);
          });
        });
      }).catch(function (error) {
        setPageError(context, error, function () { views['/new-thread'](null, context); }, 'We couldn’t load the thread form right now.');
      });
    },

    '/about': function (_id, context) {
      context = currentContext(context);
      render('' +
        '<div class="section-head"><h1 class="page-title">About</h1></div>' +
        '<div class="sidecard measure-form"><p>Companion for GTA6 is a community library of game guides backed by a database of walkthroughs, steps and forum threads.</p><p class="card__meta">Backend: ' + (isConfigured ? 'Cloud Firestore' : 'local browser storage — add your project keys in js/firebase-config.js to go live') + '.</p></div>', context);
    }
  };

  /* ---------- router ---------- */

  function setActiveLinks(path) {
    var parentPath = { '/thread': '/forum', '/new-thread': '/forum', '/account': '/accounts', '/create-account': '/accounts', '/trophies': '/achievements' }[path] || path;
    document.querySelectorAll('[data-route-link]').forEach(function (link) {
      var routePath = link.dataset.routeLink;
      var isSubmenuLink = link.classList.contains('nav__submenu-link');
      var isTabLink = !!link.closest('.tabbar');
      var active = routePath === parentPath || routePath === path;
      if (path === '/trophies') {
        active = routePath === '/trophies' || (!isSubmenuLink && !isTabLink && routePath === '/achievements');
      } else if (path === '/achievements') {
        active = routePath === '/achievements' && !isTabLink;
      }
      link.classList.toggle('is-active', active);
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }

  function createRouteContext(hash) {
    if (activeRouteContext && activeRouteContext.controller) activeRouteContext.controller.abort();
    var context = { hash: hash, sequence: ++routeSequence, controller: new AbortController() };
    activeRouteContext = context;
    return context;
  }

  function route() {
    var routeInfo = parseHash();
    var hash = location.hash || '#/';
    var context = createRouteContext(hash);
    var view = views[routeInfo.path] || views['/'];
    if (!routeHistory.length || routeHistory[routeHistory.length - 1] !== hash) {
      if (routeHistory.length > 1 && routeHistory[routeHistory.length - 2] === hash) routeHistory.pop();
      else routeHistory.push(hash);
    }
    backButton.disabled = routeHistory.length < 2;
    setActiveLinks(views[routeInfo.path] ? routeInfo.path : '/');
    closeAchievementMenu();
    closeMenu(false);
    window.scrollTo(0, 0);
    view(routeInfo.id, context);
  }

  /* ---------- menu ---------- */

  function menuFocusables() {
    return [navToggle].concat(Array.prototype.slice.call(nav.querySelectorAll('a, button'))).filter(function (element) {
      return !element.disabled && element.offsetParent !== null;
    });
  }

  function trapMenuFocus(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeMenu(true);
      return;
    }
    if (event.key !== 'Tab') return;
    var focusables = menuFocusables();
    if (!focusables.length) return;
    var firstLink = focusables.find(function (element) { return element !== navToggle; }) || focusables[0];
    var last = focusables[focusables.length - 1];
    if (event.shiftKey && (document.activeElement === firstLink || document.activeElement === navToggle)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      navToggle.focus();
    } else if (!event.shiftKey && document.activeElement === navToggle) {
      event.preventDefault();
      firstLink.focus();
    }
  }

  function setMenuInert(isInert) {
    [main, siteFooter, tabbar].forEach(function (element) {
      if (!element) return;
      element.inert = isInert;
      if (isInert) element.setAttribute('aria-hidden', 'true');
      else element.removeAttribute('aria-hidden');
    });
  }

  function openMenu() {
    if (nav.classList.contains('is-open')) return;
    menuReturnFocus = document.activeElement;
    nav.classList.add('is-open');
    navToggle.setAttribute('aria-expanded', 'true');
    navToggle.setAttribute('aria-label', 'Close menu');
    scrim.hidden = false;
    document.body.classList.add('menu-open');
    setMenuInert(true);
    menuKeydownHandler = trapMenuFocus;
    document.addEventListener('keydown', menuKeydownHandler);
    setTimeout(function () {
      var firstLink = nav.querySelector('.nav__link');
      if (nav.classList.contains('is-open') && firstLink) firstLink.focus();
    }, 240);
  }

  function closeMenu(restoreFocus) {
    var wasOpen = nav.classList.contains('is-open');
    nav.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.setAttribute('aria-label', 'Open menu');
    scrim.hidden = true;
    document.body.classList.remove('menu-open');
    setMenuInert(false);
    if (menuKeydownHandler) document.removeEventListener('keydown', menuKeydownHandler);
    menuKeydownHandler = null;
    if (restoreFocus && wasOpen && menuReturnFocus && document.contains(menuReturnFocus)) menuReturnFocus.focus();
    menuReturnFocus = null;
  }

  function closeAchievementMenu() {
    if (!achievementMenu) return;
    achievementMenu.classList.remove('is-open');
    achievementMenuToggle.setAttribute('aria-expanded', 'false');
  }

  navToggle.addEventListener('click', function () {
    nav.classList.contains('is-open') ? closeMenu(true) : openMenu();
  });
  scrim.addEventListener('click', function () { closeMenu(true); });
  nav.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () { closeMenu(false); });
  });
  achievementMenuToggle.addEventListener('click', function (event) {
    event.stopPropagation();
    var open = achievementMenu.classList.toggle('is-open');
    achievementMenuToggle.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('click', function (event) {
    if (!event.target.closest('.nav__item--has-menu')) closeAchievementMenu();
  });

  /* ---------- theme ---------- */

  var savedTheme = null;
  try { savedTheme = localStorage.getItem('gta6.theme'); } catch (e) { /* storage blocked */ }
  if (savedTheme === 'light' || savedTheme === 'dark') document.documentElement.dataset.theme = savedTheme;
  themeToggle.setAttribute('aria-pressed', document.documentElement.dataset.theme === 'light' ? 'true' : 'false');
  themeToggle.addEventListener('click', function () {
    var next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    themeToggle.setAttribute('aria-pressed', next === 'light' ? 'true' : 'false');
    try { localStorage.setItem('gta6.theme', next); } catch (e) { /* storage blocked */ }
  });

  /* ---------- search ---------- */

  function focusAccountSearch() {
    var accountInput = document.getElementById('accountSearch');
    if (!accountInput) return;
    if (accountInput.value !== state.accountQuery) {
      accountInput.value = state.accountQuery;
      accountInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  searchForm.addEventListener('submit', function (event) {
    event.preventDefault();
    state.accountQuery = searchInput.value.trim();
    if (parseHash().path === '/accounts') focusAccountSearch();
    else location.hash = '#/accounts';
  });
  searchInput.addEventListener('input', debounce(function () {
    state.accountQuery = searchInput.value.trim();
    if (parseHash().path === '/accounts') focusAccountSearch();
    else if (state.accountQuery) location.hash = '#/accounts';
  }));

  backButton.addEventListener('click', function () {
    if (routeHistory.length < 2) return;
    routeHistory.pop();
    location.hash = routeHistory[routeHistory.length - 1];
  });

  document.getElementById('year').textContent = new Date().getFullYear();
  window.addEventListener('hashchange', route);
  main.innerHTML = routeLoading('Loading…');
  route();
  dbReady.then(function (connected) {
    if (connected) route();
  }).catch(function () {
    // The local backend is already available when Firebase is unreachable.
  });
})();
