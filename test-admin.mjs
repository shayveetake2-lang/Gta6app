import admin from "firebase-admin";

admin.initializeApp({
  projectId: "gta6app"
});

const db = admin.firestore();

async function test() {
  try {
    const newsRef = db.collection("news");
    const q = newsRef.where("isApproved", "==", true).orderBy("dateAdded", "desc").limit(100);
    const snap = await q.get();
    console.log("SUCCESS! Got " + snap.size + " docs");
    process.exit(0);
  } catch (e) {
    console.error("ERROR:");
    console.error(e);
    process.exit(1);
  }
}

test();
