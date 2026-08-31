import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, orderBy, limit, getDocs } from "firebase/firestore";
const firebaseConfig = { apiKey: "AIzaSyD7VThxCB6PimQHqKa4Ahj8DEyCDiNX9nc", projectId: "gta6app" };
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
async function test() {
  try {
    const q1 = query(collection(db, "news"), orderBy("dateAdded", "desc"), limit(5));
    const snap1 = await getDocs(q1);
    console.log("News:", snap1.size);

    const q2 = query(collection(db, "walkthroughs"), orderBy("updatedAt", "desc"), limit(5));
    const snap2 = await getDocs(q2);
    console.log("Walkthroughs:", snap2.size);
  } catch (e) {
    console.error("Error:", e.message);
  }
}
test();
