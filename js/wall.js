'use strict';
/* 動態牆：可隨意擺放、調整大小的小工具，版面自動記住 */

// 雲端動態牆的網址（班級百寶箱/雲端動態牆/；組合雲端版時這裡會清空，雲端版就不會出現這個按鈕）
const CLOUD_WALL_URL = 'https://claude.ai/artifact/MLEbS6ctcd6XCN5EJASFo6';
const cloudWallLink = (cls, text) => CLOUD_WALL_URL ? h('a', { class: cls, href: CLOUD_WALL_URL, target: '_blank', rel: 'noopener', style: { textDecoration: 'none' }, title: '在 claude.ai 打開雲端動態牆：登入帳號，任何電腦都是同一面牆' }, text) : null;

const WALL_BG = {
  paper: { t: '紙張', css: '#f5efe2' },
  sky: { t: '天空', css: 'linear-gradient(180deg,#8ec5ff 0%,#e3f2ff 100%)' },
  mint: { t: '薄荷', css: 'linear-gradient(135deg,#d6f5de 0%,#8fd8c6 100%)' },
  sunset: { t: '晚霞', css: 'linear-gradient(135deg,#ffd29e 0%,#ff9190 100%)' },
  lavender: { t: '薰衣草', css: 'linear-gradient(135deg,#e7ddff 0%,#a9bcff 100%)' },
  grid: { t: '方格', css: 'repeating-linear-gradient(0deg,transparent 0 39px,#e2e7ee 39px 40px),repeating-linear-gradient(90deg,transparent 0 39px,#e2e7ee 39px 40px),#fdfcf8' },
  chalk: { t: '黑板', css: 'radial-gradient(ellipse at 30% 20%,#3e5652 0%,#263634 75%)' },
  cork: { t: '軟木板', css: 'radial-gradient(#a97b47 1.2px,transparent 1.4px) 0 0/9px 9px,radial-gradient(#ddb57f 1px,transparent 1.3px) 4px 5px/11px 11px,#c79a63' },
  night: { t: '夜空', css: 'linear-gradient(180deg,#1b2440 0%,#3b4d7c 100%)' },
  white: { t: '白色', css: '#ffffff' }
};
const WORK_SET = [
  { i: '🤫', t: '安靜' }, { i: '🗣️', t: '小聲討論' }, { i: '✋', t: '舉手發言' }, { i: '👫', t: '兩人一組' },
  { i: '👥', t: '小組合作' }, { i: '✍️', t: '個人作業' }, { i: '📖', t: '安靜閱讀' }, { i: '👀', t: '看老師' }
];

/* ---------- 小工具的計時器（每個小工具各自計時） ---------- */
const wTimer = {
  val(c) { return c.mode === 'down' ? (c.running ? (c.endAt - Date.now()) / 1000 : c.remain) : (c.running ? c.elapsed + (Date.now() - c.startAt) / 1000 : c.elapsed); },
  toggle(c) {
    if (c.running) {
      if (c.mode === 'down') c.remain = Math.max(0, (c.endAt - Date.now()) / 1000); else c.elapsed += (Date.now() - c.startAt) / 1000;
      c.running = false;
    } else {
      if (c.mode === 'down') { if (c.remain <= 0) c.remain = c.total; if (c.remain <= 0) return; c.endAt = Date.now() + c.remain * 1000; c.rang = false; }
      else c.startAt = Date.now();
      c.running = true;
    }
  },
  reset(c) { c.running = false; c.remain = c.total; c.elapsed = 0; c.rang = false; },
  add(c, s) { c.rang = false; if (c.running) c.endAt = Math.max(Date.now(), c.endAt + s * 1000); else c.remain = Math.max(0, c.remain + s); c.total = Math.max(c.total, c.running ? (c.endAt - Date.now()) / 1000 : c.remain); },
  set(c, s) { c.total = s; c.remain = s; c.running = false; c.rang = false; c.elapsed = 0; }
};

/* ---------- 考試面板的狀態 ---------- */
function examItems(c, now) {
  if (c.src === 'now') {
    if (!c.nowStart) return [];
    const d = new Date(c.nowStart);
    if (dateKey(d) !== dateKey(now)) return [];
    const s = d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
    return [{ subj: c.nowSubj || '考試', s, e: s + (+c.nowMin || 40) }];
  }
  if (c.src === 'flow') {   // 依序進行：從開始時間起，一項接一項
    if (!c.flowAt) return [];
    const d = new Date(c.flowAt);
    if (dateKey(d) !== dateKey(now)) return [];
    let s = d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
    return (c.flow || []).filter(x => +x.min > 0).map(x => { const it = { subj: x.name || (x.brk ? '下課' : '活動'), icon: x.icon || (x.brk ? '☕' : '📖'), brk: !!x.brk, s, e: s + +x.min }; s = it.e; return it; });
  }
  if (c.src === 'sched') return schedNow(now).list.filter(p => isExam(p.subj)).map(p => ({ subj: p.subj.replace(/^考\s*/, ''), s: p.s, e: p.e }));
  return (c.items || []).filter(x => x.subj && x.start && x.end).map(x => ({ subj: x.subj, s: toMin(x.start), e: toMin(x.end) })).sort((a, b) => a.s - b.s);
}
// 考試面板放不下時把 --k 調小（0.4～1），字和間距一起縮，「下方列出全部科目」才不會被切掉
function fitExam(C) {
  C.style.setProperty('--k', 1);
  if (C.scrollHeight <= C.clientHeight + 1) return;
  let lo = .4, hi = 1;
  for (let i = 0; i < 7; i++) { const k = (lo + hi) / 2; C.style.setProperty('--k', k); if (C.scrollHeight <= C.clientHeight + 1) lo = k; else hi = k; }
  C.style.setProperty('--k', lo);
}
function fmtClock(m) { const s = Math.round(m * 60); return pad(Math.floor(s / 3600) % 24) + ':' + pad(Math.floor(s % 3600 / 60)); }
// 考試面板提醒文字的顏色（和面板其他黑字分開）
const NOTE_COLORS = [['#d9480f', '橘紅'], ['#d63c3c', '紅'], ['#1c64c8', '藍'], ['#1f8f4e', '綠'], ['#7b3fbf', '紫'], ['#25313b', '黑']];
const FLOW_ICONS = ['📖', '✏️', '🔢', '🌏', '🔬', '🗣️', '🎨', '🎵', '⚽', '💻', '📝', '☕', '🧹', '🍱'];
const flowOn = c => !!c.flowAt && dateKey(new Date(c.flowAt)) === dateKey();
// 聯絡簿小工具要寫的應到實到 [應到, 實到]：先找這一頁、再找別頁的「應到實到」小工具，其次是有顯示人數的考試面板，都沒有就照今天點名
function wallAtt() {
  const P = Wall.page(), pages = [P, ...D.wall.pages.filter(p => p !== P)].filter(Boolean), roll = () => [D.students.length, presentList().length];
  for (const p of pages) {
    const a = p.widgets.find(w => w.type === 'att'), e = p.widgets.find(w => w.type === 'exam' && w.cfg.showAtt);
    if (a) return a.cfg.auto === false ? [+a.cfg.expected || 0, +a.cfg.actual || 0] : roll();
    if (e) return e.cfg.attAuto === false ? [+e.cfg.expected || 0, +e.cfg.actual || 0] : roll();
  }
  return D.students.length ? roll() : null;
}
// 抽籤小工具的名單：班上今天出席的同學、自己輸入的名單、或座號範圍（每一項 {id, t}）
function drawPool(c) {
  const src = c.src || 'class';
  if (src === 'list') return [...new Set(String(c.names || '').split(/[\n,，、]/).map(x => x.trim()).filter(Boolean))].map(t => ({ id: 'n:' + t, t }));
  if (src === 'nums') { const a = Math.min(c.from || 1, c.to || 30), b = Math.max(c.from || 1, c.to || 30); return Array.from({ length: b - a + 1 }, (_, i) => ({ id: 'no:' + (a + i), t: (a + i) + ' 號' })); }
  return presentList().map(s => ({ id: s.id, t: s.name ? pad(s.no) + '\n' + s.name : pad(s.no) + ' 號' }));
}
// 抽籤結果越大越好：照最長那一行的字數和行數算字級（半形字算半個）
function drawShow(el, x, win) {
  const lines = String(x ? x.t : '？').split('\n'), n = Math.max(1.5, ...lines.map(l => [...l].reduce((a, ch) => a + (/[\x00-\xff]/.test(ch) ? .55 : 1), 0)));
  el.replaceChildren(...lines.map(l => h('div', null, l)));
  el.style.fontSize = 'min(' + (62 / lines.length).toFixed(1) + 'cqh, ' + (86 / n).toFixed(1) + 'cqw)';
  el.classList.toggle('win', !!win);
}

/* ---------- 天氣與空氣品質（Open-Meteo：免申請金鑰，天氣是預報模式、空氣品質是 CAMS 模式推估） ---------- */
const WX_PLACES = [
  ['臺南市大內區', 23.1194, 120.3489], ['臺南市（市區）', 22.9908, 120.2133], ['臺北市', 25.0375, 121.5637], ['新北市（板橋）', 25.0143, 121.4672],
  ['基隆市', 25.1283, 121.7419], ['桃園市', 24.9937, 121.301], ['新竹市', 24.8138, 120.9675], ['苗栗市', 24.5602, 120.8214], ['臺中市', 24.1477, 120.6736],
  ['彰化市', 24.0809, 120.5385], ['南投市', 23.9157, 120.6639], ['雲林縣（斗六）', 23.7092, 120.5434], ['嘉義市', 23.4801, 120.4491], ['高雄市', 22.6273, 120.3014],
  ['屏東市', 22.669, 120.4862], ['宜蘭市', 24.757, 121.7533], ['花蓮市', 23.9871, 121.6015], ['臺東市', 22.7583, 121.1444], ['澎湖（馬公）', 23.5655, 119.5862],
  ['金門', 24.4493, 118.3767], ['馬祖（南竿）', 26.1505, 119.9499]
];
const WX_CODE = {
  0: ['☀️', '晴天'], 1: ['🌤️', '晴時多雲'], 2: ['⛅', '多雲'], 3: ['☁️', '陰天'], 45: ['🌫️', '有霧'], 48: ['🌫️', '有霧'],
  51: ['🌦️', '毛毛雨'], 53: ['🌦️', '毛毛雨'], 55: ['🌧️', '毛毛雨'], 56: ['🌧️', '凍毛毛雨'], 57: ['🌧️', '凍毛毛雨'],
  61: ['🌧️', '小雨'], 63: ['🌧️', '中雨'], 65: ['🌧️', '大雨'], 66: ['🌧️', '凍雨'], 67: ['🌧️', '凍雨'],
  71: ['🌨️', '小雪'], 73: ['🌨️', '下雪'], 75: ['🌨️', '大雪'], 77: ['🌨️', '霰'],
  80: ['🌦️', '陣雨'], 81: ['🌧️', '陣雨'], 82: ['⛈️', '大陣雨'], 85: ['🌨️', '陣雪'], 86: ['🌨️', '陣雪'],
  95: ['⛈️', '雷雨'], 96: ['⛈️', '雷雨'], 99: ['⛈️', '雷雨']
};
function wxLook(code, day = 1) {
  const [i, t] = WX_CODE[code] || ['🌡️', '天氣'];
  if (!day && code === 0) return ['🌙', '晴朗'];
  if (!day && code === 1) return ['🌙', '晴時多雲'];
  return [i, t];
}
// AQI 分級：六級的名稱和顏色照環境部空氣品質指標；最後一欄是給班上的戶外活動建議
const AQI_LV = [
  [50, '良好', '#2fb94a', '#fff', '可以正常戶外活動'],
  [100, '普通', '#f7d300', '#3b3200', '可以正常戶外活動；特別敏感的同學留意身體狀況'],
  [150, '對敏感族群不健康', '#ff7e00', '#fff', '有氣喘、過敏的同學減少劇烈的戶外活動'],
  [200, '對所有族群不健康', '#e5332a', '#fff', '大家減少戶外活動，戶外課可改在室內'],
  [300, '非常不健康', '#8f3f97', '#fff', '避免戶外活動，關好門窗'],
  [Infinity, '危害', '#7e0023', '#fff', '停止戶外活動，留在室內']
];
const aqiLv = v => AQI_LV.find(l => v <= l[0]);
const WX = {
  mem: new Map(),   // 「緯度,經度」→ { at, data, p }；同一個地點的小工具共用，20 分鐘更新一次
  k: (lat, lon) => (+lat).toFixed(2) + ',' + (+lon).toFixed(2),
  get(lat, lon, force) {
    const k = this.k(lat, lon);
    let e = this.mem.get(k);
    if (!e) { e = { at: 0, data: null, err: null, p: null }; try { const o = JSON.parse(localStorage.getItem('bxbox-wx:' + k) || 'null'); if (o) e.data = o; } catch (er) { } this.mem.set(k, e); }
    const due = Date.now() - e.at > 20 * 60000;
    if (!e.p && (force || due)) {
      e.p = this.load(lat, lon).then(d => { e.data = d; e.err = null; e.at = Date.now(); try { localStorage.setItem('bxbox-wx:' + k, JSON.stringify(d)); } catch (er) { } },
        er => { e.err = er; e.at = Date.now() - 15 * 60000; })   // 連不上就 5 分鐘後再試
        .finally(() => { e.p = null; e.v = (e.v || 0) + 1; });
    }
    return e;
  },
  async load(lat, lon) {
    const q = 'latitude=' + (+lat) + '&longitude=' + (+lon) + '&timezone=Asia%2FTaipei';
    const js = r => r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status));
    const [w, a] = await Promise.all([
      fetch('https://api.open-meteo.com/v1/forecast?' + q + '&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max&forecast_days=4').then(js),
      fetch('https://air-quality-api.open-meteo.com/v1/air-quality?' + q + '&current=us_aqi,pm2_5,pm10').then(js).catch(() => null)
    ]);
    return { w, a, at: Date.now() };
  }
};

// 網頁的安全規則（例如 claude.ai 雲端版）不准連到氣象網站或嵌入網頁時，小工具上直接說明，不要只是空白
document.addEventListener('securitypolicyviolation', e => {
  const d = e.effectiveDirective || e.violatedDirective || '', u = e.blockedURI || '';
  if (/^connect-src/.test(d) && /open-meteo\.com/.test(u)) WX.blocked = true;
  if (/^(frame|child)-src/.test(d)) $$('.wem-frame iframe').forEach(f => {
    if (u && !f.src.startsWith(u.replace(/\/$/, ''))) return;
    const w = f.parentNode; if (w.querySelector('.wem-block')) return;
    w.append(h('div', { class: 'wem-block' }, '這個畫面不允許嵌入影片或網頁', h('small', null, '請按右上角的 ↗ 在新分頁打開，或改用班級百寶箱、單機版動態牆')));
  });
});

/* ---------- 影片／網頁嵌入 ---------- */
// 直接從電腦打開檔案（file://）時網頁沒有網址，YouTube 會拒絕播放（錯誤 153），改經過 GitHub 上的中繼頁播放（班級百寶箱/yt.html）
const YT_RELAY = 'https://floralinlolo-max.github.io/class-toolbox/yt.html';
const ytRelayed = () => !/^https?:$/.test(location.protocol);
// 把貼上的網址換成可以嵌入的網址；YouTube 用不留 Cookie 的 youtube-nocookie.com
function ytTime(s) {
  if (!s) return 0;
  if (/^\d+$/.test(s)) return +s;
  const m = String(s).match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  return m ? (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0) : 0;
}
function embedSrc(c) {
  const raw = String(c.url || '').trim(); if (!raw) return null;
  let u; try { u = new URL(/^https?:\/\//i.test(raw) ? raw : 'https://' + raw); } catch (e) { return null; }
  if (!/^https?:$/.test(u.protocol) || /\s/.test(raw) || !u.hostname.includes('.')) return null;
  const host = u.hostname.replace(/^(www|m)\./, '');
  if (host === 'youtu.be' || /(^|\.)youtube(-nocookie)?\.com$/.test(host)) {
    let id = host === 'youtu.be' ? u.pathname.slice(1).split('/')[0] : (u.pathname.match(/^\/(?:embed|shorts|live|v)\/([\w-]{6,})/) || [])[1] || u.searchParams.get('v');
    if (id === 'videoseries') id = null;
    const list = u.searchParams.get('list');
    if (id || list) {
      const p = new URLSearchParams({ rel: '0', playsinline: '1' }), start = +c.start || ytTime(u.searchParams.get('t') || u.searchParams.get('start'));
      if (start) p.set('start', start);
      if (c.autoplay) { p.set('autoplay', '1'); p.set('mute', '1'); }
      if (c.loop) { p.set('loop', '1'); if (id && !list) p.set('playlist', id); }
      if (list) p.set('list', list);
      const src = 'https://www.youtube-nocookie.com/embed/' + (id || 'videoseries') + '?' + p;
      return { kind: 'yt', src: ytRelayed() ? YT_RELAY + '#' + encodeURIComponent(src) : src, open: u.href, label: list && !id ? 'YouTube 播放清單' : 'YouTube 影片' };
    }
  }
  // Google 簡報／文件／試算表／表單、Canva：換成它們的嵌入網址（「發布到網路」的 /d/e/… 和一般分享連結的 /d/… 不一樣）
  let src = u.href;
  const g = host === 'docs.google.com' && u.pathname.match(/^\/(presentation|document|spreadsheets|forms)\/d\/(e\/)?([\w-]+)/);
  if (g) {
    const base = 'https://docs.google.com/' + g[1] + '/d/' + (g[2] || '') + g[3];
    src = g[1] === 'forms' ? base + '/viewform?embedded=true'
      : !g[2] ? base + '/preview'
      : g[1] === 'presentation' ? base + '/embed?start=false&loop=false' : base + '/pubhtml?widget=true';
  } else if (/(^|\.)canva\.com$/.test(host) && /\/design\//.test(u.pathname) && !u.searchParams.has('embed')) {
    u.searchParams.set('embed', ''); src = u.href.replace('embed=', 'embed');
  }
  return { kind: 'web', src, open: raw.match(/^https?:\/\//i) ? raw : 'https://' + raw, label: host };
}
// 動態牆重畫時（全螢幕、換頁、改設定），嵌入的影片／網頁先搬到旁邊再搬回來，影片才不會重頭播放（瀏覽器要支援 moveBefore）
const EmbedKeep = {
  hold: null, wait: [], depth: 0,
  ok: () => typeof Element !== 'undefined' && typeof Element.prototype.moveBefore === 'function',
  stash(scope) {
    if (!scope || !this.ok()) return;
    const list = scope.querySelectorAll('iframe[data-wid]'); if (!list.length) return;
    if (!this.hold) this.hold = h('div', { class: 'wem-hold', 'aria-hidden': 'true' });
    if (!this.hold.isConnected) document.body.append(this.hold);
    for (const f of list) { try { this.hold.moveBefore(f, null); } catch (e) { } }
  },
  put(wrap, wid, src, make) { this.wait.push({ wrap, wid, src, make }); if (!this.depth) this.flush(); },
  flush() {
    const w = this.wait; this.wait = [];
    for (const { wrap, wid, src, make } of w) {
      const old = this.hold && [...this.hold.children].find(f => f.dataset.wid === wid && f.dataset.src === src);
      if (old && wrap.isConnected) { try { wrap.moveBefore(old, null); continue; } catch (e) { } }
      wrap.append(make());
    }
    if (this.hold) this.hold.replaceChildren();
  }
};

/* ---------- 設定表單小工具 ---------- */
const F = {
  row(label, ...kids) { return h('div', { class: 'wf' }, label ? h('div', { class: 'wf-l' }, label) : null, h('div', { class: 'wf-c' }, kids)); },
  text(label, v, on, ph) { return this.row(label, h('input', { class: 'inp', value: v || '', placeholder: ph || '', oninput: e => on(e.target.value) })); },
  area(label, v, on, ph) { return this.row(label, h('textarea', { class: 'inp', rows: 3, value: v || '', placeholder: ph || '', oninput: e => on(e.target.value) })); },
  num(label, v, min, max, on, unit) { return this.row(label, h('span', { class: 'row' }, h('input', { class: 'inp num', type: 'number', min, max, value: v, onchange: e => on(clamp(+e.target.value || 0, min, max)) }), unit || '')); },
  seg(label, opts, cur, on) { return this.row(label, h('div', { class: 'seg' }, opts.map(([v, t]) => h('button', { class: cur === v ? 'on' : '', onclick: () => on(v) }, t)))); },
  tog(label, v, on) { return h('label', { class: 'tog' }, h('input', { type: 'checkbox', checked: !!v, onchange: e => on(e.target.checked) }), h('span', null, label)); },
  color(label, v, on) { return this.row(label, h('input', { type: 'color', value: v || '#222222', oninput: e => on(e.target.value) })); }
};

/* ---------- 小工具種類 ---------- */
const WT = {
  clock: {
    name: '時鐘', icon: '🕘', w: 26, h: 50,
    cfg: () => ({ style: 'both', sec: true, date: true, period: true }),
    render(b, wd) {
      const c = wd.cfg, A = c.style !== 'digital' ? analogClock() : null;
      const t = h('div', { class: 'wc-time' }), d = h('div', { class: 'wc-date' }), p = h('div', { class: 'wc-per' });
      b.append(h('div', { class: 'w-card w-clock ' + c.style }, A ? h('div', { class: 'wc-analog' }, A.el) : null, c.style !== 'analog' ? t : null, c.date ? d : null, c.period ? p : null));
      let last = -1;
      return now => {
        const k = now.getSeconds(); if (k === last) return; last = k;
        if (A) A.update(now, c.sec);
        t.textContent = hm(now) + (c.sec && c.style === 'digital' ? ':' + pad(k) : '');
        d.textContent = fmtMD(now); p.textContent = nowLabel(now);
      };
    },
    settings(f, wd, ap) {
      const c = wd.cfg;
      f.append(F.seg('樣式', [['both', '指針＋數字'], ['analog', '指針'], ['digital', '數字']], c.style, v => { c.style = v; ap(true); }),
        F.tog('顯示秒', c.sec, v => { c.sec = v; ap(); }), F.tog('顯示日期', c.date, v => { c.date = v; ap(); }), F.tog('顯示第幾節（照課表）', c.period, v => { c.period = v; ap(); }));
    }
  },
  exam: {
    name: '考試面板', icon: '📝', w: 56, h: 72,
    cfg: () => ({ title: '考試', src: 'now', nowSubj: '國語', nowMin: 40, nowStart: null, items: [{ subj: '國語', start: '08:40', end: '09:20' }],
      flowAt: null, flow: [{ name: '國語', min: 40, icon: '📖' }, { name: '下課', min: 10, icon: '☕', brk: true }, { name: '數學', min: 40, icon: '🔢' }],
      showAtt: true, attAuto: true, expected: 25, actual: 25, note: '寫完檢查姓名、座號，再檢查答案', noteColor: '#d9480f', warn: 5, bell: true, sound: 'bell', warnBell: false, showList: false }),
    render(b, wd) {
      const c = wd.cfg;
      const subj = h('div', { class: 'we-subj' }), st = h('span', { class: 'we-t' }), en = h('span', { class: 'we-t' }), bar = h('i'), left = h('div', { class: 'we-left' });
      const ea = h('b'), aa = h('b'), list = h('div', { class: 'we-list' });
      const go = () => { save(); Wall.drawWidget(wd); Wall.refreshPanel(wd); };
      const quick = c.src === 'now' ? h('div', { class: 'we-quick' },
        h('button', { class: 'wbtn', onclick: () => { c.nowStart = c.nowStart ? null : Date.now(); go(); } }, c.nowStart ? '■ 結束' : '▶ 開始 ' + (c.nowMin || 40) + ' 分鐘'))
        : c.src === 'flow' ? h('div', { class: 'we-quick' },
          h('button', { class: 'wbtn', onclick: () => { c.flowAt = flowOn(c) ? null : Date.now(); go(); } }, flowOn(c) ? '■ 結束' : '▶ 現在開始')) : null;
      const C = h('div', { class: 'w-card w-exam' },
        h('div', { class: 'we-title' }, c.title || '考試'),
        h('div', { class: 'we-card' }, subj, h('div', { class: 'we-row' }, st, h('div', { class: 'we-bar' }, bar), en), left, quick),
        c.showAtt ? h('div', { class: 'we-att' }, h('div', null, '應到 ', ea, ' 人'), h('div', null, '實到 ', aa, ' 人')) : null,
        c.note ? h('div', { class: 'we-note', style: '--nc:' + (c.noteColor || '#d9480f') }, c.note) : null,
        c.showList ? list : null);
      b.append(C);
      let lastSec = -1, listKey = '', fitKey = '';
      return now => {
        const sec = now.getSeconds(); if (sec === lastSec) return; lastSec = sec;
        const m = now.getHours() * 60 + now.getMinutes() + sec / 60;
        const I = examItems(c, now), cur = I.find(x => m >= x.s && m < x.e), next = I.find(x => x.s > m);
        const card = subj.parentNode, ic = x => (x.icon || '📖') + ' ';
        card.classList.remove('warn', 'over', 'idle', 'brk');
        if (cur) {
          const rem = (cur.e - m) * 60;
          subj.textContent = ic(cur) + cur.subj; st.textContent = fmtClock(cur.s); en.textContent = fmtClock(cur.e);
          bar.style.width = clamp((m - cur.s) / (cur.e - cur.s), 0, 1) * 100 + '%';
          left.textContent = '還剩 ' + fmtLeft(rem) + (next && c.src === 'flow' ? '　下一項：' + next.subj : '');
          if (cur.brk) card.classList.add('brk');
          else if (rem <= (c.warn || 0) * 60) card.classList.add('warn');
        } else if (next) {
          subj.textContent = '下一項：' + ic(next) + next.subj; st.textContent = fmtClock(next.s); en.textContent = fmtClock(next.e);
          bar.style.width = '0%'; left.textContent = fmtLeft((next.s - m) * 60) + '後開始'; card.classList.add('idle');
        } else if (I.length) {
          const last = I[I.length - 1];
          subj.textContent = c.src === 'now' ? '⏰ 時間到，請停筆' : c.src === 'flow' ? '⏰ 時間到' : '考試結束'; st.textContent = fmtClock(I[0].s); en.textContent = fmtClock(last.e);
          bar.style.width = '100%'; left.textContent = c.src === 'now' ? '' : c.src === 'flow' ? '全部的科目和活動都結束了' : '今天的考試都結束了'; card.classList.add('over');
        } else {
          subj.textContent = c.src === 'sched' ? '課表裡今天沒有考試' : c.src === 'now' ? '📖 ' + (c.nowSubj || '考試') : c.src === 'flow' ? ((c.flow || [])[0] ? ic(c.flow[0]) + (c.flow[0].name || '活動') : '還沒有科目') : '還沒設定考試科目';
          st.textContent = en.textContent = ''; bar.style.width = '0%';
          left.textContent = c.src === 'now' || c.src === 'flow' ? '按「開始」就開始計時' : '按 ⚙ 設定科目和時間'; card.classList.add('idle');
        }
        // 鈴聲：一項剛結束（3 秒內）就響一次；記在設定裡，重畫小工具也不會重複響
        const snd = c.sound || (c.bell === false ? 'none' : 'bell');
        const done = I.filter(x => x.e <= m && x.e > m - 0.05).pop();
        if (done) { const k = dateKey(now) + done.subj + done.e.toFixed(3); if (c.rangKey !== k) { c.rangKey = k; if (snd !== 'none') Snd.ring(snd); } }
        if (cur && !cur.brk && c.warnBell && c.warn > 0) {
          const w = cur.e - c.warn, k = 'w' + dateKey(now) + cur.subj + cur.e.toFixed(3);
          if (m >= w && m < w + 0.05 && c.warnKey !== k) { c.warnKey = k; Snd.ring('ding'); }
        }
        if (c.showAtt) { ea.textContent = c.attAuto ? D.students.length : c.expected; aa.textContent = c.attAuto ? presentList().length : c.actual; }
        if (c.showList) {
          // 還沒按開始的「多科依序進行」也先列出每一項幾分鐘
          const plan = !I.length && c.src === 'flow' ? (c.flow || []).filter(x => +x.min > 0) : null;
          const key = plan ? JSON.stringify(plan) : I.map(x => x.subj + x.s + (cur === x ? '*' : '')).join('|') + Math.floor(m);
          if (key !== listKey) {
            listKey = key;
            const rows = plan ? plan.map(x => h('div', { class: 'we-li' }, h('span', null, ic(x) + (x.name || (x.brk ? '下課' : '活動'))), h('span', { class: 'muted' }, x.min + ' 分鐘'), h('span')))
              : I.map(x => h('div', { class: 'we-li' + (cur === x ? ' cur' : m >= x.e ? ' past' : '') },
                h('span', null, (x.icon ? x.icon + ' ' : '') + x.subj), h('span', { class: 'muted' }, fmtClock(x.s) + '–' + fmtClock(x.e)),
                h('span', { class: 'we-mini' }, h('i', { style: { width: clamp((m - x.s) / (x.e - x.s), 0, 1) * 100 + '%' } }))));
            list.replaceChildren(...rows);
          }
        }
        // 內容變了（換科、清單變了、剩餘時間字數變了）才重新算縮放
        const fk = subj.textContent + '|' + left.textContent.length + '|' + listKey + '|' + C.clientWidth + 'x' + C.clientHeight;
        if (fk !== fitKey) { fitKey = fk; fitExam(C); }
      };
    },
    settings(f, wd, ap) {
      const c = wd.cfg;
      f.append(F.text('標題', c.title, v => { c.title = v; ap(); }, '例如：平時考、第一次定期評量'),
        F.seg('時間怎麼算', [['now', '一科現在開始'], ['flow', '多科依序進行'], ['list', '排定時間'], ['sched', '照課表']], c.src, v => { c.src = v; ap(true); }));
      if (c.src === 'flow') {
        const L = c.flow || (c.flow = []), on = flowOn(c), total = L.reduce((a, x) => a + (+x.min || 0), 0);
        const st = on ? new Date(c.flowAt) : null, endM = st ? st.getHours() * 60 + st.getMinutes() + total : null;
        f.append(F.row('第一項開始', h('div', { class: 'row wrap' },
          h('input', { class: 'inp', type: 'time', value: on ? hm(st) : '', title: '也可以自己填開始時間', onchange: e => {
            if (!e.target.value) return; const [H, M] = e.target.value.split(':').map(Number), d = new Date(); d.setHours(H, M, 0, 0); c.flowAt = d.getTime(); ap(true);
          } }),
          h('button', { class: 'btn pri sm', onclick: () => { c.flowAt = Date.now(); ap(true); } }, on ? '↺ 現在重新開始' : '▶ 現在開始'),
          on ? h('button', { class: 'btn sm', onclick: () => { c.flowAt = null; ap(true); } }, '■ 停止') : null)),
          h('div', { class: 'wf-l' }, '科目與活動（照順序一項接一項）'),
          h('div', { class: 'we-flow' }, L.map((x, i) => h('div', { class: 'we-fl' + (x.brk ? ' brk' : '') },
            h('button', { class: 'we-ic', title: '點一下換圖示', onclick: () => { x.icon = FLOW_ICONS[(FLOW_ICONS.indexOf(x.icon) + 1) % FLOW_ICONS.length]; ap(true); } }, x.icon || (x.brk ? '☕' : '📖')),
            h('input', { class: 'inp', value: x.name || '', placeholder: x.brk ? '下課' : '科目或活動名稱', oninput: e => { x.name = e.target.value; ap(); } }),
            h('button', { class: 'mv', title: '往上移', onclick: () => { if (i) { [L[i - 1], L[i]] = [L[i], L[i - 1]]; ap(true); } } }, '↑'),
            h('button', { class: 'mv', title: '刪除', onclick: () => { L.splice(i, 1); ap(true); } }, '×'),
            h('div', { class: 'we-min' }, '時間',
              h('button', { class: 'btn sm', onclick: () => { x.min = Math.max(1, (+x.min || 0) - 5); ap(true); } }, '−5'),
              h('input', { class: 'inp num', type: 'number', min: 1, max: 300, value: x.min, onchange: e => { x.min = clamp(Math.round(+e.target.value) || 1, 1, 300); ap(true); } }),
              '分鐘',
              h('button', { class: 'btn sm', onclick: () => { x.min = Math.min(300, (+x.min || 0) + 5); ap(true); } }, '+5'))))),
          h('div', { class: 'row wrap' },
            h('button', { class: 'btn pri', onclick: () => { L.push({ name: '', min: 40, icon: '📖' }); ap(true); } }, '＋ 新增科目／活動'),
            h('button', { class: 'btn', onclick: () => { L.push({ name: '下課', min: 10, icon: '☕', brk: true }); ap(true); } }, '＋ 新增下課')),
          h('p', { class: 'muted small' }, '共 ' + L.length + ' 項、' + total + ' 分鐘' + (endM != null ? '，' + minToHM(endM) + ' 全部結束' : '') + '。每一項時間到都會響鈴，接著自動換下一項。'));
      }
      if (c.src === 'now') {
        f.append(F.text('科目', c.nowSubj, v => { c.nowSubj = v; ap(); }, '國語'),
          F.row('考幾分鐘', h('div', { class: 'seg' }, [20, 30, 40, 50, 60].map(m => h('button', { class: +c.nowMin === m ? 'on' : '', onclick: () => { c.nowMin = m; ap(true); } }, m))),
            h('input', { class: 'inp num', type: 'number', min: 1, max: 300, value: c.nowMin, onchange: e => { c.nowMin = clamp(+e.target.value || 40, 1, 300); ap(); } })),
          h('div', { class: 'row' }, h('button', { class: 'btn pri', onclick: () => { c.nowStart = Date.now(); ap(true); } }, c.nowStart ? '↺ 重新開始計時' : '▶ 現在開始'),
            c.nowStart ? h('button', { class: 'btn', onclick: () => { c.nowStart = null; ap(true); } }, '■ 結束') : null));
      } else if (c.src === 'list') {
        const L = c.items;
        f.append(h('div', { class: 'wf-l' }, '科目與時間'), h('div', { class: 'we-ed' }, L.map((x, i) => h('div', { class: 'we-ed-row' },
          h('input', { class: 'inp', value: x.subj, placeholder: '科目', oninput: e => { x.subj = e.target.value; ap(); } }),
          h('input', { class: 'inp', type: 'time', value: x.start, onchange: e => { x.start = e.target.value; ap(); } }),
          h('input', { class: 'inp', type: 'time', value: x.end, onchange: e => { x.end = e.target.value; ap(); } }),
          h('button', { class: 'mv', onclick: () => { L.splice(i, 1); ap(true); } }, '×')))),
          h('div', { class: 'row wrap' },
            h('button', { class: 'btn sm', onclick: () => { const l = L[L.length - 1]; const s = l ? toMin(l.end) + 10 : 520; L.push({ subj: '', start: minToHM(s), end: minToHM(s + 40) }); ap(true); } }, '＋ 加一科'),
            h('button', { class: 'btn sm', onclick: () => {
              const ex = schedNow().list.filter(p => isExam(p.subj));
              if (!ex.length) return toast('課表裡今天沒有「考」開頭的科目');
              c.items = ex.map(p => ({ subj: p.subj.replace(/^考\s*/, ''), start: p.start, end: p.end })); ap(true);
            } }, '從課表帶入今天的考試')));
      } else if (c.src === 'sched') f.append(h('p', { class: 'muted small' }, '自動使用課表裡「今天」以「考」開頭的科目和時間（例如「考國語」）。到 課表 → 編輯作息與課表 修改。'));
      const snd = c.sound || (c.bell === false ? 'none' : 'bell');
      f.append(F.row('時間到的鈴聲', h('div', { class: 'row' },
          h('select', { class: 'inp', onchange: e => { c.sound = e.target.value; c.bell = c.sound !== 'none'; ap(); } }, SOUNDS.map(([k, t]) => h('option', { value: k, selected: snd === k }, t))),
          h('button', { class: 'btn sm', title: '試聽', onclick: () => Snd.ring(c.sound || 'bell') }, '🔊 試聽'))),
        F.num('最後幾分鐘變色', c.warn, 0, 30, v => { c.warn = v; ap(); }, '分鐘'),
        F.tog('變色時也響一聲「叮」提醒', c.warnBell, v => { c.warnBell = v; ap(); }),
        F.tog('顯示應到、實到', c.showAtt, v => { c.showAtt = v; ap(true); }));
      if (c.showAtt) {
        f.append(F.seg('人數', [[true, '照今天點名'], [false, '自己填']], c.attAuto, v => { c.attAuto = v; ap(true); }));
        if (!c.attAuto) f.append(h('div', { class: 'row' }, '應到', h('input', { class: 'inp num', type: 'number', min: 0, value: c.expected, onchange: e => { c.expected = +e.target.value || 0; ap(); } }),
          '實到', h('input', { class: 'inp num', type: 'number', min: 0, value: c.actual, onchange: e => { c.actual = +e.target.value || 0; ap(); } })));
      }
      f.append(F.area('提醒文字', c.note, v => { c.note = v; ap(); }, '例如：寫完檢查姓名、座號，再檢查答案'),
        h('div', { class: 'reasons' }, D.clockNotes.map(t => h('button', { class: 'chip', onclick: () => { c.note = t; ap(true); } }, t))),
        F.row('提醒文字的顏色', h('div', { class: 'we-ncs' }, NOTE_COLORS.map(([v, t]) => h('button', { class: 'we-nc' + ((c.noteColor || '#d9480f') === v ? ' on' : ''), style: '--nc:' + v, title: t, onclick: () => { c.noteColor = v; ap(true); } }, t)))),
        F.tog('下方列出全部科目', c.showList, v => { c.showList = v; ap(); }),
        h('p', { class: 'muted small' }, '打開後，面板最下面會列出每一科（含下課）的時間和進度：正在進行的是粗體，結束的變淡。上面的大字只顯示「現在這一科」。'));
    }
  },
  timer: {
    name: '計時器', icon: '⏳', w: 26, h: 36,
    cfg: () => ({ mode: 'down', total: 300, remain: 300, running: false, endAt: 0, startAt: 0, elapsed: 0, rang: false, title: '', sound: 'bell' }),
    render(b, wd) {
      const c = wd.cfg, down = c.mode === 'down', dig = h('div', { class: 'wt-dig' }), bar = h('i'), A = c.face === 'analog' ? timerDial(down) : null;   // face：數字／指針
      const redraw = () => { save(); setTimeout(() => Wall.drawWidget(wd), 0); };
      // 沒在跑的倒數計時，小工具上直接填幾分幾秒
      const num = (v, max) => h('input', { class: 'inp num', type: 'number', min: 0, max, value: v, onchange: () => { const t = clamp(+mm.value || 0, 0, 600) * 60 + clamp(+ss.value || 0, 0, 59); if (t > 0) { wTimer.set(c, t); redraw(); } } });
      const mm = num(Math.floor(c.total / 60), 600), ss = num(Math.round(c.total % 60), 59);
      const box = h('div', { class: 'w-card w-timer' + (A ? ' ana' : '') },
        c.title ? h('div', { class: 'wt-title' }, c.title) : null, A ? h('div', { class: 'wt-dial' }, A.el) : null, dig,
        down && !A ? h('div', { class: 'wt-bar' }, bar) : null,
        h('div', { class: 'wt-btns' },
          h('span', { class: 'wt-grp' },
            h('button', { class: 'wbtn' + (c.running ? '' : ' pri'), title: '開始（空白鍵）', disabled: c.running, onclick: () => { wTimer.toggle(c); redraw(); } }, '▶'),
            h('button', { class: 'wbtn' + (c.running ? ' pri' : ''), title: '暫停（空白鍵）', disabled: !c.running, onclick: () => { wTimer.toggle(c); redraw(); } }, '⏸'),
            h('button', { class: 'wbtn', title: '重來', onclick: () => { wTimer.reset(c); redraw(); } }, '↺')),
          down ? h('span', { class: 'wt-grp' },
            h('button', { class: 'wbtn', title: '減一分鐘', onclick: () => { wTimer.add(c, -60); redraw(); } }, '−1分'),
            h('button', { class: 'wbtn', title: '加一分鐘', onclick: () => { wTimer.add(c, 60); redraw(); } }, '+1分')) : null),
        down && !c.running ? h('div', { class: 'wt-set' }, mm, '分', ss, '秒') : null);
      b.append(box);
      return () => {
        const v = wTimer.val(c);
        if (down && c.running && v <= 0) { c.running = false; c.remain = 0; c.rang = true; Snd.ring(c.sound || 'bell'); redraw(); return; }
        dig.textContent = fmtSec(c.mode === 'down' ? Math.max(0, v) : Math.floor(v));
        box.classList.toggle('warn', c.mode === 'down' && c.running && v <= 60);
        box.classList.toggle('end', c.mode === 'down' && c.rang);
        if (c.mode === 'down') bar.style.width = (c.total ? clamp(v / c.total, 0, 1) * 100 : 0) + '%';
        if (A) A.update(v);
      };
    },
    settings(f, wd, ap) {
      const c = wd.cfg;
      const mm = h('input', { class: 'inp num', type: 'number', min: 0, max: 600, value: Math.floor(c.total / 60) }), ss = h('input', { class: 'inp num', type: 'number', min: 0, max: 59, value: c.total % 60 });
      f.append(F.text('標題', c.title, v => { c.title = v; ap(); }, '例如：安靜閱讀'),
        h('div', { class: 'reasons' }, D.timerTitles.map(t => h('button', { class: 'chip', onclick: () => { c.title = t; ap(true); } }, t))),
        F.seg('種類', [['down', '倒數計時'], ['up', '碼錶']], c.mode, v => { c.mode = v; wTimer.reset(c); ap(true); }),
        F.seg('樣式', [['digital', '數字'], ['analog', '指針']], c.face || 'digital', v => { c.face = v; ap(true); }));
      if (c.mode === 'down') f.append(F.row('時間', h('div', { class: 'seg' }, [1, 3, 5, 10, 15, 20, 30].map(m => h('button', { class: c.total === m * 60 ? 'on' : '', onclick: () => { wTimer.set(c, m * 60); ap(true); } }, m + '分')))),
        F.row('自訂', mm, '分', ss, '秒', h('button', { class: 'btn sm', onclick: () => { const t = (+mm.value || 0) * 60 + (+ss.value || 0); if (t > 0) { wTimer.set(c, t); ap(true); } } }, '設定')),
        F.row('時間到的鈴聲', h('div', { class: 'row' },
          h('select', { class: 'inp', onchange: e => { c.sound = e.target.value; ap(); } }, SOUNDS.map(([k, t]) => h('option', { value: k, selected: (c.sound || 'bell') === k }, t))),
          h('button', { class: 'btn sm', title: '試聽', onclick: () => Snd.ring(c.sound || 'bell') }, '🔊 試聽'))));
      f.append(h('p', { class: 'muted small' }, '快捷鍵：按空白鍵開始／暫停（選了這個計時器時控制它，沒選時控制這一頁的第一個計時器）。'));
    }
  },
  text: {
    name: '文字', icon: '🔤', w: 30, h: 22,
    cfg: () => ({ text: '', color: '#22303c', bg: 'white', align: 'center', font: 'sans', bold: true, vert: false }),
    render(b, wd) {
      const c = wd.cfg;
      const inner = h('div', { class: 'wx-in font-' + c.font + (c.bold ? ' bold' : '') + (c.vert ? ' vert' : ''), style: { color: c.color, textAlign: c.align } });
      if (c.vert) inner.innerHTML = vtHTML(c.text); else inner.textContent = c.text;
      const box = h('div', { class: 'w-text bg-' + c.bg + (c.text ? '' : ' empty') + (c.vert ? ' vert' : '') }, inner);
      if (!c.text) inner.textContent = '雙擊這裡打字';
      inner.addEventListener('dblclick', () => {
        if (inner.isContentEditable) return;
        inner.textContent = c.text; inner.contentEditable = 'true'; box.classList.remove('empty'); inner.focus();
        const r = document.createRange(); r.selectNodeContents(inner); r.collapse(false); const s = getSelection(); s.removeAllRanges(); s.addRange(r);
        inner.addEventListener('blur', () => { c.text = inner.innerText.replace(/\n+$/, ''); save(); Wall.drawWidget(wd); Wall.refreshPanel(wd); }, { once: true });
      });
      b.append(box);
      requestAnimationFrame(() => {
        fitText(box, inner, 0, 400);
        if (!c.vert) return;
        // 直書盡量一行一直排（不自動折行）；這樣字會小太多時才折行
        const wrapped = parseFloat(inner.style.fontSize);
        inner.style.whiteSpace = 'pre'; fitText(box, inner, 0, 400);
        if (parseFloat(inner.style.fontSize) < wrapped * .6) { inner.style.whiteSpace = ''; inner.style.fontSize = wrapped + 'px'; }
      });
      return null;
    },
    settings(f, wd, ap) {
      const c = wd.cfg;
      f.append(F.area('文字', c.text, v => { c.text = v; ap(); }, '也可以在小工具上雙擊直接打字'),
        F.seg('底色', [['white', '白'], ['yellow', '便利貼'], ['chalk', '黑板'], ['none', '透明']], c.bg, v => { c.bg = v; if (v === 'chalk' && c.color === '#22303c') c.color = '#f6f2e4'; if (v !== 'chalk' && c.color === '#f6f2e4') c.color = '#22303c'; ap(true); }),
        F.seg('方向', [[false, '橫書'], [true, '直書']], !!c.vert, v => { c.vert = v; ap(true); }),
        F.seg('字體', [['sans', '黑體'], ['kai', '楷書']], c.font, v => { c.font = v; ap(true); }),
        F.seg('對齊', [['left', c.vert ? '靠上' : '靠左'], ['center', '置中']], c.align, v => { c.align = v; ap(true); }),
        F.tog('粗體', c.bold, v => { c.bold = v; ap(); }),
        F.row('文字顏色', h('div', { class: 'swatches' }, ['#22303c', '#f6f2e4', '#d63c3c', '#e07b00', '#1f8f4e', '#2a62c9', '#7a3fc4'].map(col => h('button', { class: 'sw' + (c.color === col ? ' on' : ''), style: { background: col }, onclick: () => { c.color = col; ap(true); } }))),
          h('input', { type: 'color', value: c.color, oninput: e => { c.color = e.target.value; ap(); } })),
        h('p', { class: 'muted small' }, '字的大小會自動配合框框；拉大框框，字就變大。'));
    }
  },
  sched: {
    name: '課表進度', icon: '📅', w: 34, h: 62,
    cfg: () => ({ title: '今天的課', src: 'today', all: false, items: [{ name: '晨讀', start: '07:50', end: '08:30' }] }),
    render(b, wd) {
      const c = wd.cfg, list = h('div', { class: 'ws-list' });
      b.append(h('div', { class: 'w-card w-sched' }, c.title ? h('div', { class: 'w-h' }, c.title) : null, list));
      let key = '', rows = [];
      return now => {
        const m = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
        const items = c.src === 'today'
          ? schedNow(now).list.filter(p => c.all || p.kind === 'class').map(p => ({ name: p.subj || p.label, sub: p.subj ? p.label : '', s: p.s, e: p.e, exam: isExam(p.subj) }))
          : (c.items || []).filter(x => x.name && x.start && x.end).map(x => ({ name: x.name, sub: '', s: toMin(x.start), e: toMin(x.end) })).sort((a, b) => a.s - b.s);
        const k = items.map(x => x.name + x.s + x.e).join('|');
        if (k !== key) {
          key = k;
          rows = items.map(x => ({ x, bar: h('i'), el: null }));
          list.replaceChildren(...rows.map(r => (r.el = h('div', { class: 'ws-row' + (r.x.exam ? ' exam' : '') },
            h('div', { class: 'ws-name' }, r.x.name, r.x.sub ? h('small', null, r.x.sub) : null),
            h('div', { class: 'ws-time' }, fmtClock(r.x.s) + '–' + fmtClock(r.x.e)),
            h('div', { class: 'ws-bar' }, r.bar)))));
          if (!items.length) list.append(h('div', { class: 'muted center' }, c.src === 'today' ? '今天沒有課（到課表設定）' : '按 ⚙ 加入項目'));
        }
        for (const r of rows) {
          const p = clamp((m - r.x.s) / (r.x.e - r.x.s), 0, 1);
          r.bar.style.width = p * 100 + '%';
          r.el.classList.toggle('cur', m >= r.x.s && m < r.x.e); r.el.classList.toggle('past', m >= r.x.e);
        }
      };
    },
    settings(f, wd, ap) {
      const c = wd.cfg;
      f.append(F.text('標題', c.title, v => { c.title = v; ap(); }),
        F.seg('內容', [['today', '今天的課表'], ['custom', '自己寫']], c.src, v => { c.src = v; ap(true); }));
      if (c.src === 'today') f.append(F.tog('也列出早自習、午休等', c.all, v => { c.all = v; ap(); }));
      else {
        const L = c.items;
        f.append(h('div', { class: 'we-ed' }, L.map((x, i) => h('div', { class: 'we-ed-row' },
          h('input', { class: 'inp', value: x.name, placeholder: '項目', oninput: e => { x.name = e.target.value; ap(); } }),
          h('input', { class: 'inp', type: 'time', value: x.start, onchange: e => { x.start = e.target.value; ap(); } }),
          h('input', { class: 'inp', type: 'time', value: x.end, onchange: e => { x.end = e.target.value; ap(); } }),
          h('button', { class: 'mv', onclick: () => { L.splice(i, 1); ap(true); } }, '×')))),
          h('button', { class: 'btn sm', onclick: () => { const l = L[L.length - 1]; const s = l ? toMin(l.end) + 5 : 480; L.push({ name: '', start: minToHM(s), end: minToHM(s + 30) }); ap(true); } }, '＋ 加一項'));
      }
    }
  },
  att: {
    name: '應到實到', icon: '🧮', w: 30, h: 18,
    cfg: () => ({ auto: true, expected: 25, actual: 25 }),
    render(b, wd) {
      const c = wd.cfg, ea = h('b'), aa = h('b');
      b.append(h('div', { class: 'w-card w-att' }, h('div', null, '應到 ', ea, ' 人'), h('div', null, '實到 ', aa, ' 人')));
      return () => { ea.textContent = c.auto ? D.students.length : c.expected; aa.textContent = c.auto ? presentList().length : c.actual; };
    },
    settings(f, wd, ap) {
      const c = wd.cfg;
      f.append(F.seg('人數', [[true, '照今天點名'], [false, '自己填']], c.auto, v => { c.auto = v; ap(true); }));
      if (!c.auto) f.append(F.num('應到', c.expected, 0, 99, v => { c.expected = v; ap(); }), F.num('實到', c.actual, 0, 99, v => { c.actual = v; ap(); }));
    }
  },
  board: {
    name: '聯絡簿', icon: '📒', w: 40, h: 56,
    cfg: () => ({ side: true, att: false }),
    render(b, wd) {
      const box = h('div', { class: 'w-card w-board' });
      b.append(box);
      let key = '';
      // 黑板內容、值日生、倒數、應到實到改了（或換日）才重畫
      return () => {
        const side = wd.cfg.side !== false, att = side && wd.cfg.att ? wallAtt() : null;
        const k = JSON.stringify(D.board) + fmtMD(new Date()) + (side ? Board.dutyToday().map(s => s.no).join() + Board.countdownText() : '') + (att ? att.join('/') : '');
        if (k === key) return;
        key = k;
        const inner = Board.render(true, side ? { att: att || false } : undefined), main = h('div', { class: 'wb-main' }, inner);
        box.replaceChildren(main);
        requestAnimationFrame(() => fitText(main, inner, 0, 200));
      };
    },
    settings(f, wd, ap) {
      const side = wd.cfg.side !== false;
      f.append(h('p', null, '顯示教室黑板的內容（聯絡簿或自由書寫）。'),
        F.tog('聯絡簿前面也寫倒數和值日生', side, v => { wd.cfg.side = v; ap(true); }),
        h('div', { hidden: !side }, F.tog('也寫應到、實到', wd.cfg.att, v => { wd.cfg.att = v; ap(true); }),
          h('p', { class: 'muted small' }, '人數和動態牆上的「應到實到」小工具一樣（自己填的數字也會跟著變）；沒有那個小工具時，照考試面板的人數或今天的點名。')),
        h('p', { class: 'muted small' }, '值日生、倒數在「編輯黑板」下面的「聯絡簿前面也寫」設定。橫書時寫在最上面兩行，直書時是最右邊兩行。'),
        h('button', { class: 'btn', onclick: () => Board.edit() }, '✎ 編輯黑板'));
    }
  },
  traffic: {
    name: '紅綠燈', icon: '🚦', w: 14, h: 52,
    cfg: () => ({ state: 'green', red: '安靜', yellow: '小聲', green: '可以說話', label: true }),
    render(b, wd) {
      const c = wd.cfg;
      b.append(h('div', { class: 'w-traffic' }, h('div', { class: 'wtl-box' }, ['red', 'yellow', 'green'].map(k => h('button', { class: 'wtl ' + k + (c.state === k ? ' on' : ''), title: c[k], onclick: () => { c.state = k; save(); Wall.drawWidget(wd); } }))),
        c.label ? h('div', { class: 'wtl-label' }, c[c.state]) : null));
      return null;
    },
    settings(f, wd, ap) {
      const c = wd.cfg;
      f.append(F.text('紅燈', c.red, v => { c.red = v; ap(); }), F.text('黃燈', c.yellow, v => { c.yellow = v; ap(); }), F.text('綠燈', c.green, v => { c.green = v; ap(); }), F.tog('顯示文字', c.label, v => { c.label = v; ap(); }));
    }
  },
  work: {
    name: '工作提示', icon: '🤫', w: 22, h: 34,
    cfg: () => ({ cur: 0, use: [0, 1, 2, 4, 5] }),
    render(b, wd) {
      const c = wd.cfg, L = c.use.map(i => WORK_SET[i]).filter(Boolean), it = L[c.cur % (L.length || 1)] || WORK_SET[0];
      b.append(h('button', { class: 'w-card w-work', title: '點一下換下一個', onclick: () => { c.cur = (c.cur + 1) % (L.length || 1); save(); Wall.drawWidget(wd); } }, h('div', { class: 'ww-i' }, it.i), h('div', { class: 'ww-t' }, it.t)));
      return null;
    },
    settings(f, wd, ap) {
      const c = wd.cfg;
      f.append(h('p', { class: 'muted small' }, '點小工具會依序換下一個。勾選要輪流的提示：'),
        h('div', { class: 'reasons' }, WORK_SET.map((w, i) => h('button', { class: 'chip' + (c.use.includes(i) ? ' on' : ''), onclick: () => { c.use = c.use.includes(i) ? c.use.filter(x => x !== i) : c.use.concat(i).sort((a, b) => a - b); if (!c.use.length) c.use = [i]; c.cur = 0; ap(true); } }, w.i + ' ' + w.t))));
    }
  },
  random: {
    name: '抽籤', icon: '🎯', w: 26, h: 34,
    cfg: () => ({ round: [], last: null, src: 'class', names: '', from: 1, to: 30 }),
    render(b, wd) {
      const c = wd.cfg, name = h('div', { class: 'wr-name' }), P = drawPool(c), sh = x => P.find(p => p.id === x);
      drawShow(name, c.last != null ? sh(c.last) : null, c.last != null && !!sh(c.last));
      const go = () => {
        let pool = P.filter(x => !c.round.includes(x.id)); if (!pool.length) { c.round = []; pool = P.filter(x => x.id !== c.last); if (!pool.length) pool = P; }
        const win = pick(pool); let i = 0;
        const step = () => { if (i++ < 14) { drawShow(name, pick(P)); Snd.tick(); setTimeout(step, 50 + i * 12); } else { c.last = win.id; c.round.push(win.id); save(); drawShow(name, win, true); Snd.win(); } };
        step();
      };
      b.append(h('div', { class: 'w-card w-random' }, name, P.length ? h('button', { class: 'wbtn yellow', onclick: go }, '抽！')
        : [h('div', { class: 'wr-hint' }, (c.src || 'class') === 'class' ? '還沒有名單' : '名單是空的'), h('button', { class: 'wbtn', onclick: () => Wall.select(wd.id, true) }, '⚙ 輸入名單')]));
      return null;
    },
    settings(f, wd, ap) {
      const c = wd.cfg, src = c.src || 'class', P = drawPool(c), reset = () => { c.round = []; c.last = null; };
      f.append(F.seg('從哪裡抽', [['class', '班上同學'], ['list', '自己輸入名單'], ['nums', '座號']], src, v => { c.src = v; reset(); ap(true); }));
      if (src === 'class') {
        const openRoster = typeof Roster === 'object' ? () => Roster.open() : typeof Settings === 'object' ? () => Settings.open('roster') : null;
        f.append(h('p', { class: 'muted small' }, D.students.length ? '從今天出席的同學裡抽（今天 ' + P.length + ' 位）。' : '班上還沒有名單：可以先建立班級名單，或改用「自己輸入名單」「座號」。'));
        if (openRoster) f.append(h('button', { class: 'btn', onclick: openRoster }, D.students.length ? '👥 修改班級名單' : '👥 建立班級名單'));
      } else if (src === 'list') {
        f.append(F.area('名單（一行一個，也可以用逗號、頓號隔開）', c.names, v => { c.names = v; reset(); ap(); }, '例如：\n01 王小明\n02 李小華\n或：第一組、第二組、第三組'),
          h('p', { class: 'muted small' }, '可以放名字、組別、題目，什麼都可以抽。這份名單只給這個抽籤用。'));
      } else {
        const num = (v, on) => h('input', { class: 'inp num', type: 'number', min: 1, max: 99, value: v, onchange: e => { on(clamp(Math.round(+e.target.value) || 1, 1, 99)); reset(); ap(true); } });
        f.append(F.row('座號', h('div', { class: 'row' }, '從', num(c.from || 1, v => { c.from = v; }), '號到', num(c.to || 30, v => { c.to = v; }), '號')),
          h('p', { class: 'muted small' }, '只抽座號，不用輸入名字。'));
      }
      f.append(h('p', { class: 'muted small' }, '同一輪抽過的不會再抽到' + (P.length ? '（這一輪已抽 ' + c.round.filter(id => P.some(p => p.id === id)).length + '／' + P.length + '）' : '') + '。'),
        h('button', { class: 'btn', onclick: () => { reset(); ap(true); toast('重新開始一輪'); } }, '重新開始一輪'));
    }
  },
  dice: {
    name: '骰子', icon: '🎲', w: 20, h: 28,
    cfg: () => ({ n: 1, vals: [6] }),
    render(b, wd) {
      const c = wd.cfg, faces = '⚀⚁⚂⚃⚄⚅', box = h('div', { class: 'wdc-faces' });
      const show = v => box.replaceChildren(...v.map(x => h('span', null, faces[x - 1])));
      show(c.vals.slice(0, c.n).concat(Array(Math.max(0, c.n - c.vals.length)).fill(1)));
      b.append(h('button', { class: 'w-card w-dice', title: '點一下擲骰子', onclick: () => {
        let i = 0; const roll = () => Array.from({ length: c.n }, () => 1 + Math.floor(Math.random() * 6));
        const step = () => { if (i++ < 10) { show(roll()); Snd.tick(); setTimeout(step, 60); } else { c.vals = roll(); show(c.vals); save(); Snd.pop(); } };
        step();
      } }, box));
      return null;
    },
    settings(f, wd, ap) { f.append(F.seg('幾顆', [[1, '1 顆'], [2, '2 顆'], [3, '3 顆']], wd.cfg.n, v => { wd.cfg.n = v; ap(true); })); }
  },
  countdown: {
    name: '倒數日', icon: '📆', w: 30, h: 20,
    cfg: () => ({ name: '段考', date: '' }),
    render(b, wd) {
      const c = wd.cfg, t = h('div', { class: 'wcd-t' });
      b.append(h('div', { class: 'w-card w-cd' }, t));
      let last = '';
      return () => {
        const k = dateKey(); if (k === last) return; last = k;
        if (!c.date) { t.textContent = '按 ⚙ 設定日期'; return; }
        const n = daysBetween(k, c.date);
        t.textContent = n > 1 ? c.name + ' 還有 ' + n + ' 天' : n === 1 ? '明天' + c.name : n === 0 ? '今天' + c.name + '！' : c.name + ' 已經過了';
      };
    },
    settings(f, wd, ap) { const c = wd.cfg; f.append(F.text('名稱', c.name, v => { c.name = v; ap(); }), F.row('日期', h('input', { class: 'inp', type: 'date', value: c.date, onchange: e => { c.date = e.target.value; ap(); } }))); }
  },
  sound: {
    name: '音量計', icon: '🔉', w: 28, h: 34,
    cfg: () => ({ limit: 60 }),
    render(b, wd) {
      const c = wd.cfg, fill = h('i'), face = h('div', { class: 'wsm-face' }, '🙂'), btn = h('button', { class: 'wbtn' }, '🎤 開始聽');
      const line = h('b', { class: 'wsm-line', style: { left: c.limit + '%' } });
      b.append(h('div', { class: 'w-card w-sound' }, face, h('div', { class: 'wsm-bar' }, fill, line), btn));
      btn.onclick = async () => {
        if (Wall.mics.has(wd.id)) { Wall.stopMic(wd.id); btn.textContent = '🎤 開始聽'; return; }
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const ac = Snd.ac(), src = ac.createMediaStreamSource(stream), an = ac.createAnalyser();
          an.fftSize = 1024; src.connect(an);
          const buf = new Uint8Array(an.fftSize); let lv = 0;
          const loop = () => {
            an.getByteTimeDomainData(buf);
            let sum = 0; for (const v of buf) sum += (v - 128) * (v - 128);
            const rms = Math.sqrt(sum / buf.length);
            lv = lv * 0.8 + clamp(rms * 2.2, 0, 100) * 0.2;
            fill.style.width = lv + '%';
            const loud = lv > c.limit;
            fill.parentNode.classList.toggle('loud', loud);
            face.textContent = loud ? '😣' : lv > c.limit * 0.7 ? '😐' : '🙂';
            M.raf = requestAnimationFrame(loop);
          };
          const M = { stream, raf: 0 }; Wall.mics.set(wd.id, M); loop();
          btn.textContent = '⏹ 停止';
        } catch (e) { toast('無法使用麥克風：請允許瀏覽器使用麥克風'); }
      };
      return null;
    },
    settings(f, wd, ap) { f.append(F.num('太吵的界線（0～100）', wd.cfg.limit, 5, 95, v => { wd.cfg.limit = v; ap(); }), h('p', { class: 'muted small' }, '第一次使用時，瀏覽器會問要不要允許使用麥克風。')); }
  },
  image: {
    name: '圖片', icon: '🖼️', w: 30, h: 40,
    cfg: () => ({ img: null, fit: 'contain', cap: '' }),
    render(b, wd) {
      const c = wd.cfg, box = h('div', { class: 'w-card w-image' });
      if (c.img) { const img = h('img', { alt: c.cap || '圖片', style: { objectFit: c.fit } }); ImgDB.get(c.img).then(u => { if (u) img.src = u; }).catch(() => { }); box.append(img); }
      else box.append(h('button', { class: 'wbtn', onclick: () => Wall.uploadImg(wd) }, '🖼 選擇圖片'));
      if (c.cap) box.append(h('div', { class: 'wi-cap' }, c.cap));
      b.append(box);
      return null;
    },
    settings(f, wd, ap) {
      const c = wd.cfg;
      f.append(h('button', { class: 'btn', onclick: () => Wall.uploadImg(wd) }, '🖼 換一張圖片'),
        F.seg('顯示方式', [['contain', '完整顯示'], ['cover', '填滿框框']], c.fit, v => { c.fit = v; ap(true); }),
        F.text('說明文字', c.cap, v => { c.cap = v; ap(); }, '可以不填'));
    }
  },
  weather: {
    name: '天氣空品', icon: '🌤️', w: 30, h: 50,
    cfg: () => ({ place: WX_PLACES[0][0], name: WX_PLACES[0][0], lat: WX_PLACES[0][1], lon: WX_PLACES[0][2], wx: true, aq: true, tip: true, fc: true }),
    render(b, wd) {
      const c = wd.cfg, box = h('div', { class: 'w-card w-wx' });
      b.append(box);
      const paint = e => {
        const d = e.data;
        if (!d) {
          box.replaceChildren(h('div', { class: 'wx-msg' }, e.err ? '⚠ 連不上氣象資料' : '讀取天氣中…',
            e.err ? h('small', null, WX.blocked ? '這個畫面不允許連到氣象網站，請改用班級百寶箱或單機版動態牆' : '請檢查網路，5 分鐘後會再試一次') : null));
          return;
        }
        const cur = d.w.current, day = d.w.daily, a = d.a && d.a.current, [ic, tx] = wxLook(cur.weather_code, cur.is_day);
        const rain = i => (day.precipitation_probability_max[i] ?? '–') + '%', range = i => Math.round(day.temperature_2m_min[i]) + '～' + Math.round(day.temperature_2m_max[i]) + '°';
        const kids = [h('div', { class: 'wx-top' }, h('span', null, '📍 ' + (c.name || '天氣')), h('span', { class: 'wx-at' }, hm(new Date(d.at)) + ' 更新' + (e.err ? '（離線）' : '')))];
        if (c.wx) kids.push(
          h('div', { class: 'wx-now' }, h('span', { class: 'wx-ic' }, ic), h('span', { class: 'wx-temp' }, Math.round(cur.temperature_2m), h('small', null, '°C')),
            h('div', { class: 'wx-desc' }, h('b', null, tx), h('span', null, range(0) + 'C'))),
          h('div', { class: 'wx-info' }, h('span', null, '☔ 降雨 ' + rain(0)), h('span', null, '💧 濕度 ' + cur.relative_humidity_2m + '%'), h('span', null, '🌡️ 體感 ' + Math.round(cur.apparent_temperature) + '°'),
            day.uv_index_max && day.uv_index_max[0] != null ? h('span', null, '🔆 紫外線 ' + Math.round(day.uv_index_max[0])) : null));
        if (c.aq && a && a.us_aqi != null) {
          const L = aqiLv(a.us_aqi);
          kids.push(h('div', { class: 'wx-aq', style: '--aq:' + L[2] + ';--aqt:' + L[3] }, h('span', { class: 'wx-aqb' }, 'AQI ', h('b', null, Math.round(a.us_aqi)), ' ', L[1]),
            a.pm2_5 != null ? h('span', { class: 'wx-pm' }, 'PM2.5 ', h('b', null, Math.round(a.pm2_5))) : null), c.tip ? h('div', { class: 'wx-tip' }, '🏃 ' + L[4]) : null);
        } else if (c.aq) kids.push(h('div', { class: 'wx-tip' }, '空氣品質資料暫時沒有'));
        if (c.fc) kids.push(h('div', { class: 'wx-fc' }, [1, 2, 3].filter(i => day.time[i]).map(i => h('div', null,
          h('span', null, i === 1 ? '明天' : i === 2 ? '後天' : '週' + WD[new Date(day.time[i] + 'T00:00').getDay()]), h('span', { class: 'wx-fi' }, wxLook(day.weather_code[i])[0]), h('span', null, range(i)), h('small', null, '☔' + rain(i))))));
        box.replaceChildren(...kids);
      };
      let last = '';
      return () => {
        const e = WX.get(c.lat, c.lon), sig = (e.v || 0) + ':' + !!e.data + ':' + !!e.err;
        if (sig !== last) { last = sig; paint(e); }
      };
    },
    settings(f, wd, ap) {
      const c = wd.cfg, custom = !WX_PLACES.some(p => p[0] === c.place);
      f.append(F.row('地點', h('select', { class: 'inp', onchange: e => {
        const p = WX_PLACES.find(x => x[0] === e.target.value);
        if (p) { c.place = c.name = p[0]; c.lat = p[1]; c.lon = p[2]; } else c.place = '';
        ap(true);
      } }, WX_PLACES.map(p => h('option', { value: p[0], selected: p[0] === c.place }, p[0])), h('option', { value: '', selected: custom }, '自訂地點（填經緯度）'))));
      if (custom) f.append(F.text('地點名稱', c.name, v => { c.name = v; ap(); }),
        F.row('緯度、經度',
          h('input', { class: 'inp num', type: 'number', step: '0.0001', value: c.lat, 'aria-label': '緯度', onchange: e => { c.lat = clamp(+e.target.value || 0, -90, 90); ap(); } }),
          h('input', { class: 'inp num', type: 'number', step: '0.0001', value: c.lon, 'aria-label': '經度', onchange: e => { c.lon = clamp(+e.target.value || 0, -180, 180); ap(); } })),
        h('button', { class: 'btn sm', onclick: () => {
          if (!navigator.geolocation) return toast('這個瀏覽器不能取得位置，請自己填經緯度');
          navigator.geolocation.getCurrentPosition(p => { c.lat = +p.coords.latitude.toFixed(4); c.lon = +p.coords.longitude.toFixed(4); if (!c.name) c.name = '目前位置'; ap(true); },
            () => toast('沒有取得位置：請允許瀏覽器使用位置，或自己填經緯度'), { timeout: 10000 });
        } }, '📍 用這台電腦的位置'));
      f.append(F.tog('天氣（溫度、降雨機率、濕度、紫外線）', c.wx, v => { c.wx = v; ap(); }),
        F.tog('空氣品質（AQI、PM2.5）', c.aq, v => { c.aq = v; ap(); }),
        F.tog('戶外活動建議（照 AQI 分級）', c.tip, v => { c.tip = v; ap(); }),
        F.tog('明天、後天的預報（框框太矮時會自動藏起來）', c.fc, v => { c.fc = v; ap(); }),
        h('button', { class: 'btn sm', onclick: () => { WX.get(c.lat, c.lon, true); toast('正在更新天氣…'); } }, '🔄 現在更新'),
        h('p', { class: 'muted small' }, '資料來自 Open-Meteo，每 20 分鐘自動更新，連不上網路時顯示上一次的資料。天氣是預報模式算出來的；空氣品質是 CAMS 模式推估，AQI 用美國的算法，六級名稱和顏色和環境部空氣品質指標一樣。數字可能和中央氣象署、環境部測站不同。'));
    }
  },
  embed: {
    name: '影片網頁', icon: '📺', w: 44, h: 54,
    cfg: () => ({ url: '', title: '', zoom: 100, autoplay: false, loop: false, start: 0, hideBar: false }),
    render(b, wd) {
      const c = wd.cfg, s = embedSrc(c);
      const box = h('div', { class: 'w-card w-embed' + (c.hideBar ? ' nohead' : '') });
      box.append(h('div', { class: 'wem-head', title: '拖曳這裡移動' }, h('span', { class: 'wem-t' }, c.title || (s ? (s.kind === 'yt' ? '▶ ' : '🌐 ') + s.label : '📺 影片／網頁')),
        s ? h('a', { class: 'wem-open', href: s.open, target: '_blank', rel: 'noopener', title: '在新分頁打開' }, '↗') : null));
      b.append(box);
      if (!s) {
        box.append(h('div', { class: 'wem-empty' }, h('div', { class: 'wem-big' }, '📺'), h('div', null, c.url ? '這個網址看不懂，請檢查一下' : '貼上 YouTube 影片或網頁的網址'),
          h('button', { class: 'wbtn', onclick: () => Wall.select(wd.id, true) }, '⚙ 輸入網址')));
        return null;
      }
      const wrap = h('div', { class: 'wem-frame ' + s.kind });
      if (s.kind === 'web' && +c.zoom && +c.zoom !== 100) wrap.style.setProperty('--z', +c.zoom / 100);
      box.append(wrap);
      EmbedKeep.put(wrap, wd.id, s.src, () => h('iframe', { src: s.src, 'data-wid': wd.id, 'data-src': s.src, title: c.title || s.label,
        allow: 'autoplay; encrypted-media; picture-in-picture; fullscreen; clipboard-write', referrerpolicy: 'strict-origin-when-cross-origin' }));
      return null;
    },
    settings(f, wd, ap) {
      const c = wd.cfg, s = embedSrc(c);
      f.append(F.row('網址', h('input', { class: 'inp', value: c.url || '', placeholder: '貼上 YouTube 或網頁的網址', onchange: e => { c.url = e.target.value.trim(); ap(true); }, onkeydown: e => { if (e.key === 'Enter') e.target.blur(); } })),
        h('p', { class: 'muted small' }, !s ? '可以貼：YouTube 影片、播放清單、Shorts、直播；Google 簡報／文件／表單（要先開「知道連結的任何人都能查看」）、Canva、Padlet、Wordwall 等網頁。貼好按 Enter。'
          : s.kind === 'yt' ? '✅ ' + s.label + '：可以直接在框框裡播放、全螢幕。'
          : '🌐 網頁：' + s.label + '。有些網站不允許放進別的網頁，框框裡會空白或顯示「拒絕連線」，這時請按標題列右邊的 ↗ 在新分頁打開。'),
        F.row('標題（可以不填）', h('input', { class: 'inp', value: c.title || '', placeholder: s ? s.label : '', onchange: e => { c.title = e.target.value; ap(); } })));
      if (s && s.kind === 'yt') f.append(F.tog('自動播放（瀏覽器規定要先靜音）', c.autoplay, v => { c.autoplay = v; ap(); }), F.tog('播完重複播放', c.loop, v => { c.loop = v; ap(); }),
        F.num('從第幾秒開始', +c.start || 0, 0, 36000, v => { c.start = v; ap(); }, '秒（0＝照網址）'));
      if (s && s.kind === 'web') f.append(F.seg('網頁縮放（字太大或太小時調整）', [[50, '50%'], [75, '75%'], [100, '100%'], [125, '125%'], [150, '150%']], +c.zoom || 100, v => { c.zoom = v; ap(true); }));
      f.append(F.tog('鎖定版面時隱藏標題列', c.hideBar, v => { c.hideBar = v; ap(); }),
        h('p', { class: 'muted small' }, '移動這個小工具：拖曳上面的標題列（影片和網頁本身可以直接點、捲動）。直接打開電腦裡的檔案時，YouTube 會經過班級百寶箱的 GitHub 網站播放，電腦要能上網。'));
    }
  }
};
const WT_ORDER = ['clock', 'exam', 'timer', 'text', 'sched', 'att', 'board', 'weather', 'traffic', 'work', 'random', 'dice', 'countdown', 'sound', 'image', 'embed'];

const WALL_TPL = {
  exam: {
    name: '考試牆', icon: '📝', desc: '時鐘、考試科目與進度條、應到實到、提醒', bg: 'paper',
    widgets: [
      { type: 'clock', x: 3, y: 8, w: 30, h: 70, cfg: { style: 'both', sec: true, date: true, period: false } },
      { type: 'exam', x: 36, y: 5, w: 61, h: 86 }
    ]
  },
  lesson: {
    name: '上課牆', icon: '📚', desc: '時鐘、計時器、紅綠燈、工作提示、文字', bg: 'sky',
    widgets: [
      { type: 'clock', x: 3, y: 5, w: 22, h: 44, cfg: { style: 'both', sec: false, date: true, period: true } },
      { type: 'text', x: 28, y: 5, w: 44, h: 24, cfg: { text: '今天的學習目標', bg: 'white' } },
      { type: 'timer', x: 75, y: 5, w: 22, h: 36 },
      { type: 'work', x: 28, y: 33, w: 22, h: 36 },
      { type: 'traffic', x: 53, y: 33, w: 12, h: 50 },
      { type: 'text', x: 3, y: 54, w: 22, h: 30, cfg: { text: '記得舉手發言', bg: 'yellow' } }
    ]
  },
  morning: {
    name: '早自習牆', icon: '🌅', desc: '聯絡簿、時鐘、今天的課表進度', bg: 'chalk',
    widgets: [
      { type: 'board', x: 3, y: 5, w: 55, h: 88 },
      { type: 'clock', x: 61, y: 5, w: 36, h: 30, cfg: { style: 'digital', sec: false, date: true, period: true } },
      { type: 'sched', x: 61, y: 38, w: 36, h: 55 }
    ]
  },
  blank: { name: '空白牆', icon: '⬜', desc: '從空白開始，自己放小工具', bg: 'paper', widgets: [] }
};

/* ---------- 動態牆本體 ---------- */
const Wall = {
  root: null, canvas: null, panel: null, sel: null, live: new Map(), mics: new Map(), tk: null, fold: null,
  isOpen() { return !!this.root; },
  // 小工具列收起來了沒（localStorage 'bxbox-wdock'；瀏覽器不讓存時只記在這次打開）
  dockFold() {
    if (this.fold == null) { try { this.fold = localStorage.getItem('bxbox-wdock') === 'fold'; } catch (e) { this.fold = false; } }
    return this.fold;
  },
  setFold(v) {
    this.fold = !!v;
    try { if (v) localStorage.setItem('bxbox-wdock', 'fold'); else localStorage.removeItem('bxbox-wdock'); } catch (e) { }
    if (this.root) this.draw();
  },
  page() {
    let p = D.wall.pages.find(x => x.id === D.wall.cur);
    if (!p && D.wall.pages.length) { p = D.wall.pages[0]; D.wall.cur = p.id; }
    return p;
  },
  cur() { const p = this.page(); return p && p.widgets.find(w => w.id === this.sel); },
  maxZ() { return Math.max(0, ...this.page().widgets.map(w => w.z || 0)); },
  open() {
    if (!D.wall.pages.length) return this.templates();
    if (this.root) return;
    try { localStorage.setItem('bxbox-wall', '1'); } catch (e) { }
    this.root = h('div', { id: 'wall', class: 'wall' });
    document.body.append(this.root); document.body.classList.add('wall-open');
    this.draw();
    this.tk = () => { const now = new Date(); for (const up of this.live.values()) { try { up(now); } catch (e) { console.error(e); } } };
    Tick.add(this.tk);
    this.onKey = e => this.key(e); document.addEventListener('keydown', this.onKey);
    let rt = null; this.onResize = () => { clearTimeout(rt); rt = setTimeout(() => this.root && this.draw(), 200); };
    window.addEventListener('resize', this.onResize);
  },
  close() {
    if (!this.root) return;
    this.stopMics(); Tick.delete(this.tk);
    document.removeEventListener('keydown', this.onKey); window.removeEventListener('resize', this.onResize);
    this.root.remove(); this.root = null; this.sel = null; this.live.clear();
    document.body.classList.remove('wall-open');
    try { localStorage.removeItem('bxbox-wall'); } catch (e) { }
    refresh();
  },
  bgCSS(bg) {
    if (!bg) return WALL_BG.paper.css;
    if (bg.type === 'color') return bg.v;
    if (bg.type === 'image') return '#333';
    return (WALL_BG[bg.v] || WALL_BG.paper).css;
  },
  draw() {
    EmbedKeep.depth++; EmbedKeep.stash(this.root);
    try { this.drawAll(); } finally { EmbedKeep.depth--; EmbedKeep.flush(); }
  },
  drawAll() {
    const P = this.page(), locked = !!D.wall.locked;
    this.stopMics(); this.live.clear();
    this.root.replaceChildren();
    this.root.classList.toggle('locked', locked);
    const cv = this.canvas = h('div', { class: 'w-canvas' });
    cv.style.background = this.bgCSS(P.bg);
    if (P.bg && P.bg.type === 'image') ImgDB.get(P.bg.v).then(u => { if (u) cv.style.background = 'center/cover no-repeat url("' + u + '"), #333'; }).catch(() => { });
    cv.classList.toggle('dark', !!P.bg && (P.bg.v === 'chalk' || P.bg.v === 'night'));
    cv.addEventListener('pointerdown', e => { if (e.target === cv) this.select(null); });
    for (const wd of P.widgets) cv.append(this.makeWidget(wd));
    if (!P.widgets.length) cv.append(h('div', { class: 'w-empty' }, '從下面的工具列加入小工具，拖曳移動、拉右下角調整大小。'));
    const n = D.wall.pages.length, i = D.wall.pages.indexOf(P);
    const nav = h('div', { class: 'w-nav' },
      h('button', { class: 'wbtn', disabled: i <= 0, title: '上一頁', onclick: () => this.go(i - 1) }, '‹'),
      h('button', { class: 'w-pname', title: '頁面選單', onclick: () => this.pageMenu() }, P.name + '　' + (i + 1) + '/' + n),
      h('button', { class: 'wbtn', disabled: i >= n - 1, title: '下一頁', onclick: () => this.go(i + 1) }, '›'),
      h('button', { class: 'wbtn', title: '新增一頁', onclick: () => this.templates() }, '＋'));
    const top = h('div', { class: 'w-top' },
      h('button', { class: 'wbtn', onclick: () => this.close() }, '← 回教室'),
      cloudWallLink('wbtn', '☁ 雲端版'),
      h('span', { class: 'grow' }),
      h('button', { class: 'wbtn', title: locked ? '解除鎖定才能移動小工具' : '鎖住後，小工具不會被拖動', onclick: () => { D.wall.locked = !locked; save(); this.sel = null; this.draw(); } }, locked ? '🔓 編輯版面' : '🔒 鎖定版面'),
      h('button', { class: 'wbtn', onclick: () => toggleFull() }, '⛶ 全螢幕'));
    // 小工具列可以收起來（記在這台電腦），收起時下面只留一個小按鈕
    const dock = this.dockFold()
      ? h('button', { class: 'w-dockshow', title: '打開小工具列', onclick: () => this.setFold(false) }, '︿ 小工具列')
      : h('div', { class: 'w-dock' },
        h('button', { class: 'wd-add', onclick: () => this.bgPicker() }, h('span', null, '🎨'), h('small', null, '背景')),
        WT_ORDER.map(k => h('button', { class: 'wd-add', title: '加入' + WT[k].name, onclick: () => this.add(k) }, h('span', null, WT[k].icon), h('small', null, WT[k].name))),
        h('button', { class: 'wd-add wd-fold', title: '收起小工具列（下面會留一個小按鈕，可以再打開）', onclick: () => this.setFold(true) }, h('span', null, '﹀'), h('small', null, '收起')));
    this.panel = h('div', { class: 'w-panel', hidden: true });
    this.root.append(...[cv, top, locked ? null : dock, nav, this.panel].filter(Boolean));
    if (this.sel && this.cur()) this.select(this.sel, !this.panelWasOpen ? false : true); else this.sel = null;
  },
  makeWidget(wd) {
    const el = h('div', { class: 'wd wd-' + wd.type + (this.sel === wd.id ? ' sel' : ''), 'data-id': wd.id });
    this.place(el, wd);
    const body = h('div', { class: 'wd-body' });
    el.append(body,
      h('div', { class: 'wd-bar' },
        h('button', { title: '設定', onclick: () => this.select(wd.id, true) }, '⚙'),
        h('button', { title: '複製', onclick: () => this.dup(wd) }, '⧉'),
        h('button', { title: '刪除', onclick: () => this.remove(wd) }, '🗑')),
      h('div', { class: 'wd-rs', title: '拖曳調整大小' }));
    this.fill(body, wd);
    el.addEventListener('pointerdown', e => this.down(e, wd, el));
    el.querySelector('.wd-rs').addEventListener('pointerdown', e => this.resize(e, wd, el));
    return el;
  },
  fill(body, wd) {
    EmbedKeep.stash(body);
    body.replaceChildren(); this.live.delete(wd.id);
    const T = WT[wd.type];
    if (T) {
      if (!wd.cfg) wd.cfg = {};
      const def = T.cfg();
      for (const k in def) if (!(k in wd.cfg)) wd.cfg[k] = def[k];
      const up = T.render(body, wd);
      if (up) { this.live.set(wd.id, up); try { up(new Date()); } catch (e) { console.error(e); } }
    }
    if (!EmbedKeep.depth) EmbedKeep.flush();
  },
  drawWidget(wd) {
    const el = this.canvas && this.canvas.querySelector('.wd[data-id="' + wd.id + '"]');
    if (!el) return;
    this.place(el, wd); this.fill(el.querySelector('.wd-body'), wd);
  },
  place(el, wd) { Object.assign(el.style, { left: wd.x + '%', top: wd.y + '%', width: wd.w + '%', height: wd.h + '%', zIndex: wd.z || 1 }); el.classList.toggle('bar-in', wd.y < 8); },
  snap: v => Math.round(v * 2) / 2,
  select(id, openPanel) {
    this.sel = id;
    if (!this.canvas) return;
    $$('.wd', this.canvas).forEach(e => e.classList.toggle('sel', e.dataset.id === id));
    if (!id) { this.panel.hidden = true; this.panelWasOpen = false; return; }
    if (openPanel || !this.panel.hidden) this.showPanel();
  },
  refreshPanel(wd) { if (this.panel && !this.panel.hidden && this.sel === wd.id) this.showPanel(); },
  showPanel() {
    const wd = this.cur(); if (!wd) { this.panel.hidden = true; return; }
    const T = WT[wd.type], p = this.panel;
    const scroll = p.querySelector('.wp-form')?.scrollTop || 0;
    p.hidden = false; this.panelWasOpen = true; p.replaceChildren();
    p.append(h('div', { class: 'wp-head' }, h('b', null, T.icon + ' ' + T.name), h('button', { class: 'x', title: '關閉', onclick: () => { p.hidden = true; this.panelWasOpen = false; } }, '×')));
    const form = h('div', { class: 'wp-form' });
    p.append(form);
    const ap = rebuild => { save(); this.drawWidget(wd); if (rebuild) this.showPanel(); };
    T.settings(form, wd, ap);
    p.append(h('div', { class: 'wp-foot' },
      h('button', { class: 'btn sm', onclick: () => { wd.z = this.maxZ() + 1; save(); this.drawWidget(wd); } }, '⬆ 移到最上層'),
      h('button', { class: 'btn sm', onclick: () => this.dup(wd) }, '⧉ 複製'),
      h('button', { class: 'btn sm danger', onclick: () => this.remove(wd) }, '🗑 刪除')));
    form.scrollTop = scroll;
  },
  down(e, wd, el) {
    if (e.button !== 0 || e.target.closest('.wd-bar, .wd-rs')) return;
    const interactive = e.target.closest('button, input, select, textarea, a, [contenteditable="true"]');
    if (this.sel !== wd.id) this.select(wd.id);
    if (interactive || D.wall.locked) return;
    e.preventDefault();
    try { el.setPointerCapture(e.pointerId); } catch (er) { }   // 拖過影片／網頁上方時，滑鼠事件才不會被它吃掉
    const r = this.canvas.getBoundingClientRect(), sx = e.clientX, sy = e.clientY, ox = wd.x, oy = wd.y;
    let moved = false;
    const mv = ev => {
      if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 5) return;
      if (!moved) { moved = true; wd.z = this.maxZ() + 1; el.style.zIndex = wd.z; el.classList.add('dragging'); }
      wd.x = this.snap(clamp(ox + (ev.clientX - sx) / r.width * 100, 4 - wd.w, 96));
      wd.y = this.snap(clamp(oy + (ev.clientY - sy) / r.height * 100, 0, 96));
      this.place(el, wd);
    };
    const up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); el.classList.remove('dragging'); if (moved) save(); };
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
  },
  resize(e, wd, el) {
    if (D.wall.locked) return;
    e.stopPropagation(); e.preventDefault();
    this.select(wd.id);
    const r = this.canvas.getBoundingClientRect(), sx = e.clientX, sy = e.clientY, ow = wd.w, oh = wd.h;
    el.classList.add('dragging');   // 拉大小時滑鼠經過影片／網頁也收得到
    try { e.target.setPointerCapture(e.pointerId); } catch (er) { }
    const mv = ev => {
      wd.w = this.snap(clamp(ow + (ev.clientX - sx) / r.width * 100, 6, 100 - wd.x));
      wd.h = this.snap(clamp(oh + (ev.clientY - sy) / r.height * 100, 6, 100 - wd.y));
      this.place(el, wd);
    };
    const up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); el.classList.remove('dragging'); save(); this.drawWidget(wd); };
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
  },
  key(e) {
    if (Layers.length) return;
    const t = e.target, typing = t.closest && t.closest('input, textarea, select, [contenteditable="true"]');
    if (typing) return;
    const wd = this.cur();
    if (e.key === 'Escape') { if (wd) this.select(null); return; }
    // 空白鍵：計時器開始／暫停（選了計時器就控制它，否則控制這一頁的第一個計時器；鎖定版面時也可以用）
    if (e.key === ' ') {
      const tw = wd && wd.type === 'timer' ? wd : this.page().widgets.find(w => w.type === 'timer');
      if (!tw) return;
      e.preventDefault(); if (t.closest && t.closest('button')) t.blur();
      wTimer.toggle(tw.cfg); save(); this.drawWidget(tw); return;
    }
    if (!wd || D.wall.locked) return;
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); this.remove(wd); return; }
    const mv = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (mv) { e.preventDefault(); const k = e.shiftKey ? 5 : 0.5; wd.x = clamp(wd.x + mv[0] * k, 4 - wd.w, 96); wd.y = clamp(wd.y + mv[1] * k, 0, 96); this.place(this.canvas.querySelector('.wd[data-id="' + wd.id + '"]'), wd); save(); }
  },
  add(type) {
    const T = WT[type], P = this.page(), n = P.widgets.length;
    const wd = { id: uid(), type, x: this.snap(clamp(50 - T.w / 2 + (n % 5) * 3 - 6, 0, 100 - T.w)), y: this.snap(clamp(42 - T.h / 2 + (n % 5) * 3 - 6, 0, 100 - T.h)), w: T.w, h: T.h, z: this.maxZ() + 1, cfg: T.cfg() };
    P.widgets.push(wd); save();
    this.canvas.querySelector('.w-empty')?.remove();
    this.canvas.append(this.makeWidget(wd));
    this.select(wd.id, true);
    if (type === 'image') this.uploadImg(wd);
  },
  dup(wd) {
    const P = this.page(), c = JSON.parse(JSON.stringify(wd));
    c.id = uid(); c.x = clamp(wd.x + 3, 0, 96); c.y = clamp(wd.y + 3, 0, 96); c.z = this.maxZ() + 1;
    P.widgets.push(c); save(); this.canvas.append(this.makeWidget(c)); this.select(c.id, !this.panel.hidden);
  },
  remove(wd) {
    const P = this.page(), i = P.widgets.indexOf(wd); if (i < 0) return;
    P.widgets.splice(i, 1); this.stopMic(wd.id); this.live.delete(wd.id);
    this.canvas.querySelector('.wd[data-id="' + wd.id + '"]')?.remove();
    if (this.sel === wd.id) this.select(null);
    save();
    toast('已刪除「' + WT[wd.type].name + '」', { undo: () => { P.widgets.splice(i, 0, wd); save(); if (this.root && this.page() === P) this.draw(); } });
  },
  async uploadImg(wd) {
    const f = await pickFile('image/*'); if (!f) return;
    try {
      const url = await readImageFile(f), id = 'img-' + uid();
      await ImgDB.put(id, url); wd.cfg.img = id; save(); this.drawWidget(wd); this.refreshPanel(wd);
    } catch (e) { toast('讀不到這張圖片'); }
  },
  go(i) { const p = D.wall.pages[i]; if (!p) return; D.wall.cur = p.id; this.sel = null; save(); this.draw(); },
  pageMenu() {
    const P = this.page();
    const m = modal('頁面：' + P.name, c => {
      c.body.append(h('label', { class: 'lbl' }, '頁面名稱'), h('input', { class: 'inp', value: P.name, oninput: e => { P.name = e.target.value || '未命名'; save(); } }),
        h('div', { class: 'lbl' }, '全部頁面（點一下切換）'),
        h('div', { class: 'reasons' }, D.wall.pages.map((p, i) => h('button', { class: 'chip' + (p === P ? ' on' : ''), onclick: () => { m.close(); this.go(i); } }, (i + 1) + '. ' + p.name))));
      c.foot.append(
        h('button', { class: 'btn', onclick: () => { const cp = JSON.parse(JSON.stringify(P)); cp.id = uid(); cp.name = P.name + '（複製）'; cp.widgets.forEach(w => { w.id = uid(); }); D.wall.pages.splice(D.wall.pages.indexOf(P) + 1, 0, cp); D.wall.cur = cp.id; save(); m.close(); this.draw(); } }, '複製這一頁'),
        h('button', { class: 'btn danger', onclick: async () => {
          if (!await ask('刪除「' + P.name + '」這一頁？', '刪除', { danger: true })) return;
          const i = D.wall.pages.indexOf(P); D.wall.pages.splice(i, 1);
          m.close();
          if (!D.wall.pages.length) { D.wall.cur = null; save(); this.close(); return; }
          D.wall.cur = D.wall.pages[Math.max(0, i - 1)].id; save(); this.draw();
        } }, '刪除這一頁'),
        h('button', { class: 'btn pri', onclick: () => { m.close(); this.draw(); } }, '完成'));
    });
  },
  templates() {
    const m = modal('新增一面動態牆', c => {
      c.body.append(h('p', { class: 'muted' }, '選一個開始的樣子，之後都可以自由加減、移動小工具。版面會自動記住，下次打開還在。'),
        h('div', { class: 'tpl-grid' }, Object.entries(WALL_TPL).map(([k, t]) => h('button', { class: 'tpl', onclick: () => { m.close(); this.newPage(k); } },
          h('div', { class: 'tpl-prev', style: { background: WALL_BG[t.bg].css } }, t.widgets.map(w => h('i', { style: { left: w.x + '%', top: w.y + '%', width: w.w + '%', height: w.h + '%' } }))),
          h('b', null, t.icon + ' ' + t.name), h('small', { class: 'muted' }, t.desc)))));
    }, { cls: 'wide' });
  },
  newPage(k) {
    const t = WALL_TPL[k];
    const p = { id: uid(), name: t.name, bg: { type: 'preset', v: t.bg }, widgets: t.widgets.map((w, i) => ({ id: uid(), type: w.type, x: w.x, y: w.y, w: w.w, h: w.h, z: i + 1, cfg: Object.assign(WT[w.type].cfg(), JSON.parse(JSON.stringify(w.cfg || {}))) })) };
    D.wall.pages.push(p); D.wall.cur = p.id; D.wall.locked = false; save();
    if (this.root) this.draw(); else this.open();
  },
  bgPicker() {
    const P = this.page();
    const m = modal('背景', c => {
      const set = bg => { P.bg = bg; save(); this.draw(); c.rebuild(); };
      c.body.append(h('div', { class: 'bg-grid' }, Object.entries(WALL_BG).map(([k, b]) => h('button', { class: 'bg-sw' + (P.bg && P.bg.type === 'preset' && P.bg.v === k ? ' on' : ''), style: { background: b.css }, onclick: () => set({ type: 'preset', v: k }) }, h('span', null, b.t)))),
        h('div', { class: 'row wrap' }, '單色：', h('input', { type: 'color', value: P.bg && P.bg.type === 'color' ? P.bg.v : '#f5efe2', onchange: e => set({ type: 'color', v: e.target.value }) }),
          h('button', { class: 'btn', onclick: async () => {
            const f = await pickFile('image/*'); if (!f) return;
            try { const url = await readImageFile(f, 2400), id = 'bg-' + uid(); await ImgDB.put(id, url); set({ type: 'image', v: id }); } catch (e) { toast('讀不到這張圖片'); }
          } }, '🖼 用自己的圖片')));
    });
  },
  stopMic(id) { const M = this.mics.get(id); if (!M) return; cancelAnimationFrame(M.raf); M.stream.getTracks().forEach(t => t.stop()); this.mics.delete(id); },
  stopMics() { for (const id of [...this.mics.keys()]) this.stopMic(id); }
};

function toggleFull() {
  if (document.fullscreenElement) document.exitFullscreen?.();
  else document.documentElement.requestFullscreen?.().catch(() => toast('這個瀏覽器不能全螢幕，可以按 F11'));
}
