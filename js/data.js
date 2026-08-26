/**
 * Data layer with two interchangeable backends:
 *   - Firestore, when js/firebase-config.js holds real credentials
 *   - a localStorage store, so the UI works offline / before setup
 * The UI only ever talks to the exported `DB` object.
 */
import {
  collection, doc, getDoc, getDocs, addDoc, query, where,
  orderBy, limit, startAt, endAt, serverTimestamp, increment, updateDoc, writeBatch
} from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js';
import { ready, getDb, getUser, displayName } from './firebase.js';
import { SEED_ON_EMPTY } from './firebase-config.js';

/* ---------------------------------------------------------------- seed data */

const SEED = {
  users: [
    {
      id: 'nova',
      username: 'nova',
      displayName: 'Nova Reyes',
      bio: 'Speedrunner. Writes the story-mission guides nobody else wants to.',
      role: 'Contributor',
      joinedAt: '2025-11-02',
      location: 'Leeds, UK'
    },
    {
      id: 'mapmaker',
      username: 'mapmaker',
      displayName: 'Ari Kovac',
      bio: 'Cartographer for hire. Collectible routes and 100% checklists.',
      role: 'Moderator',
      joinedAt: '2025-09-14',
      location: 'Zagreb, HR'
    },
    {
      id: 'sable',
      username: 'sable',
      displayName: 'Sable',
      bio: 'Combat encounters, frame data and hard-mode strategies.',
      role: 'Contributor',
      joinedAt: '2026-01-20',
      location: 'Toronto, CA'
    },
    {
      id: 'pixelpush',
      username: 'pixelpush',
      displayName: 'Dana P.',
      bio: 'PC performance tuning and graphics settings comparisons.',
      role: 'Member',
      joinedAt: '2026-03-08',
      location: 'Austin, US'
    },
    {
      id: 'admin',
      username: 'admin',
      displayName: 'GTA6 Walkthrough Staff',
      bio: 'Official account. Announcements and rule changes.',
      role: 'Admin',
      joinedAt: '2025-08-01',
      location: 'Everywhere'
    }
  ],
  walkthroughs: [
    {
      id: 'wt-1',
      title: 'Prologue: Getting Out of Town',
      game: 'GTA 6',
      difficulty: 'easy',
      duration: 25,
      author: 'nova',
      updatedAt: '2026-08-12',
      cover: '🚗',
      summary: 'Complete the opening heist and escape the county line without losing wanted stars.',
      tags: ['story', 'beginner'],
      steps: [
        'Follow the on-screen prompts to reach the getaway vehicle.',
        'Stick to back roads to avoid the first police checkpoint.',
        'Swap vehicles at the barn to drop your wanted level.',
        'Drive to the safehouse and stash the loot.'
      ]
    },
    {
      id: 'wt-2',
      title: 'All Collectible Locations',
      game: 'GTA 6',
      difficulty: 'medium',
      duration: 180,
      author: 'mapmaker',
      updatedAt: '2026-08-20',
      cover: '🗺️',
      summary: 'Region-by-region route for every hidden collectible with the fastest travel order.',
      tags: ['collectibles', '100%'],
      steps: [
        'Unlock fast travel by finishing the second story chapter.',
        'Sweep the coastal region from south to north.',
        'Clear the inland swamp at night for easier spotting.',
        'Finish with the city rooftops using a helicopter.'
      ]
    },
    {
      id: 'wt-3',
      title: 'Hard Mode Boss Strategy',
      game: 'GTA 6',
      difficulty: 'hard',
      duration: 45,
      author: 'sable',
      updatedAt: '2026-08-25',
      cover: '🎯',
      summary: 'Loadout, cover positions and timing windows for the final confrontation.',
      tags: ['combat', 'endgame'],
      steps: [
        'Bring armor-piercing rounds and at least three medkits.',
        'Use the left-side cover to bait the first attack pattern.',
        'Break line of sight when the shield phase begins.',
        'Focus damage during the reload window after each volley.'
      ]
    },
    {
      id: 'wt-4',
      title: 'Fast Money in the First 5 Hours',
      game: 'GTA 6',
      difficulty: 'easy',
      duration: 60,
      author: 'nova',
      updatedAt: '2026-08-18',
      cover: '💰',
      summary: 'Repeatable early-game income loop that requires no upfront investment.',
      tags: ['economy', 'beginner'],
      steps: [
        'Complete the courier side jobs near the docks.',
        'Sell recovered vehicles at the west chop shop.',
        'Reinvest in a garage slot to double payout capacity.'
      ]
    }
  ],
  threads: [
    {
      id: 'th-1',
      title: 'Best settings for 60fps on mid-range hardware?',
      category: 'Tech',
      author: 'pixelpush',
      createdAt: '2026-08-24',
      body: 'Shadows and volumetric fog seem to be the biggest cost. What are you all running?',
      replies: [
        { id: 'r-1', author: 'sable', createdAt: '2026-08-24', body: 'Drop volumetrics to medium first, it is worth ~12fps.' },
        { id: 'r-2', author: 'nova', createdAt: '2026-08-25', body: 'Also cap the framerate, the frametimes get much smoother.' }
      ]
    },
    {
      id: 'th-2',
      title: 'Missable trophies list — help me verify',
      category: 'Guides',
      author: 'mapmaker',
      createdAt: '2026-08-21',
      body: 'I have found four so far. Adding them to the collectibles walkthrough once confirmed.',
      replies: [
        { id: 'r-3', author: 'pixelpush', createdAt: '2026-08-22', body: 'The chapter 3 photo one is definitely missable.' }
      ]
    },
    {
      id: 'th-3',
      title: 'Introduce yourself here',
      category: 'General',
      author: 'admin',
      createdAt: '2026-08-01',
      body: 'New here? Say hello and tell us what you are playing.',
      replies: []
    }
  ]
};

const CATEGORIES = ['General', 'Guides', 'Tech', 'Off-topic'];

/* ------------------------------------------------------------------ helpers */

const clone = (v) => JSON.parse(JSON.stringify(v));
const today = () => new Date().toISOString().slice(0, 10);
const uid = (p) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

function toDateString(value) {
  if (!value) return today();
  if (typeof value === 'string') return value;
  if (typeof value.toDate === 'function') return value.toDate().toISOString().slice(0, 10);
  return today();
}

function matchesQuery(w, needle) {
  if (!needle) return true;
  return `${w.title} ${w.summary} ${(w.tags || []).join(' ')}`.toLowerCase().includes(needle);
}

function matchesUser(u, needle) {
  if (!needle) return true;
  return `${u.username} ${u.displayName} ${u.bio || ''} ${u.location || ''}`.toLowerCase().includes(needle);
}

/* -------------------------------------------------------- local (fallback) */

const LOCAL_KEY = 'wh.db.v1';

function loadLocal() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* storage unavailable or corrupt */ }
  return clone(SEED);
}

const local = loadLocal();
if (!local.users) local.users = clone(SEED.users); // store predates the accounts section

function saveLocal() {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(local));
  } catch { /* quota or private mode: stay in memory */ }
}

const localBackend = {
  async listUsers({ query: q = '' } = {}) {
    const needle = q.trim().toLowerCase();
    return clone(local.users.filter((u) => matchesUser(u, needle)));
  },
  async getProfile(id) {
    return clone(local.users.find((u) => u.id === id || u.username === id) || null);
  },
  async listWalkthroughs({ difficulty = 'all', query: q = '' } = {}) {
    const needle = q.trim().toLowerCase();
    return clone(local.walkthroughs.filter(
      (w) => (difficulty === 'all' || w.difficulty === difficulty) && matchesQuery(w, needle)
    ));
  },
  async getWalkthrough(id) {
    return clone(local.walkthroughs.find((w) => w.id === id) || null);
  },
  async listThreads(category) {
    return clone(local.threads.filter((t) => !category || category === 'all' || t.category === category));
  },
  async getThread(id) {
    return clone(local.threads.find((t) => t.id === id) || null);
  },
  async createThread({ title, category, body, author }) {
    const thread = {
      id: uid('th'),
      title,
      category: category || 'General',
      author: author || 'guest',
      createdAt: today(),
      body,
      replies: []
    };
    local.threads.unshift(thread);
    saveLocal();
    return clone(thread);
  },
  async addReply(threadId, { body, author }) {
    const thread = local.threads.find((t) => t.id === threadId);
    if (!thread) throw new Error('Thread not found');
    const reply = { id: uid('r'), author: author || 'guest', createdAt: today(), body };
    thread.replies.push(reply);
    saveLocal();
    return clone(reply);
  }
};

/* --------------------------------------------------------------- firestore */

function firestoreBackend(db) {
  const threadsRef = collection(db, 'threads');
  const walkthroughsRef = collection(db, 'walkthroughs');
  const usersRef = collection(db, 'users');

  return {
    async listUsers({ query: q = '' } = {}) {
      const needle = q.trim().toLowerCase();
      // Firestore has no substring search: range-scan the username prefix,
      // then widen with a client-side match over the returned page.
      const constraints = needle
        ? [orderBy('usernameLower'), startAt(needle), endAt(needle + '\uf8ff'), limit(25)]
        : [orderBy('usernameLower'), limit(50)];
      let docs = (await getDocs(query(usersRef, ...constraints))).docs;

      if (needle && docs.length === 0) {
        const page = await getDocs(query(usersRef, orderBy('usernameLower'), limit(200)));
        docs = page.docs.filter((d) => matchesUser(d.data(), needle));
      }
      return docs.map((d) => ({ id: d.id, ...d.data(), joinedAt: toDateString(d.data().joinedAt) }));
    },

    async getProfile(id) {
      const snap = await getDoc(doc(db, 'users', id));
      if (!snap.exists()) return null;
      return { id: snap.id, ...snap.data(), joinedAt: toDateString(snap.data().joinedAt) };
    },

    async listWalkthroughs({ difficulty = 'all', query: q = '' } = {}) {
      const filters = difficulty === 'all' ? [] : [where('difficulty', '==', difficulty)];
      const snap = await getDocs(query(walkthroughsRef, ...filters, orderBy('updatedAt', 'desc'), limit(100)));
      const needle = q.trim().toLowerCase();
      return snap.docs
        .map((d) => ({ id: d.id, ...d.data(), updatedAt: toDateString(d.data().updatedAt) }))
        .filter((w) => matchesQuery(w, needle));
    },

    async getWalkthrough(id) {
      const snap = await getDoc(doc(db, 'walkthroughs', id));
      if (!snap.exists()) return null;
      return { id: snap.id, ...snap.data(), updatedAt: toDateString(snap.data().updatedAt) };
    },

    async listThreads(category) {
      const filters = !category || category === 'all' ? [] : [where('category', '==', category)];
      const snap = await getDocs(query(threadsRef, ...filters, orderBy('createdAt', 'desc'), limit(50)));
      return snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          createdAt: toDateString(data.createdAt),
          replies: new Array(data.replyCount || 0) // the list view only needs the count
        };
      });
    },

    async getThread(id) {
      const snap = await getDoc(doc(db, 'threads', id));
      if (!snap.exists()) return null;
      const repliesSnap = await getDocs(
        query(collection(db, 'threads', id, 'replies'), orderBy('createdAt', 'asc'), limit(200))
      );
      return {
        id: snap.id,
        ...snap.data(),
        createdAt: toDateString(snap.data().createdAt),
        replies: repliesSnap.docs.map((r) => ({
          id: r.id,
          ...r.data(),
          createdAt: toDateString(r.data().createdAt)
        }))
      };
    },

    async createThread({ title, category, body }) {
      const user = getUser();
      const author = displayName();
      const ref = await addDoc(threadsRef, {
        title,
        category: category || 'General',
        body,
        author,
        authorUid: user ? user.uid : null,
        createdAt: serverTimestamp(),
        replyCount: 0
      });
      return { id: ref.id, title, category, body, author, createdAt: today(), replies: [] };
    },

    async addReply(threadId, { body }) {
      const user = getUser();
      const reply = {
        body,
        author: displayName(),
        authorUid: user ? user.uid : null,
        createdAt: serverTimestamp()
      };
      const ref = await addDoc(collection(db, 'threads', threadId, 'replies'), reply);
      await updateDoc(doc(db, 'threads', threadId), { replyCount: increment(1) });
      return { id: ref.id, ...reply, createdAt: today() };
    }
  };
}

async function seedFirestore(db) {
  const existing = await getDocs(query(collection(db, 'walkthroughs'), limit(1)));
  if (!existing.empty) return;

  const batch = writeBatch(db);
  SEED.users.forEach(({ id, ...data }) =>
    batch.set(doc(db, 'users', id), { ...data, usernameLower: data.username.toLowerCase() }));
  SEED.walkthroughs.forEach(({ id, ...data }) => batch.set(doc(db, 'walkthroughs', id), data));
  SEED.threads.forEach(({ id, replies, ...data }) => {
    batch.set(doc(db, 'threads', id), { ...data, replyCount: replies.length });
    replies.forEach(({ id: rid, ...reply }) => batch.set(doc(db, 'threads', id, 'replies', rid), reply));
  });
  await batch.commit();
  console.info('[firebase] Seeded starter content.');
}

/* ---------------------------------------------------------------- exported */

let backend = localBackend;

/** Resolves to true when the Firestore backend is active. */
export const dbReady = (async () => {
  const connected = await ready;
  const store = getDb();
  if (!connected || !store) return false;
  backend = firestoreBackend(store);
  if (SEED_ON_EMPTY) {
    try {
      await seedFirestore(store);
    } catch (err) {
      console.warn('[firebase] Seeding skipped:', err.message);
    }
  }
  return true;
})();

export const DB = {
  listUsers: (opts) => backend.listUsers(opts),
  getProfile: (id) => backend.getProfile(id),
  listWalkthroughs: (opts) => backend.listWalkthroughs(opts),
  getWalkthrough: (id) => backend.getWalkthrough(id),
  listThreads: (category) => backend.listThreads(category),
  getThread: (id) => backend.getThread(id),
  createThread: (input) => backend.createThread(input),
  addReply: (threadId, input) => backend.addReply(threadId, input),
  categories: async () => CATEGORIES.slice()
};
