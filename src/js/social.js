/* U-45 Social — a local-only social feed. All data lives in this device's IndexedDB
   (memory store under Node for tests). There is no server, no account and no network use. */
(function (G) {
  'use strict';
  const now = () => Date.now();
  let seq = 0; const uid = (p) => p + now().toString(36) + (++seq).toString(36);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const MAXLEN = 2000, REACTS = ['👍', '❤️', '😂', '😮', '😢', '🎉'];
  const EMOJI = { ':smile:': '😄', ':heart:': '❤️', ':fire:': '🔥', ':100:': '💯', ':pi:': 'π', ':thumbsup:': '👍', ':tada:': '🎉', ':think:': '🤔', ':calc:': '🧮', ':star:': '⭐' };
  const NTYPES = ['like', 'react', 'comment', 'reply', 'mention', 'follow', 'repost', 'quote', 'poll', 'dm', 'group'];
  function blank() {
    const p1 = { id: 'p1', name: 'Me', handle: 'me', bio: '', avatar: '🧮', color: '#FFD600', banner: '#222', site: '', pronouns: '', birthday: '', private: false, created: now() };
    return { v: 1, me: 'p1', profiles: { p1 }, follows: [], blocks: [], mutes: [], closeFriends: [], posts: {}, comments: {}, bookmarks: {}, collections: {}, drafts: {}, dms: {}, groups: {}, notifs: [],
      mutedWords: [], mutedTags: [], hidden: [], savedSearches: [], recent: [], notifPrefs: {}, seen: {}, settings: { theme: 'dark', font: 16, motion: true, compact: false }, log: [] };
  }
  // ---- storage adapter ----
  const memStore = { v: null, async get() { return this.v; }, async set(x) { this.v = x; } };
  function idbStore() {
    const open = () => new Promise((ok, no) => { const r = indexedDB.open('u45social', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); });
    const tx = (mode, fn) => open().then(db => new Promise((ok, no) => { const t = db.transaction('kv', mode); const q = fn(t.objectStore('kv')); t.oncomplete = () => ok(q && q.result); t.onerror = () => no(t.error); }));
    return { get: () => tx('readonly', s => s.get('state')), set: (x) => tx('readwrite', s => s.put(x, 'state')) };
  }
  const store = (typeof indexedDB !== 'undefined') ? idbStore() : memStore;
  let S = blank(), saveT = null, readyP = null; const listeners = [];
  const save = () => { clearTimeout(saveT); saveT = setTimeout(() => { store.set(JSON.parse(JSON.stringify(S))).catch(() => {}); }, 120); listeners.forEach(f => { try { f(); } catch (e) { /* listener errors are ignored */ } }); };
  const log = (what) => { S.log.push({ t: now(), who: S.me, what }); if (S.log.length > 500) S.log.shift(); };
  const need = (c, msg) => { if (!c) throw new Error(msg); };
  const P = (id) => { const p = S.posts[id]; need(p, 'no such post'); return p; };
  const me = () => S.me;
  function notify(to, type, ref) { if (!to || to === S.me) return; const pr = S.notifPrefs[to] || {}; if (pr[type] === false) return; if (isBlocked(to, S.me)) return; S.notifs.push({ id: uid('n'), to, type, from: S.me, ref, created: now(), read: false }); }
  const isBlocked = (a, b) => S.blocks.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
  const isMuted = (a, b) => S.mutes.some(([x, y]) => x === a && y === b);
  const parseTags = (t) => [...new Set((String(t).match(/#[\p{L}\p{N}_]+/gu) || []).map(x => x.slice(1).toLowerCase()))];
  const parseMentions = (t) => [...new Set((String(t).match(/@[A-Za-z0-9_]+/g) || []).map(x => x.slice(1).toLowerCase()))];
  const parseLinks = (t) => String(t).match(/https?:\/\/[^\s<]+/g) || [];
  const emojify = (t) => String(t).replace(/:[a-z0-9]+:/g, m => EMOJI[m] || m);
  const byHandle = (h) => Object.values(S.profiles).find(p => p.handle === String(h).toLowerCase().replace(/^@/, ''));
  const words = (t) => (String(t).trim().match(/\S+/g) || []).length;
  // ---- core operations ----
  const C = {
    // posts
    post(o) {
      o = o || {}; const text = emojify(o.text || ''); need(text.trim() || o.poll || (o.attach && o.attach.length) || o.repostOf, 'empty post'); need(text.length <= MAXLEN, `post longer than ${MAXLEN} characters`);
      if (o.group) need(S.groups[o.group] && S.groups[o.group].members.includes(S.me), 'join the group first');
      const p = { id: uid('t'), author: S.me, text, cw: o.cw || '', spoiler: !!o.spoiler, vis: o.vis || 'public', created: now(), edited: 0, history: [], pinned: false, deleted: 0, repostOf: o.repostOf || null, quoteOf: o.quoteOf || null,
        poll: o.poll ? { options: o.poll.options.map(t => ({ t: String(t), votes: [] })), multi: !!o.poll.multi, closesAt: o.poll.hours ? now() + o.poll.hours * 3600e3 : 0, closed: false } : null,
        attach: o.attach || [], tags: parseTags(text), mentions: parseMentions(text), links: parseLinks(text), group: o.group || null, lang: o.lang || 'en', mood: o.mood || '', place: o.place || '', publishAt: o.publishAt || 0, reactions: {}, views: 0 };
      if (p.poll) need(p.poll.options.length >= 2 && p.poll.options.length <= 6, 'a poll needs 2–6 options');
      S.posts[p.id] = p; p.mentions.forEach(h => { const u = byHandle(h); if (u) notify(u.id, 'mention', p.id); });
      if (p.repostOf) notify(P(p.repostOf).author, 'repost', p.id); if (p.quoteOf) notify(P(p.quoteOf).author, 'quote', p.id);
      if (o.draft) delete S.drafts[o.draft]; log('post'); save(); return p;
    },
    edit(id, text) { const p = P(id); need(p.author === S.me, 'only the author can edit'); need(String(text).length <= MAXLEN, 'too long'); p.history.push({ t: p.edited || p.created, text: p.text }); p.text = emojify(text); p.tags = parseTags(p.text); p.mentions = parseMentions(p.text); p.links = parseLinks(p.text); p.edited = now(); save(); return p; },
    history(id) { return P(id).history.slice(); },
    trash(id) { const p = P(id); need(p.author === S.me, 'only the author can delete'); p.deleted = now(); p.pinned = false; save(); return p; },
    restore(id) { P(id).deleted = 0; save(); return P(id); },
    purge(id) { need(P(id).deleted, 'move it to the trash first'); delete S.posts[id]; Object.keys(S.comments).forEach(k => { if (S.comments[k].post === id) delete S.comments[k]; }); save(); return true; },
    trashList() { return Object.values(S.posts).filter(p => p.deleted && p.author === S.me); },
    emptyTrash() { C.trashList().forEach(p => C.purge(p.id)); return true; },
    pin(id) { const p = P(id); need(p.author === S.me, 'pin your own posts'); Object.values(S.posts).forEach(q => { if (q.author === S.me) q.pinned = false; }); p.pinned = true; save(); return p; },
    unpin(id) { P(id).pinned = false; save(); return P(id); },
    repost(id) { const src = P(id); need(src.vis === 'public', 'only public posts can be reposted'); return C.post({ repostOf: id, text: '' }); },
    quote(id, text) { P(id); return C.post({ quoteOf: id, text }); },
    unrepost(id) { const r = Object.values(S.posts).find(p => p.repostOf === id && p.author === S.me && !p.deleted); need(r, 'not reposted'); delete S.posts[r.id]; save(); return true; },
    view(id) { const p = P(id); p.views++; S.seen[S.me + ':' + id] = now(); return p; },
    stats(id) { const p = P(id); const cs = Object.values(S.comments).filter(c => c.post === id && !c.deleted); return { views: p.views, reactions: Object.keys(p.reactions).length, comments: cs.length, reposts: Object.values(S.posts).filter(q => q.repostOf === id).length, quotes: Object.values(S.posts).filter(q => q.quoteOf === id).length, bookmarks: Object.values(S.bookmarks).filter(b => b.includes(id)).length, words: words(p.text), chars: p.text.length }; },
    visibleTo(p, viewer) { viewer = viewer || S.me; if (p.deleted || isBlocked(p.author, viewer)) return false; if (p.author === viewer) return true; if (p.publishAt && p.publishAt > now()) return false; if (p.vis === 'private') return false; if (p.vis === 'followers') return S.follows.some(([a, b]) => a === viewer && b === p.author); if (p.vis === 'close') return S.closeFriends.some(([a, b]) => a === p.author && b === viewer); if (S.profiles[p.author] && S.profiles[p.author].private) return S.follows.some(([a, b]) => a === viewer && b === p.author); return true; },
    // reactions
    react(id, emoji) { const p = P(id); need(REACTS.includes(emoji), 'unknown reaction'); const had = p.reactions[S.me]; if (had === emoji) delete p.reactions[S.me]; else { p.reactions[S.me] = emoji; notify(p.author, emoji === '❤️' ? 'like' : 'react', id); } save(); return p.reactions; },
    like(id) { return C.react(id, '❤️'); },
    reactCounts(id) { const o = {}; Object.values(P(id).reactions).forEach(e => { o[e] = (o[e] || 0) + 1; }); return o; },
    reactors(id, emoji) { return Object.entries(P(id).reactions).filter(([, e]) => !emoji || e === emoji).map(([u]) => S.profiles[u] && S.profiles[u].name); },
    topReaction(id) { const c = C.reactCounts(id); return Object.keys(c).sort((a, b) => c[b] - c[a])[0] || null; },
    // comments
    comment(id, text, parent) { const p = P(id); need(String(text).trim(), 'empty comment'); need(!isBlocked(p.author, S.me), 'blocked'); if (parent) need(S.comments[parent] && S.comments[parent].post === id, 'no such comment');
      const c = { id: uid('c'), post: id, parent: parent || null, author: S.me, text: emojify(text), created: now(), edited: 0, deleted: 0, likes: [], pinned: false, mentions: parseMentions(text) };
      S.comments[c.id] = c; notify(p.author, parent ? 'reply' : 'comment', id); if (parent) notify(S.comments[parent].author, 'reply', id); c.mentions.forEach(h => { const u = byHandle(h); if (u) notify(u.id, 'mention', id); }); save(); return c; },
    reply(id, parent, text) { return C.comment(id, text, parent); },
    editComment(cid, text) { const c = S.comments[cid]; need(c && c.author === S.me, 'not your comment'); c.text = emojify(text); c.edited = now(); save(); return c; },
    deleteComment(cid) { const c = S.comments[cid]; need(c && (c.author === S.me || P(c.post).author === S.me), 'not allowed'); c.deleted = now(); c.text = ''; save(); return c; },
    likeComment(cid) { const c = S.comments[cid]; need(c, 'no such comment'); const i = c.likes.indexOf(S.me); if (i >= 0) c.likes.splice(i, 1); else { c.likes.push(S.me); notify(c.author, 'like', c.post); } save(); return c.likes.length; },
    pinComment(cid) { const c = S.comments[cid]; need(c && P(c.post).author === S.me, 'only the post author can pin'); Object.values(S.comments).forEach(x => { if (x.post === c.post) x.pinned = false; }); c.pinned = true; save(); return c; },
    comments(id, sort) { const xs = Object.values(S.comments).filter(c => c.post === id && !isBlocked(c.author, S.me)); const f = { new: (a, b) => b.created - a.created, old: (a, b) => a.created - b.created, top: (a, b) => b.likes.length - a.likes.length }[sort || 'old']; return xs.sort((a, b) => (b.pinned - a.pinned) || f(a, b)); },
    thread(id) { const all = C.comments(id); const kids = (pid) => all.filter(c => c.parent === pid).map(c => Object.assign({}, c, { replies: kids(c.id) })); return kids(null); },
    // profiles & relationships
    addProfile(o) { o = o || {}; const h = String(o.handle || o.name || 'user').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20) || 'user'; need(!byHandle(h), 'handle taken'); const p = Object.assign(blank().profiles.p1, { id: uid('p'), name: o.name || h, handle: h, avatar: o.avatar || '🙂', color: o.color || '#7CFFFB', created: now() }); S.profiles[p.id] = p; save(); return p; },
    switchProfile(id) { need(S.profiles[id], 'no such profile'); S.me = id; save(); return S.profiles[id]; },
    updateProfile(o) { const p = S.profiles[S.me]; ['name', 'bio', 'avatar', 'color', 'banner', 'site', 'pronouns', 'birthday', 'private'].forEach(k => { if (o[k] !== undefined) p[k] = o[k]; }); if (o.handle !== undefined) { const h = String(o.handle).toLowerCase().replace(/[^a-z0-9_]/g, ''); const u = byHandle(h); need(h && (!u || u.id === p.id), 'handle taken'); p.handle = h; } need(String(p.bio).length <= 300, 'bio too long'); save(); return p; },
    deleteProfile(id) { need(id !== S.me && S.profiles[id], 'cannot delete the active profile'); delete S.profiles[id]; Object.values(S.posts).forEach(p => { if (p.author === id) delete S.posts[p.id]; }); S.follows = S.follows.filter(f => !f.includes(id)); save(); return true; },
    profiles() { return Object.values(S.profiles); },
    follow(id) { need(S.profiles[id] && id !== S.me, 'cannot follow'); need(!isBlocked(id, S.me), 'blocked'); if (!S.follows.some(([a, b]) => a === S.me && b === id)) { S.follows.push([S.me, id]); notify(id, 'follow', S.me); } save(); return true; },
    unfollow(id) { S.follows = S.follows.filter(([a, b]) => !(a === S.me && b === id)); save(); return true; },
    removeFollower(id) { S.follows = S.follows.filter(([a, b]) => !(a === id && b === S.me)); save(); return true; },
    followers(id) { id = id || S.me; return S.follows.filter(([, b]) => b === id).map(([a]) => a); },
    following(id) { id = id || S.me; return S.follows.filter(([a]) => a === id).map(([, b]) => b); },
    mutuals(id) { id = id || S.me; const f = C.following(id); return C.followers(id).filter(x => f.includes(x)); },
    suggestions() { const f = C.following(); const c = {}; f.forEach(x => C.following(x).forEach(y => { if (y !== S.me && !f.includes(y)) c[y] = (c[y] || 0) + 1; })); Object.keys(S.profiles).forEach(y => { if (y !== S.me && !f.includes(y) && !(y in c)) c[y] = 0; }); return Object.keys(c).sort((a, b) => c[b] - c[a]); },
    block(id) { need(id !== S.me, 'cannot block yourself'); if (!isBlocked(S.me, id)) S.blocks.push([S.me, id]); S.follows = S.follows.filter(([a, b]) => !((a === S.me && b === id) || (a === id && b === S.me))); save(); return true; },
    unblock(id) { S.blocks = S.blocks.filter(([a, b]) => !(a === S.me && b === id)); save(); return true; },
    mute(id) { if (!isMuted(S.me, id)) S.mutes.push([S.me, id]); save(); return true; },
    unmute(id) { S.mutes = S.mutes.filter(([a, b]) => !(a === S.me && b === id)); save(); return true; },
    closeFriend(id, on) { S.closeFriends = S.closeFriends.filter(([a, b]) => !(a === S.me && b === id)); if (on !== false) S.closeFriends.push([S.me, id]); save(); return true; },
    profileStats(id) { id = id || S.me; const ps = Object.values(S.posts).filter(p => p.author === id && !p.deleted); return { posts: ps.length, followers: C.followers(id).length, following: C.following(id).length, reactions: ps.reduce((a, p) => a + Object.keys(p.reactions).length, 0), joined: S.profiles[id].created }; },
    // feeds, sorting, filtering
    feed(o) {
      o = o || {}; let xs = Object.values(S.posts).filter(p => C.visibleTo(p) && !S.hidden.includes(p.id) && !isMuted(S.me, p.author));
      const mw = S.mutedWords.map(w => w.toLowerCase()); if (mw.length) xs = xs.filter(p => !mw.some(w => p.text.toLowerCase().includes(w)));
      if (S.mutedTags.length) xs = xs.filter(p => !p.tags.some(t => S.mutedTags.includes(t)));
      if (o.tab === 'following') { const f = C.following(); xs = xs.filter(p => f.includes(p.author) || p.author === S.me); }
      if (o.tab === 'mine' || o.author) { const a = o.author || S.me; xs = xs.filter(p => p.author === a); }
      if (o.tab === 'media') xs = xs.filter(p => p.attach.some(a => a.type === 'image'));
      if (o.tab === 'liked') xs = xs.filter(p => p.reactions[S.me]);
      if (o.tab === 'bookmarks') { const b = S.bookmarks[S.me] || []; xs = xs.filter(p => b.includes(p.id)); }
      if (o.tag) xs = xs.filter(p => p.tags.includes(String(o.tag).toLowerCase().replace(/^#/, '')));
      if (o.group) xs = xs.filter(p => p.group === o.group); else if (!o.tab || o.tab === 'home') xs = xs.filter(p => !p.group);
      if (o.has === 'poll') xs = xs.filter(p => p.poll); if (o.has === 'calc') xs = xs.filter(p => p.attach.some(a => a.type === 'calc')); if (o.has === 'link') xs = xs.filter(p => p.links.length); if (o.has === 'image') xs = xs.filter(p => p.attach.some(a => a.type === 'image'));
      if (o.from) xs = xs.filter(p => p.created >= o.from); if (o.to) xs = xs.filter(p => p.created <= o.to);
      if (o.lang) xs = xs.filter(p => p.lang === o.lang);
      if (o.unread) xs = xs.filter(p => !S.seen[S.me + ':' + p.id]);
      const score = (p) => Object.keys(p.reactions).length * 2 + C.comments(p.id).length * 3 + Object.values(S.posts).filter(q => q.repostOf === p.id).length * 4;
      const sorts = { new: (a, b) => b.created - a.created, old: (a, b) => a.created - b.created, top: (a, b) => score(b) - score(a), trending: (a, b) => score(b) / Math.pow((now() - b.created) / 36e5 + 2, 1.5) - score(a) / Math.pow((now() - a.created) / 36e5 + 2, 1.5), comments: (a, b) => C.comments(b.id).length - C.comments(a.id).length };
      xs.sort((a, b) => ((o.tab === 'mine' || o.author) ? (b.pinned - a.pinned) : 0) || (sorts[o.sort || 'new'])(a, b));
      const per = o.per || 20, pg = o.page || 0; return { total: xs.length, items: xs.slice(pg * per, pg * per + per), more: xs.length > (pg + 1) * per };
    },
    hide(id) { if (!S.hidden.includes(id)) S.hidden.push(id); save(); return true; },
    unhide(id) { S.hidden = S.hidden.filter(x => x !== id); save(); return true; },
    muteWord(w) { w = String(w).trim().toLowerCase(); need(w, 'empty word'); if (!S.mutedWords.includes(w)) S.mutedWords.push(w); save(); return S.mutedWords; },
    unmuteWord(w) { S.mutedWords = S.mutedWords.filter(x => x !== String(w).toLowerCase()); save(); return S.mutedWords; },
    muteTag(t) { t = String(t).toLowerCase().replace(/^#/, ''); if (!S.mutedTags.includes(t)) S.mutedTags.push(t); save(); return S.mutedTags; },
    unmuteTag(t) { S.mutedTags = S.mutedTags.filter(x => x !== String(t).toLowerCase().replace(/^#/, '')); save(); return S.mutedTags; },
    markSeen(id) { S.seen[S.me + ':' + id] = now(); return true; },
    unreadCount() { return C.feed({ unread: true, per: 1e9 }).total; },
    // search
    search(q, o) { o = o || {}; const s = String(q || '').trim().toLowerCase(); need(s, 'empty search'); if (!S.recent.includes(s)) { S.recent.unshift(s); S.recent = S.recent.slice(0, 15); }
      if (s.startsWith('#')) return C.feed(Object.assign({ tag: s, per: 1e9, tab: 'all' }, o)).items;
      if (s.startsWith('@')) return C.searchUsers(s.slice(1));
      const terms = s.split(/\s+/); return Object.values(S.posts).filter(p => C.visibleTo(p) && terms.every(t => (p.text + ' ' + p.cw + ' ' + (S.profiles[p.author] || {}).name).toLowerCase().includes(t))).sort((a, b) => b.created - a.created); },
    searchUsers(q) { const s = String(q).toLowerCase(); return Object.values(S.profiles).filter(p => (p.name + ' ' + p.handle + ' ' + p.bio).toLowerCase().includes(s)); },
    searchComments(q) { const s = String(q).toLowerCase(); return Object.values(S.comments).filter(c => !c.deleted && c.text.toLowerCase().includes(s)); },
    saveSearch(q) { if (!S.savedSearches.includes(q)) S.savedSearches.push(q); save(); return S.savedSearches; },
    unsaveSearch(q) { S.savedSearches = S.savedSearches.filter(x => x !== q); save(); return S.savedSearches; },
    recentSearches() { return S.recent.slice(); },
    clearRecent() { S.recent = []; save(); return true; },
    trending(n) { const c = {}; Object.values(S.posts).filter(p => C.visibleTo(p) && now() - p.created < 7 * 864e5).forEach(p => p.tags.forEach(t => { c[t] = (c[t] || 0) + 1; })); return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, n || 10); },
    allTags() { const c = {}; Object.values(S.posts).forEach(p => p.tags.forEach(t => { c[t] = (c[t] || 0) + 1; })); return c; },
    // bookmarks & collections
    bookmark(id) { P(id); const b = S.bookmarks[S.me] = S.bookmarks[S.me] || []; if (!b.includes(id)) b.push(id); save(); return true; },
    unbookmark(id) { S.bookmarks[S.me] = (S.bookmarks[S.me] || []).filter(x => x !== id); save(); return true; },
    bookmarks() { return (S.bookmarks[S.me] || []).map(id => S.posts[id]).filter(Boolean); },
    newCollection(name) { need(String(name).trim(), 'name required'); const c = { id: uid('k'), owner: S.me, name: String(name).trim(), posts: [], created: now() }; S.collections[c.id] = c; save(); return c; },
    renameCollection(id, name) { const c = S.collections[id]; need(c, 'no such collection'); c.name = name; save(); return c; },
    deleteCollection(id) { delete S.collections[id]; save(); return true; },
    addToCollection(cid, pid) { const c = S.collections[cid]; need(c, 'no such collection'); P(pid); if (!c.posts.includes(pid)) c.posts.push(pid); save(); return c; },
    removeFromCollection(cid, pid) { const c = S.collections[cid]; need(c, 'no such collection'); c.posts = c.posts.filter(x => x !== pid); save(); return c; },
    collections() { return Object.values(S.collections).filter(c => c.owner === S.me); },
    // polls
    vote(id, i) { const p = P(id); need(p.poll, 'not a poll'); C.closeExpired(); need(!p.poll.closed, 'poll closed'); need(p.poll.options[i], 'no such option'); const o = p.poll.options[i];
      if (!p.poll.multi) p.poll.options.forEach((x, j) => { if (j !== i) x.votes = x.votes.filter(v => v !== S.me); });
      const k = o.votes.indexOf(S.me); if (k >= 0) o.votes.splice(k, 1); else o.votes.push(S.me); save(); return C.pollResults(id); },
    pollResults(id) { const p = P(id); need(p.poll, 'not a poll'); const voters = new Set(); p.poll.options.forEach(o => o.votes.forEach(v => voters.add(v))); const tot = p.poll.options.reduce((a, o) => a + o.votes.length, 0); return { voters: voters.size, options: p.poll.options.map(o => ({ t: o.t, n: o.votes.length, pct: tot ? Math.round(o.votes.length / tot * 1000) / 10 : 0, mine: o.votes.includes(S.me) })), closed: p.poll.closed, closesAt: p.poll.closesAt }; },
    closePoll(id) { const p = P(id); need(p.poll && p.author === S.me, 'only the author can close'); p.poll.closed = true; C.pollVoters(id).forEach(v => notify(v, 'poll', id)); save(); return true; },
    closeExpired() { Object.values(S.posts).forEach(p => { if (p.poll && !p.poll.closed && p.poll.closesAt && p.poll.closesAt < now()) { p.poll.closed = true; notify(p.author, 'poll', p.id); } }); },
    pollVoters(id) { return [...new Set(P(id).poll.options.flatMap(o => o.votes))]; },
    // drafts & scheduling
    saveDraft(o) { const d = Object.assign({ id: (o && o.id) || uid('d'), author: S.me, text: '', cw: '', saved: now() }, o, { saved: now() }); S.drafts[d.id] = d; save(); return d; },
    drafts() { return Object.values(S.drafts).filter(d => d.author === S.me).sort((a, b) => b.saved - a.saved); },
    deleteDraft(id) { delete S.drafts[id]; save(); return true; },
    publishDraft(id) { const d = S.drafts[id]; need(d, 'no such draft'); return C.post(Object.assign({}, d, { draft: id })); },
    schedule(o, at) { need(at > now(), 'choose a future time'); return C.post(Object.assign({}, o, { publishAt: at })); },
    scheduled() { return Object.values(S.posts).filter(p => p.author === S.me && p.publishAt > now()); },
    // direct messages
    openDM(members, name) { members = [...new Set([S.me].concat(members || []))]; need(members.length >= 2, 'pick someone'); members.forEach(m => need(S.profiles[m] && !isBlocked(m, S.me), 'cannot message that profile'));
      const key = members.slice().sort().join(','); let d = members.length === 2 && Object.values(S.dms).find(x => !x.group && x.members.slice().sort().join(',') === key);
      if (!d) { d = { id: uid('m'), members, name: name || '', group: members.length > 2, created: now(), archived: [], msgs: [], muted: [] }; S.dms[d.id] = d; } save(); return d; },
    send(did, text, o) { const d = S.dms[did]; need(d && d.members.includes(S.me), 'not in this conversation'); need(String(text).trim() || (o && o.attach), 'empty message'); const m = { id: uid('x'), from: S.me, text: emojify(text), created: now(), edited: 0, deleted: 0, reactions: {}, readBy: [S.me], replyTo: (o && o.replyTo) || null, attach: (o && o.attach) || null }; d.msgs.push(m); d.archived = []; d.members.forEach(x => { if (!d.muted.includes(x)) notify(x, 'dm', did); }); save(); return m; },
    editMsg(did, mid, text) { const m = S.dms[did].msgs.find(x => x.id === mid); need(m && m.from === S.me, 'not your message'); m.text = text; m.edited = now(); save(); return m; },
    unsendMsg(did, mid) { const m = S.dms[did].msgs.find(x => x.id === mid); need(m && m.from === S.me, 'not your message'); m.deleted = now(); m.text = ''; save(); return m; },
    reactMsg(did, mid, e) { const m = S.dms[did].msgs.find(x => x.id === mid); need(m && REACTS.includes(e), 'bad reaction'); if (m.reactions[S.me] === e) delete m.reactions[S.me]; else m.reactions[S.me] = e; save(); return m.reactions; },
    readDM(did) { const d = S.dms[did]; need(d, 'no such conversation'); d.msgs.forEach(m => { if (!m.readBy.includes(S.me)) m.readBy.push(S.me); }); save(); return true; },
    unreadDMs() { return Object.values(S.dms).filter(d => d.members.includes(S.me)).reduce((a, d) => a + d.msgs.filter(m => !m.readBy.includes(S.me)).length, 0); },
    inbox(o) { o = o || {}; return Object.values(S.dms).filter(d => d.members.includes(S.me) && (o.archived ? d.archived.includes(S.me) : !d.archived.includes(S.me))).sort((a, b) => ((b.msgs[b.msgs.length - 1] || b).created) - ((a.msgs[a.msgs.length - 1] || a).created)); },
    archiveDM(did) { const d = S.dms[did]; if (!d.archived.includes(S.me)) d.archived.push(S.me); save(); return true; },
    muteDM(did) { const d = S.dms[did]; const i = d.muted.indexOf(S.me); if (i >= 0) d.muted.splice(i, 1); else d.muted.push(S.me); save(); return d.muted.includes(S.me); },
    renameDM(did, name) { const d = S.dms[did]; need(d.group, 'only group chats have names'); d.name = name; save(); return d; },
    addToDM(did, pid) { const d = S.dms[did]; need(d.group && S.profiles[pid], 'cannot add'); if (!d.members.includes(pid)) d.members.push(pid); save(); return d; },
    leaveDM(did) { const d = S.dms[did]; d.members = d.members.filter(x => x !== S.me); if (!d.members.length) delete S.dms[did]; save(); return true; },
    searchDMs(q) { const s = String(q).toLowerCase(); return Object.values(S.dms).filter(d => d.members.includes(S.me)).flatMap(d => d.msgs.filter(m => m.text.toLowerCase().includes(s)).map(m => ({ dm: d.id, msg: m }))); },
    // groups / communities
    createGroup(o) { o = o || {}; need(String(o.name || '').trim(), 'name required'); const g = { id: uid('g'), name: o.name.trim(), desc: o.desc || '', rules: o.rules || [], owner: S.me, admins: [S.me], members: [S.me], banned: [], private: !!o.private, requests: [], created: now() }; S.groups[g.id] = g; save(); return g; },
    joinGroup(id) { const g = S.groups[id]; need(g && !g.banned.includes(S.me), 'cannot join'); if (g.members.includes(S.me)) return g; if (g.private) { if (!g.requests.includes(S.me)) g.requests.push(S.me); g.admins.forEach(a => notify(a, 'group', id)); } else g.members.push(S.me); save(); return g; },
    approveJoin(id, pid) { const g = S.groups[id]; need(g.admins.includes(S.me), 'admins only'); g.requests = g.requests.filter(x => x !== pid); if (!g.members.includes(pid)) g.members.push(pid); notify(pid, 'group', id); save(); return g; },
    leaveGroup(id) { const g = S.groups[id]; need(g.owner !== S.me || g.members.length === 1, 'transfer ownership first'); g.members = g.members.filter(x => x !== S.me); g.admins = g.admins.filter(x => x !== S.me); if (!g.members.length) delete S.groups[id]; save(); return true; },
    editGroup(id, o) { const g = S.groups[id]; need(g.admins.includes(S.me), 'admins only'); ['name', 'desc', 'rules', 'private'].forEach(k => { if (o[k] !== undefined) g[k] = o[k]; }); save(); return g; },
    makeAdmin(id, pid) { const g = S.groups[id]; need(g.owner === S.me && g.members.includes(pid), 'owner only'); if (!g.admins.includes(pid)) g.admins.push(pid); save(); return g; },
    transferGroup(id, pid) { const g = S.groups[id]; need(g.owner === S.me && g.members.includes(pid), 'owner only'); g.owner = pid; if (!g.admins.includes(pid)) g.admins.push(pid); save(); return g; },
    kick(id, pid) { const g = S.groups[id]; need(g.admins.includes(S.me) && pid !== g.owner, 'not allowed'); g.members = g.members.filter(x => x !== pid); g.admins = g.admins.filter(x => x !== pid); save(); return g; },
    ban(id, pid) { C.kick(id, pid); const g = S.groups[id]; if (!g.banned.includes(pid)) g.banned.push(pid); save(); return g; },
    removeGroupPost(gid, pid) { const g = S.groups[gid], p = P(pid); need(g.admins.includes(S.me) && p.group === gid, 'admins only'); p.deleted = now(); save(); return true; },
    groups(o) { return Object.values(S.groups).filter(g => !(o && o.mine) || g.members.includes(S.me)); },
    groupFeed(id, o) { return C.feed(Object.assign({ group: id, tab: 'all' }, o)); },
    // notifications
    notifications(o) { o = o || {}; return S.notifs.filter(n => n.to === S.me && (!o.type || n.type === o.type) && (!o.unread || !n.read)).sort((a, b) => b.created - a.created); },
    readNotif(id) { const n = S.notifs.find(x => x.id === id); if (n) n.read = true; save(); return true; },
    readAll() { S.notifs.forEach(n => { if (n.to === S.me) n.read = true; }); save(); return true; },
    clearNotifs() { S.notifs = S.notifs.filter(n => n.to !== S.me); save(); return true; },
    notifPref(type, on) { need(NTYPES.includes(type), 'unknown type'); (S.notifPrefs[S.me] = S.notifPrefs[S.me] || {})[type] = !!on; save(); return S.notifPrefs[S.me]; },
    badge() { return C.notifications({ unread: true }).length + C.unreadDMs(); },
    // attachments
    attachCalc(o) { return { type: 'calc', calc: o.calc || '', expr: String(o.expr || ''), result: String(o.result || '') }; },
    attachImage(dataUrl, alt) { need(/^data:image\/(png|jpeg|gif|webp);base64,/.test(dataUrl), 'images must be PNG/JPEG/GIF/WebP'); need(dataUrl.length < 1.5e6, 'image too large (max ≈1 MB)'); return { type: 'image', src: dataUrl, alt: alt || '' }; },
    attachBook(id) { const L = G.U45Library; const m = L && L.meta(id); need(m, 'no such book'); return { type: 'book', id: m.id, title: m.title }; },
    // data & privacy
    exportJSON() { return JSON.stringify({ app: 'U-45 Social', exported: new Date().toISOString(), data: S }, null, 1); },
    importJSON(txt, merge) { const o = JSON.parse(txt); const d = o.data || o; need(d && d.profiles && d.posts, 'not a U-45 Social export'); if (merge) { ['profiles', 'posts', 'comments', 'collections', 'drafts', 'dms', 'groups'].forEach(k => Object.assign(S[k], d[k] || {})); } else S = Object.assign(blank(), d); save(); return true; },
    wipe() { S = blank(); save(); return true; },
    usage() { const t = JSON.stringify(S); return { bytes: t.length, posts: Object.keys(S.posts).length, comments: Object.keys(S.comments).length, dms: Object.keys(S.dms).length, profiles: Object.keys(S.profiles).length }; },
    activity(n) { return S.log.slice(-(n || 50)).reverse(); },
    setting(k, v) { need(k in S.settings, 'unknown setting'); S.settings[k] = v; save(); return S.settings; },
    settings() { return Object.assign({}, S.settings); },
    plain(id) { const p = P(id); return `${(S.profiles[p.author] || {}).name} (@${(S.profiles[p.author] || {}).handle}) — ${new Date(p.created).toLocaleString()}\n${p.cw ? '[CW: ' + p.cw + '] ' : ''}${p.text}`; },
    permalink(id) { P(id); return '#/social/post/' + id; },
    seed() { if (Object.keys(S.posts).length) return false; const a = C.addProfile({ name: 'Ada', handle: 'ada', avatar: '🧠' }), b = C.addProfile({ name: 'Euler', handle: 'euler', avatar: '📐', color: '#FF8BD1' }); const keep = S.me;
      S.me = a.id; C.post({ text: 'Welcome to U-45 Social — everything here stays on this device. #welcome #maths' }); S.me = b.id; C.post({ text: 'e^(iπ) + 1 = 0 :heart: #identity', attach: [C.attachCalc({ calc: '#1', expr: 'e^(i*pi)+1', result: '0' })] }); C.post({ text: 'Which topic next?', poll: { options: ['Calculus', 'Logic', 'Statistics'] } });
      S.me = keep; C.follow(a.id); C.follow(b.id); save(); return true; },
    get state() { return S; }, get me() { return S.me; }, profile(id) { return S.profiles[id || S.me]; }, getPost(id) { return P(id); },
    onChange(f) { listeners.push(f); }
  };
  // ---- numbered feature list: every entry names the operation (core method or UI renderer) that implements it ----
  const FEAT = `Posts|Write a text post|post;Posts|2 000-character limit with live counter|ui:counter;Posts|Edit your post|edit;Posts|Edit history viewer|history;Posts|“edited” label|ui:edited;Posts|Delete to trash|trash;Posts|Restore from trash|restore;Posts|Delete forever|purge;Posts|Trash list|trashList;Posts|Empty trash|emptyTrash;Posts|Pin a post to your profile|pin;Posts|Unpin|unpin;Posts|Repost|repost;Posts|Undo repost|unrepost;Posts|Quote post|quote;Posts|Content warning|post;Posts|Spoiler blur|ui:spoiler;Posts|Visibility: public|visibleTo;Posts|Visibility: followers only|visibleTo;Posts|Visibility: close friends|visibleTo;Posts|Visibility: only me|visibleTo;Posts|Hashtag detection|post;Posts|Clickable hashtags|ui:tags;Posts|@mention detection|post;Posts|Clickable mentions|ui:mentions;Posts|Link detection|post;Posts|Clickable links (open in new tab)|ui:links;Posts|Emoji shortcodes (:fire: → 🔥)|post;Posts|Markdown **bold**|ui:md;Posts|Markdown _italic_|ui:md;Posts|Markdown \`code\`|ui:md;Posts|Mood tag|post;Posts|Place tag|post;Posts|Language tag|post;Posts|Attach a calculator result|attachCalc;Posts|Attach the last calculator answer in one tap|ui:lastcalc;Posts|Attach an image (stored locally)|attachImage;Posts|Image alt text|attachImage;Posts|Attach a Library book|attachBook;Posts|View counter|view;Posts|Post statistics|stats;Posts|Word and character count|stats;Posts|Copy post text|plain;Posts|Permalink to a post|permalink;Posts|Single-post page|ui:single;Posts|Relative timestamps|ui:time;Posts|Full date on hover|ui:time;Posts|Print a post|ui:print
Reactions|Like ❤️|like;Reactions|Unlike|like;Reactions|👍 reaction|react;Reactions|😂 reaction|react;Reactions|😮 reaction|react;Reactions|😢 reaction|react;Reactions|🎉 reaction|react;Reactions|Change your reaction|react;Reactions|Reaction counts|reactCounts;Reactions|Who reacted|reactors;Reactions|Filter reactors by emoji|reactors;Reactions|Top reaction|topReaction;Reactions|Liked-posts tab|feed
Comments|Comment on a post|comment;Comments|Reply to a comment|reply;Comments|Nested threads|thread;Comments|Edit a comment|editComment;Comments|Delete a comment|deleteComment;Comments|Post author can remove comments|deleteComment;Comments|Like a comment|likeComment;Comments|Pin a comment|pinComment;Comments|Sort comments: oldest|comments;Comments|Sort comments: newest|comments;Comments|Sort comments: top|comments;Comments|Comment count|stats;Comments|Mentions inside comments|comment;Comments|Collapse / expand threads|ui:collapse;Comments|Search comments|searchComments
Profiles|Several local profiles on one device|addProfile;Profiles|Switch profile|switchProfile;Profiles|Edit display name|updateProfile;Profiles|Change @handle (unique)|updateProfile;Profiles|Bio (300 characters)|updateProfile;Profiles|Emoji avatar|updateProfile;Profiles|Avatar colour|updateProfile;Profiles|Banner colour|updateProfile;Profiles|Website|updateProfile;Profiles|Pronouns|updateProfile;Profiles|Birthday|updateProfile;Profiles|Private profile|updateProfile;Profiles|Delete a profile|deleteProfile;Profiles|Profile list|profiles;Profiles|Profile statistics|profileStats;Profiles|Profile page: posts tab|feed;Profiles|Profile page: media tab|feed;Profiles|Pinned post shown first|feed
Network|Follow|follow;Network|Unfollow|unfollow;Network|Remove a follower|removeFollower;Network|Followers list|followers;Network|Following list|following;Network|Mutual follows|mutuals;Network|Who-to-follow suggestions|suggestions;Network|Block|block;Network|Unblock|unblock;Network|Mute an account|mute;Network|Unmute an account|unmute;Network|Close-friends list|closeFriend
Feed|Home feed|feed;Feed|Following feed|feed;Feed|My posts feed|feed;Feed|Bookmarks feed|feed;Feed|Sort: newest|feed;Feed|Sort: oldest|feed;Feed|Sort: top|feed;Feed|Sort: trending (time-decayed)|feed;Feed|Sort: most discussed|feed;Feed|Filter: has poll|feed;Feed|Filter: has calculator result|feed;Feed|Filter: has link|feed;Feed|Filter: has image|feed;Feed|Filter: date range|feed;Feed|Filter: language|feed;Feed|Filter: unread only|feed;Feed|Paging with “Load more”|feed;Feed|Hide a post|hide;Feed|Unhide|unhide;Feed|Mute a word|muteWord;Feed|Unmute a word|unmuteWord;Feed|Mute a hashtag|muteTag;Feed|Unmute a hashtag|unmuteTag;Feed|Seen tracking|markSeen;Feed|Unread counter|unreadCount;Feed|Live refresh on change|onChange;Feed|Seed demo content|seed
Search|Full-text search|search;Search|Multi-word AND search|search;Search|#hashtag search|search;Search|@user search|searchUsers;Search|Search highlights|ui:highlight;Search|Saved searches|saveSearch;Search|Remove saved search|unsaveSearch;Search|Recent searches|recentSearches;Search|Clear recent searches|clearRecent;Search|Trending hashtags (7 days)|trending;Search|Tag cloud|allTags
Bookmarks|Bookmark a post|bookmark;Bookmarks|Remove bookmark|unbookmark;Bookmarks|Bookmarks list|bookmarks;Bookmarks|Create a collection|newCollection;Bookmarks|Rename a collection|renameCollection;Bookmarks|Delete a collection|deleteCollection;Bookmarks|Add to collection|addToCollection;Bookmarks|Remove from collection|removeFromCollection;Bookmarks|Collections list|collections
Polls|Create a poll (2–6 options)|post;Polls|Vote|vote;Polls|Change your vote|vote;Polls|Multiple-choice polls|vote;Polls|Live percentages|pollResults;Polls|Voter count|pollResults;Polls|Poll duration|post;Polls|Auto-close when expired|closeExpired;Polls|Close a poll early|closePoll;Polls|Voters notified when closed|closePoll
Drafts|Save a draft|saveDraft;Drafts|Drafts list|drafts;Drafts|Delete a draft|deleteDraft;Drafts|Publish a draft|publishDraft;Drafts|Schedule a post|schedule;Drafts|Scheduled-posts list|scheduled;Drafts|Scheduled posts hidden until due|visibleTo
Messages|Direct message another profile|openDM;Messages|Send a message|send;Messages|Edit a message|editMsg;Messages|Unsend a message|unsendMsg;Messages|React to a message|reactMsg;Messages|Reply to a specific message|send;Messages|Share a calculator result in a message|send;Messages|Read receipts|readDM;Messages|Unread message count|unreadDMs;Messages|Inbox sorted by latest|inbox;Messages|Archive a conversation|archiveDM;Messages|Archived list|inbox;Messages|Mute a conversation|muteDM;Messages|Group chats|openDM;Messages|Rename a group chat|renameDM;Messages|Add people to a group chat|addToDM;Messages|Leave a conversation|leaveDM;Messages|Search messages|searchDMs
Groups|Create a group|createGroup;Groups|Join a public group|joinGroup;Groups|Request to join a private group|joinGroup;Groups|Approve join requests|approveJoin;Groups|Leave a group|leaveGroup;Groups|Edit name, description, rules|editGroup;Groups|Make someone admin|makeAdmin;Groups|Transfer ownership|transferGroup;Groups|Remove a member|kick;Groups|Ban a member|ban;Groups|Post into a group|post;Groups|Admins remove group posts|removeGroupPost;Groups|Group feed|groupFeed;Groups|My groups / all groups|groups
Notifications|Like notifications|notifications;Notifications|Reaction notifications|notifications;Notifications|Comment notifications|notifications;Notifications|Reply notifications|notifications;Notifications|Mention notifications|notifications;Notifications|Follow notifications|notifications;Notifications|Repost and quote notifications|notifications;Notifications|Poll-closed notifications|notifications;Notifications|Message notifications|notifications;Notifications|Group notifications|notifications;Notifications|Filter by type|notifications;Notifications|Mark one read|readNotif;Notifications|Mark all read|readAll;Notifications|Clear all|clearNotifs;Notifications|Turn a type on/off|notifPref;Notifications|Badge count on the toolbar button|badge
Data|Stored only in this device's IndexedDB (no server)|ui:local;Data|Export everything to JSON|exportJSON;Data|Import from JSON (replace)|importJSON;Data|Import and merge|importJSON;Data|Wipe all social data|wipe;Data|Storage usage|usage;Data|Activity log|activity;Data|Works offline|ui:local;Settings|Compact layout|setting;Settings|Font size|setting;Settings|Reduce motion|setting;Settings|Light/dark theme|setting;Settings|Keyboard: Ctrl+Enter posts|ui:keys;Settings|Screen-reader labels and live regions|ui:a11y;Settings|Large touch targets for mobile|ui:a11y;Settings|Numbered feature list (this list)|ui:features`;
  const FEATURES = FEAT.split(/[;\n]/).map((s, i) => { const [area, name, op] = s.split('|'); return { n: i + 1, area, name, op }; });
  // ---- UI ----
  function md(t, hl) {
    let h = esc(t);
    h = h.replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/(^|\s)_([^_]+)_/g, '$1<i>$2</i>');
    h = h.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
    h = h.replace(/(^|[\s(])#([\p{L}\p{N}_]+)/gu, '$1<a href="#/social/tag/$2" class="sc-tag">#$2</a>').replace(/(^|[\s(])@([A-Za-z0-9_]+)/g, (m, a, u) => { const p = byHandle(u); return p ? `${a}<a href="#/social/user/${p.id}" class="sc-at">@${u}</a>` : m; });
    if (hl) { const re = new RegExp('(' + hl.split(/\s+/).filter(Boolean).map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')(?![^<]*>)', 'gi'); h = h.replace(re, '<mark>$1</mark>'); }
    return h.replace(/\n/g, '<br>');
  }
  const ago = (t) => { const s = (now() - t) / 1000; if (s < 0) return 'scheduled ' + new Date(t).toLocaleString(); if (s < 60) return 'now'; if (s < 3600) return Math.floor(s / 60) + 'm'; if (s < 86400) return Math.floor(s / 3600) + 'h'; if (s < 604800) return Math.floor(s / 86400) + 'd'; return new Date(t).toLocaleDateString(); };
  const av = (p) => `<span class="sc-av" style="background:${esc(p ? p.color : '#888')}" aria-hidden="true">${esc(p ? p.avatar : '?')}</span>`;
  function attachHTML(a) { if (a.type === 'calc') return `<div class="sc-calc">🧮 ${esc(a.calc)} <code>${esc(a.expr)}</code> = <b>${esc(a.result)}</b></div>`; if (a.type === 'image') return `<img class="sc-img" src="${esc(a.src)}" alt="${esc(a.alt)}">`; if (a.type === 'book') return `<a class="sc-book" href="#/library/${a.id}">📚 ${esc(a.title)}</a>`; return ''; }
  function postHTML(p, o) {
    o = o || {}; const u = S.profiles[p.author]; const src = p.repostOf && S.posts[p.repostOf]; const q = p.quoteOf && S.posts[p.quoteOf];
    if (src) return `<article class="sc-post sc-rp" data-id="${p.id}"><div class="sc-meta">🔁 ${esc(u && u.name)} reposted</div>${C.visibleTo(src) ? postHTML(src, o) : '<p class="xnote">Original unavailable.</p>'}</article>`;
    const st = C.stats(p.id), rc = C.reactCounts(p.id), mine = p.reactions[S.me], bm = (S.bookmarks[S.me] || []).includes(p.id);
    const body = `<div class="sc-text">${md(p.text, o.hl)}</div>${p.attach.map(attachHTML).join('')}${q ? `<blockquote class="sc-q">${C.visibleTo(q) ? `<b>${esc((S.profiles[q.author] || {}).name)}</b>: ${md(q.text.slice(0, 280))}` : 'Quoted post unavailable.'}</blockquote>` : ''}${p.poll ? pollHTML(p) : ''}`;
    return `<article class="sc-post" data-id="${p.id}" aria-label="Post by ${esc(u && u.name)}">
      <header class="sc-meta">${av(u)}<a href="#/social/user/${p.author}"><b>${esc(u && u.name)}</b> @${esc(u && u.handle)}</a> · <a href="#/social/post/${p.id}" title="${new Date(p.created).toLocaleString()}">${ago(p.publishAt > now() ? p.publishAt : p.created)}</a>${p.edited ? ' · <button class="sc-l" data-do="hist">edited</button>' : ''}${p.pinned ? ' · 📌' : ''}${p.vis !== 'public' ? ' · ' + ({ followers: '👥', close: '💚', private: '🔒' }[p.vis] || '') : ''}${p.group && S.groups[p.group] ? ` · in <a href="#/social/group/${p.group}">${esc(S.groups[p.group].name)}</a>` : ''}${p.mood ? ' · ' + esc(p.mood) : ''}${p.place ? ' · 📍' + esc(p.place) : ''}</header>
      ${p.cw || p.spoiler ? `<details class="sc-cw"><summary>⚠ ${esc(p.cw || 'Spoiler')} — show</summary>${body}</details>` : body}
      <footer class="sc-acts">${REACTS.map(e => `<button data-do="react" data-e="${e}" class="${mine === e ? 'on' : ''}" aria-pressed="${mine === e}" aria-label="React ${e}">${e}${rc[e] ? ' ' + rc[e] : ''}</button>`).join('')}
        <button data-do="cmt" aria-label="Comments">💬 ${st.comments}</button><button data-do="rp" aria-label="Repost">🔁 ${st.reposts}</button><button data-do="qt" aria-label="Quote">❝</button><button data-do="bm" class="${bm ? 'on' : ''}" aria-label="Bookmark">🔖</button><button data-do="more" aria-label="More actions">⋯</button><span class="sc-v">👁 ${p.views}</span></footer>
      <div class="sc-more" hidden></div><div class="sc-cmts" ${o.open ? '' : 'hidden'}>${o.open ? commentsHTML(p.id) : ''}</div></article>`;
  }
  function pollHTML(p) { C.closeExpired(); const r = C.pollResults(p.id); return `<div class="sc-poll" role="group" aria-label="Poll">${r.options.map((o, i) => `<button data-do="vote" data-i="${i}" class="sc-opt ${o.mine ? 'on' : ''}" ${r.closed ? 'disabled' : ''}><span style="width:${o.pct}%"></span><em>${esc(o.t)}</em><b>${o.pct}%</b></button>`).join('')}<small>${r.voters} voter${r.voters === 1 ? '' : 's'} · ${r.closed ? 'closed' : r.closesAt ? 'closes ' + new Date(r.closesAt).toLocaleString() : 'open'}${p.poll.multi ? ' · multiple choice' : ''}</small>${p.author === S.me && !r.closed ? ' <button data-do="closepoll" class="sc-l">close poll</button>' : ''}</div>`; }
  function commentsHTML(pid, sort) {
    const one = (c) => { const u = S.profiles[c.author]; return `<li class="sc-c" data-c="${c.id}">${av(u)}<b>${esc(u && u.name)}</b> <small>${ago(c.created)}${c.edited ? ' · edited' : ''}${c.pinned ? ' · 📌' : ''}</small><div>${c.deleted ? '<i>deleted</i>' : md(c.text)}</div>
      <div class="sc-cacts"><button data-do="clike">♥ ${c.likes.length}</button><button data-do="creply">Reply</button>${c.author === S.me && !c.deleted ? '<button data-do="cedit">Edit</button>' : ''}${(c.author === S.me || S.posts[pid].author === S.me) && !c.deleted ? '<button data-do="cdel">Delete</button>' : ''}${S.posts[pid].author === S.me ? '<button data-do="cpin">Pin</button>' : ''}</div>${c.replies.length ? `<details open><summary>${c.replies.length} repl${c.replies.length === 1 ? 'y' : 'ies'}</summary><ul>${c.replies.map(one).join('')}</ul></details>` : ''}</li>`; };
    const tree = C.thread(pid); const order = { new: (a, b) => b.created - a.created, top: (a, b) => b.likes.length - a.likes.length, old: (a, b) => a.created - b.created }[sort || 'old']; tree.sort((a, b) => (b.pinned - a.pinned) || order(a, b));
    return `<div class="xbar"><select data-do="csort" aria-label="Sort comments"><option value="old">Oldest</option><option value="new"${sort === 'new' ? ' selected' : ''}>Newest</option><option value="top"${sort === 'top' ? ' selected' : ''}>Top</option></select></div><ul class="sc-cl">${tree.map(one).join('') || '<li class="xnote">No comments yet.</li>'}</ul><form class="xbar sc-cf"><input name="c" placeholder="Write a comment…" aria-label="Comment" maxlength="${MAXLEN}"><button class="xbig">Send</button></form>`;
  }
  const TABS = [['', '🏠 Feed'], ['search', '🔎 Search'], ['notifs', '🔔 Alerts'], ['dms', '✉ Messages'], ['groups', '👥 Groups'], ['saved', '🔖 Saved'], ['user/me', '👤 Profile'], ['drafts', '📝 Drafts'], ['trash', '🗑 Trash'], ['data', '⚙ Data'], ['features', '★ Features']];
  const V = { tab: 'home', sort: 'new', has: '', page: 0, csort: {} };
  function composer(o) {
    o = o || {}; const lr = (() => { try { return JSON.parse(localStorage.getItem('u45.lastResult') || 'null'); } catch (e) { return null; } })();
    return `<form class="sc-comp" id="scf"><label class="sr" for="sct">New post</label><textarea id="sct" maxlength="${MAXLEN}" placeholder="${o.group ? 'Post to the group…' : 'Share a result, a puzzle, a proof… (#tags, @mentions, **bold**, _italic_, \`code\`, :fire:)'}" rows="3"></textarea>
      <div class="sc-row"><span id="scn" class="sc-n" aria-live="polite">0 / ${MAXLEN}</span>
      <select id="scv" aria-label="Visibility"><option value="public">🌐 Public</option><option value="followers">👥 Followers</option><option value="close">💚 Close friends</option><option value="private">🔒 Only me</option></select>
      <input id="sccw" placeholder="Content warning (optional)" aria-label="Content warning"><label><input type="checkbox" id="scsp"> spoiler</label>
      <input id="scmood" placeholder="Mood" aria-label="Mood" size="6"><input id="scpl" placeholder="Place" aria-label="Place" size="6"><select id="sclang" aria-label="Language"><option>en</option><option>fr</option><option>sw</option><option>lg</option><option>es</option><option>ar</option></select></div>
      <details><summary>📊 Poll · 🖼 Image · 🧮 Result · 📚 Book · ⏰ Schedule</summary><div class="sc-row"><input id="scpo" placeholder="Poll options, separated by |  (2–6)" aria-label="Poll options"><label><input type="checkbox" id="scpm"> multiple</label><input id="scph" type="number" min="0" max="720" placeholder="hours" aria-label="Poll hours" size="4"></div>
      <div class="sc-row"><input type="file" id="scimg" accept="image/png,image/jpeg,image/gif,image/webp" aria-label="Image"><input id="scalt" placeholder="Image description (alt)" aria-label="Alt text"></div>
      <div class="sc-row">${lr && lr.result ? `<label><input type="checkbox" id="sclr"> attach last result: ${esc(lr.calc)} = <b>${esc(lr.result)}</b></label>` : '<span class="xnote">Use a calculator first to attach its last result.</span>'}<input id="scbk" type="number" min="1" placeholder="Library book #" aria-label="Library book number" size="8"></div>
      <div class="sc-row"><input type="datetime-local" id="scat" aria-label="Schedule for"></div></details>
      <div class="sc-row"><button class="xbig" type="submit">Post (Ctrl+Enter)</button><button type="button" id="scdr">Save draft</button></div></form>`;
  }
  async function readComposer(root, extra) {
    const g = (s) => root.querySelector(s); const o = Object.assign({ text: g('#sct').value, vis: g('#scv').value, cw: g('#sccw').value, spoiler: g('#scsp').checked, mood: g('#scmood').value, place: g('#scpl').value, lang: g('#sclang').value, attach: [] }, extra);
    const po = g('#scpo').value.split('|').map(s => s.trim()).filter(Boolean); if (po.length) o.poll = { options: po, multi: g('#scpm').checked, hours: +g('#scph').value || 0 };
    const f = g('#scimg').files && g('#scimg').files[0]; if (f) { const url = await new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = no; r.readAsDataURL(f); }); o.attach.push(C.attachImage(url, g('#scalt').value)); }
    const lr = g('#sclr'); if (lr && lr.checked) { const x = JSON.parse(localStorage.getItem('u45.lastResult')); o.attach.push(C.attachCalc({ calc: '#' + x.id + ' ' + x.calc, expr: '', result: x.result })); }
    if (+g('#scbk').value) o.attach.push(C.attachBook(+g('#scbk').value));
    const at = g('#scat').value; if (at) o.publishAt = new Date(at).getTime();
    return o;
  }
  function page(root, sub) {
    sub = sub || ''; if (sub === 'user/me') sub = 'user/' + S.me;
    const u = S.profiles[S.me]; const nb = C.notifications({ unread: true }).length, nd = C.unreadDMs();
    const head = `<div class="xpage social sc-font" style="--scf:${S.settings.font}px" data-theme="${S.settings.theme}" data-compact="${S.settings.compact}"><div class="xhead"><h2>💬 Social <small class="xnote">local-only, no server — stored in this device’s IndexedDB · ${FEATURES.length} features</small></h2>
      <label class="sc-me">${av(u)}<select id="scme" aria-label="Active profile">${C.profiles().map(p => `<option value="${p.id}"${p.id === S.me ? ' selected' : ''}>${esc(p.name)} @${esc(p.handle)}</option>`).join('')}<option value="+">+ New profile…</option></select></label></div>
      <nav class="xbar sc-tabs" aria-label="Social sections">${TABS.map(([k, l]) => `<a href="#/social${k ? '/' + k : ''}" class="xbtn${(sub === k || (k && sub.startsWith(k)) || (k === 'user/me' && sub === 'user/' + S.me)) ? ' on' : ''}">${l}${k === 'notifs' && nb ? ` <b class="sc-badge">${nb}</b>` : ''}${k === 'dms' && nd ? ` <b class="sc-badge">${nd}</b>` : ''}</a>`).join('')}</nav><main id="scm">`;
    let body = '';
    const [k, a1] = sub.split('/');
    if (!k || k === 'tag') {
      const tabs = ['home', 'following', 'liked', 'media'];
      const f = C.feed({ tab: V.tab, sort: V.sort, has: V.has, tag: k === 'tag' ? decodeURIComponent(a1) : '', per: 20 * (V.page + 1) });
      body = (k === 'tag' ? `<h3>#${esc(decodeURIComponent(a1))} <button data-do="mutetag" data-t="${esc(a1)}">Mute tag</button></h3>` : composer()) +
        `<div class="xbar">${tabs.map(t => `<button data-do="ftab" data-t="${t}" class="xbtn${V.tab === t ? ' on' : ''}">${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}<select data-do="fsort" aria-label="Sort">${['new', 'old', 'top', 'trending', 'comments'].map(s => `<option${V.sort === s ? ' selected' : ''}>${s}</option>`).join('')}</select><select data-do="fhas" aria-label="Filter"><option value="">All posts</option>${['poll', 'calc', 'link', 'image'].map(s => `<option${V.has === s ? ' selected' : ''}>${s}</option>`).join('')}</select><button data-do="seed">Demo content</button></div>
        <p class="xnote">${f.total} post${f.total === 1 ? '' : 's'} · ${C.unreadCount()} unread · trending: ${C.trending(6).map(([t, n]) => `<a href="#/social/tag/${esc(t)}">#${esc(t)}</a> ${n}`).join(' · ') || '—'}</p>
        <div class="sc-feed">${f.items.map(p => postHTML(p)).join('') || '<p class="xnote">Nothing here yet — write the first post, or load demo content.</p>'}</div>${f.more ? '<button class="xbig" data-do="moref">Load more</button>' : ''}`;
      f.items.forEach(p => C.markSeen(p.id));
    } else if (k === 'post') { const p = S.posts[a1]; if (p && C.visibleTo(p)) { C.view(p.id); body = postHTML(p, { open: true }); } else body = '<p>Post not found.</p>'; }
    else if (k === 'search') {
      const q = V.q || ''; let r = []; try { r = q ? C.search(q) : []; } catch (e) { r = []; }
      body = `<form class="xbar" id="scs"><input id="scq" type="search" value="${esc(q)}" placeholder="Search posts, #tags, @people" aria-label="Search"><button class="xbig">Search</button>${q ? '<button type="button" data-do="savesearch">☆ Save</button>' : ''}</form>
        <p class="xnote">Saved: ${S.savedSearches.map(s => `<a href="#" data-do="runq" data-q="${esc(s)}">${esc(s)}</a> <button data-do="unsave" data-q="${esc(s)}" aria-label="Remove">×</button>`).join(' · ') || '—'} · Recent: ${S.recent.slice(0, 8).map(s => `<a href="#" data-do="runq" data-q="${esc(s)}">${esc(s)}</a>`).join(' · ') || '—'} ${S.recent.length ? '<button data-do="clearrecent">clear</button>' : ''}</p>
        <p class="sc-cloud">${Object.entries(C.allTags()).sort((a, b) => b[1] - a[1]).slice(0, 40).map(([t, n]) => `<a href="#/social/tag/${esc(t)}" style="font-size:${Math.min(2, 0.9 + n / 5)}em">#${esc(t)}</a>`).join(' ')}</p>
        ${q ? (q.startsWith('@') ? r.map(p => `<p>${av(p)} <a href="#/social/user/${p.id}">${esc(p.name)} @${esc(p.handle)}</a> ${esc(p.bio)}</p>`).join('') : r.map(p => postHTML(p, { hl: q.startsWith('#') ? '' : q })).join('')) + (r.length ? '' : '<p>No results.</p>') : ''}
        ${q && !/^[#@]/.test(q) ? `<h4>In comments</h4>${C.searchComments(q).map(c => `<p><a href="#/social/post/${c.post}">${md(c.text, q)}</a></p>`).join('') || '<p class="xnote">none</p>'}` : ''}`;
    }
    root.innerHTML = head + (body || pageMore(k, a1)) + '</main></div>';
    wire(root, sub);
  }
  const NLABEL = { like: 'liked your post', react: 'reacted to your post', comment: 'commented on your post', reply: 'replied', mention: 'mentioned you', follow: 'followed you', repost: 'reposted you', quote: 'quoted you', poll: 'poll closed', dm: 'sent you a message', group: 'group update' };
  function pageMore(k, a1) {
    const nm = (id) => esc((S.profiles[id] || { name: '?' }).name);
    if (k === 'notifs') { const t = V.ntype || ''; const ns = C.notifications({ type: t }); return `<div class="xbar"><select data-do="ntype" aria-label="Type"><option value="">All types</option>${NTYPES.map(x => `<option${t === x ? ' selected' : ''}>${x}</option>`).join('')}</select><button data-do="readall">Mark all read</button><button data-do="clearn">Clear</button></div>
      <details><summary>Notification settings</summary>${NTYPES.map(x => `<label><input type="checkbox" data-do="npref" data-t="${x}" ${((S.notifPrefs[S.me] || {})[x] !== false) ? 'checked' : ''}> ${x}</label>`).join(' ')}</details>
      <ul class="sc-nl">${ns.map(n => `<li class="${n.read ? '' : 'unread'}"><a href="${n.type === 'dm' ? '#/social/dm/' + n.ref : n.type === 'follow' ? '#/social/user/' + n.from : n.type === 'group' ? '#/social/group/' + n.ref : '#/social/post/' + n.ref}" data-do="nread" data-n="${n.id}">${nm(n.from)} ${NLABEL[n.type]}</a> <small>${ago(n.created)}</small></li>`).join('') || '<li class="xnote">No notifications.</li>'}</ul>`; }
    if (k === 'dms') { const arch = V.arch; const ib = C.inbox({ archived: arch }); const others = C.profiles().filter(p => p.id !== S.me);
      return `<form class="xbar" id="scdm"><select id="scdmto" multiple size="3" aria-label="People">${others.map(p => `<option value="${p.id}">${esc(p.name)} @${esc(p.handle)}</option>`).join('')}</select><input id="scdmn" placeholder="Group chat name (optional)" aria-label="Group name"><button class="xbig">New chat</button></form>${others.length ? '' : '<p class="xnote">Create a second local profile (top right) to message it.</p>'}
      <div class="xbar"><button data-do="arch" class="xbtn${arch ? '' : ' on'}">Inbox</button><button data-do="arch" data-v="1" class="xbtn${arch ? ' on' : ''}">Archived</button><input id="scdq" type="search" placeholder="Search messages" aria-label="Search messages"><button data-do="dsearch">Search</button></div><div id="scdr"></div>
      <ul class="sc-nl">${ib.map(d => { const last = d.msgs[d.msgs.length - 1]; const un = d.msgs.filter(m => !m.readBy.includes(S.me)).length; return `<li class="${un ? 'unread' : ''}"><a href="#/social/dm/${d.id}"><b>${esc(d.name || d.members.filter(x => x !== S.me).map(x => (S.profiles[x] || {}).name).join(', '))}</b>${un ? ` <b class="sc-badge">${un}</b>` : ''} — ${esc(last ? (last.deleted ? 'message unsent' : last.text).slice(0, 60) : 'no messages')}</a>${d.muted.includes(S.me) ? ' 🔕' : ''}</li>`; }).join('') || '<li class="xnote">No conversations.</li>'}</ul>`; }
    if (k === 'dm') { const d = S.dms[a1]; if (!d || !d.members.includes(S.me)) return '<p>Conversation not found.</p>'; C.readDM(d.id); const lr = (() => { try { return JSON.parse(localStorage.getItem('u45.lastResult') || 'null'); } catch (e) { return null; } })();
      return `<h3>${esc(d.name || d.members.filter(x => x !== S.me).map(x => (S.profiles[x] || {}).name).join(', '))}</h3><div class="xbar"><button data-do="darch">Archive</button><button data-do="dmute">${d.muted.includes(S.me) ? 'Unmute' : 'Mute'}</button>${d.group ? `<button data-do="dren">Rename</button><select data-do="dadd" aria-label="Add person"><option value="">+ Add…</option>${C.profiles().filter(p => !d.members.includes(p.id)).map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select>` : ''}<button data-do="dleave">Leave</button></div>
      <ol class="sc-msgs" aria-live="polite">${d.msgs.map(m => `<li class="${m.from === S.me ? 'me' : ''}" data-m="${m.id}"><small>${nm(m.from)} · ${ago(m.created)}${m.edited ? ' · edited' : ''}</small>${m.replyTo ? `<blockquote>${esc((d.msgs.find(x => x.id === m.replyTo) || { text: '…' }).text.slice(0, 80))}</blockquote>` : ''}<div>${m.deleted ? '<i>message unsent</i>' : md(m.text)}</div>${m.attach ? attachHTML(m.attach) : ''}
        <div class="sc-cacts">${REACTS.slice(0, 3).map(e => `<button data-do="mreact" data-e="${e}">${e}${Object.values(m.reactions).filter(x => x === e).length || ''}</button>`).join('')}<button data-do="mreply">Reply</button>${m.from === S.me && !m.deleted ? '<button data-do="medit">Edit</button><button data-do="munsend">Unsend</button>' : ''}<small>${m.readBy.length > 1 ? '✓✓ read' : '✓ sent'}</small></div></li>`).join('')}</ol>
      <form class="xbar" id="scsend"><input id="scmsg" placeholder="Message…" aria-label="Message" maxlength="${MAXLEN}">${lr && lr.result ? '<label><input type="checkbox" id="scmlr"> 🧮 last result</label>' : ''}<button class="xbig">Send</button></form><p class="xnote" id="screp"></p>`; }
    if (k === 'groups') return `<form class="xbar" id="scg"><input id="scgn" placeholder="New group name" aria-label="Group name"><input id="scgd" placeholder="Description" aria-label="Description"><label><input type="checkbox" id="scgp"> private</label><button class="xbig">Create</button></form>
      <ul class="sc-nl">${C.groups().map(g => `<li><a href="#/social/group/${g.id}"><b>${esc(g.name)}</b></a> ${g.private ? '🔒' : '🌐'} · ${g.members.length} member${g.members.length === 1 ? '' : 's'} — ${esc(g.desc)} ${g.members.includes(S.me) ? '<i>joined</i>' : g.requests.includes(S.me) ? '<i>requested</i>' : `<button data-do="gjoin" data-g="${g.id}">Join</button>`}</li>`).join('') || '<li class="xnote">No groups yet.</li>'}</ul>`;
    if (k === 'group') { const g = S.groups[a1]; if (!g) return '<p>Group not found.</p>'; const adm = g.admins.includes(S.me), mem = g.members.includes(S.me); const f = C.groupFeed(g.id, { per: 50 });
      return `<h3>${esc(g.name)} ${g.private ? '🔒' : '🌐'}</h3><p>${esc(g.desc)}</p>${g.rules.length ? `<ol>${g.rules.map(r => `<li>${esc(r)}</li>`).join('')}</ol>` : ''}<p class="xnote">Owner ${nm(g.owner)} · admins ${g.admins.map(nm).join(', ')} · members ${g.members.map(nm).join(', ')}</p>
      <div class="xbar">${mem ? '<button data-do="gleave">Leave</button>' : '<button data-do="gjoin" data-g="' + g.id + '">Join</button>'}${adm ? '<button data-do="gedit">Edit description</button><button data-do="grule">Add rule</button>' : ''}</div>
      ${adm && g.requests.length ? `<p>Requests: ${g.requests.map(r => `${nm(r)} <button data-do="gok" data-u="${r}">Approve</button>`).join(' ')}</p>` : ''}
      ${adm ? `<details><summary>Manage members</summary>${g.members.filter(x => x !== S.me).map(x => `<p>${nm(x)} ${g.owner === S.me ? `<button data-do="gadmin" data-u="${x}">Make admin</button><button data-do="gowner" data-u="${x}">Transfer ownership</button>` : ''}${x !== g.owner ? `<button data-do="gkick" data-u="${x}">Remove</button><button data-do="gban" data-u="${x}">Ban</button>` : ''}</p>`).join('') || '<p class="xnote">No other members.</p>'}</details>` : ''}
      ${mem ? composer({ group: g.id }) : ''}<div class="sc-feed">${f.items.map(p => postHTML(p) + (adm ? `<button data-do="gdel" data-p="${p.id}" class="sc-l">remove post</button>` : '')).join('') || '<p class="xnote">No posts in this group.</p>'}</div>`; }
    if (k === 'saved') { const cs = C.collections(); const sel = V.coll && S.collections[V.coll]; const items = sel ? sel.posts.map(id => S.posts[id]).filter(Boolean) : C.bookmarks();
      return `<div class="xbar"><button data-do="coll" class="xbtn${sel ? '' : ' on'}">All bookmarks</button>${cs.map(c => `<button data-do="coll" data-c="${c.id}" class="xbtn${sel && sel.id === c.id ? ' on' : ''}">${esc(c.name)} (${c.posts.length})</button>`).join('')}<button data-do="newcoll">+ Collection</button>${sel ? '<button data-do="rencoll">Rename</button><button data-do="delcoll">Delete</button>' : ''}</div>
      <div class="sc-feed">${items.map(p => postHTML(p) + `<div class="xbar">${sel ? `<button data-do="uncoll" data-p="${p.id}">Remove from collection</button>` : cs.map(c => `<button data-do="tocoll" data-c="${c.id}" data-p="${p.id}">+ ${esc(c.name)}</button>`).join('')}</div>`).join('') || '<p class="xnote">Nothing saved yet — tap 🔖 on a post.</p>'}</div>`; }
    if (k === 'user') { const p = S.profiles[a1]; if (!p) return '<p>Profile not found.</p>'; const st = C.profileStats(p.id); const mine = p.id === S.me; const ptab = V.ptab || 'mine'; const fol = C.following().includes(p.id);
      const f = C.feed({ author: p.id, tab: ptab === 'media' ? 'media' : 'mine', per: 50 }); if (ptab === 'media') f.items = f.items.filter(x => x.author === p.id);
      return `<section class="sc-prof"><div class="sc-ban" style="background:${esc(p.banner)}"></div>${av(p)}<h3>${esc(p.name)} <small>@${esc(p.handle)}${p.pronouns ? ' · ' + esc(p.pronouns) : ''}${p.private ? ' · 🔒' : ''}</small></h3><p>${md(p.bio)}</p><p class="xnote">${p.site ? `<a href="${esc(/^https?:\/\//.test(p.site) ? p.site : 'https://' + p.site)}" target="_blank" rel="noopener noreferrer">${esc(p.site)}</a> · ` : ''}${p.birthday ? '🎂 ' + esc(p.birthday) + ' · ' : ''}joined ${new Date(st.joined).toLocaleDateString()}</p>
        <p><b>${st.posts}</b> posts · <a href="#" data-do="flist" data-w="followers"><b>${st.followers}</b> followers</a> · <a href="#" data-do="flist" data-w="following"><b>${st.following}</b> following</a> · <b>${st.reactions}</b> reactions${mine ? ` · <b>${C.mutuals().length}</b> mutuals` : ''}</p><div id="scfl"></div>
        <div class="xbar">${mine ? '<button data-do="pedit" class="xbig">Edit profile</button>' : `<button data-do="${fol ? 'unfollow' : 'follow'}" class="xbig">${fol ? 'Unfollow' : 'Follow'}</button><button data-do="dmwith">Message</button><button data-do="pmute">${isMuted(S.me, p.id) ? 'Unmute' : 'Mute'}</button><button data-do="pblock">${isBlocked(S.me, p.id) ? 'Unblock' : 'Block'}</button><button data-do="pclose">${S.closeFriends.some(([a, b]) => a === S.me && b === p.id) ? 'Remove close friend' : 'Add close friend'}</button>${C.followers().includes(p.id) ? '<button data-do="premove">Remove follower</button>' : ''}<button data-do="pdel">Delete profile</button>`}</div>
        <form id="scpe" hidden class="sc-pe">${['name', 'handle', 'bio', 'avatar', 'color', 'banner', 'site', 'pronouns', 'birthday'].map(f2 => `<label>${f2}<input name="${f2}" value="${esc(p[f2])}" ${f2 === 'color' || f2 === 'banner' ? 'type="color"' : f2 === 'birthday' ? 'type="date"' : ''} ${f2 === 'bio' ? 'maxlength="300"' : ''}></label>`).join('')}<label><input type="checkbox" name="private" ${p.private ? 'checked' : ''}> private profile</label><button class="xbig">Save</button></form>
        ${mine ? `<p class="xnote">Who to follow: ${C.suggestions().slice(0, 5).map(x => `<a href="#/social/user/${x}">${esc(S.profiles[x].name)}</a>`).join(' · ') || '—'}</p>` : ''}</section>
        <div class="xbar"><button data-do="ptab" data-t="mine" class="xbtn${ptab === 'mine' ? ' on' : ''}">Posts</button><button data-do="ptab" data-t="media" class="xbtn${ptab === 'media' ? ' on' : ''}">Media</button></div><div class="sc-feed">${f.items.map(x => postHTML(x)).join('') || '<p class="xnote">No posts.</p>'}</div>`; }
    if (k === 'drafts') return `<h3>Drafts</h3>${C.drafts().map(d => `<div class="sc-post" data-d="${d.id}"><p>${md(d.text || '(empty)')}</p><small>saved ${ago(d.saved)}</small> <button data-do="dpub">Publish</button><button data-do="ddel">Delete</button></div>`).join('') || '<p class="xnote">No drafts.</p>'}<h3>Scheduled</h3>${C.scheduled().map(p => postHTML(p)).join('') || '<p class="xnote">Nothing scheduled.</p>'}`;
    if (k === 'trash') { const t = C.trashList(); return `<div class="xbar"><button data-do="empty" ${t.length ? '' : 'disabled'}>Empty trash</button></div>${t.map(p => `<div class="sc-post" data-id="${p.id}"><p>${md(p.text)}</p><small>deleted ${ago(p.deleted)}</small> <button data-do="restore">Restore</button><button data-do="purge">Delete forever</button></div>`).join('') || '<p class="xnote">Trash is empty.</p>'}`; }
    if (k === 'data') { const us = C.usage(), st = S.settings;
      return `<h3>Your data stays here</h3><p class="xnote">U-45 Social is <b>local-only, with no server</b>. Posts, profiles, messages and groups are kept in this browser’s IndexedDB on this device. Nothing is uploaded; other people can only see your posts if you export the file and share it yourself.</p>
      <p>${us.posts} posts · ${us.comments} comments · ${us.dms} conversations · ${us.profiles} profiles · ${(us.bytes / 1024).toFixed(1)} KB</p>
      <div class="xbar"><button data-do="export" class="xbig">⬇ Export JSON</button><label class="xbtn">⬆ Import (replace)<input type="file" id="scimp" accept="application/json" hidden></label><label class="xbtn">⬆ Import (merge)<input type="file" id="scimpm" accept="application/json" hidden></label><button data-do="wipe">Wipe all social data</button></div>
      <h3>Settings</h3><div class="xbar"><label>Theme <select data-do="set" data-k="theme"><option${st.theme === 'dark' ? ' selected' : ''}>dark</option><option${st.theme === 'light' ? ' selected' : ''}>light</option></select></label><label>Font <input type="range" min="12" max="24" value="${st.font}" data-do="set" data-k="font" aria-label="Font size"></label><label><input type="checkbox" data-do="set" data-k="compact" ${st.compact ? 'checked' : ''}> compact</label><label><input type="checkbox" data-do="set" data-k="motion" ${st.motion ? '' : 'checked'} data-inv="1"> reduce motion</label></div>
      <h3>Muted</h3><form class="xbar" id="scmw"><input id="scmwi" placeholder="Mute a word or #tag" aria-label="Mute"><button>Mute</button></form><p>${S.mutedWords.map(w => `${esc(w)} <button data-do="unmw" data-w="${esc(w)}" aria-label="Unmute">×</button>`).join(' · ')}${S.mutedTags.map(w => ` #${esc(w)} <button data-do="unmt" data-w="${esc(w)}" aria-label="Unmute">×</button>`).join(' · ')}</p>
      <p>Hidden posts: ${S.hidden.length} ${S.hidden.length ? '<button data-do="unhideall">Unhide all</button>' : ''}</p>
      <h3>Activity log</h3><ol class="sc-nl">${C.activity(20).map(l => `<li>${new Date(l.t).toLocaleString()} — ${esc((S.profiles[l.who] || {}).name)}: ${esc(l.what)}</li>`).join('') || '<li class="xnote">empty</li>'}</ol>`; }
    if (k === 'features') { const areas = [...new Set(FEATURES.map(f => f.area))]; return `<h3>${FEATURES.length} numbered features</h3><p class="xnote">Every item below is implemented in this app (core operation or UI) and runs entirely on this device.</p>${areas.map(a => `<h4>${esc(a)}</h4><ol class="sc-fl">${FEATURES.filter(f => f.area === a).map(f => `<li value="${f.n}">${esc(f.name)}</li>`).join('')}</ol>`).join('')}`; }
    return '<p>Unknown section.</p>';
  }
  // inline dialog (window.prompt is unavailable in Electron)
  function askText(label, val) {
    return new Promise(ok => { const d = document.createElement('div'); d.className = 'sc-dlg'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true');
      d.innerHTML = `<form><button type="button" class="u45-back" data-x aria-label="Back (cancel)">← Back</button><label>${esc(label)}<textarea rows="3">${esc(val || '')}</textarea></label><div class="xbar"><button class="xbig">OK</button><button type="button" data-x>Cancel</button></div></form>`;
      document.body.appendChild(d); const ta = d.querySelector('textarea'); ta.focus();
      let fin = false, nav = null; const done = (v, src) => { if (fin) return; fin = true; d.remove(); if (nav && src !== 'pop' && src !== 'drop') nav.done(); ok(v); };
      if (window.U45Nav) nav = window.U45Nav.open('dialog', (src) => done(null, src), d);
      d.querySelector('form').onsubmit = (e) => { e.preventDefault(); done(ta.value); }; d.querySelectorAll('[data-x]').forEach(b => { b.onclick = () => done(null); });
      d.addEventListener('keydown', e => { if (e.key === 'Escape') done(null); }); });
  }
  function confirmBox(msg) { return askText(msg + ' — type YES to confirm', '').then(v => v != null && /^yes$/i.test(v.trim())); }
  function toast(root, msg, bad) { let t = document.querySelector('.sc-toast'); if (!t) { t = document.createElement('div'); t.className = 'sc-toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); window.addEventListener('hashchange', () => t.remove(), { once: true }); } t.textContent = msg; t.classList.toggle('bad', !!bad); clearTimeout(t._h); t._h = setTimeout(() => t.remove(), 2600); }
  function download(name, text, type) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
  function wire(root, sub) {
    const re = () => page(root, sub); const $ = (s) => root.querySelector(s);
    const tryDo = async (f, ok) => { try { const r = await f(); if (ok) toast(root, ok); re(); return r; } catch (e) { toast(root, e.message || String(e), true); return null; } };
    const me = $('#scme'); me.onchange = async () => { if (me.value === '+') { const n = await askText('Name for the new local profile'); if (n) await tryDo(() => C.switchProfile(C.addProfile({ name: n, handle: n }).id), 'Profile created'); else re(); } else tryDo(() => C.switchProfile(me.value)); };
    const ct = $('#sct'); if (ct) { const n = $('#scn'); ct.oninput = () => { n.textContent = `${ct.value.length} / ${MAXLEN}`; n.classList.toggle('bad', ct.value.length > MAXLEN * 0.95); }; ct.onkeydown = (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); $('#scf').requestSubmit(); } }; }
    const grp = sub.startsWith('group/') ? sub.split('/')[1] : null;
    const cf = $('#scf'); if (cf) { cf.onsubmit = async (e) => { e.preventDefault(); try { const o = await readComposer(root, grp ? { group: grp } : {}); C.post(o); toast(root, o.publishAt > now() ? 'Scheduled' : 'Posted'); re(); } catch (er) { toast(root, er.message, true); } };
      $('#scdr').onclick = async () => { try { const o = await readComposer(root); C.saveDraft({ text: o.text, cw: o.cw, vis: o.vis, poll: o.poll, attach: o.attach }); toast(root, 'Draft saved'); re(); } catch (er) { toast(root, er.message, true); } }; }
    const sf = $('#scs'); if (sf) sf.onsubmit = (e) => { e.preventDefault(); V.q = $('#scq').value.trim(); re(); };
    const dmf = $('#scdm'); if (dmf) dmf.onsubmit = (e) => { e.preventDefault(); const to = [...$('#scdmto').selectedOptions].map(o => o.value); tryDo(() => { const d = C.openDM(to, $('#scdmn').value); location.hash = '#/social/dm/' + d.id; }); };
    const sd = $('#scsend'); if (sd) { const did = sub.split('/')[1]; sd.onsubmit = (e) => { e.preventDefault(); const lr = $('#scmlr') && $('#scmlr').checked ? (() => { const x = JSON.parse(localStorage.getItem('u45.lastResult')); return C.attachCalc({ calc: '#' + x.id + ' ' + x.calc, result: x.result }); })() : null; tryDo(() => C.send(did, $('#scmsg').value, { replyTo: V.replyTo || null, attach: lr })).then(() => { V.replyTo = null; const m = root.querySelector('#scmsg'); if (m) m.focus(); }); }; }
    const gf = $('#scg'); if (gf) gf.onsubmit = (e) => { e.preventDefault(); tryDo(() => C.createGroup({ name: $('#scgn').value, desc: $('#scgd').value, private: $('#scgp').checked }), 'Group created'); };
    const pe = $('#scpe'); if (pe) pe.onsubmit = (e) => { e.preventDefault(); const o = {}; [...pe.elements].forEach(x => { if (x.name) o[x.name] = x.type === 'checkbox' ? x.checked : x.value; }); tryDo(() => C.updateProfile(o), 'Profile saved'); };
    const mw = $('#scmw'); if (mw) mw.onsubmit = (e) => { e.preventDefault(); const v = $('#scmwi').value.trim(); tryDo(() => v.startsWith('#') ? C.muteTag(v) : C.muteWord(v), 'Muted'); };
    ['#scimp', '#scimpm'].forEach(s => { const i = $(s); if (i) i.onchange = () => { const f = i.files[0]; if (!f) return; f.text().then(t => tryDo(() => C.importJSON(t, s === '#scimpm'), 'Imported')); }; });
    root.querySelectorAll('select[data-do], input[data-do]').forEach(el => el.addEventListener('change', () => act(el, el.dataset.do)));
    root.onclick = (e) => { const el = e.target.closest('button[data-do], a[data-do]'); if (!el || el.tagName === 'SELECT') return; if (el.tagName === 'A') e.preventDefault(); act(el, el.dataset.do); };
    async function act(el, d) {
      const pid = (el.closest('[data-id]') || {}).dataset && el.closest('[data-id]') ? el.closest('[data-id]').dataset.id : null;
      const cid = el.closest('[data-c]') && el.closest('[data-c]').dataset.c; const mid = el.closest('[data-m]') && el.closest('[data-m]').dataset.m;
      const did = sub.startsWith('dm/') ? sub.split('/')[1] : null, uidp = sub.startsWith('user/') ? sub.split('/')[1] : null, gid = grp;
      const F = {
        react: () => tryDo(() => C.react(pid, el.dataset.e)), vote: () => tryDo(() => C.vote(pid, +el.dataset.i)), closepoll: () => tryDo(() => C.closePoll(pid), 'Poll closed'),
        bm: () => tryDo(() => ((S.bookmarks[S.me] || []).includes(pid) ? C.unbookmark(pid) : C.bookmark(pid))),
        rp: () => tryDo(() => (Object.values(S.posts).some(p => p.repostOf === pid && p.author === S.me && !p.deleted) ? C.unrepost(pid) : C.repost(pid)), 'Done'),
        qt: async () => { const t = await askText('Quote with your comment'); if (t != null) tryDo(() => C.quote(pid, t), 'Quoted'); },
        cmt: () => { const box = el.closest('.sc-post').querySelector('.sc-cmts'); box.hidden = !box.hidden; if (!box.hidden) { box.innerHTML = commentsHTML(pid, V.csort[pid]); wireComments(box, pid); } },
        hist: () => { const h = C.history(pid); askText('Edit history (read-only)', h.map(x => new Date(x.t).toLocaleString() + ': ' + x.text).join('\n\n')); },
        more: () => { const m = el.closest('.sc-post').querySelector('.sc-more'); const p = S.posts[pid]; const own = p.author === S.me; m.hidden = !m.hidden;
          m.innerHTML = `<div class="xbar">${own ? `<button data-do="pedit2">Edit</button><button data-do="${p.pinned ? 'unpin' : 'pin'}">${p.pinned ? 'Unpin' : 'Pin to profile'}</button><button data-do="del">Delete</button>` : `<button data-do="hide">Hide</button><button data-do="muteu">Mute author</button>`}<button data-do="copy">Copy text</button><button data-do="link">Copy link</button><button data-do="print">Print</button><button data-do="who">Who reacted</button><button data-do="pstats">Stats</button></div>`; },
        pedit2: async () => { const t = await askText('Edit post', S.posts[pid].text); if (t != null) tryDo(() => C.edit(pid, t), 'Edited'); }, pin: () => tryDo(() => C.pin(pid), 'Pinned'), unpin: () => tryDo(() => C.unpin(pid)),
        del: () => tryDo(() => C.trash(pid), 'Moved to trash'), hide: () => tryDo(() => C.hide(pid), 'Hidden'), muteu: () => tryDo(() => C.mute(S.posts[pid].author), 'Muted'),
        copy: () => { try { navigator.clipboard.writeText(C.plain(pid)); toast(root, 'Copied'); } catch (er) { toast(root, 'Clipboard unavailable', true); } },
        link: () => { try { navigator.clipboard.writeText(location.href.split('#')[0] + C.permalink(pid)); toast(root, 'Link copied'); } catch (er) { toast(root, 'Clipboard unavailable', true); } },
        print: () => { const w = window.open('', '_blank'); if (!w) return toast(root, 'Pop-ups blocked', true); w.document.write('<pre style="white-space:pre-wrap;font:16px system-ui">' + esc(C.plain(pid)) + '</pre>'); w.document.close(); w.print(); },
        who: () => { const r = C.reactors(pid); toast(root, r.length ? 'Reacted: ' + r.join(', ') + ' · top ' + C.topReaction(pid) : 'No reactions yet'); },
        pstats: () => { const s = C.stats(pid); toast(root, Object.entries(s).map(([a, b]) => a + ' ' + b).join(' · ')); },
        ftab: () => { V.tab = el.dataset.t; V.page = 0; re(); }, fsort: () => { V.sort = el.value; re(); }, fhas: () => { V.has = el.value; re(); }, moref: () => { V.page++; re(); },
        seed: () => tryDo(() => { if (!C.seed()) throw new Error('demo content is only added to an empty feed'); }, 'Demo content added'), mutetag: () => tryDo(() => C.muteTag(el.dataset.t), 'Tag muted'),
        savesearch: () => tryDo(() => C.saveSearch(V.q), 'Search saved'), runq: () => { V.q = el.dataset.q; if (sub !== 'search') location.hash = '#/social/search'; else re(); }, unsave: () => tryDo(() => C.unsaveSearch(el.dataset.q)), clearrecent: () => tryDo(() => C.clearRecent()),
        ntype: () => { V.ntype = el.value; re(); }, readall: () => tryDo(() => C.readAll()), clearn: () => tryDo(() => C.clearNotifs()), npref: () => tryDo(() => C.notifPref(el.dataset.t, el.checked)), nread: () => { C.readNotif(el.dataset.n); location.hash = el.getAttribute('href'); },
        arch: () => { V.arch = !!el.dataset.v; re(); }, dsearch: () => { const r = C.searchDMs($('#scdq').value); $('#scdr').innerHTML = r.map(x => `<p><a href="#/social/dm/${x.dm}">${md(x.msg.text, $('#scdq').value)}</a></p>`).join('') || '<p class="xnote">No messages match.</p>'; },
        darch: () => tryDo(() => C.archiveDM(did), 'Archived'), dmute: () => tryDo(() => C.muteDM(did)), dren: async () => { const n = await askText('Group chat name', S.dms[did].name); if (n != null) tryDo(() => C.renameDM(did, n)); },
        dadd: () => { if (el.value) tryDo(() => C.addToDM(did, el.value), 'Added'); }, dleave: () => tryDo(() => { C.leaveDM(did); location.hash = '#/social/dms'; }),
        mreact: () => tryDo(() => C.reactMsg(did, mid, el.dataset.e)), mreply: () => { V.replyTo = mid; $('#screp').textContent = 'Replying to: ' + S.dms[did].msgs.find(m => m.id === mid).text.slice(0, 80); $('#scmsg').focus(); },
        medit: async () => { const t = await askText('Edit message', S.dms[did].msgs.find(m => m.id === mid).text); if (t != null) tryDo(() => C.editMsg(did, mid, t)); }, munsend: () => tryDo(() => C.unsendMsg(did, mid)),
        gjoin: () => tryDo(() => C.joinGroup(el.dataset.g), 'Joined (or requested)'), gleave: () => tryDo(() => { C.leaveGroup(gid); location.hash = '#/social/groups'; }),
        gedit: async () => { const t = await askText('Group description', S.groups[gid].desc); if (t != null) tryDo(() => C.editGroup(gid, { desc: t })); }, grule: async () => { const t = await askText('New rule'); if (t) tryDo(() => C.editGroup(gid, { rules: S.groups[gid].rules.concat([t]) })); },
        gok: () => tryDo(() => C.approveJoin(gid, el.dataset.u)), gadmin: () => tryDo(() => C.makeAdmin(gid, el.dataset.u)), gowner: () => tryDo(() => C.transferGroup(gid, el.dataset.u)), gkick: () => tryDo(() => C.kick(gid, el.dataset.u)), gban: () => tryDo(() => C.ban(gid, el.dataset.u)), gdel: () => tryDo(() => C.removeGroupPost(gid, el.dataset.p)),
        coll: () => { V.coll = el.dataset.c || null; re(); }, newcoll: async () => { const n = await askText('Collection name'); if (n) tryDo(() => C.newCollection(n)); }, rencoll: async () => { const n = await askText('New name', S.collections[V.coll].name); if (n) tryDo(() => C.renameCollection(V.coll, n)); },
        delcoll: () => tryDo(() => { C.deleteCollection(V.coll); V.coll = null; }), uncoll: () => tryDo(() => C.removeFromCollection(V.coll, el.dataset.p)), tocoll: () => tryDo(() => C.addToCollection(el.dataset.c, el.dataset.p), 'Added'),
        flist: () => { const ids = el.dataset.w === 'followers' ? C.followers(uidp) : C.following(uidp); $('#scfl').innerHTML = ids.map(x => `<a href="#/social/user/${x}">${av(S.profiles[x])} ${esc((S.profiles[x] || {}).name)}</a>`).join(' · ') || '<span class="xnote">none</span>'; },
        pedit: () => { $('#scpe').hidden = !$('#scpe').hidden; }, follow: () => tryDo(() => C.follow(uidp), 'Following'), unfollow: () => tryDo(() => C.unfollow(uidp)), dmwith: () => tryDo(() => { location.hash = '#/social/dm/' + C.openDM([uidp]).id; }),
        pmute: () => tryDo(() => (isMuted(S.me, uidp) ? C.unmute(uidp) : C.mute(uidp))), pblock: () => tryDo(() => (isBlocked(S.me, uidp) ? C.unblock(uidp) : C.block(uidp))), premove: () => tryDo(() => C.removeFollower(uidp)),
        pclose: () => tryDo(() => C.closeFriend(uidp, !S.closeFriends.some(([a, b]) => a === S.me && b === uidp))), pdel: async () => { if (await confirmBox('Delete this profile and its posts')) tryDo(() => { C.deleteProfile(uidp); location.hash = '#/social'; }); },
        ptab: () => { V.ptab = el.dataset.t; re(); },
        dpub: () => tryDo(() => C.publishDraft(el.closest('[data-d]').dataset.d), 'Published'), ddel: () => tryDo(() => C.deleteDraft(el.closest('[data-d]').dataset.d)),
        empty: async () => { if (await confirmBox('Permanently delete everything in the trash')) tryDo(() => C.emptyTrash()); }, restore: () => tryDo(() => C.restore(pid), 'Restored'), purge: () => tryDo(() => C.purge(pid)),
        export: () => download('u45-social-' + new Date().toISOString().slice(0, 10) + '.json', C.exportJSON(), 'application/json'),
        wipe: async () => { if (await confirmBox('Erase ALL local social data')) tryDo(() => C.wipe(), 'Wiped'); },
        set: () => tryDo(() => C.setting(el.dataset.k, el.type === 'checkbox' ? (el.dataset.inv ? !el.checked : el.checked) : el.type === 'range' ? +el.value : el.value)),
        unmw: () => tryDo(() => C.unmuteWord(el.dataset.w)), unmt: () => tryDo(() => C.unmuteTag(el.dataset.w)), unhideall: () => tryDo(() => { S.hidden.slice().forEach(h => C.unhide(h)); })
      };
      if (F[d]) F[d]();
    }
  }
  function wireComments(box, pid) {
    const re = () => { box.innerHTML = commentsHTML(pid, V.csort[pid]); wireComments(box, pid); };
    const tryC = (f) => { try { f(); re(); } catch (e) { toast(box, e.message, true); } };
    const f = box.querySelector('.sc-cf'); f.onsubmit = (e) => { e.preventDefault(); const v = f.elements.c.value; tryC(() => C.comment(pid, v, V.replyC || null)); V.replyC = null; };
    box.querySelector('select[data-do="csort"]').onchange = (e) => { V.csort[pid] = e.target.value; re(); };
    box.onclick = async (e) => { const el = e.target.closest('button[data-do]'); if (!el) return; e.stopPropagation(); const c = el.closest('[data-c]') && el.closest('[data-c]').dataset.c; const d = el.dataset.do;
      if (d === 'clike') tryC(() => C.likeComment(c)); else if (d === 'cdel') tryC(() => C.deleteComment(c)); else if (d === 'cpin') tryC(() => C.pinComment(c));
      else if (d === 'creply') { V.replyC = c; f.elements.c.placeholder = 'Replying to ' + (S.profiles[S.comments[c].author] || {}).name + '…'; f.elements.c.focus(); }
      else if (d === 'cedit') { const t = await askText('Edit comment', S.comments[c].text); if (t != null) tryC(() => C.editComment(c, t)); } };
  }
  function ready() { if (!readyP) readyP = store.get().then(d => { if (d && d.profiles) S = Object.assign(blank(), d); return C; }).catch(() => C); return readyP; }
  function mount(root, sub) { root.innerHTML = '<p class="xnote">Opening local Social…</p>'; return ready().then(() => page(root, sub)); }
  G.U45Social = { core: C, ready, mount, FEATURES, REACTS, NTYPES, MAXLEN, _reset: () => { S = blank(); } };
})(typeof window !== 'undefined' ? window : globalThis);
