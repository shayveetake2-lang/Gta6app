import React, { useEffect, useState } from "react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "./firebaseConfig"; // Core web/mobile SDK initialized module

export default function GtaContentStream() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    // Target only public-approved content, ordered sequentially by newest first
    const postsCollectionRef = collection(db, "gta_news_posts");
    let baseQuery = query(
      postsCollectionRef,
      where("status", "==", "published"),
      orderBy("timestamp", "desc")
    );

    // Initialize real-time listening stream from Firestore database
    const unsubscribe = onSnapshot(baseQuery, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPosts(items);
      setLoading(false);
    }, (error) => {
      console.error("💥 Error fetching live streams:", error);
      setLoading(false);
    });

    return () => unsubscribe(); // Terminate event stream wrapper on unmount
  }, []);

  const filteredPosts = posts.filter(post => filter === "All" || post.category === filter);

  if (loading) return <div style={{color: "#fff", background: "#050505", padding: "20px"}}>Loading Vice City Feeds...</div>;

  return (
    <div style={{ background: "#0A0A0C", color: "#F1F1F4", padding: "16px", fontFamily: "sans-serif", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #FE005D", paddingBottom: "12px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px", margin: 0, color: "#FE005D" }}>GTA VI Live Core</h1>
        <select onChange={(e) => setFilter(e.target.value)} style={{ background: "#1A1A24", color: "#fff", border: "1px solid #3A3A4F", padding: "6px 12px", borderRadius: "6px" }}>
          <option value="All">All Stream Content</option>
          <option value="News">Latest News Updates</option>
          <option value="Walkthrough">Walkthrough Guides</option>
        </select>
      </div>

      <div style={{ marginTop: "20px" }}>
        {filteredPosts.length === 0 ? (
          <p style={{ color: "#6A6A7F" }}>No matching published articles available yet.</p>
        ) : (
          filteredPosts.map(post => (
            <article key={post.id} style={{ background: "#12121A", borderRadius: "10px", padding: "20px", marginBottom: "16px", border: "1px solid #222230" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <span style={{ background: post.category === "News" ? "#FE005D" : "#00D2FF", color: "#000", fontWeight: "bold", fontSize: "11px", textTransform: "uppercase", padding: "3px 8px", borderRadius: "4px" }}>
                  {post.category}
                </span>
                <small style={{ color: "#6A6A7F" }}>{new Date(post.timestamp).toLocaleDateString()}</small>
              </div>
              <h2 style={{ fontSize: "18px", color: "#fff", margin: "0 0 10px 0" }}>{post.title}</h2>
              <div style={{ color: "#B5B5C3", fontSize: "14px", lineHeight: "1.6", whiteSpace: "pre-wrap" }}>
                {post.content}
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}

