import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';

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

const newsItems = [
  {
    id: "gta6-release-date",
    title: "Official Release Date Announced",
    category: "Official",
    content: "GTA 6 will officially release on Thursday, November 19, 2026, for the PlayStation 5 and Xbox Series X/S.",
    sourceLink: "https://rockstargames.com/newswire",
    isApproved: true,
    author: "admin",
    authorUid: "admin",
    dateAdded: "2026-08-30T10:00:00Z"
  },
  {
    id: "gta6-performance-scale",
    title: "Performance & Scale Details",
    category: "Official",
    content: "The campaign takes up to 80 hours to beat, and the game is capped at 30fps on consoles. The budget reportedly surpassed 1 to 2 billion dollars.",
    sourceLink: "https://rockstargames.com/newswire",
    isApproved: true,
    author: "admin",
    authorUid: "admin",
    dateAdded: "2026-08-30T10:05:00Z"
  },
  {
    id: "gta6-protagonists-romance",
    title: "Protagonists & Romance Options",
    category: "Official",
    content: "Features dual protagonists, Lucia Caminos and Jason Duval. They have a modern \"Bonnie and Clyde\" dynamic, but romance is optional and must be actively nurtured.",
    sourceLink: "https://rockstargames.com/newswire",
    isApproved: true,
    author: "admin",
    authorUid: "admin",
    dateAdded: "2026-08-30T10:10:00Z"
  },
  {
    id: "gta6-rpg-mechanics",
    title: "Dynamic RPG Mechanics",
    category: "Official",
    content: "Players can gain or lose weight, and sleep deprivation will visibly show on their faces.",
    sourceLink: "https://rockstargames.com/newswire",
    isApproved: true,
    author: "admin",
    authorUid: "admin",
    dateAdded: "2026-08-30T10:15:00Z"
  },
  {
    id: "gta6-august-leaks",
    title: "August 2026 Gameplay Leaks",
    category: "Leaks",
    content: "A group known as \"CyberLeek\" released footage showing a basketball minigame with a \"Focus\" mechanic, a taser weapon, and key-cloning for vehicles.",
    sourceLink: "",
    isApproved: true,
    author: "admin",
    authorUid: "admin",
    dateAdded: "2026-08-30T10:20:00Z"
  }
];

async function seedNews() {
  const batch = db.batch();
  for (const item of newsItems) {
    const { id, dateAdded, ...rest } = item;
    batch.set(db.doc(`news/${id}`), {
      ...rest,
      dateAdded: ts(dateAdded)
    });
  }
  await batch.commit();
  console.log(`Seeded ${newsItems.length} verified GTA 6 news items.`);
}

seedNews().catch((err) => {
  console.error(err);
  process.exit(1);
});
