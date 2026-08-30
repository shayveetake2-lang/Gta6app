const fs = require('fs');
let code = fs.readFileSync('js/data.js', 'utf8');

// Update schema in matchesNews
code = code.replace(/n\.title \+ ' ' \+ n\.summary \+ ' ' \+ n\.body/g, "n.title + ' ' + n.content");

// Update listNews for local
code = code.replace(/async listNews\(\s*\{[^}]*\}\s*=\s*\{\}\s*\)\s*\{[\s\S]*?async getNews/g, `async listNews({ category = 'all', query: q = '', includeUnapproved = false } = {}) {
    const needle = q.trim().toLowerCase();
    const allNews = localNews();
    return clone(
      allNews
        .filter((n) => (includeUnapproved || n.isApproved) && (category === 'all' || (n.category || '').toLowerCase() === category.toLowerCase()) && matchesNews(n, needle))
        .sort((first, second) => (second.dateAdded || '').localeCompare(first.dateAdded || ''))
    );
  },
  async getNews`);

// Update createNews in localBackend
code = code.replace(/async createNews\(\{[\s\S]*?async deleteNews/g, `async createNews({ title, category, content, sourceLink, isApproved }) {
    const user = await this.getCurrentProfile();
    const item = {
      id: uid('news'),
      title: (title || '').trim(),
      category: category || 'Official',
      content: (content || '').trim(),
      sourceLink: (sourceLink || '').trim(),
      dateAdded: today(),
      isApproved: !!isApproved,
      author: user ? user.username : 'guest',
      authorUid: user ? user.id : null
    };
    localNews().unshift(item);
    saveLocal();
    return clone(item);
  },
  async updateNews(id, updates) {
    const newsList = localNews();
    const idx = newsList.findIndex((n) => n.id === id);
    if (idx === -1) throw new Error('News item not found.');
    Object.assign(newsList[idx], updates);
    saveLocal();
  },
  async deleteNews`);

// Update listNews in firestoreBackend
code = code.replace(/async listNews\(\s*\{[^}]*\}\s*=\s*\{\}\s*\)\s*\{[\s\S]*?async getNews/g, `async listNews({ category = 'all', query: q = '', includeUnapproved = false } = {}) {
      const constraints = [orderBy('dateAdded', 'desc'), limit(100)];
      if (!includeUnapproved) constraints.unshift(where('isApproved', '==', true));
      const snap = await getDocs(query(newsRef, ...constraints));
      const needle = q.trim().toLowerCase();
      return snap.docs
        .map((d) => {
          const data = d.data();
          const createdStr = toDateString(data.dateAdded);
          return {
            id: d.id,
            ...data,
            dateAdded: createdStr
          };
        })
        .filter((n) => (category === 'all' || (n.category || '').toLowerCase() === category.toLowerCase()) && matchesNews(n, needle));
    },

    async getNews`);

// Update createNews in firestoreBackend
code = code.replace(/async createNews\(\{[\s\S]*?async deleteNews/g, `async createNews({ title, category, content, sourceLink, isApproved }) {
      const user = getUser();
      const profile = await this.getCurrentProfile();
      const author = profile ? profile.username : displayName();
      const item = {
        title: (title || '').trim(),
        category: category || 'Official',
        content: (content || '').trim(),
        sourceLink: (sourceLink || '').trim(),
        dateAdded: serverTimestamp(),
        isApproved: !!isApproved,
        author: author,
        authorUid: user ? user.uid : null
      };
      const ref = await addDoc(newsRef, item);
      return { id: ref.id, ...item, dateAdded: today() };
    },

    async updateNews(id, updates) {
      await updateDoc(doc(db, 'news', id), updates);
    },

    async deleteNews`);

// Export updateNews
code = code.replace(/createNews:\s*\(input\)\s*=>\s*backend.createNews\(input\),/g, `createNews: (input) => backend.createNews(input),
  updateNews: (id, updates) => backend.updateNews(id, updates),`);

fs.writeFileSync('js/data.js', code);
