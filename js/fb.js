'use strict';
/* 登入與雲端資料（Firebase）：班級百寶箱、動態牆單機版、後台共用。
   js/cloudcfg.js 的 FB_CONFIG 是 null，或直接雙擊檔案（file://）打開時，什麼都不做：不用登入，資料存在這台電腦的瀏覽器。
   有設定時要先用 Google 帳號登入：
   - 管理者（擁有者和後台加入的管理者）：班級資料存在 Firestore，換電腦登入同一個帳號就是同一份；別台改了，開著的也會跟著變。
   - 觀看者（同事、學生、家長）：只看得到老師開放的動態牆頁面，不能修改；看不到名字和分數。
   Firestore 裡的樣子（規則在 firebase/firestore.rules）：
     config/owner      { email, at }                  擁有者，後台第一次設定時建立，之後不能改
     members/{email}   { role: 'admin'|'viewer', note, at, by }
     d/{key}           { v: JSON 字串, at, by }       班級資料，D 最上層的每個 key 一份
     img/{id}          { url, at }                    圖片（data URL）
     pub/wall          { v: JSON 字串, at }           給觀看者看的動態牆（管理者存檔時順便產生） */

const FB_SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';
const FB_SKIP = ['app', 'v', 'imgs', 'src'];   // 只屬於這個網頁的欄位，不同步
const FB_MAX = 1000000;                        // Firestore 一份文件最多 1 MiB，留一點空間
const FB_ROLE = { owner: '擁有者', admin: '管理者', viewer: '觀看者' };
const fbLower = s => String(s || '').trim().toLowerCase();
const fbBytes = s => new Blob([s]).size;
const fbSleep = ms => new Promise(r => setTimeout(r, ms));
function fbErr(e) {
  const c = (e && e.code) || '';
  return { 'permission-denied': '沒有權限', unavailable: '連不上網路', 'resource-exhausted': '超過今天的免費用量' }[c] || (e && e.message) || String(e);
}
// 圖片太大放不進一份文件時，縮小並轉成 JPEG
async function fbShrink(url, max = 900000) {
  if (!url || url.length <= max) return url;
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
  let w = img.naturalWidth, ht = img.naturalHeight, q = 0.85, out = url;
  for (let n = 0; n < 6 && out.length > max; n++) {
    const k = Math.min(1, Math.sqrt(max / out.length) * 0.92);
    w = Math.max(160, Math.round(w * k)); ht = Math.max(120, Math.round(ht * k));
    const c = document.createElement('canvas'); c.width = w; c.height = ht;
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, w, ht); g.drawImage(img, 0, 0, w, ht);
    out = c.toDataURL('image/jpeg', q); q = Math.max(0.6, q - 0.07);
  }
  return out;
}

const FB = {
  on: typeof FB_CONFIG !== 'undefined' && !!FB_CONFIG && /^https?:$/.test(location.protocol),
  root: './', fns: {}, db: null, auth: null,
  user: null, email: '', role: '', owner: false, started: false,
  ready: false, last: {}, lastPub: null, pending: new Map(), timer: null, pendingView: null,

  /* ---------- 載入、登入、身分 ---------- */
  script(src) {
    return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('載入失敗：' + src)); document.head.append(s); });
  },
  async init() {
    if (this.db) return;
    if (!(window.firebase && firebase.firestore)) for (const f of ['firebase-app-compat.js', 'firebase-auth-compat.js', 'firebase-firestore-compat.js']) await this.script(FB_SDK + f);
    if (!firebase.apps.length) firebase.initializeApp(FB_CONFIG);
    this.auth = firebase.auth(); this.db = firebase.firestore();
    try { await this.db.enablePersistence({ synchronizeTabs: true }); } catch (e) { }   // 離線時先用這台電腦暫存的
  },
  async signIn() {
    const p = new firebase.auth.GoogleAuthProvider();
    p.setCustomParameters({ prompt: 'select_account' });   // 每次都讓人選帳號（公用電腦）
    try { await this.auth.signInWithPopup(p); }
    catch (e) {
      const c = (e && e.code) || '';
      if (c === 'auth/popup-closed-by-user' || c === 'auth/cancelled-popup-request') return;
      Gate.msg(c === 'auth/popup-blocked' ? '瀏覽器擋住了登入視窗：請允許這個網站開啟彈出視窗，再按一次登入。'
        : c === 'auth/unauthorized-domain' ? '這個網址還沒加進 Firebase 的授權網域（Authentication → 設定 → 授權網域）。'
        : '登入失敗：' + fbErr(e));
    }
  },
  // 擁有者看 config/owner；其他人看 members/{email}
  async who(u) {
    const email = fbLower(u.email);
    const o = await this.db.doc('config/owner').get();
    const owner = o.exists ? fbLower(o.data().email) : '';
    if (owner && owner === email) return { role: 'admin', owner: true, ownerSet: true };
    let m = null;
    try { const s = await this.db.doc('members/' + email).get(); if (s.exists) m = s.data(); }
    catch (e) { if (e.code !== 'permission-denied') throw e; }
    return { role: m && (m.role === 'admin' || m.role === 'viewer') ? m.role : '', owner: false, ownerSet: !!owner };
  },
  roleName() { return this.owner ? FB_ROLE.owner : FB_ROLE[this.role] || ''; },
  state(s) {
    if (typeof Cloud !== 'undefined' && Cloud.setState) return Cloud.setState(s);
    setSaveState({ ok: '☁ 已同步', saving: '☁ 儲存中…', error: '⚠ 沒有存到雲端', offline: '⚠ 離線中，連上網路會自動存' }[s] || '');
  },
  busy() {
    const a = document.activeElement;
    return Layers.length > 0 || !!document.querySelector('.wd.dragging') || !!(a && a.closest && a.closest('input, textarea, select, [contenteditable="true"]'));
  },

  /* ---------- 管理者：班級資料同步 ---------- */
  async adminStart() {
    const s = await this.db.collection('d').get(), data = {}, raw = {};
    s.forEach(doc => { const v = doc.data().v; try { data[doc.id] = JSON.parse(v); raw[doc.id] = v; } catch (e) { } });
    try { const p = await this.db.doc('pub/wall').get(); if (p.exists) this.lastPub = p.data().v; } catch (e) { }
    window.save = () => this.save();
    window.saveNow = () => this.flush();
    this.hookImages(true);
    this.fns.admin(data);                        // 由各網頁把資料放進 D、畫出畫面
    Object.assign(this.last, raw); this.ready = true;
    this.openHashPage();
    if (s.empty) this.firstTime(); else this.flush();
    this.db.collection('d').onSnapshot(x => this.onSnap(x), e => this.onErr(e));
    Tick.add(() => this.tryApply());
    window.addEventListener('offline', () => this.state('offline'));
    window.addEventListener('online', () => this.state(this.timer ? 'saving' : 'ok'));
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') this.flush(); });
  },
  // 從後台「打開編輯」連過來時（網址後面 #page=頁面編號），直接打開那一頁
  openHashPage() {
    const m = /[#&]page=([\w-]+)/.exec(location.hash);
    if (!m || !D.wall || !D.wall.pages.some(p => p.id === m[1])) return;
    D.wall.cur = m[1];
    history.replaceState(null, '', location.pathname + location.search);
    if (Wall.isOpen()) Wall.draw(); else Wall.open();
  },
  save() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), 700);
    this.state('saving');
  },
  // 只寫有改過的部分；觀看者看的 pub/wall 也一起更新
  flush() {
    clearTimeout(this.timer); this.timer = null;
    if (!this.ready || !D) return;
    const b = this.db.batch(), done = [], big = [], at = Date.now();
    for (const k of Object.keys(D)) {
      if (FB_SKIP.includes(k)) continue;
      const v = JSON.stringify(D[k]);
      if (v === undefined || v === this.last[k]) continue;
      if (v.length > 300000 && fbBytes(v) > FB_MAX) { big.push(k); continue; }
      b.set(this.db.doc('d/' + k), { v, at, by: this.email });
      done.push([k, this.last[k]]); this.last[k] = v;
    }
    const pv = JSON.stringify(this.buildPub(D)), pubPrev = this.lastPub;
    if (pv !== this.lastPub && fbBytes(pv) <= FB_MAX) { b.set(this.db.doc('pub/wall'), { v: pv, at }); this.lastPub = pv; done.push(['@pub', pubPrev]); }
    if (big.length) toast('資料太多，存不進雲端（' + big.join('、') + '）：請刪掉一些舊資料或動態牆頁面。', { ms: 9000 });
    if (!done.length) { this.state(big.length ? 'error' : navigator.onLine === false ? 'offline' : 'ok'); return; }
    this.state(navigator.onLine === false ? 'offline' : 'saving');
    b.commit().then(() => { if (!this.timer) this.state('ok'); }, e => {
      for (const [k, prev] of done) { if (k === '@pub') this.lastPub = prev; else this.last[k] = prev; }   // 下次存檔再試
      this.state('error');
      toast('沒有存到雲端：' + fbErr(e), { ms: 8000 });
    });
  },
  // 收到別台電腦的修改
  onSnap(s) {
    for (const ch of s.docChanges()) {
      const d = ch.doc, k = d.id;
      if (ch.type === 'removed' || d.metadata.hasPendingWrites || FB_SKIP.includes(k)) continue;
      const v = d.data().v;
      if (typeof v === 'string' && v !== this.last[k]) this.pending.set(k, v);
    }
    this.tryApply();
  },
  // 正在拖曳、打字或開著視窗時先不換，免得改到一半被蓋掉
  tryApply() {
    if (!this.pending.size || this.busy()) return;
    const def = defaultData();
    let n = 0;
    for (const [k, v] of this.pending) {
      this.pending.delete(k);
      if (D[k] !== undefined && JSON.stringify(D[k]) !== this.last[k]) continue;   // 這台改了還沒存：用這台的
      let o; try { o = JSON.parse(v); } catch (e) { continue; }
      const dk = def[k];
      if (dk && typeof dk === 'object' && !Array.isArray(dk) && o && typeof o === 'object' && !Array.isArray(o)) fillDefaults(o, dk);
      D[k] = o; this.last[k] = v; n++;
    }
    if (!n) return;
    refresh();
    if (document.getElementById('top') && Wall.isOpen()) Wall.draw();
  },
  onErr(e) {
    if (e && e.code === 'permission-denied') { toast('你的帳號已經沒有修改的權限，重新整理網頁…', { ms: 4000 }); setTimeout(() => location.reload(), 3000); return; }
    this.state('error');
    toast('雲端同步中斷了（' + fbErr(e) + '），請重新整理網頁。', { ms: 10000 });
  },
  // 雲端還沒有資料：問要不要把這台電腦瀏覽器裡的資料放上去
  firstTime() {
    const read = k => { try { const o = JSON.parse(localStorage.getItem(k) || 'null'); return o && typeof o === 'object' ? o : null; } catch (e) { return null; } };
    const local = read(LS_KEY) || read('cwall-local');
    const ns = local && Array.isArray(local.students) ? local.students.length : 0, np = local && local.wall && Array.isArray(local.wall.pages) ? local.wall.pages.length : 0;
    if (!ns && !np) {
      this.flush();
      toast('雲端還沒有班級資料。可以到 ⚙ 設定 → 資料 → 匯入備份檔，把原本的資料帶進來。', { ms: 10000 });
      return;
    }
    modal('把這台電腦的資料放到雲端？', c => {
      c.body.append(h('p', null, '雲端還沒有班級資料。這台電腦的瀏覽器裡有 ', h('b', null, '同學 ' + ns + ' 位、動態牆 ' + np + ' 頁'), '。要放到雲端嗎？之後在任何電腦用這個帳號登入都看得到。'),
        h('p', { class: 'muted small' }, '選「從空白開始」也沒關係，之後還可以用 ⚙ 設定 → 資料 → 匯入備份檔 帶進來。'));
      c.foot.append(h('button', { class: 'btn', onclick: () => { c.close(); this.flush(); } }, '從空白開始'),
        h('button', { class: 'btn pri', onclick: () => { c.close(); this.upload(local); } }, '☁ 放到雲端'));
    }, { sticky: true });
  },
  async upload(local) {
    if (local.app === '班級百寶箱') { D = fillDefaults(local, defaultData()); rollDay(); }
    else for (const k of ['wall', 'students', 'att', 'sched', 'board', 'timerTitles', 'clockNotes']) if (local[k] != null) D[k] = local[k];
    if (local.info && local.info.className) D.info.className = local.info.className;
    this.flush(); refresh();
    if (Wall.isOpen()) Wall.draw();
    let n = 0;
    try {
      const imgs = await this.allLocal();
      for (const [id, url] of Object.entries(imgs)) { await this.db.doc('img/' + id).set({ url: await fbShrink(url), at: Date.now() }); n++; }
    } catch (e) { toast('有些圖片沒有放上雲端：' + fbErr(e)); }
    toast('已經放到雲端' + (n ? '（含 ' + n + ' 張圖片）' : ''), { ms: 6000 });
  },

  /* ---------- 圖片：雲端一份，這台電腦的 IndexedDB 當暫存 ---------- */
  putLocal: (id, url) => ImgDB.run('readwrite', st => st.put(url, id)),
  getLocal: id => ImgDB.run('readonly', st => st.get(id)),
  allLocal: null,
  hookImages(admin) {
    const all0 = ImgDB.all.bind(ImgDB);
    this.allLocal = () => all0().catch(() => ({}));
    ImgDB.get = async id => {
      let u = null;
      try { u = await this.getLocal(id); } catch (e) { }
      if (u) return u;
      try { const s = await this.db.doc('img/' + id).get(); if (s.exists) { u = s.data().url; this.putLocal(id, u).catch(() => { }); } } catch (e) { }
      return u || null;
    };
    if (!admin) return;
    ImgDB.put = async (id, url) => {
      url = await fbShrink(url);
      await this.putLocal(id, url);
      this.db.doc('img/' + id).set({ url, at: Date.now() }).catch(e => toast('圖片沒有存到雲端：' + fbErr(e)));
    };
    // 匯出備份檔時，雲端的圖片也要帶上
    ImgDB.all = async () => {
      const out = await this.allLocal();
      try { const s = await this.db.collection('img').get(); s.forEach(d => { out[d.id] = d.data().url; }); } catch (e) { }
      return out;
    };
  },

  /* ---------- 給觀看者看的動態牆 ---------- */
  // 只放開放的頁面和畫動態牆用得到的資料；同學只給座號（沒有名字、分數）
  buildPub(o) {
    const t = dateKey(), W = o.wall || {}, pages = (W.pages || []).filter(p => !p.hide);
    const start = pages.find(p => p.id === W.viewStart) || pages[0];
    const L = (o.students || []).slice().sort((a, b) => a.no - b.no), A = (o.att && o.att[t]) || {}, att = {};
    const students = L.map((s, i) => ({ id: 'v' + i, no: s.no, name: '' }));
    L.forEach((s, i) => { if (A[s.id]) (att[t] = att[t] || {})['v' + i] = A[s.id]; });   // 應到實到、值日生輪到誰要用
    const info = {};
    for (const k of ['className', 'attPos', 'boardFont', 'boardSmall', 'sound']) if (o.info && o.info[k] !== undefined) info[k] = o.info[k];
    return {
      pages, cur: start ? start.id : null, students, att, info,
      board: o.board ? Object.assign({}, o.board, { saved: [] }) : null,
      sched: o.sched || null, timerTitles: o.timerTitles || null, clockNotes: o.clockNotes || null
    };
  },
  async viewerStart() {
    const ref = this.db.doc('pub/wall'), s = await ref.get();
    window.save = () => { }; window.saveNow = () => { };
    this.hookImages(false);
    this.patchWall();
    this.view(s.exists ? s.data().v : null);
    ref.onSnapshot(x => { if (x.exists && x.data().v !== this.lastPub) this.pendingView = x.data().v; }, e => this.onErr(e));
    Tick.add(() => { if (this.pendingView && !this.busy()) { const v = this.pendingView; this.pendingView = null; this.view(v); } });
  },
  view(v) {
    this.lastPub = v;
    let P = null; try { P = v ? JSON.parse(v) : null; } catch (e) { }
    const cur = D && D.wall && D.wall.cur;
    D = defaultData();
    if (P) {
      for (const k of ['students', 'att', 'board', 'sched', 'timerTitles', 'clockNotes']) if (P[k] != null) D[k] = P[k];
      Object.assign(D.info, P.info || {});
      const pages = P.pages || [];
      D.wall = { cur: pages.some(p => p.id === cur) ? cur : P.cur, pages, locked: true, viewStart: null };
    }
    D.wall.locked = true;
    if (!D.wall.pages.length) return Gate.show('empty');
    Gate.hide();
    if (Wall.isOpen()) Wall.draw(); else Wall.open();
  },
  // 觀看者：版面鎖住，只留換頁和全螢幕
  patchWall() {
    const draw0 = Wall.draw;
    Wall.draw = function () {
      D.wall.locked = true;
      draw0.call(this);
      const top = this.root.querySelector('.w-top');
      if (top) top.replaceChildren(h('span', { class: 'wbtn fb-cls' }, D.info.className || '動態牆'), h('span', { class: 'grow' }), h('button', { class: 'wbtn', onclick: () => toggleFull() }, '⛶ 全螢幕'));
      this.root.querySelector('.w-nav [title="新增一頁"]')?.remove();
      this.root.querySelectorAll('.wd-bar, .wd-rs').forEach(e => e.remove());
    };
    Wall.select = function () { this.sel = null; if (this.panel) this.panel.hidden = true; };
    Wall.pageMenu = function () {
      const P = this.page();
      const m = modal('換頁', c => c.body.append(h('div', { class: 'reasons' }, D.wall.pages.map((p, i) => h('button', { class: 'chip' + (p === P ? ' on' : ''), onclick: () => { m.close(); this.go(i); } }, (i + 1) + '. ' + p.name)))));
    };
    Wall.close = function () { };
    Wall.templates = function () { };
  },

  /* ---------- 帳號按鈕、登出 ---------- */
  mountAcct() {
    const open = () => this.acctMenu(), top = document.getElementById('top');
    if (top && !document.getElementById('btnAcct')) {
      const b = h('button', { id: 'btnAcct', class: 'tbtn', title: '帳號：' + this.email, onclick: open }, '👤 ' + this.roleName());
      const set = document.getElementById('btnSet'); set ? set.before(b) : top.append(b);
    }
    if (!document.getElementById('fbAcct')) document.body.append(h('button', { id: 'fbAcct', title: '帳號：' + this.email + '（' + this.roleName() + '）', onclick: open }, '👤'));
    if (!top) document.body.classList.add('fb-solo');
  },
  acctMenu() {
    const admin = this.role === 'admin';
    modal('帳號', c => {
      c.body.append(h('p', null, '登入帳號：', h('b', null, this.email)),
        h('p', null, '身分：', h('b', null, this.roleName()), admin ? '（可以修改班級資料，也可以進後台）' : '（只能看老師開放的動態牆頁面）'),
        h('div', { class: 'row wrap' },
          admin ? h('a', { class: 'btn pri', href: this.root + 'admin/' }, '🛠 後台管理') : null,
          admin ? h('a', { class: 'btn', href: this.root }, '🧰 班級百寶箱') : null,
          h('a', { class: 'btn', href: this.root + 'wall/' }, '🖼 動態牆')),
        h('p', { class: 'muted small' }, '在公用電腦用完請登出：登出時會清掉這台電腦暫存的班級資料。'));
      c.foot.append(h('button', { class: 'btn', onclick: () => c.close() }, '關閉'), h('button', { class: 'btn danger', onclick: () => { c.close(); this.logout(); } }, '登出'));
    });
  },
  async logout() {
    if (this.role === 'admin' && this.ready) {
      this.flush();
      const ok = await Promise.race([this.db.waitForPendingWrites().then(() => true, () => true), fbSleep(5000).then(() => false)]);
      if (!ok && !await ask('還有修改沒有傳到雲端（可能是網路斷了）。現在登出，這些修改會不見。確定要登出嗎？', '還是登出', { danger: true })) return;
    }
    Gate.show('loading', '正在登出…');
    try { await this.auth.signOut(); } catch (e) { }
    try { await this.db.terminate(); await this.db.clearPersistence(); } catch (e) { }
    try { (await ImgDB.open()).close(); } catch (e) { }
    await new Promise(r => { const q = indexedDB.deleteDatabase('bxbox-img'); q.onsuccess = q.onerror = q.onblocked = r; });
    location.reload();
  }
};

/* ---------- 登入畫面 ---------- */
const Gate = {
  el: null,
  // fns：{ local, admin(data), root, title, icon }；沒有設定 Firebase 就直接跑 local
  run(fns) {
    if (!FB.on) return fns.local();
    FB.fns = fns; FB.root = fns.root || './';
    this.css(); this.show('loading');
    FB.init().then(() => FB.auth.onAuthStateChanged(u => this.onUser(u)), () => this.show('error', '登入服務載入失敗，請檢查網路，再重新整理網頁。'));
  },
  async onUser(u) {
    if (FB.started) { if (!u || fbLower(u.email) !== FB.email) location.reload(); return; }   // 別的分頁登出或換帳號
    if (!u) return this.show('login');
    this.show('loading', '正在確認你的身分…');
    try {
      const w = await FB.who(u);
      FB.user = u; FB.email = fbLower(u.email); FB.role = w.role; FB.owner = w.owner;
      if (!w.role) return this.show(w.ownerSet ? 'denied' : 'noowner');
      FB.started = true;
      if (w.role === 'admin') { await FB.adminStart(); this.hide(); }
      else await FB.viewerStart();
      FB.mountAcct();
    } catch (e) { this.show('error', '讀不到雲端資料（' + fbErr(e) + '），請重新整理網頁。'); }
  },
  css() {
    if (document.getElementById('fbStyle')) return;
    document.head.append(h('style', { id: 'fbStyle' }, `
#fbGate { position: fixed; inset: 0; z-index: 450; display: flex; align-items: center; justify-content: center; padding: 20px; background: radial-gradient(circle at 30% 20%, #fffaf0, #efe6d5); color: #25313b; font: 16px/1.6 "Microsoft JhengHei UI", "Microsoft JhengHei", "PingFang TC", "Noto Sans TC", system-ui, sans-serif; overflow: auto; }
.fbg-card { background: #fffdf8; border: 1px solid #e0d6c4; border-radius: 22px; box-shadow: 0 12px 40px rgba(40, 30, 10, .16); padding: 26px 28px; width: min(460px, 100%); text-align: center; }
.fbg-logo { font-size: 54px; line-height: 1.1; }
.fbg-card h1 { font-family: "LXGW WenKai TC", "標楷體", "DFKai-SB", serif; font-size: 28px; margin: 6px 0 12px; }
.fbg-card .btn.big { margin: 10px 0 6px; }
.fbg-btns { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; margin-top: 12px; }
.fbg-who { background: #f6f0e4; border-radius: 10px; padding: 6px 10px; word-break: break-all; }
.fbg-msg { color: #b8321f; font-weight: 700; }
.fbg-spin { width: 34px; height: 34px; margin: 12px auto 4px; border-radius: 50%; border: 4px solid #e0d6c4; border-top-color: #1f8a70; animation: fbspin 1s linear infinite; }
@keyframes fbspin { to { transform: rotate(360deg); } }
#fbGate a.btn, .ov a.btn { text-decoration: none; display: inline-block; }
#fbAcct { display: none; position: fixed; left: 10px; bottom: 10px; z-index: 60; width: 42px; height: 42px; border-radius: 50%; border: 1px solid rgba(0, 0, 0, .15); background: rgba(255, 255, 255, .95); box-shadow: 0 2px 8px rgba(0, 0, 0, .2); font-size: 20px; cursor: pointer; align-items: center; justify-content: center; padding: 0; }
body.wall-open #fbAcct, body.fb-solo #fbAcct { display: flex; }
.wbtn.fb-cls { cursor: default; font-weight: 700; }`));
  },
  show(kind, msg) {
    if (!this.el) { this.el = h('div', { id: 'fbGate' }); document.body.append(this.el); }
    const btn = (t, fn, cls = '') => h('button', { class: 'btn ' + cls, onclick: fn }, t);
    const who = () => h('p', { class: 'fbg-who' }, '目前登入：' + ((FB.auth && FB.auth.currentUser && FB.auth.currentUser.email) || ''));
    const other = () => btn('換一個帳號登入', () => FB.signIn());
    const card = h('div', { class: 'fbg-card' }, h('div', { class: 'fbg-logo' }, FB.fns.icon || '🧰'), h('h1', null, FB.fns.title || document.title));
    if (kind === 'loading') card.append(h('div', { class: 'fbg-spin' }), h('p', { class: 'muted' }, msg || '正在連線…'));
    else if (kind === 'login') card.append(h('p', null, '要先登入才能看。'), btn('🔑 用 Google 帳號登入', () => FB.signIn(), 'pri big'),
      h('p', { class: 'muted small' }, '老師在後台加入的帳號才看得到內容。'));
    else if (kind === 'denied') card.append(who(), h('p', null, '這個帳號還沒有權限。請老師到後台把你的 email 加進來，加好之後重新整理這個網頁。'),
      h('div', { class: 'fbg-btns' }, other(), btn('重新整理', () => location.reload(), 'pri')));
    else if (kind === 'noowner') card.append(who(), h('p', null, '還沒有完成第一次設定：請老師先到後台，把自己的帳號設成擁有者。'),
      h('div', { class: 'fbg-btns' }, other(), h('a', { class: 'btn pri', href: FB.root + 'admin/' }, '🛠 到後台設定')));
    else if (kind === 'empty') card.append(who(), h('p', null, '老師還沒有開放動態牆的頁面，晚一點再來看看。'),
      h('div', { class: 'fbg-btns' }, btn('登出', () => FB.logout())));
    else card.append(h('p', null, msg || '發生錯誤'), btn('重新整理', () => location.reload(), 'pri'));
    card.append(h('p', { class: 'fbg-msg', hidden: true }));
    this.el.replaceChildren(card);
  },
  hide() {
    if (this.el) { this.el.remove(); this.el = null; }
    const v = document.getElementById('veil'); if (v) v.hidden = true;
  },
  msg(t) {
    const m = this.el && this.el.querySelector('.fbg-msg');
    if (m) { m.textContent = t; m.hidden = false; } else toast(t, { ms: 8000 });
  }
};
