/**
 * Creates or updates the two application Admin accounts.
 *
 * Required environment variables:
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
 *   ADMIN1_EMAIL, ADMIN1_PASSWORD, ADMIN1_USERNAME
 *   ADMIN2_EMAIL, ADMIN2_PASSWORD, ADMIN2_USERNAME
 *
 * Passwords are intentionally supplied at runtime and never committed.
 */
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';

const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!keyPath) throw new Error('Set GOOGLE_APPLICATION_CREDENTIALS first.');

initializeApp({ credential: cert(JSON.parse(readFileSync(keyPath, 'utf8'))) });
const auth = getAuth();
const db = getFirestore();

const admins = [1, 2].map((number) => {
  const email = process.env[`ADMIN${number}_EMAIL`];
  const password = process.env[`ADMIN${number}_PASSWORD`];
  const username = process.env[`ADMIN${number}_USERNAME`];
  if (!email || !password || !username) throw new Error(`Set ADMIN${number}_EMAIL, ADMIN${number}_PASSWORD, and ADMIN${number}_USERNAME.`);
  return { email, password, username };
});

for (const admin of admins) {
  let user;
  try {
    user = await auth.getUserByEmail(admin.email);
    user = await auth.updateUser(user.uid, { password: admin.password, displayName: admin.username });
  } catch (error) {
    if (error.code !== 'auth/user-not-found') throw error;
    user = await auth.createUser({ email: admin.email, password: admin.password, displayName: admin.username });
  }
  await db.doc(`users/${user.uid}`).set({
    username: admin.username,
    usernameLower: admin.username.toLowerCase(),
    displayName: admin.username,
    bio: 'GTA6 Walkthrough administrator.',
    location: '',
    role: 'Admin',
    joinedAt: new Date()
  }, { merge: true });
  console.log(`Provisioned Admin ${admin.username} (${user.uid}).`);
}
