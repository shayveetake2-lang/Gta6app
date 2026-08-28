/**
 * Provision or promote an Admin account using Firebase Web API Key & Google Access Token.
 * Usage:
 *   node scripts/create-admin.mjs <email> <password> [username]
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const [,, email, password, username = 'admin'] = process.argv;

if (!email || !password) {
  console.log('Usage: node scripts/create-admin.mjs <email> <password> [username]');
  process.exit(1);
}

const configPath = path.join(os.homedir(), '.config/configstore/firebase-tools.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const accessToken = config.tokens?.access_token;
const apiKey = 'AIzaSyD7VThxCB6PimQHqKa4Ahj8DEyCDiNX9nc';
const PROJECT_ID = 'gta6app';

async function main() {
  console.log(`\n👑 Provisioning Admin: ${email} (@${username})...`);

  // 1. Sign up or Sign in to get UID
  let uid = null;
  const signUpRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true })
  });
  const signUpData = await signUpRes.json();

  if (signUpData.localId) {
    uid = signUpData.localId;
    console.log(`✅ Created Firebase Auth user (UID: ${uid})`);
  } else if (signUpData.error?.message === 'EMAIL_EXISTS') {
    // Sign in to get UID and update password
    const signInRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true })
    });
    const signInData = await signInRes.json();
    uid = signInData.localId;
    console.log(`ℹ️ User already exists (UID: ${uid}). Updating profile...`);
  } else {
    throw new Error(signUpData.error?.message || 'Failed to authenticate user');
  }

  // 2. Update Firestore doc with Admin role
  const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${uid}`;
  const firestoreBody = {
    fields: {
      username: { stringValue: username },
      usernameLower: { stringValue: username.toLowerCase() },
      displayName: { stringValue: username },
      email: { stringValue: email },
      bio: { stringValue: 'GTA6 Walkthrough Administrator' },
      location: { stringValue: 'Vice City' },
      role: { stringValue: 'Admin' },
      joinedAt: { timestampValue: new Date().toISOString() }
    }
  };

  const fsRes = await fetch(firestoreUrl, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(firestoreBody)
  });

  if (!fsRes.ok) {
    const errText = await fsRes.text();
    throw new Error(`Firestore update failed: ${errText}`);
  }

  console.log(`✅ Firestore user record /users/${uid} updated with role: 'Admin'`);
  console.log(`\n🎉 Admin account ready!\n  Login: ${email} (or username '${username}')\n  Password: ${password}\n  Admin Dashboard: #/admin\n`);
}

main().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
