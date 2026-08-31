import fs from 'fs';

let content = fs.readFileSync('js/app.js', 'utf8');

const targetStart = content.indexOf('var user = getUser();');
const targetEnd = content.indexOf('    "/walkthroughs": function (id) {');

if (targetStart === -1 || targetEnd === -1) {
    console.error("Could not find targets");
    process.exit(1);
}

const replacement = `var user = getUser();
        var isAuth = user && !user.isAnonymous;
        var placeholderText = isAuth ? "What's on your mind? Drop a tip, ask a question, or share some news..." : "Sign in to post...";

        var formHtml = 
          '<form id="quickShareForm" class="post-card">' +
            '<textarea id="qsText" class="post-form-textarea" required placeholder="' + placeholderText + '"></textarea>' +
            '<div class="post-form-footer">' +
              '<select id="qsCategory" class="post-form-select">' +
                '<option value="news">News</option>' +
                '<option value="guides">Guide</option>' +
                '<option value="discussions">Discussion</option>' +
              '</select>' +
              '<button type="submit" id="qsBtn" class="btn btn--primary" style="background:#e01e5a; border-color:#e01e5a;">Post</button>' +
            '</div>' +
          '</form>';

        var tabsHtml = 
          '<div class="feed-tabs">' +
            '<a href="#/?tab=all" class="feed-tab ' + (currentTab === "all" ? "active" : "") + '">All</a>' +
            '<a href="#/?tab=news" class="feed-tab ' + (currentTab === "news" ? "active" : "") + '">News</a>' +
            '<a href="#/?tab=guides" class="feed-tab ' + (currentTab === "guides" ? "active" : "") + '">Guides</a>' +
            '<a href="#/?tab=discussions" class="feed-tab ' + (currentTab === "discussions" ? "active" : "") + '">Discussions</a>' +
          '</div>';

        // Skeleton loader
        function renderSkeleton() {
          var skeleton = '<div class="skeleton-post">' +
            '<div style="display:flex; align-items:center; margin-bottom:1rem;">' +
              '<div class="skeleton-avatar"></div>' +
              '<div style="flex:1;">' +
                '<div class="skeleton-line short"></div>' +
                '<div class="skeleton-line" style="width:20%;"></div>' +
              '</div>' +
            '</div>' +
            '<div class="skeleton-line"></div>' +
            '<div class="skeleton-line"></div>' +
            '<div class="skeleton-line short"></div>' +
          '</div>';
          return skeleton + skeleton + skeleton;
        }

        render(
          '<div class="feed-layout">' +
            '<div class="feed-main">' +
              tabsHtml +
              formHtml +
              '<div id="feedContainer">' +
                renderSkeleton() +
              '</div>' +
            '</div>' +
            '<div class="feed-sidebar">' +
              '<div class="section-head"><h2>Latest GTA 6 news</h2><a href="#/news">View all news</a></div>' +
              (news.length
                ? '<div class="grid">' + news.map(newsCard).join("") + "</div>"
                : emptyState("No news articles published yet.")) +
              '<div class="section-head"><h2>Latest guides</h2><a href="#/walkthroughs">View all</a></div>' +
              (guides.length
                ? '<div class="grid">' + guides.map(walkthroughCard).join("") + "</div>"
                : emptyState("No guides published yet.")) +
              (eventSection
                ? '<div class="section-head"><h2>' + esc(eventSection.title) + '</h2><span class="card__meta">' + esc(eventSection.label) + '</span></div>' +
                  '<div class="grid">' +
                  eventSection.items.map(function (item) {
                    return contentCard({ section: eventSection.title, title: item.title, body: item.body, meta: item.meta });
                  }).join("") +
                  "</div>"
                : "") +
            '</div>' +
          '</div>' +
          '<div id="authModalOverlay" class="auth-modal-overlay">' +
            '<div class="auth-modal">' +
              '<button type="button" class="auth-modal-close" id="authModalClose">&times;</button>' +
              '<h3>Log in to post on feed</h3>' +
              '<p style="margin-bottom:1.5rem; color:#aaa;">You must be signed in to contribute to the community feed.</p>' +
              '<a href="#/login" class="btn btn--primary" style="background:#00f0ff; border-color:#00f0ff; color:#111; width:100%;">Sign In</a>' +
            '</div>' +
          '</div>'
        );

        // Bind form submit
        var qsForm = document.getElementById("quickShareForm");
        qsForm.addEventListener("submit", function(e) {
          e.preventDefault();
          if (!isAuth) {
             document.getElementById("authModalOverlay").classList.add("active");
             return;
          }
          
          var qsBtn = document.getElementById("qsBtn");
          qsBtn.disabled = true;
          qsBtn.textContent = "Posting...";
          
          var text = document.getElementById("qsText").value.trim();
          var category = document.getElementById("qsCategory").value;
          
          addDoc(collection(getDb(), "posts"), {
            text: text,
            category: category,
            userId: user.uid,
            authorName: user.displayName || 'Anonymous User',
            createdAt: serverTimestamp()
          }).then(function() {
            document.getElementById("qsText").value = "";
            qsBtn.disabled = false;
            qsBtn.textContent = "Post";
          }).catch(function(err) {
            console.error(err);
            alert("Error: " + err.message);
            qsBtn.disabled = false;
            qsBtn.textContent = "Post";
          });
        });

        // Bind Modal Close
        var closeBtn = document.getElementById("authModalClose");
        var overlay = document.getElementById("authModalOverlay");
        if (closeBtn && overlay) {
           closeBtn.addEventListener("click", function() { overlay.classList.remove("active"); });
           overlay.addEventListener("click", function(e) { if(e.target === overlay) overlay.classList.remove("active"); });
        }

        // Realtime Feed Listener
        var feedQuery;
        if (currentTab === "all") {
          feedQuery = query(collection(getDb(), "posts"), orderBy("createdAt", "desc"));
        } else {
          feedQuery = query(collection(getDb(), "posts"), where("category", "==", currentTab), orderBy("createdAt", "desc"));
        }

        window.feedUnsub = onSnapshot(feedQuery, function(snapshot) {
          var feedContainer = document.getElementById("feedContainer");
          if (!feedContainer) {
            if (window.feedUnsub) { window.feedUnsub(); window.feedUnsub = null; }
            return;
          }

          var html = "";
          var count = 0;
          
          function renderPost(author, timeStr, badgeColor, categoryText, bodyText) {
             return '<div class="post-card">' +
                '<div class="post-header">' +
                  '<div>' +
                    '<div class="post-author">' + esc(author) + '</div>' +
                    '<div class="post-time">' + timeStr + '</div>' +
                  '</div>' +
                  '<span class="badge badge--' + badgeColor + '">' + esc(categoryText) + '</span>' +
                '</div>' +
                '<div class="post-body">' + esc(bodyText) + '</div>' +
              '</div>';
          }

          snapshot.forEach(function(docSnap) {
            if (count >= 15) return;
            count++;
            var data = docSnap.data();
            var dateStr = data.createdAt ? new Date(data.createdAt.toMillis()).toLocaleString() : "Just now";
            var badgeColor = "news";
            if (data.category === "guides" || data.category === "Missions" || data.category === "MISSIONS") badgeColor = "guides";
            if (data.category === "discussions") badgeColor = "discussions";
            
            // Map specific tags to new colors
            var displayCat = data.category;
            if (data.category.toUpperCase() === "MISSIONS") { badgeColor = "missions"; displayCat = "MISSIONS"; }
            if (data.category.toUpperCase() === "RACES") { badgeColor = "races"; displayCat = "RACES"; }
            if (data.category.toUpperCase() === "CARS") { badgeColor = "cars"; displayCat = "CARS"; }
            if (data.category.toUpperCase() === "MONEY") { badgeColor = "money"; displayCat = "MONEY"; }

            html += renderPost(data.authorName, dateStr, badgeColor, displayCat, data.text);
          });

          // Backfilling if sparse (< 8)
          if (count < 8) {
            // Take items not shown in sidebar (sidebar has res[0].slice(0,3) and res[1].slice(0,3))
            var extraNews = res[0].slice(3);
            var extraGuides = res[1].slice(3);
            var allThreads = res[2];
            
            var pool = [];
            extraNews.forEach(function(n) { 
              pool.push({ author: n.authorName || 'News Team', time: (n.dateAdded ? new Date(n.dateAdded).toLocaleString() : 'Recent'), badge: 'news', cat: 'News', text: n.title });
            });
            extraGuides.forEach(function(g) { 
              pool.push({ author: g.author || 'Guide Author', time: (g.updatedAt ? new Date(g.updatedAt).toLocaleString() : 'Recent'), badge: 'guides', cat: 'Guide', text: g.title });
            });
            allThreads.forEach(function(t) { 
              pool.push({ author: t.authorName || 'Forum User', time: (t.createdAt ? new Date(t.createdAt).toLocaleString() : 'Recent'), badge: 'discussions', cat: 'Discussion', text: t.title });
            });

            for (var i = 0; i < pool.length && count < 8; i++) {
              var p = pool[i];
              html += renderPost(p.author, p.time, p.badge, p.cat, p.text);
              count++;
            }
          }

          if (!html) {
             html = '<div class="empty-feed">MISSION LOCKED - CLASSIFIED INTEL: BE THE FIRST TO POST</div>';
          }
          feedContainer.innerHTML = html;
        }, function(error) {
           console.error("Feed snapshot error:", error);
           var feedContainer = document.getElementById("feedContainer");
           if (feedContainer) {
             feedContainer.innerHTML = emptyState("Error loading feed: " + error.message + " (Check console for index link)");
           }
        });
      });
    },
`;

const newContent = content.slice(0, targetStart) + replacement + content.slice(targetEnd - 4);
fs.writeFileSync('js/app.js', newContent);
console.log("Patched app.js successfully");
