/**
 * Data layer with two interchangeable backends:
 *   - Firestore, when js/firebase-config.js holds real credentials
 *   - a localStorage store, so the UI works offline / before setup
 * The UI only ever talks to the exported `DB` object.
 */
import {
  collection, doc, getDoc, getDocs, addDoc, setDoc, query, where,
  orderBy, limit, startAt, endAt, serverTimestamp, increment, updateDoc
} from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js';
import { ready, getDb, getUser, displayName } from './firebase.js';
import { SEED, CATEGORIES, TROPHIES } from './seed.js';
import { CONTENT_SECTIONS } from './content.js';

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

const LOCAL_KEY = 'gta6.db.v2';
const LOCAL_PROFILE_KEY = 'gta6.profile.id';

function loadLocal() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* storage unavailable or corrupt */ }
  return clone(SEED);
}

const local = loadLocal();

function saveLocal() {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(local));
  } catch { /* quota or private mode: stay in memory */ }
}

function localManualAchievements() {
  if (!Array.isArray(local.manualAchievements)) local.manualAchievements = [];
  return local.manualAchievements;
}

const localBackend = {
  async listUsers({ query: q = '' } = {}) {
    const needle = q.trim().toLowerCase();
    return clone(local.users.filter((u) => matchesUser(u, needle)));
  },
  async getProfile(id) {
    return clone(local.users.find((u) => u.id === id || u.username === id) || null);
  },
  async getCurrentProfile() {
    let id = null;
    try { id = localStorage.getItem(LOCAL_PROFILE_KEY); } catch { /* storage unavailable */ }
    return clone(local.users.find((user) => user.id === id) || local.users[0] || null);
  },
  async updateProfile(input) {
    const current = await this.getCurrentProfile();
    if (!current) throw new Error('No local profile is available.');
    const username = input.username.trim();
    const usernameLower = username.toLowerCase();
    if (local.users.some((user) => user.id !== current.id && user.usernameLower === usernameLower)) {
      throw new Error('That username is already in use.');
    }
    Object.assign(current, {
      username, usernameLower,
      displayName: input.displayName.trim(),
      bio: input.bio.trim(), location: input.location.trim()
    });
    local.users[local.users.findIndex((user) => user.id === current.id)] = current;
    try { localStorage.setItem(LOCAL_PROFILE_KEY, current.id); } catch { /* storage unavailable */ }
    saveLocal();
    return clone(current);
  },
  async createUser({ username, displayName, bio, location }) {
    const usernameLower = username.toLowerCase();
    if (local.users.some((user) => user.usernameLower === usernameLower)) {
      throw new Error('That username is already in use.');
    }
    const user = {
      id: uid('user'),
      username,
      usernameLower,
      displayName,
      bio: bio || '',
      location: location || '',
      role: 'Member',
      joinedAt: today()
    };
    local.users.unshift(user);
    saveLocal();
    return clone(user);
  },
  async listManualAchievements() {
    return clone(localManualAchievements().slice().sort((first, second) => second.createdAt.localeCompare(first.createdAt)));
  },
  async createManualAchievement({ gameTitle, achievementName, description }) {
    const achievement = {
      id: uid('achievement'),
      platform: 'manual',
      gameTitle,
      achievementName,
      description: description || '',
      unlocked: false,
      completedAt: null,
      createdAt: today()
    };
    localManualAchievements().unshift(achievement);
    saveLocal();
    return clone(achievement);
  },
  async setManualAchievementCompleted(id, unlocked) {
    const achievement = localManualAchievements().find((item) => item.id === id);
    if (!achievement) throw new Error('Achievement not found.');
    achievement.unlocked = unlocked;
    achievement.completedAt = unlocked ? today() : null;
    saveLocal();
    return clone(achievement);
  },
  async listWalkthroughs({ difficulty = 'all', query: q = '', includePending = false } = {}) {
    const needle = q.trim().toLowerCase();
    return clone(local.walkthroughs.filter(
      (w) => (includePending || w.approved !== false) && (difficulty === 'all' || w.difficulty === difficulty) && matchesQuery(w, needle)
    ));
  },
  async createWalkthrough(input) {
    const author = await this.getCurrentProfile();
    const walkthrough = {
      id: uid('wt'), title: input.title.trim(), game: 'GTA 6', difficulty: input.difficulty,
      duration: Number(input.duration), author: author.username, authorUid: author.id,
      likes: 0, updatedAt: today(), cover: input.cover.trim() || '📖',
      summary: input.summary.trim(), tags: input.tags, steps: input.steps, approved: false
    };
    local.walkthroughs.unshift(walkthrough);
    saveLocal();
    return clone(walkthrough);
  },
  async listPendingWalkthroughs() {
    return clone(local.walkthroughs.filter((w) => w.approved === false));
  },
  async approveWalkthrough(id) {
    const walkthrough = local.walkthroughs.find((w) => w.id === id);
    if (!walkthrough) throw new Error('Walkthrough not found');
    walkthrough.approved = true;
    saveLocal();
    return clone(walkthrough);
  },
  async getWalkthrough(id) {
    return clone(local.walkthroughs.find((w) => w.id === id) || null);
  },
  async listThreads(category) {
    return clone(local.threads.filter((t) => !category || category === 'all' || t.category === category))
      .map((t) => ({ ...t, replyCount: t.replies.length }));
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
  async likeThread(threadId) {
    const thread = local.threads.find((t) => t.id === threadId);
    if (!thread) throw new Error('Thread not found');
    thread.likes = (thread.likes || 0) + 1;
    saveLocal();
    return clone(thread);
  },
  async likeWalkthrough(walkthroughId) {
    const walkthrough = local.walkthroughs.find((w) => w.id === walkthroughId);
    if (!walkthrough) throw new Error('Walkthrough not found');
    walkthrough.likes = (walkthrough.likes || 0) + 1;
    saveLocal();
    return clone(walkthrough);
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

    async getCurrentProfile() {
      const user = getUser();
      if (!user) throw new Error('Sign in is not ready. Please try again.');
      const profile = await this.getProfile(user.uid);
      return profile || {
        id: user.uid,
        username: 'user_' + user.uid.slice(0, 8),
        displayName: 'New community member',
        bio: '',
        location: '',
        role: 'Member',
        joinedAt: today()
      };
    },

    async updateProfile(input) {
      const user = getUser();
      if (!user) throw new Error('Sign in is not ready. Please try again.');
      const profile = {
        username: input.username.trim(),
        usernameLower: input.username.trim().toLowerCase(),
        displayName: input.displayName.trim(),
        bio: input.bio.trim(), location: input.location.trim()
      };
      const profileRef = doc(db, 'users', user.uid);
      const existing = await getDoc(profileRef);
      if (existing.exists()) {
        await updateDoc(profileRef, profile);
      } else {
        await setDoc(profileRef, { ...profile, role: 'Member', joinedAt: serverTimestamp() });
      }
      return { id: user.uid, ...profile, role: input.role || 'Member', joinedAt: input.joinedAt || today() };
    },

    async createUser({ username, displayName, bio, location }) {
      const user = getUser();
      if (!user) throw new Error('Sign in is not ready. Please try again.');
      const profileRef = doc(db, 'users', user.uid);
      const existing = await getDoc(profileRef);
      if (existing.exists()) throw new Error('This browser already has a profile.');
      await setDoc(profileRef, {
        username,
        usernameLower: username.toLowerCase(),
        displayName,
        bio: bio || '',
        location: location || '',
        role: 'Member',
        joinedAt: serverTimestamp()
      });
      return { id: user.uid, username, displayName, bio: bio || '', location: location || '', role: 'Member', joinedAt: today() };
    },

    async listManualAchievements() {
      const user = getUser();
      if (!user) throw new Error('Sign in is not ready. Please try again.');
      const achievementsRef = collection(db, 'users', user.uid, 'manualAchievements');
      const snap = await getDocs(query(achievementsRef, orderBy('createdAt', 'desc'), limit(100)));
      return snap.docs.map((item) => ({
        id: item.id,
        ...item.data(),
        createdAt: toDateString(item.data().createdAt),
        completedAt: item.data().completedAt ? toDateString(item.data().completedAt) : null
      }));
    },

    async createManualAchievement({ gameTitle, achievementName, description }) {
      const user = getUser();
      if (!user) throw new Error('Sign in is not ready. Please try again.');
      const achievement = {
        platform: 'manual',
        gameTitle,
        achievementName,
        description: description || '',
        unlocked: false,
        completedAt: null,
        createdAt: serverTimestamp()
      };
      const ref = await addDoc(collection(db, 'users', user.uid, 'manualAchievements'), achievement);
      return { id: ref.id, ...achievement, createdAt: today() };
    },

    async setManualAchievementCompleted(id, unlocked) {
      const user = getUser();
      if (!user) throw new Error('Sign in is not ready. Please try again.');
      const ref = doc(db, 'users', user.uid, 'manualAchievements', id);
      await updateDoc(ref, { unlocked, completedAt: unlocked ? serverTimestamp() : null });
      return { id, unlocked, completedAt: unlocked ? today() : null };
    },

    async listWalkthroughs({ difficulty = 'all', query: q = '', includePending = false } = {}) {
      const filters = includePending ? [] : [where('approved', '==', true)];
      const snap = await getDocs(query(walkthroughsRef, ...filters, orderBy('updatedAt', 'desc'), limit(100)));
      const needle = q.trim().toLowerCase();
      return snap.docs
        .map((d) => ({ id: d.id, ...d.data(), updatedAt: toDateString(d.data().updatedAt) }))
        .filter((w) => difficulty === 'all' || w.difficulty === difficulty)
        .filter((w) => matchesQuery(w, needle));
    },

    async getWalkthrough(id) {
      const snap = await getDoc(doc(db, 'walkthroughs', id));
      if (!snap.exists()) return null;
      const walkthrough = { id: snap.id, ...snap.data(), updatedAt: toDateString(snap.data().updatedAt) };
      return walkthrough.approved === false ? null : walkthrough;
    },

    async createWalkthrough(input) {
      const user = getUser();
      if (!user) throw new Error('Sign in is not ready. Please try again.');
      const profile = await this.getCurrentProfile();
      const ref = await addDoc(walkthroughsRef, {
        title: input.title.trim(), game: 'GTA 6', difficulty: input.difficulty,
        duration: Number(input.duration), author: profile.username, authorUid: user.uid,
        likes: 0, updatedAt: serverTimestamp(), cover: input.cover.trim() || '📖',
        summary: input.summary.trim(), tags: input.tags, steps: input.steps, approved: false
      });
      return { id: ref.id, ...input, author: profile.username, approved: false, updatedAt: today() };
    },
    async listPendingWalkthroughs() {
      const snap = await getDocs(query(walkthroughsRef, where('approved', '==', false), orderBy('updatedAt', 'desc'), limit(100)));
      return snap.docs.map((d) => ({ id: d.id, ...d.data(), updatedAt: toDateString(d.data().updatedAt) }));
    },
    async approveWalkthrough(id) {
      await updateDoc(doc(db, 'walkthroughs', id), { approved: true });
      return this.getWalkthrough(id);
    },

    async listThreads(category) {
      const filters = !category || category === 'all' ? [] : [where('category', '==', category)];
      const snap = await getDocs(query(threadsRef, ...filters, orderBy('createdAt', 'desc'), limit(50)));
      return snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: toDateString(d.data().createdAt),
        replyCount: d.data().replyCount || 0
      }));
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
      return { id: ref.id, title, category, body, author, createdAt: today(), replies: [], replyCount: 0 };
    },

    async likeThread(threadId) {
      await updateDoc(doc(db, 'threads', threadId), { likes: increment(1) });
      return this.getThread(threadId);
    },

    async likeWalkthrough(walkthroughId) {
      await updateDoc(doc(db, 'walkthroughs', walkthroughId), { likes: increment(1) });
      return this.getWalkthrough(walkthroughId);
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

/* ---------------------------------------------------------------- exported */

let backend = localBackend;

/** Resolves to true when the Firestore backend is active. */
export const dbReady = (async () => {
  const connected = await ready;
  const store = getDb();
  if (!connected || !store) return false;
  backend = firestoreBackend(store);
  return true;
})();

export const DB = {
  listUsers: (opts) => backend.listUsers(opts),
  getProfile: (id) => backend.getProfile(id),
  getCurrentProfile: () => backend.getCurrentProfile(),
  updateProfile: (input) => backend.updateProfile(input),
  createUser: (input) => backend.createUser(input),
  listManualAchievements: () => backend.listManualAchievements(),
  createManualAchievement: (input) => backend.createManualAchievement(input),
  setManualAchievementCompleted: (id, unlocked) => backend.setManualAchievementCompleted(id, unlocked),
  listWalkthroughs: (opts) => backend.listWalkthroughs(opts),
  createWalkthrough: (input) => backend.createWalkthrough(input),
  listPendingWalkthroughs: () => backend.listPendingWalkthroughs(),
  approveWalkthrough: (id) => backend.approveWalkthrough(id),
  getWalkthrough: (id) => backend.getWalkthrough(id),
  listThreads: (category) => backend.listThreads(category),
  getThread: (id) => backend.getThread(id),
  createThread: (input) => backend.createThread(input),
  likeThread: (id) => backend.likeThread(id),
  likeWalkthrough: (id) => backend.likeWalkthrough(id),
  addReply: (threadId, input) => backend.addReply(threadId, input),
  categories: async () => CATEGORIES.slice(),
  listTrophies: async () => clone(TROPHIES),
  listContent: async () => clone(CONTENT_SECTIONS)
};
