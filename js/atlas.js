const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[character]));

const escapeAttribute = (value) => escapeHtml(value).replace(/`/g, '&#96;');

export const ATLAS_CHIP_IDS = Object.freeze(['all-games', 'gta-online', 'forum']);
export const ATLAS_TOKEN_IDS = Object.freeze(['accent', 'focus']);
export const ATLAS_STATUS_IDS = Object.freeze(['official', 'gameplay', 'rumour', 'admin', 'unlocked']);
export const ATLAS_ANCHOR_IDS = Object.freeze(['atlas-controls', 'atlas-responsive']);

export const ATLAS_DATA = Object.freeze({
  hero: {
    eyebrow: 'Readable by design',
    titleLines: ['One interface.', 'Every signal.'],
    description: 'The Component Atlas turns official news, community theories, walkthroughs, and moderation states into one readable language for the Leonida signal desk.',
    actions: [
      { label: 'Use the system', icon: '↗', target: 'atlas-controls', kind: 'primary' },
      { label: 'Read the rules', target: 'atlas-responsive', kind: 'ghost' }
    ],
    metrics: [
      { value: '44px', label: 'touch target cue' },
      { value: '860px', label: 'responsive split' },
      { value: '02', label: 'mapped modes' }
    ],
    tokens: [
      { id: 'accent', prefix: '$', name: '--accent:', value: '#ff007f', tone: 'pink' },
      { id: 'focus', prefix: '$', name: '--focus:', value: '#00f0ff', tone: 'cyan' }
    ],
    swatches: [
      { id: 'canvas', label: 'canvas', value: '#0b0914', tone: 'canvas' },
      { id: 'surface', label: 'surface', value: '#151126', tone: 'surface' },
      { id: 'primary', label: 'primary', value: '#ff007f', tone: 'primary' },
      { id: 'focus', label: 'focus', value: '#00f0ff', tone: 'focus' }
    ]
  },
  palette: [
    { id: 'canvas', label: 'Canvas', value: '#0b0914', role: 'background.canvas', tone: 'canvas' },
    { id: 'surface', label: 'Surface', value: '#151126', role: 'surface.default', tone: 'surface' },
    { id: 'raised', label: 'Raised', value: '#211a39', role: 'surface.raised', tone: 'raised' },
    { id: 'ink', label: 'Ink', value: '#ffffff', role: 'text.primary', tone: 'ink' },
    { id: 'muted', label: 'Muted', value: '#8490a6', role: 'text.secondary', tone: 'muted' },
    { id: 'primary', label: 'Primary', value: '#ff007f', role: 'primary.bg', tone: 'primary' },
    { id: 'focus', label: 'Focus', value: '#00f0ff', role: 'border.focus', tone: 'focus' },
    { id: 'warning', label: 'Warning', value: '#ea580c', role: 'rumour signal', tone: 'warning' }
  ],
  geometry: [
    { id: 'primary-shell', label: 'primary shell', value: '14px', detail: 'cards · heroes · profiles' },
    { id: 'compact-shell', label: 'compact shell', value: '9px', detail: 'rows · fields · admin' },
    { id: 'action-language', label: 'action language', value: 'pill', detail: 'buttons · chips · badges' }
  ],
  controls: {
    buttons: [
      { label: 'Browse walkthroughs', className: 'btn--primary' },
      { label: 'Latest GTA 6 news', className: 'btn--ghost' },
      { label: 'Neutral action', className: '' }
    ],
    chips: [
      { id: 'all-games', label: 'All games', active: true },
      { id: 'gta-online', label: 'GTA Online', active: false },
      { id: 'forum', label: 'Forum', active: false }
    ],
    field: '@vicecartographer',
    search: 'Search by source or category…',
    feedback: {
      title: 'Profile saved.',
      body: 'Your forum identity is ready for the next discussion.'
    }
  },
  statuses: [
    { id: 'official', label: 'Official', description: 'source confirmed', className: 'badge--official' },
    { id: 'gameplay', label: 'Gameplay', description: 'footage reading', className: 'badge--gameplay' },
    { id: 'rumour', label: 'Rumour', description: 'unverified claim', className: 'badge--rumour' },
    { id: 'admin', label: 'Admin', description: 'role / access', className: 'badge--admin' },
    { id: 'unlocked', label: 'Unlocked', description: 'tracker complete', className: 'achievement-status--unlocked' }
  ],
  featuredNews: {
    category: 'Official',
    source: 'source / Rockstar Games',
    date: '27 Aug 2026',
    title: 'Extended Look: Leonida after dark',
    summary: 'A new official media drop moves through neon coastlines, wet streets, and the wider state beyond Vice City. Here is the signal desk’s first pass.',
    excerpt: '“The city reads differently after sunset: businesses, waterways, and the spaces between them become part of the route.”',
    byline: '@signaldesk',
    meta: 'breakdown · 4 min read'
  },
  threads: [
    { initials: 'NV', title: 'Is the Keys route built for solo players?', category: 'General', categoryClass: 'badge--general', meta: '@nova · 12 min ago', replies: 18 },
    { initials: 'MC', title: 'Which Drift Race gives the cleanest line?', category: 'Races', categoryClass: 'badge--races', meta: '@midnightclub · 1 hr ago', replies: 7 },
    { initials: 'LC', title: 'Lucia’s first move after the prison gate', category: 'Theory', categoryClass: 'badge--community', meta: '@leonidacartographer · 2 hr ago', replies: 31 }
  ],
  responsive: [
    { id: 'desktop', label: 'desktop / > 860px', title: 'Horizontal nav + inline search', description: 'The topbar stays in one 60px row. Walkthrough detail can open into a main column and 300px sidecard.' },
    { id: 'split', label: '860px / split', title: 'Nav becomes a drawer', description: 'Search moves to a full-width row, the theme control joins the menu, and the scrim protects context.' },
    { id: 'mobile', label: 'mobile / touch', title: 'Fixed tab rail + safe area', description: 'The bottom tab bar keeps Home, Guides, News, and Forum one thumb away without obscuring content.' }
  ],
  systemNotes: [
    { label: 'CSS-only motion', tone: 'cyan' },
    { label: 'system sans', tone: 'cyan' },
    { label: 'light mode mapped', tone: 'pink' },
    { label: 'safe-area aware', tone: 'cyan' }
  ]
});

const renderSectionHeader = (number, eyebrow, title, trailing, id) => `
  <div class="atlas-section-head">
    <div>
      <p class="atlas-micro atlas-micro--cyan">${escapeHtml(number)} / ${escapeHtml(eyebrow)}</p>
      <h2 id="${escapeAttribute(id)}" tabindex="-1">${escapeHtml(title)}</h2>
    </div>
    <span class="atlas-code">${escapeHtml(trailing)}</span>
  </div>`;

const renderTokenRow = (token) => `
  <button class="atlas-token-row" type="button" data-atlas-copy data-atlas-token="${escapeAttribute(token.id)}" data-atlas-value="${escapeAttribute(`${token.name} ${token.value}`)}" aria-label="Copy ${escapeAttribute(token.name)} ${escapeAttribute(token.value)}">
    <span class="atlas-token-prefix atlas-token-prefix--${escapeAttribute(token.tone)}" aria-hidden="true">${escapeHtml(token.prefix)}</span>
    <code>${escapeHtml(token.name)}</code>
    <code class="atlas-token-value atlas-token-value--${escapeAttribute(token.tone)}">${escapeHtml(token.value)}</code>
    <span class="atlas-copy-hint" aria-hidden="true">copy</span>
  </button>`;

const renderHero = () => `
  <div class="atlas-hero-meta">
    <p class="atlas-micro atlas-micro--cyan">Component Atlas / Build 01</p>
    <p class="atlas-code">semantic role <span>/</span> source value <span>/</span> interactive state</p>
  </div>
  <section class="atlas-hero" aria-labelledby="atlas-title">
    <div class="atlas-hero__copy">
      <p class="atlas-micro atlas-micro--pink">${escapeHtml(ATLAS_DATA.hero.eyebrow)}</p>
      <h1 id="atlas-title">${escapeHtml(ATLAS_DATA.hero.titleLines[0])}<br><span>${escapeHtml(ATLAS_DATA.hero.titleLines[1])}</span></h1>
      <p class="atlas-hero__description">${escapeHtml(ATLAS_DATA.hero.description)}</p>
      <div class="atlas-actions">
        ${ATLAS_DATA.hero.actions.map((action) => `<button class="btn ${action.kind === 'primary' ? 'btn--primary' : 'btn--ghost'} atlas-action" type="button" data-atlas-scroll="${escapeAttribute(action.target)}">${escapeHtml(action.label)}${action.icon ? ` <span aria-hidden="true">${escapeHtml(action.icon)}</span>` : ''}</button>`).join('')}
      </div>
      <div class="atlas-hero-metrics">
        ${ATLAS_DATA.hero.metrics.map((metric) => `<span><b>${escapeHtml(metric.value)}</b> ${escapeHtml(metric.label)}</span>`).join('')}
      </div>
    </div>
    <div class="atlas-panel atlas-token-preview">
      <div class="atlas-preview-orbit" aria-hidden="true"></div>
      <div class="atlas-panel__content">
        <div class="atlas-panel-head">
          <p class="atlas-micro atlas-micro--cyan">Live token preview</p>
          <span class="atlas-code">preview / dark</span>
        </div>
        <div class="atlas-token-block" aria-label="Copyable token declarations">
          ${ATLAS_DATA.hero.tokens.map(renderTokenRow).join('')}
        </div>
        <div class="atlas-preview-swatches" aria-label="Preview color swatches">
          ${ATLAS_DATA.hero.swatches.map((swatch) => `<div><span class="atlas-swatch atlas-swatch--${escapeAttribute(swatch.tone)}"></span><span class="atlas-code">${escapeHtml(swatch.label)}</span></div>`).join('')}
        </div>
        <div class="atlas-brand-preview">
          <span class="brand__mark" aria-hidden="true">G6</span>
          <div><strong>Brand mark / gradient</strong><span class="atlas-code">135deg · primary → secondary</span></div>
        </div>
        <div class="atlas-preview-status">
          <span class="atlas-check" aria-hidden="true">✓</span>
          <span>light mode mapped</span>
          <code>{color.semantic.*}</code>
        </div>
      </div>
    </div>
  </section>
  <p class="atlas-live-status" id="atlasActionStatus" aria-live="polite"></p>`;

const renderFoundations = () => `
  <section class="atlas-section" aria-labelledby="atlas-foundations-title">
    ${renderSectionHeader('01', 'foundations', 'Tokens you can see', 'source: css/styles.css', 'atlas-foundations-title')}
    <div class="atlas-foundations-grid">
      <div class="atlas-panel atlas-palette-panel">
        <div class="atlas-panel-head">
          <div><p class="atlas-micro atlas-micro--pink">Color signals</p><p class="atlas-panel-description">Semantic roles stay visible before they become components.</p></div>
          <span class="atlas-code">8 primitives</span>
        </div>
        <div class="atlas-palette-grid">
          ${ATLAS_DATA.palette.map((item) => `<div class="atlas-palette-item"><span class="atlas-swatch atlas-swatch--${escapeAttribute(item.tone)}" title="${escapeAttribute(item.value)}"></span><div class="atlas-palette-label"><strong>${escapeHtml(item.label)}</strong><code>${escapeHtml(item.value)}</code></div><span class="atlas-role">${escapeHtml(item.role)}</span></div>`).join('')}
        </div>
      </div>
      <div class="atlas-panel atlas-geometry-panel">
        <div class="atlas-panel-head"><div><p class="atlas-micro atlas-micro--cyan">Geometry</p><p class="atlas-panel-description">Shape is a signal, not decoration.</p></div><span class="atlas-code">source values</span></div>
        <div class="atlas-geometry-list">
          ${ATLAS_DATA.geometry.map((item) => `<div class="atlas-geometry-row"><span>${escapeHtml(item.label)}</span><strong class="atlas-geometry-value atlas-geometry-value--${escapeAttribute(item.id)}">${escapeHtml(item.value)}</strong><small>${escapeHtml(item.detail)}</small></div>`).join('')}
        </div>
        <div class="atlas-ruler-wrap"><div class="atlas-ruler-label"><span>control height</span><code>min-height: 44px</code></div><div class="atlas-ruler"><b>44px touch target cue</b></div></div>
        <div class="atlas-container-note"><p class="atlas-micro">layout container</p><strong>1140 <span>px</span></strong><p class="atlas-code">centered · 1rem side gutter · fluid cards from 260px</p></div>
      </div>
    </div>
  </section>`;

const renderControls = () => `
  <section class="atlas-section" id="atlas-controls" aria-labelledby="atlas-controls-title">
    ${renderSectionHeader('02', 'interaction', 'Core controls', 'interactive state / default → active', 'atlas-controls-title')}
    <div class="atlas-controls-grid">
      <div class="atlas-panel atlas-control-room">
        <div class="atlas-panel-head"><div><p class="atlas-micro atlas-micro--cyan">Control room</p><p class="atlas-panel-description">Use the system’s weight before adding more chrome.</p></div><span class="atlas-code">button / chip / field</span></div>
        <div class="atlas-control-demo-grid">
          <div>
            <p class="atlas-micro">Actions</p>
            <div class="atlas-demo-actions">${ATLAS_DATA.controls.buttons.map((button) => `<button class="btn ${escapeAttribute(button.className)}" type="button">${escapeHtml(button.label)}</button>`).join('')}</div>
            <p class="atlas-micro atlas-control-label">Filters</p>
            <div class="atlas-demo-chips" role="group" aria-label="Filter chip states">
              ${ATLAS_DATA.controls.chips.map((chip) => `<button class="chip${chip.active ? ' is-active' : ''}" type="button" data-atlas-chip="${escapeAttribute(chip.id)}" aria-pressed="${chip.active ? 'true' : 'false'}">${escapeHtml(chip.label)}</button>`).join('')}
            </div>
            <p class="atlas-micro atlas-control-label">Search / focus state</p>
            <input class="atlas-focus-input" type="search" value="${escapeAttribute(ATLAS_DATA.controls.search)}" aria-label="Search by source or category" readonly>
          </div>
          <div>
            <p class="atlas-micro">Compact field</p>
            <label class="atlas-field-label" for="atlas-profile-handle">Profile handle</label>
            <input class="atlas-compact-input" id="atlas-profile-handle" value="${escapeAttribute(ATLAS_DATA.controls.field)}" aria-label="Profile handle" readonly>
            <p class="atlas-code atlas-field-note">9px radius · 1px border</p>
            <p class="atlas-micro atlas-control-label">Inline feedback</p>
            <div class="atlas-feedback" role="status"><span class="atlas-feedback-icon" aria-hidden="true">✓</span><span><strong>${escapeHtml(ATLAS_DATA.controls.feedback.title)}</strong><small>${escapeHtml(ATLAS_DATA.controls.feedback.body)}</small></span></div>
            <div class="atlas-touch-cue"><p class="atlas-micro">Touch cue</p><div><strong>44px</strong><span>minimum source height</span></div></div>
          </div>
        </div>
        <p class="atlas-filter-status atlas-code" data-atlas-filter-status>active chip / All games</p>
      </div>
      <aside class="atlas-panel atlas-state-panel">
        <div class="atlas-panel-head"><div><p class="atlas-micro atlas-micro--pink">State language</p><p class="atlas-panel-title">States</p></div><span class="atlas-code">status / editorial</span></div>
        <div class="atlas-state-list">
          ${ATLAS_DATA.statuses.map((status) => `<div class="atlas-state-row"><span>${escapeHtml(status.description)}</span><span class="badge ${escapeAttribute(status.className)}">${escapeHtml(status.label)}</span></div>`).join('')}
        </div>
        <div class="atlas-disabled-demo"><p class="atlas-micro">Unavailable action</p><button class="btn atlas-disabled-button" type="button" disabled>Approve &amp; Publish</button><span class="atlas-code">opacity: .4 · retains hierarchy</span></div>
      </aside>
    </div>
  </section>`;

const renderEditorial = () => `
  <section class="atlas-section" aria-labelledby="atlas-editorial-title">
    ${renderSectionHeader('03', 'composition', 'Editorial surfaces', 'dense, breathable, accountable', 'atlas-editorial-title')}
    <div class="atlas-editorial-grid">
      <div class="atlas-feature-column">
        <article class="card card--news atlas-featured-card">
          <div class="atlas-featured-card__top"><div><span class="badge badge--official">${escapeHtml(ATLAS_DATA.featuredNews.category)}</span><span class="atlas-micro">${escapeHtml(ATLAS_DATA.featuredNews.source)}</span></div><span class="atlas-code">${escapeHtml(ATLAS_DATA.featuredNews.date)}</span></div>
          <div class="atlas-featured-card__body"><p class="atlas-micro atlas-micro--pink">featured signal</p><div class="atlas-featured-title-row"><h3>${escapeHtml(ATLAS_DATA.featuredNews.title)}</h3><span aria-hidden="true">▥</span></div><p class="atlas-featured-summary">${escapeHtml(ATLAS_DATA.featuredNews.summary)}</p><blockquote><p class="atlas-micro atlas-micro--cyan">raised content excerpt</p><p>${escapeHtml(ATLAS_DATA.featuredNews.excerpt)}</p></blockquote><div class="atlas-featured-footer"><span>By <strong>${escapeHtml(ATLAS_DATA.featuredNews.byline)}</strong> · ${escapeHtml(ATLAS_DATA.featuredNews.meta)}</span><button class="atlas-text-link" type="button" data-atlas-scroll="atlas-responsive">Read breakdown <span aria-hidden="true">→</span></button></div></div>
        </article>
        <aside class="atlas-rumour-note"><span class="atlas-rumour-icon" aria-hidden="true">⚠</span><div><strong>Know the difference</strong><p>Rumour Watch keeps predictions and unverified claims separate from official announcements. If Rockstar has not announced it, it is not confirmed.</p></div></aside>
      </div>
      <div class="atlas-discussion-column">
        <div class="atlas-discussion-head"><div><p class="atlas-micro atlas-micro--pink">Active discussions</p><p class="atlas-panel-description">Forum rows keep the conversation scannable.</p></div><span class="atlas-code">3 threads</span></div>
        <div class="atlas-discussion-stack">
          ${ATLAS_DATA.threads.map((thread) => `<a class="thread atlas-thread" href="#/forum"><span class="avatar">${escapeHtml(thread.initials)}</span><span class="thread__body"><strong class="thread__title">${escapeHtml(thread.title)}</strong><span class="thread__meta"><span class="badge ${escapeAttribute(thread.categoryClass)}">${escapeHtml(thread.category)}</span> ${escapeHtml(thread.meta)}</span></span><span class="thread__stats"><b>${escapeHtml(thread.replies)}</b>replies</span></a>`).join('')}
        </div>
        <div class="empty atlas-empty-specimen"><p class="atlas-micro">empty-state specimen</p><p>No pinned discussions yet.</p><span class="atlas-code">border: 1px dashed</span></div>
      </div>
    </div>
  </section>`;

const renderResponsive = () => `
  <section class="atlas-section" id="atlas-responsive" aria-labelledby="atlas-responsive-title">
    ${renderSectionHeader('04', 'responsive behavior', 'Same signal, different frame', 'breakpoint: 860px', 'atlas-responsive-title')}
    <div class="atlas-panel atlas-responsive-panel">
      <div class="atlas-responsive-grid">
        ${ATLAS_DATA.responsive.map((item, index) => `<div class="atlas-responsive-item atlas-responsive-item--${escapeAttribute(item.id)}"><p class="atlas-micro atlas-micro--${index === 1 ? 'pink' : 'cyan'}">${escapeHtml(item.label)}</p><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description)}</p></div>`).join('')}
      </div>
      <div class="atlas-mobile-specimen"><div class="atlas-mobile-specimen-head"><p class="atlas-micro">mobile tab rail specimen</p><span class="atlas-code">tabbar-h: 58px</span></div><nav class="atlas-mobile-tabs" aria-label="Mobile tab specimen"><a class="is-active" href="#/" aria-current="page"><span aria-hidden="true">⌂</span>Home</a><a href="#/walkthroughs"><span aria-hidden="true">▤</span>Guides</a><a href="#/news"><span aria-hidden="true">▥</span>News</a><a href="#/forum"><span aria-hidden="true">▣</span>Forum</a></nav></div>
    </div>
  </section>`;

const renderSystemNote = () => `
  <section class="atlas-system-note" aria-label="System notes">
    <div><p class="atlas-micro atlas-micro--pink">Built for the Leonida signal desk</p><p>A living reference for the community intelligence hub.</p></div>
    <div class="atlas-system-note__list">${ATLAS_DATA.systemNotes.map((note) => `<span><i class="atlas-dot atlas-dot--${escapeAttribute(note.tone)}" aria-hidden="true"></i>${escapeHtml(note.label)}</span>`).join('')}</div>
  </section>`;

export function renderAtlas() {
  return `<div class="atlas-page">
    ${renderHero()}
    ${renderFoundations()}
    ${renderControls()}
    ${renderEditorial()}
    ${renderResponsive()}
    ${renderSystemNote()}
  </div>`;
}

const fallbackCopy = (value) => {
  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  let copied = false;
  try { copied = document.execCommand('copy'); } catch { copied = false; }
  textarea.remove();
  return copied;
};

const announce = (root, message) => {
  const status = root.querySelector('#atlasActionStatus');
  if (!status) return;
  status.textContent = message;
  window.setTimeout(() => {
    if (status.textContent === message) status.textContent = '';
  }, 2400);
};

const copyToken = async (root, trigger) => {
  const value = trigger.dataset.atlasValue || '';
  const tokenId = trigger.dataset.atlasToken || 'token';
  let copied = false;
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(value);
      copied = true;
    } catch { copied = false; }
  }
  if (!copied) copied = fallbackCopy(value);
  trigger.classList.toggle('is-copied', copied);
  announce(root, copied ? `Copied ${tokenId}` : 'Copy unavailable — select the token value manually.');
};

export function bindAtlasInteractions({ root = document } = {}) {
  if (!root || root.dataset.atlasBound === 'true') return;
  root.dataset.atlasBound = 'true';

  root.addEventListener('click', (event) => {
    const copyTrigger = event.target.closest('[data-atlas-copy]');
    if (copyTrigger && root.contains(copyTrigger)) {
      event.preventDefault();
      copyToken(root, copyTrigger);
      return;
    }

    const scrollTrigger = event.target.closest('[data-atlas-scroll]');
    if (scrollTrigger && root.contains(scrollTrigger)) {
      event.preventDefault();
      const targetId = scrollTrigger.dataset.atlasScroll || '';
      const target = Array.from(root.querySelectorAll('[id]')).find((candidate) => candidate.id === targetId);
      if (!target) return;
      const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      const focusTarget = target.matches('[tabindex]') ? target : target.querySelector('[tabindex="-1"]');
      focusTarget?.focus({ preventScroll: true });
      return;
    }

    const chip = event.target.closest('[data-atlas-chip]');
    if (chip && root.contains(chip)) {
      event.preventDefault();
      root.querySelectorAll('[data-atlas-chip]').forEach((candidate) => {
        const active = candidate === chip;
        candidate.classList.toggle('is-active', active);
        candidate.setAttribute('aria-pressed', String(active));
      });
      const label = chip.textContent.trim();
      const status = root.querySelector('[data-atlas-filter-status]');
      if (status) status.textContent = `active chip / ${label}`;
    }
  });
}
