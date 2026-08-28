/**
 * One-off Firestore seeder. The security rules deny client writes to
 * `walkthroughs` and to other people's `users` docs, so the starter content has
 * to be written with the Admin SDK, which bypasses rules.
 *
 * Usage:
 *   npm install
 *   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
 *   npm run seed
 */
import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';
import { SEED } from '../js/seed.js';

const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!keyPath) {
  console.error('Set GOOGLE_APPLICATION_CREDENTIALS to your service-account JSON file first.');
  process.exit(1);
}

const credential = process.env.FIRESTORE_EMULATOR_HOST
  ? applicationDefault()
  : cert(JSON.parse(readFileSync(keyPath, 'utf8')));

initializeApp({ credential });
const db = getFirestore();

const ts = (isoDate) => Timestamp.fromDate(new Date(isoDate));

async function seed() {
  const batch = db.batch();

  for (const { id, joinedAt, ...user } of SEED.users) {
    batch.set(db.doc(`users/${id}`), {
      ...user,
      usernameLower: user.username.toLowerCase(),
      joinedAt: ts(joinedAt)
    });
  }

  for (const { id, updatedAt, ...guide } of SEED.walkthroughs) {
    batch.set(db.doc(`walkthroughs/${id}`), { ...guide, approved: true, updatedAt: ts(updatedAt) });
  }

  for (const { id, replies, createdAt, ...thread } of SEED.threads) {
    batch.set(db.doc(`threads/${id}`), {
      ...thread,
      createdAt: ts(createdAt),
      replyCount: replies.length
    });
    for (const { id: replyId, createdAt: replyDate, ...reply } of replies) {
      batch.set(db.doc(`threads/${id}/replies/${replyId}`), { ...reply, createdAt: ts(replyDate) });
    }
  }

  await batch.commit();
  const counts = [SEED.users.length, SEED.walkthroughs.length, SEED.threads.length];
  console.log(`Seeded ${counts[0]} users, ${counts[1]} walkthroughs, ${counts[2]} threads.`);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
