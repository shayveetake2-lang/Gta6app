import fs from 'fs';

let content = fs.readFileSync('js/app.js', 'utf8');
const targetStr = `        function setupUserSearch() {`;
const insertPos = content.indexOf(targetStr);

if (insertPos === -1) {
    console.error("Could not find insertion point");
    process.exit(1);
}

const feedAdminCode = `
        var feedStatusMsg = "";
        function loadFeedPosts() {
          var el = document.getElementById("adminPanel-feed");
          if (!el) return;
          getDocs(query(collection(getDb(), "posts"), orderBy("createdAt", "desc"))).then(function(snap) {
            var alertHtml = feedStatusMsg ? feedStatusMsg : "";
            if (snap.empty) {
              el.innerHTML = alertHtml + emptyState("No feed posts found.");
              return;
            }
            
            var html = alertHtml + '<div class="stack">';
            snap.forEach(function(docSnap) {
              var data = docSnap.data();
              var dateStr = data.createdAt ? new Date(data.createdAt.toMillis()).toLocaleString() : "Just now";
              html += 
                '<div class="admin-row" data-post-id="' + docSnap.id + '">' +
                  '<div class="admin-row__body">' +
                    '<strong>' + esc(data.authorName || 'Anonymous') + '</strong> <span style="font-size:0.8rem;color:#888;">(' + dateStr + ')</span>' +
                    '<div style="margin-top:0.5rem;font-size:0.9rem;">' + esc(data.text) + '</div>' +
                    '<div style="margin-top:0.25rem;"><span class="badge badge--' + esc(data.category.toLowerCase()) + '">' + esc(data.category) + '</span></div>' +
                  '</div>' +
                  '<div class="admin-row__actions">' +
                    '<button class="btn btn--secondary" data-action="edit-post" data-id="' + docSnap.id + '">Edit</button>' +
                    '<button class="btn btn--danger" data-action="delete-post" data-id="' + docSnap.id + '">Delete</button>' +
                  '</div>' +
                '</div>';
            });
            html += '</div>';
            el.innerHTML = html;

            // Bind delete actions
            el.querySelectorAll('[data-action="delete-post"]').forEach(function(btn) {
              btn.addEventListener("click", function() {
                if (!confirm("Are you sure you want to delete this post?")) return;
                btn.disabled = true;
                btn.textContent = "Deleting...";
                deleteDoc(doc(getDb(), "posts", btn.dataset.id)).then(function() {
                  feedStatusMsg = '<div class="admin-notice" style="margin-bottom:1.5rem;padding:.85rem;background:rgba(34,197,94,0.15);border:1px solid #22c55e;color:#fff;">Post deleted successfully.</div>';
                  loadFeedPosts();
                }).catch(function(err) {
                  feedStatusMsg = '<div class="admin-notice form-error is-visible" style="margin-bottom:1.5rem;">Error deleting post: ' + esc(err.message) + '</div>';
                  loadFeedPosts();
                });
              });
            });

            // Bind edit actions
            el.querySelectorAll('[data-action="edit-post"]').forEach(function(btn) {
              btn.addEventListener("click", function() {
                var row = btn.closest(".admin-row");
                var textEl = row.querySelector("div[style*='margin-top:0.5rem']");
                var currentText = textEl.textContent;
                var newText = prompt("Edit post text:", currentText);
                if (newText !== null && newText.trim() !== "" && newText !== currentText) {
                  btn.disabled = true;
                  btn.textContent = "Saving...";
                  updateDoc(doc(getDb(), "posts", btn.dataset.id), { text: newText.trim() }).then(function() {
                    feedStatusMsg = '<div class="admin-notice" style="margin-bottom:1.5rem;padding:.85rem;background:rgba(34,197,94,0.15);border:1px solid #22c55e;color:#fff;">Post updated successfully.</div>';
                    loadFeedPosts();
                  }).catch(function(err) {
                    feedStatusMsg = '<div class="admin-notice form-error is-visible" style="margin-bottom:1.5rem;">Error updating post: ' + esc(err.message) + '</div>';
                    loadFeedPosts();
                  });
                }
              });
            });

          }).catch(function(err) {
             el.innerHTML = emptyState("Error loading posts: " + err.message);
          });
        }

`;

const newContent = content.slice(0, insertPos) + feedAdminCode + content.slice(insertPos);
fs.writeFileSync('js/app.js', newContent);
console.log("Admin feed moderation injected");
