/**
 * Firebase project settings. These values are public by design — access is
 * controlled by the Firestore security rules, not by hiding this file.
 * Replace the placeholders with the config from
 * Firebase console → Project settings → Your apps → Web app.
 */
export const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT.firebaseapp.com',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_PROJECT.appspot.com',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId: 'YOUR_APP_ID'
};

/**
 * Client-side seeding is blocked by firestore.rules (guides and other people's
 * profiles are not client-writable). Use `npm run seed` instead.
 */
export const SEED_ON_EMPTY = false;
