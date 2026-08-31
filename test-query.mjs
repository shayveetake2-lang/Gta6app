import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, orderBy, getDocs } from "firebase/firestore";
const firebaseConfig = {
  apiKey: "AIzaSyD7VThxCB6PimQHqKa4Ahj8DEyCDiNX9nc",
  projectId: "gta6app",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
async function test() {
  try {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    console.log("Success! Found", snap.size, "posts.");
  } catch (e) {
    console.error("Error:", e.message);
  }
}
test();
