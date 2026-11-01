'use strict';
/* 班級百寶箱後台：帳號管理、動態牆內容、資料備份。要用擁有者或管理者的 Google 帳號登入（登入與資料的做法見 js/fb.js）。 */

const ICONS = { clock: '🕘', exam: '📝', timer: '⏳', text: '🔤', sched: '📅', att: '🧮', board: '📒', weather: '🌤️', traffic: '🚦', work: '🤫', random: '🎯', dice: '🎲', countdown: '📆', sound: '🔉', image: '🖼️', embed: '📺' };
const BG = { paper: '#f5efe2', sky: 'linear-gradient(180deg,#8ec5ff,#e3f2ff)', mint: 'linear-gradient(135deg,#d6f5de,#8fd8c6)', sunset: 'linear-gradient(135deg,#ffd29e,#ff9190)', lavender: 'linear-gradient(135deg,#e7ddff,#a9bcff)', grid: '#fdfcf8', chalk: '#2f4542', cork: '#c79a63', night: 'linear-gradient(180deg,#1b2440,#3b4d7c)', white: '#fff' };
const A = { tab: 'members', owner: '', members: [], d: {}, raw: {}, later: false, filter: '' };
const appURL = p => new URL('../' + p, location.href).href;

/* ---------- 登入 ---------- */
function card(...kids) {
  Gate.css(); Gate.show('loading');
  Gate.el.replaceChildren(h('div', { class: 'fbg-card' }, h('div', { class: 'fbg-logo' }, '🛠'), h('h1', null, '班級百寶箱後台'), ...kids, h('p', { class: 'fbg-msg', hidden: true })));
}
const whoLine = () => h('p', { class: 'fbg-who' }, '目前登入：' + FB.email);
const otherBtn = () => h('button', { class: 'btn', onclick: () => FB.signIn() }, '換一個帳號登入');

function start() {
  FB.fns = { title: '班級百寶箱後台', icon: '🛠' }; FB.root = '../';
  if (!FB.on) {
    card(h('p', null, location.protocol === 'file:' ? '後台要從網址打開（GitHub 網頁），直接雙擊檔案不能用。' : '還沒有設定 Firebase，所以不用登入，也沒有後台可以管理。'),
      h('p', { class: 'muted small' }, '設定方法：在 Firebase 建好專案後，把 firebaseConfig 貼到 js/cloudcfg.js，再發布到 GitHub。'),
      h('div', { class: 'fbg-btns' }, h('a', { class: 'btn pri', href: '../' }, '🧰 回班級百寶箱')));
    return;
  }
  Gate.css(); Gate.show('loading');
  FB.init().then(() => FB.auth.onAuthStateChanged(onUser), () => Gate.show('error', '登入服務載入失敗，請檢查網路，再重新整理網頁。'));
}
async function onUser(u) {
  if (FB.started) { if (!u || fbLower(u.email) !== FB.email) location.reload(); return; }
  if (!u) return Gate.show('login');
  Gate.show('loading', '正在確認你的身分…');
  let w;
  try { w = await FB.who(u); } catch (e) { return Gate.show('error', '讀不到雲端資料（' + fbErr(e) + '），請檢查 Firestore 規則有沒有發布。'); }
  FB.user = u; FB.email = fbLower(u.email); FB.role = w.role; FB.owner = w.owner;
  if (!w.ownerSet) return claim();
  if (w.role !== 'admin') return card(whoLine(),
    h('p', null, w.role === 'viewer' ? '這個帳號是觀看者，只能看動態牆，不能進後台。' : '這個帳號沒有權限進後台。請擁有者把你加成管理者。'),
    h('div', { class: 'fbg-btns' }, otherBtn(), w.role === 'viewer' ? h('a', { class: 'btn pri', href: '../wall/' }, '🖼 看動態牆') : null));
  FB.started = true; Gate.hide(); main();
}
// 第一次設定：把目前登入的帳號設成擁有者（規則只允許建立一次）
function claim() {
  card(whoLine(), h('h2', null, '第一次設定'),
    h('p', null, '把這個帳號設成「擁有者」：可以修改班級資料、管理所有帳號，而且不會被別的管理者移除。'),
    h('p', { class: 'muted small' }, '請用你平常要用的 Google 帳號。設好之後就不能在這裡改，要換人只能到 Firebase 主控台處理。'),
    h('div', { class: 'fbg-btns' }, otherBtn(), h('button', { class: 'btn pri', onclick: async () => {
      try { await FB.db.doc('config/owner').set({ email: FB.email, at: Date.now() }); location.reload(); }
      catch (e) { Gate.msg('設定失敗（' + fbErr(e) + '）：可能別人已經先設好了，請重新整理。'); }
    } }, '✅ 設成擁有者')));
}

/* ---------- 主畫面 ---------- */
function main() {
  FB.db.doc('config/owner').get().then(s => { A.owner = s.exists ? fbLower(s.data().email) : ''; draw(); });
  FB.db.collection('members').onSnapshot(s => {
    A.members = s.docs.map(d => Object.assign({ email: d.id }, d.data())).sort((a, b) => (a.role === b.role ? 0 : a.role === 'admin' ? -1 : 1) || a.email.localeCompare(b.email));
    if (A.tab === 'members') redraw();
  }, e => toast('讀不到帳號名單：' + fbErr(e)));
  FB.db.collection('d').onSnapshot(s => {
    for (const ch of s.docChanges()) {
      const v = ch.doc.data().v;
      if (ch.type === 'removed') { delete A.d[ch.doc.id]; delete A.raw[ch.doc.id]; continue; }
      try { A.d[ch.doc.id] = JSON.parse(v); A.raw[ch.doc.id] = v; } catch (e) { }
    }
    if (A.tab !== 'members') redraw();
  }, e => toast('讀不到班級資料：' + fbErr(e)));
  document.addEventListener('focusout', () => setTimeout(() => { if (A.later) redraw(); }, 0));
  draw();
}
// 正在打字時先不重畫，免得打到一半被換掉
function redraw() {
  const a = document.activeElement;
  if (a && a.closest && a.closest('#pane') && a.matches('input, textarea, select')) { A.later = true; return; }
  A.later = false; draw();
}
function draw() {
  const app = document.getElementById('app');
  const cls = (A.d.info && A.d.info.className) || '';
  const tab = (k, t) => h('button', { class: A.tab === k ? 'on' : '', onclick: () => { A.tab = k; draw(); } }, t);
  app.replaceChildren(
    h('header', { class: 'adm-top' }, h('h1', null, '🛠 後台管理'), cls ? h('span', { class: 'chip-top plain' }, cls) : null, h('span', { class: 'grow' }),
      h('a', { class: 'btn sm', href: '../' }, '🧰 班級百寶箱'), h('a', { class: 'btn sm', href: '../wall/' }, '🖼 動態牆'),
      h('span', { class: 'who' }, '👤 ' + FB.email + '（' + FB.roleName() + '）'),
      h('button', { class: 'btn sm danger', onclick: () => FB.logout() }, '登出')),
    h('div', { class: 'adm-main' },
      h('div', { class: 'tabs' }, tab('members', '👥 帳號管理'), tab('wall', '🖼 動態牆內容'), tab('data', '💾 資料')),
      h('div', { id: 'pane' }, A.tab === 'members' ? members() : A.tab === 'wall' ? wallPane() : dataPane())));
}

/* ---------- 帳號管理 ---------- */
function members() {
  const nA = A.members.filter(m => m.role === 'admin').length, nV = A.members.length - nA;
  let role = 'viewer';
  const ta = h('textarea', { class: 'inp', id: 'addEmails', placeholder: '一行一個 email，可以一次貼很多個\n例如：\nparent01@gmail.com\nteacher@tcps.tn.edu.tw' });
  const note = h('input', { class: 'inp', id: 'addNote', placeholder: '備註，例如：四甲家長、科任老師' });
  const seg = h('div', { class: 'seg' });
  const drawSeg = () => seg.replaceChildren(...[['viewer', '👀 觀看者'], ['admin', '🛠 管理者']].map(([k, t]) => h('button', { class: role === k ? 'on' : '', onclick: () => { role = k; drawSeg(); } }, t)));
  drawSeg();
  const q = A.filter.trim().toLowerCase();
  const list = A.members.filter(m => !q || m.email.includes(q) || String(m.note || '').toLowerCase().includes(q));
  return [
    h('div', { class: 'adm-note' }, h('b', null, '誰可以登入'), h('ul', null,
      h('li', null, h('b', null, '管理者'), '：可以修改班級百寶箱和動態牆，也可以進後台。'),
      h('li', null, h('b', null, '觀看者'), '：只能看動態牆上開放的頁面（看不到名字和分數），不能修改。適合同事、學生、家長。'),
      h('li', null, '對方用 Google 帳號登入（Gmail 或學校帳號都可以），email 要和這裡加的一樣。'))),
    h('div', { class: 'adm-card' }, h('h2', null, '加入帳號'),
      h('div', { class: 'adm-add' }, ta, h('div', null,
        h('div', { class: 'lbl' }, '身分'), seg,
        h('div', { class: 'lbl' }, '備註（可以不填）'), note,
        h('div', { class: 'row' }, h('button', { class: 'btn pri', onclick: async e => { e.target.disabled = true; await addMembers(ta.value, role, note.value); e.target.disabled = false; } }, '＋ 加入'))))),
    h('div', { class: 'adm-card' }, h('h2', null, '帳號名單（管理者 ' + nA + ' 位、觀看者 ' + nV + ' 位）'),
      A.members.length > 8 ? h('input', { class: 'inp', id: 'memFilter', placeholder: '🔍 找 email 或備註', value: A.filter, oninput: e => { A.filter = e.target.value; const p = document.getElementById('pane'); p.replaceChildren(...members()); const f = document.getElementById('memFilter'); f.focus(); f.setSelectionRange(f.value.length, f.value.length); } }) : null,
      h('div', { class: 'tblwrap' }, h('table', { class: 'tbl mem-tbl' },
        h('thead', null, h('tr', null, h('th', null, 'email'), h('th', null, '備註'), h('th', null, '身分'), h('th', null, '加入日期'), h('th', null, ''))),
        h('tbody', null,
          A.owner ? h('tr', null, h('td', { class: 'e' }, h('b', null, A.owner)), h('td', null, ''), h('td', null, h('span', { class: 'role admin' }, '擁有者')), h('td', null, ''), h('td', null, '')) : null,
          list.map(m => h('tr', null,
            h('td', { class: 'e' }, m.email + (m.email === FB.email ? '（你）' : '')),
            h('td', null, h('input', { class: 'inp', value: m.note || '', 'aria-label': m.email + ' 的備註', onchange: e => setMember(m.email, { note: e.target.value.trim() }) })),
            h('td', null, h('select', { class: 'inp', 'aria-label': m.email + ' 的身分', onchange: e => setMember(m.email, { role: e.target.value }) },
              h('option', { value: 'viewer', selected: m.role !== 'admin' }, '👀 觀看者'), h('option', { value: 'admin', selected: m.role === 'admin' }, '🛠 管理者'))),
            h('td', null, m.at ? fmtMD(new Date(m.at)) : ''),
            h('td', null, h('button', { class: 'btn sm danger', onclick: () => delMember(m.email) }, '移除')))),
          !A.members.length ? h('tr', null, h('td', { colspan: 5, class: 'muted' }, '還沒有加入任何帳號。')) : null))))
  ];
}
async function addMembers(text, role, note) {
  const all = [...new Set(String(text).split(/[\s,;，；、]+/).map(fbLower).filter(Boolean))];
  const bad = all.filter(e => !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)), ok = all.filter(e => !bad.includes(e) && e !== A.owner);
  if (!ok.length) return toast(bad.length ? '看不懂這些 email：' + bad.join('、') : '請先輸入 email');
  try {
    for (let i = 0; i < ok.length; i += 400) {
      const b = FB.db.batch();
      for (const e of ok.slice(i, i + 400)) {
        const old = A.members.find(m => m.email === e);
        b.set(FB.db.doc('members/' + e), old ? { role, note: note.trim() || old.note || '', at: old.at || Date.now(), by: FB.email } : { role, note: note.trim(), at: Date.now(), by: FB.email });
      }
      await b.commit();
    }
    const ta = document.getElementById('addEmails'); if (ta) ta.value = '';
    toast('已加入 ' + ok.length + ' 個帳號（' + (role === 'admin' ? '管理者' : '觀看者') + '）' + (bad.length ? '；這些看不懂：' + bad.join('、') : ''), { ms: 7000 });
  } catch (e) { toast('沒有加成功：' + fbErr(e)); }
}
async function setMember(email, patch) {
  try { await FB.db.doc('members/' + email).set(patch, { merge: true }); toast('已更新 ' + email); }
  catch (e) { toast('沒有改成功：' + fbErr(e)); redraw(); }
}
async function delMember(email) {
  const self = email === FB.email;
  if (!await ask((self ? '這是你自己的帳號，移除後就不能再進後台。' : '') + '確定要移除 ' + email + ' 嗎？移除後這個帳號就看不到了。', '移除', { danger: true })) return;
  try { await FB.db.doc('members/' + email).delete(); toast('已移除 ' + email); }
  catch (e) { toast('沒有移除成功：' + fbErr(e)); }
}

/* ---------- 動態牆內容 ---------- */
function wallPane() {
  const W = A.d.wall;
  if (!W || !W.pages || !W.pages.length) return [h('div', { class: 'adm-card' }, h('h2', null, '還沒有動態牆'),
    h('p', null, '先到班級百寶箱（工具列的「牆」）或動態牆新增頁面，這裡就會出現。'),
    h('div', { class: 'row wrap' }, h('a', { class: 'btn pri', href: '../wall/' }, '🖼 打開動態牆'), h('a', { class: 'btn', href: '../' }, '🧰 打開班級百寶箱')))];
  const open = W.pages.filter(p => !p.hide), url = appURL('wall/');
  return [
    h('div', { class: 'adm-note' }, h('b', null, '觀看者看得到哪些頁面'), h('ul', null,
      h('li', null, '打勾「觀看者看得到」的頁面，觀看者登入後就看得到（不能修改，看不到名字和分數）。'),
      h('li', null, '在這裡改的會馬上同步到開著的班級百寶箱和動態牆。要改小工具和版面，按「✏️ 編輯」。'))),
    h('div', { class: 'adm-card' },
      h('div', { class: 'row wrap' }, h('b', null, '觀看者打開時先看：'),
        h('select', { class: 'inp', 'aria-label': '觀看者打開時先看的頁面', onchange: e => edit(w => { w.viewStart = e.target.value || null; }, '已設定') },
          h('option', { value: '' }, '第一個開放的頁面'),
          open.map(p => h('option', { value: p.id, selected: W.viewStart === p.id }, p.name))),
        h('span', { class: 'muted' }, '開放 ' + open.length + '／' + W.pages.length + ' 頁')),
      h('div', { class: 'urlbox' }, '給觀看者的網址：', h('code', null, url),
        h('button', { class: 'btn sm', onclick: () => navigator.clipboard.writeText(url).then(() => toast('已複製網址'), () => toast('沒辦法複製，請自己選取網址')) }, '📋 複製'))),
    h('div', { class: 'pg-grid' }, W.pages.map((p, i) => pageCard(W, p, i)))
  ];
}
function preview(p) {
  const bg = p.bg || {}, box = h('div', { class: 'pg-prev' });
  box.style.background = bg.type === 'color' ? bg.v : bg.type === 'image' ? '#555' : BG[bg.v] || BG.paper;
  for (const w of p.widgets || []) {
    const r = h('i', { title: w.type }, ICONS[w.type] || '▫️');
    Object.assign(r.style, { left: w.x + '%', top: w.y + '%', width: w.w + '%', height: w.h + '%', zIndex: w.z || 1 });
    box.append(r);
  }
  return box;
}
function pageCard(W, p, i) {
  const n = W.pages.length, pv = preview(p);
  pv.prepend(h('span', { class: 'pg-no' }, (i + 1) + (W.cur === p.id ? '　（目前這頁）' : '')));
  return h('div', { class: 'pg' + (p.hide ? ' off' : '') }, pv,
    h('input', { class: 'inp', value: p.name, 'aria-label': '第 ' + (i + 1) + ' 頁的名稱', onchange: e => edit(w => { w.pages[i].name = e.target.value.trim() || '未命名'; }, '已改名') }),
    h('div', { class: 'muted small' }, (p.widgets || []).length + ' 個小工具'),
    h('label', { class: 'tog' }, h('input', { type: 'checkbox', checked: !p.hide, onchange: e => edit(w => { if (e.target.checked) delete w.pages[i].hide; else w.pages[i].hide = true; }, e.target.checked ? '觀看者看得到「' + p.name + '」了' : '「' + p.name + '」不給觀看者看了') }), h('span', null, '👀 觀看者看得到')),
    h('div', { class: 'pg-tools' },
      h('button', { class: 'btn', title: '往前移', disabled: i === 0, onclick: () => edit(w => { w.pages.splice(i - 1, 0, w.pages.splice(i, 1)[0]); }) }, '↑'),
      h('button', { class: 'btn', title: '往後移', disabled: i === n - 1, onclick: () => edit(w => { w.pages.splice(i + 1, 0, w.pages.splice(i, 1)[0]); }) }, '↓'),
      h('button', { class: 'btn', onclick: () => edit(w => { const c = JSON.parse(JSON.stringify(w.pages[i])); c.id = uid(); c.name = p.name + '（複製）'; (c.widgets || []).forEach(x => { x.id = uid(); }); w.pages.splice(i + 1, 0, c); }, '已複製') }, '⧉ 複製'),
      h('button', { class: 'btn danger', onclick: async () => {
        if (!await ask('刪除「' + p.name + '」這一頁？刪除後開著的班級百寶箱和動態牆也會不見這一頁。', '刪除', { danger: true })) return;
        edit(w => {
          const k = w.pages.findIndex(x => x.id === p.id); if (k < 0) return;
          w.pages.splice(k, 1);
          if (w.cur === p.id) w.cur = w.pages.length ? w.pages[0].id : null;
          if (w.viewStart === p.id) w.viewStart = null;
        }, '已刪除「' + p.name + '」');
      } }, '🗑 刪除'),
      h('a', { class: 'btn pri', href: '../wall/#page=' + p.id }, '✏️ 編輯')));
}
// 改動態牆：存回 d/wall，觀看者看的 pub/wall 也一起更新
async function edit(fn, msg) {
  const w = JSON.parse(A.raw.wall || 'null'); if (!w) return;
  fn(w);
  const v = JSON.stringify(w), at = Date.now();
  if (v === A.raw.wall) return;
  A.d.wall = w; A.raw.wall = v;
  const b = FB.db.batch();
  b.set(FB.db.doc('d/wall'), { v, at, by: FB.email });
  b.set(FB.db.doc('pub/wall'), { v: JSON.stringify(FB.buildPub(Object.assign({}, A.d, { wall: w }))), at });
  A.later = false; draw();
  try { await b.commit(); if (msg) toast(msg); } catch (e) { toast('沒有存到雲端：' + fbErr(e)); }
}

/* ---------- 資料 ---------- */
function dataPane() {
  const keys = Object.keys(A.raw).sort(), total = keys.reduce((s, k) => s + fbBytes(A.raw[k]), 0);
  const kb = n => Math.max(1, Math.round(n / 1024)) + ' KB';
  const NAMES = { info: '班級設定', students: '名單與分數', att: '點名紀錄', log: '今天的加扣分', wall: '動態牆', board: '聯絡簿／黑板', sched: '作息與課表', gacha: '扭蛋', hw: '作業', groups: '小組', settles: '結算紀錄' };
  return [
    h('div', { class: 'adm-card' }, h('h2', null, '下載備份檔'),
      h('p', null, '把雲端上的全部班級資料（含圖片）存成一個 .json 檔，放在 OneDrive 或隨身碟。要還原時，在班級百寶箱按 ⚙ 設定 → 資料 → 匯入備份檔。'),
      h('button', { class: 'btn pri', onclick: e => backup(e.target) }, '💾 下載備份檔')),
    h('div', { class: 'adm-card' }, h('h2', null, '雲端資料大小（全部 ' + kb(total) + '）'),
      h('p', { class: 'muted small' }, '每一項最多大約 1000 KB。快滿的時候，請刪掉舊的動態牆頁面或紀錄。'),
      h('div', { class: 'tblwrap' }, h('table', { class: 'tbl' }, h('thead', null, h('tr', null, h('th', null, '項目'), h('th', null, '大小'))),
        h('tbody', null, keys.map(k => { const n = fbBytes(A.raw[k]); return h('tr', null, h('td', null, (NAMES[k] || k)), h('td', { style: n > 800000 ? 'color:#b8321f;font-weight:700' : null }, kb(n))); })))))
  ];
}
async function backup(btn) {
  btn.disabled = true; toast('正在準備備份檔…');
  try {
    const images = {};
    const s = await FB.db.collection('img').get(); s.forEach(d => { images[d.id] = d.data().url; });
    const o = Object.assign({ app: '班級百寶箱', v: 1 }, A.d, { images, exportedAt: new Date().toISOString() });
    download(((A.d.info && A.d.info.className) || '班級') + '-班級百寶箱雲端備份-' + dateKey() + '.json', JSON.stringify(o), 'application/json');
  } catch (e) { toast('備份失敗：' + fbErr(e)); }
  btn.disabled = false;
}

start();
