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
import { SEED, CATEGORIES } from './seed.js';

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
