import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js';
import { getAuth, signInAnonymously, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js';
import { firebaseConfig } from './firebase-config.js';

export const isConfigured = !/^YOUR_/.test(firebaseConfig.apiKey || 'YOUR_');

let firestore = null;
let auth = null;
let currentUser = null;

/** Resolves once Firebase is initialised and signed in, or immediately if unconfigured. */
export const ready = (async function init() {
  if (!isConfigured) {
    console.warn('[firebase] Not configured — using the local in-browser store. Fill in js/firebase-config.js to connect.');
    return false;
  }
  try {
    const app = initializeApp(firebaseConfig);
    firestore = getFirestore(app);
    auth = getAuth(app);

    await new Promise((resolve) => {
      onAuthStateChanged(auth, (user) => {
        currentUser = user;
        if (user) resolve();
      });
      signInAnonymously(auth).catch((err) => {
        console.error('[firebase] Anonymous sign-in failed:', err);
        resolve();
      });
    });
    return !!currentUser;
  } catch (err) {
    console.error('[firebase] Initialisation failed, falling back to local store:', err);
    firestore = null;
    return false;
  }
})();

export function getDb() { return firestore; }
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
