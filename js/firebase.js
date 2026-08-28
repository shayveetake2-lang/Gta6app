import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js';
import {
  getAuth, signInAnonymously, onAuthStateChanged,
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, updateProfile as fbUpdateProfile
} from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js';
import { firebaseConfig } from './firebase-config.js';

export const isConfigured = !/^YOUR_/.test(firebaseConfig.apiKey || 'YOUR_');

let firestore = null;
let auth = null;
let currentUser = null;

// Auth-state change callbacks registered by the app layer.
const authListeners = [];

/** Resolves once Firebase is initialised (anonymous session established), or immediately if unconfigured. */
export const ready = (async function init() {
  if (!isConfigured) {
    console.warn('[firebase] Not configured — using local in-browser store.');
    return false;
  }
  try {
    const app = initializeApp(firebaseConfig);
    firestore = getFirestore(app);
    auth = getAuth(app);

    // Persistent listener for the session lifetime.
    onAuthStateChanged(auth, (user) => {
      currentUser = user;
      authListeners.forEach((cb) => cb(user));
    });

    // Establish an anonymous session for read-only access.
    await new Promise((resolve) => {
      const unsub = onAuthStateChanged(auth, (user) => {
        if (user) { unsub(); resolve(); }
      });
      signInAnonymously(auth).catch((err) => {
        console.error('[firebase] Anonymous sign-in failed:', err);
        resolve();
      });
    });
    return !!currentUser;
  } catch (err) {
    console.error('[firebase] Init failed, falling back to local store:', err);
    firestore = null;
    return false;
  }
})();

// ---- Auth helpers -------------------------------------------------------

/** Register with email + password. Returns the Firebase Auth user. */
export async function authRegister(email, password, displayNameStr) {
  if (!auth) throw new Error('Firebase is not configured.');
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (displayNameStr) await fbUpdateProfile(cred.user, { displayName: displayNameStr });
  return cred.user;
}

/** Sign in with email + password. Returns the Firebase Auth user. */
export async function authLogin(email, password) {
  if (!auth) throw new Error('Firebase is not configured.');
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

/** Sign out, then re-establish anonymous session for read-only access. */
export async function authSignOut() {
  if (!auth) return;
  await signOut(auth);
  await signInAnonymously(auth).catch(() => {});
}

/** Register a callback fired whenever auth state changes (fires immediately with current state). */
export function onAuthChange(cb) {
  authListeners.push(cb);
  cb(currentUser);
}

export function getDb()   { return firestore; }
export function getUser() { return currentUser; }

export async function signInAdmin(email, password) {
  if (!auth) throw new Error('Firebase is not configured.');
  await signInWithEmailAndPassword(auth, email, password);
  return currentUser;
}

export async function signOutUser() {
  if (auth) await signOut(auth);
}

export function displayName() {
  if (!currentUser) return 'guest';
  return currentUser.displayName || 'user-' + currentUser.uid.slice(0, 5);
}

/** True when the current user authenticated with email (not anonymous). */
export function isEmailUser() {
  return !!(currentUser && !currentUser.isAnonymous);
}
