import fs from 'fs';
let js = fs.readFileSync('js/app.js', 'utf8');

// Patch addReply silent failure
js = js.replace(
  /                btn\.textContent = "Post reply";\n                console\.error\(err\);\n              \}\);\n          \}\);/g,
  `                btn.textContent = "Post reply";
                console.error(err);
                alert("Error: " + (err.message || "Failed to post reply."));
              });
          });`
);

// Patch createThread silent failure
js = js.replace(
  /                btn\.textContent = "Publish";\n                console\.error\(err\);\n              \}\);\n          \}\);/g,
  `                btn.textContent = "Publish";
                console.error(err);
                alert("Error: " + (err.message || "Failed to create thread."));
              });
          });`
);

fs.writeFileSync('js/app.js', js);
console.log("Write failures patched.");
