'use strict';
/* 班級百寶箱：共用小工具、資料儲存、視窗、音效 */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

function h(tag, props, ...kids) {
  const e = document.createElement(tag);
  if (props) for (const k in props) {
    const v = props[k];
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
    else if (['value', 'checked', 'selected', 'disabled', 'innerHTML', 'textContent'].includes(k)) e[k] = v;
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat(Infinity)) if (c != null && c !== false) e.append(c instanceof Node ? c : String(c));
  return e;
}
function svg(tag, attrs, ...kids) {
  const e = document.createElementNS('http://www.w3.org/2000/svg', tag);
  if (attrs) for (const k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
  for (const c of kids.flat(Infinity)) if (c != null && c !== false) e.append(c instanceof Node ? c : String(c));
  return e;
}

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const pad = n => String(n).padStart(2, '0');
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const WD = '日一二三四五六';
function dateKey(d = new Date()) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
function parseKey(k) { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); }
function fmtMD(d) { if (typeof d === 'string') d = parseKey(d); return (d.getMonth() + 1) + '/' + d.getDate() + '（' + WD[d.getDay()] + '）'; }
function hm(d = new Date()) { return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
function toMin(t) { const [a, b] = String(t || '0:0').split(':').map(Number); return (a || 0) * 60 + (b || 0); }
function minToHM(m) { m = ((Math.round(m) % 1440) + 1440) % 1440; return pad(Math.floor(m / 60)) + ':' + pad(m % 60); }
function fmtSec(s) {
  s = Math.max(0, Math.ceil(s));
  const H = Math.floor(s / 3600), M = Math.floor(s % 3600 / 60), S = s % 60;
  return (H ? H + ':' + pad(M) : pad(M)) + ':' + pad(S);
}
function fmtLeft(s) {
  s = Math.max(0, Math.ceil(s));
  const M = Math.floor(s / 60), S = s % 60;
  return M ? M + ' 分 ' + pad(S) + ' 秒' : S + ' 秒';
}
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
function daysBetween(a, b) { return Math.round((parseKey(b) - parseKey(a)) / 864e5); }
function weekStart(d = new Date()) { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }

function download(name, data, type = 'text/plain') {
  const blob = data instanceof Blob ? data : new Blob([data], { type: type + ';charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: name });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
function toCSV(rows) {
  return '﻿' + rows.map(r => r.map(v => { v = v == null ? '' : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(',')).join('\r\n');
}
function printHTML(title, bodyHTML, css = '') {
  const w = window.open('', '_blank');
  if (!w) { toast('瀏覽器擋住了列印視窗，請允許彈出視窗。'); return; }
  w.document.write('<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><title>' + title + '</title><style>body{font-family:"Microsoft JhengHei","PingFang TC",sans-serif;margin:24px;color:#222}h1{font-size:22px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #888;padding:6px 8px;text-align:center}th{background:#eee}' + css + '</style></head><body>' + bodyHTML + '</body></html>');
  w.document.close(); w.focus(); setTimeout(() => w.print(), 300);
}
const escHTML = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------- 資料 ---------- */
const LS_KEY = 'bxbox-data-v1';
const GROUP_COLORS = ['#e8574a', '#f29a2e', '#d9b52c', '#43a865', '#2a9db5', '#4f6fd8', '#9a5bd0', '#d6589a', '#8a6a4f', '#5f7180'];
const ABS = { sick: '病假', personal: '事假', late: '遲到' };
const ABS_SHORT = { sick: '病', personal: '事', late: '遲' };

function defaultPeriods() {
  return [
    { label: '早自習', start: '07:50', end: '08:30', kind: 'other' },
    { label: '第一節', start: '08:40', end: '09:20', kind: 'class' },
    { label: '第二節', start: '09:30', end: '10:10', kind: 'class' },
    { label: '第三節', start: '10:30', end: '11:10', kind: 'class' },
    { label: '第四節', start: '11:20', end: '12:00', kind: 'class' },
    { label: '午餐午休', start: '12:00', end: '13:20', kind: 'other' },
    { label: '第五節', start: '13:30', end: '14:10', kind: 'class' },
    { label: '第六節', start: '14:20', end: '15:00', kind: 'class' },
    { label: '第七節', start: '15:20', end: '16:00', kind: 'class' }
  ];
}
function defaultData() {
  return {
    app: '班級百寶箱', v: 1, classId: uid(),
    info: {
      className: '我們班', rows: 6, cols: 6, hideScore: true, sound: true,
      scoreBtns: [1, 2, 3, -1], allAsk: false, drawAsk: false, dockHidden: [], scoreStart: null, boardSmall: false,
      view: '3d', theme: 'auto', rules: ['上課專心聽講', '發言先舉手', '愛護公物', '互相幫忙'], honor: [], tip: '',
      teacher: { name: '', avatar: 'longsoft' }, teacherWalk: true, floor: 'wood', deskItem: 'none', ac: true,
      boardFont: 'kai', attPos: 'right', cardHidden: []
    },
    students: [],
    plus: ['回答問題', '專心聽講', '幫助同學', '作業優良', '整潔', '守秩序', '進步了', '主動學習'],
    minus: ['上課講話', '作業缺交', '遲交', '不守秩序', '忘記帶東西'],
    log: { date: dateKey(), items: [] },
    att: {},
    hw: [],
    ready: { date: dateKey(), items: [] },
    readyCommon: ['學習單寫完了', '作業交了', '訂正完了', '回條交了', '聯絡簿交了', '潔牙'],
    lot: { round: [], range: null },
    gacha: {
      cost: 100,
      prizes: [
        { id: uid(), name: '貼紙一張', limited: true, left: 20 },
        { id: uid(), name: '換座位一天', limited: false, left: 0 },
        { id: uid(), name: '當一天小老師', limited: false, left: 0 },
        { id: uid(), name: '免寫一項作業', limited: true, left: 5 },
        { id: uid(), name: '下課選一首歌', limited: false, left: 0 }
      ],
      tasks: [
        { id: uid(), name: '朗讀課文一段' },
        { id: uid(), name: '分享今天學到的一件事' },
        { id: uid(), name: '說一句讚美同學的話' },
        { id: uid(), name: '幫忙擦黑板' }
      ],
      history: []
    },
    groups: [],
    board: {
      mode: 'contact', vertical: false, scale: { contact: 0, free: 0 },
      contact: { items: [{ cat: 'hw', text: '' }] },
      free: '', saved: [],
      duty: { on: false, mode: 'seq', count: 2, anchorDate: dateKey(), anchorIdx: 0, fixed: [] },
      countdown: { on: false, name: '段考', date: '' }
    },
    sched: { periods: defaultPeriods(), week: { 1: [], 2: [], 3: [], 4: [], 5: [] }, saved: null },
    timerTitles: ['安靜閱讀', '小組討論', '寫學習單', '收拾整理'],
    clockNotes: ['寫完檢查姓名、座號，再檢查答案', '安靜作答，有問題請舉手', '交卷後安靜閱讀'],
    clockNote: '', clockStyle: 'digital',
    settles: [],
    lock: { pin: null, note: '老師馬上回來，請安靜自習' },
    wall: { cur: null, pages: [], locked: false }
  };
}
let D = null;
const UI = { mode: 'normal', sel: null, multi: new Set(), hwId: null, pickSeat: null, temp: null, heralds: [] };

function fillDefaults(o, d) {
  for (const k in d) {
    if (!(k in o) || o[k] == null) o[k] = d[k];
    else if (d[k] && typeof d[k] === 'object' && !Array.isArray(d[k]) && typeof o[k] === 'object' && !Array.isArray(o[k])) fillDefaults(o[k], d[k]);
  }
  return o;
}
function loadData() {
  let o = null;
  try { o = JSON.parse(localStorage.getItem(LS_KEY) || 'null'); } catch (e) { o = null; }
  if (o && o.info && o.info.attBoard === false && o.info.attPos == null) o.info.attPos = 'none';   // 舊版的「黑板上寫應到、實到」
  D = o && typeof o === 'object' ? fillDefaults(o, defaultData()) : defaultData();
  rollDay();
}
function rollDay() {
  const t = dateKey();
  if (D.log.date !== t) D.log = { date: t, items: [] };
  if (D.ready.date !== t) D.ready = { date: t, items: [] };
}
let saveTimer = null;
function save() { clearTimeout(saveTimer); saveTimer = setTimeout(saveNow, 200); setSaveState('儲存中…'); }
function saveNow() {
  clearTimeout(saveTimer);
  try { localStorage.setItem(LS_KEY, JSON.stringify(D)); setSaveState('已儲存'); }
  catch (e) { setSaveState('儲存失敗'); toast('儲存失敗：瀏覽器空間可能不夠，請先匯出備份檔。'); }
}
function setSaveState(t) { const e = $('#saveState'); if (e) e.textContent = t; }
window.addEventListener('beforeunload', () => { if (D) saveNow(); });

/* ---------- 同學 ---------- */
const stu = id => D.students.find(s => s.id === id);
const grp = id => D.groups.find(g => g.id === id);
const roster = () => D.students.slice().sort((a, b) => a.no - b.no);
const attToday = () => D.att[dateKey()] || {};
const statusOf = sid => attToday()[sid] || '';
const isAbsent = sid => { const s = statusOf(sid); return s === 'sick' || s === 'personal'; };
const presentList = () => roster().filter(s => !isAbsent(s.id));
const nameOf = s => s ? pad(s.no) + ' ' + (s.name || '') : '';

function addPoints(sids, d, why, quiet) {
  const t = hm(), made = [];
  for (const sid of sids) {
    const s = stu(sid); if (!s) continue;
    s.score = (s.score || 0) + d;
    const it = { id: uid(), sid, d, why: why || '', t };
    D.log.items.push(it); made.push(it);
  }
  if (made.length && !D.info.scoreStart) D.info.scoreStart = dateKey();
  save(); refresh();
  if (made.length) {
    if (!quiet) d > 0 ? Snd.plus() : Snd.minus();
    floatScore(sids, d);
    if (!quiet && typeof Room !== 'undefined') Room.react(sids, d, why);
  }
  return made;
}
function addGroupPoints(gid, d, why) {
  const g = grp(gid); if (!g) return [];
  g.score = (g.score || 0) + d;
  const it = { id: uid(), gid, d, why: why || '', t: hm() };
  D.log.items.push(it); save(); refresh();
  d > 0 ? Snd.plus() : Snd.minus();
  return [it];
}
function removeLog(items) {
  for (const it of items) {
    const i = D.log.items.findIndex(x => x.id === it.id);
    if (i < 0) continue;
    D.log.items.splice(i, 1);
    const o = it.sid ? stu(it.sid) : grp(it.gid);
    if (o) o.score = (o.score || 0) - it.d;
  }
  save(); refresh();
}
function pointsToast(made, text) {
  if (!made.length) return;
  toast(text, { undo: () => { removeLog(made); toast('已復原'); } });
}
function floatScore(sids, d) {
  for (const sid of sids) {
    const t = document.querySelector('.seat[data-id="' + sid + '"]');
    if (!t) continue;
    const f = h('span', { class: 'float ' + (d > 0 ? 'up' : 'down') }, (d > 0 ? '+' : '−') + Math.abs(d));
    t.append(f); setTimeout(() => f.remove(), 1200);
  }
}

/* ---------- 作息 ---------- */
function schedNow(now = new Date()) {
  const m = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60, wd = now.getDay();
  const day = D.sched.week[wd] || [];
  let ci = -1;
  const list = D.sched.periods.map(p => {
    const isClass = p.kind === 'class'; if (isClass) ci++;
    return { label: p.label, kind: p.kind, start: p.start, end: p.end, s: toMin(p.start), e: toMin(p.end), subj: isClass ? (day[ci] || '').trim() : '' };
  });
  const school = wd >= 1 && wd <= 5;
  const cur = school ? list.find(p => m >= p.s && m < p.e) : null;
  const next = school ? list.find(p => p.s > m) : null;
  return { list, cur, next, m, school };
}
const isExam = subj => /^考/.test(subj || '');
function periodText(p) {
  if (!p) return '';
  if (isExam(p.subj)) return p.label + ' ' + p.subj + ' 考試中';
  return p.label + (p.subj ? ' ' + p.subj : '');
}
function nowLabel(now = new Date()) {
  const S = schedNow(now);
  if (!S.school) return '';
  if (S.cur) return periodText(S.cur);
  if (S.next) return S.list.indexOf(S.next) === 0 ? '還沒上課' : '下課時間';
  return '放學了';
}

/* ---------- 每秒更新 ---------- */
const Tick = new Set();
let lastDay = dateKey();
setInterval(() => {
  if (!D) return;
  const t = dateKey();
  if (t !== lastDay) { lastDay = t; rollDay(); save(); refresh(); }
  for (const f of Tick) { try { f(); } catch (e) { console.error(e); } }
}, 250);

/* ---------- 提示與視窗 ---------- */
function toast(msg, opt = {}) {
  const box = $('#toasts');
  const t = h('div', { class: 'toast' }, h('span', null, msg));
  if (opt.undo) t.append(h('button', { class: 'btn sm', onclick: () => { opt.undo(); t.remove(); } }, '↶ 復原'));
  box.append(t);
  setTimeout(() => t.classList.add('out'), opt.ms || 5000);
  setTimeout(() => t.remove(), (opt.ms || 5000) + 400);
}

const Layers = [];
function openLayer(kind, title, build, opt = {}) {
  const ov = h('div', { class: 'ov ' + kind + (opt.cls ? ' ' + opt.cls : '') });
  const box = h('div', { class: 'lbox', role: 'dialog', 'aria-label': title });
  const head = h('div', { class: 'lhead' });
  const body = h('div', { class: 'lbody' }), foot = h('div', { class: 'lfoot' });
  box.append(head, body, foot); ov.append(box);
  const ctx = { ov, box, head, body, foot, title, data: opt.data || {}, closed: false };
  ctx.setTitle = t => { ctx.title = t; drawHead(); };
  function drawHead() {
    head.replaceChildren(h('h2', null, ctx.title), ...(ctx.headExtra || []).filter(Boolean), h('button', { class: 'x', title: '關閉（Esc）', onclick: () => ctx.close() }, '×'));
  }
  ctx.rebuild = () => {
    body.replaceChildren(); foot.replaceChildren(); ctx.headExtra = [];
    build(ctx); drawHead();
    if (kind === 'modal' && !foot.childElementCount && !opt.noFoot) foot.append(h('button', { class: 'btn pri', onclick: () => ctx.close() }, '完成'));
    foot.hidden = !foot.childElementCount;
  };
  ctx.close = () => {
    if (ctx.closed) return;
    if (ctx.beforeClose && ctx.beforeClose() === false) return;
    ctx.closed = true; ov.remove();
    const i = Layers.indexOf(ctx); if (i >= 0) Layers.splice(i, 1);
    if (ctx.onClose) ctx.onClose();
    if (opt.onClose) opt.onClose();
  };
  if (kind === 'modal') {
    let down = false;
    ov.addEventListener('pointerdown', e => { down = e.target === ov; });
    ov.addEventListener('click', e => { if (e.target === ov && down && !opt.sticky) ctx.close(); down = false; });
  }
  $('#layer').append(ov); Layers.push(ctx);
  ctx.rebuild();
  return ctx;
}
const modal = (title, build, opt) => openLayer('modal', title, build, opt);
const proj = (title, build, opt) => openLayer('proj', title, build, opt);

function ask(msg, okText = '確定', opt = {}) {
  return new Promise(res => {
    let done = false;
    const fin = v => { if (done) return; done = true; res(v); m.close(); };
    const m = modal(opt.title || '請確認', c => {
      c.body.append(h('p', { class: 'askmsg' }, msg));
      c.foot.append(h('button', { class: 'btn', onclick: () => fin(false) }, '取消'),
        h('button', { class: 'btn ' + (opt.danger ? 'danger' : 'pri'), onclick: () => fin(true) }, okText));
    }, { onClose: () => { if (!done) { done = true; res(false); } } });
  });
}
function askText(title, labelText, value = '', opt = {}) {
  return new Promise(res => {
    let done = false;
    const inp = h(opt.multi ? 'textarea' : 'input', { class: 'inp', value, placeholder: opt.placeholder || '', rows: opt.multi ? 8 : null });
    const fin = v => { if (done) return; done = true; res(v); m.close(); };
    const m = modal(title, c => {
      c.body.append(h('label', { class: 'lbl' }, labelText), inp);
      if (opt.hint) c.body.append(h('p', { class: 'muted' }, opt.hint));
      c.foot.append(h('button', { class: 'btn', onclick: () => fin(null) }, '取消'), h('button', { class: 'btn pri', onclick: () => fin(inp.value) }, opt.ok || '好'));
    }, { onClose: () => { if (!done) { done = true; res(null); } } });
    if (!opt.multi) inp.addEventListener('keydown', e => { if (e.key === 'Enter') fin(inp.value); });
    setTimeout(() => inp.focus(), 30);
  });
}
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  const top = Layers[Layers.length - 1];
  if (top) { if (!top.noEsc) top.close(); return; }
  if (typeof Wall !== 'undefined' && Wall.isOpen()) return;
  if (UI.mode !== 'normal') setMode('normal');
  else if (UI.sel) { UI.sel = null; refresh(); }
});

/* ---------- 音效 ---------- */
const Snd = {
  ctx: null,
  ac() {
    if (!this.ctx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; this.ctx = new C(); }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  },
  play(notes, force) {
    if (!force && D && !D.info.sound) return;
    const ac = this.ac(); if (!ac) return;
    const t0 = ac.currentTime + 0.01;
    for (const [f, st, du, type = 'sine', vol = 0.18] of notes) {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = type; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t0 + st);
      g.gain.exponentialRampToValueAtTime(vol, t0 + st + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + st + du);
      o.connect(g).connect(ac.destination); o.start(t0 + st); o.stop(t0 + st + du + 0.05);
    }
  },
  plus() { this.play([[880, 0, 0.14], [1320, 0.08, 0.24]]); },
  minus() { this.play([[330, 0, 0.18, 'triangle'], [247, 0.1, 0.26, 'triangle']]); },
  tick() { this.play([[1400, 0, 0.03, 'square', 0.04]]); },
  ding() { this.play([[1046, 0, 0.45], [2093, 0, 0.3, 'sine', 0.05]]); },
  pop() { this.play([[660, 0, 0.08, 'triangle'], [990, 0.05, 0.12, 'triangle']]); },
  win() { this.play([[523, 0, 0.16], [659, 0.13, 0.16], [784, 0.26, 0.16], [1046, 0.39, 0.5]]); },
  bell() { const n = []; for (const s of [0, 0.6, 1.2]) n.push([880, s, 0.5], [1760, s, 0.35, 'sine', 0.06]); this.play(n); },
  crank() { const n = []; for (let i = 0; i < 6; i++) n.push([220 + i * 30, i * 0.12, 0.06, 'square', 0.05]); this.play(n); },
  // 考試面板、計時器的鈴聲（k 是 SOUNDS 的名字；這種提醒不管上方喇叭開關都會響）
  ring(k) {
    const n = [];
    if (k === 'chime') { let st = 0; for (const ph of [[659, 523, 587, 392], [392, 587, 659, 523]]) { for (const f of ph) { n.push([f, st, 1.1, 'sine', 0.2], [f * 2, st, 0.6, 'sine', 0.04]); st += 0.55; } st += 0.4; } }
    else if (k === 'dingdong') n.push([784, 0, 0.9, 'sine', 0.22], [1568, 0, 0.4, 'sine', 0.05], [622, 0.55, 1.2, 'sine', 0.22], [1244, 0.55, 0.5, 'sine', 0.05]);
    else if (k === 'alarm') { for (let r = 0; r < 3; r++) for (let i = 0; i < 4; i++) n.push([1046, r * 0.9 + i * 0.14, 0.08, 'square', 0.07]); }
    else if (k === 'ding') n.push([1046, 0, 0.45], [2093, 0, 0.3, 'sine', 0.05]);
    else if (k === 'bell') { for (const s of [0, 0.6, 1.2]) n.push([880, s, 0.5], [1760, s, 0.35, 'sine', 0.06]); }
    if (n.length) this.play(n, true);
  }
};
const SOUNDS = [['bell', '鈴鈴鈴'], ['chime', '學校鐘聲'], ['dingdong', '叮咚'], ['alarm', '鬧鐘'], ['ding', '叮一聲'], ['none', '不響']];

/* ---------- 圖片（IndexedDB） ---------- */
const ImgDB = {
  p: null,
  open() {
    return this.p || (this.p = new Promise((res, rej) => {
      const r = indexedDB.open('bxbox-img', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('img');
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    }));
  },
  async run(mode, fn) {
    const db = await this.open();
    return new Promise((res, rej) => {
      const tx = db.transaction('img', mode), st = tx.objectStore('img');
      const r = fn(st);
      tx.oncomplete = () => res(r && 'result' in r ? r.result : undefined);
      tx.onerror = () => rej(tx.error);
    });
  },
  put(id, url) { return this.run('readwrite', st => st.put(url, id)); },
  get(id) { return this.run('readonly', st => st.get(id)); },
  del(id) { return this.run('readwrite', st => st.delete(id)); },
  async all() {
    const db = await this.open();
    return new Promise((res, rej) => {
      const out = {}, tx = db.transaction('img', 'readonly'), r = tx.objectStore('img').openCursor();
      r.onsuccess = () => { const c = r.result; if (c) { out[c.key] = c.value; c.continue(); } };
      tx.oncomplete = () => res(out); tx.onerror = () => rej(tx.error);
    });
  }
};
function readImageFile(file, max = 1920) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => {
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = h('canvas', { width: Math.round(img.width * k), height: Math.round(img.height * k) });
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        res(c.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.86));
      };
      img.onerror = () => rej(new Error('img'));
      img.src = fr.result;
    };
    fr.onerror = () => rej(fr.error);
    fr.readAsDataURL(file);
  });
}
function pickFile(accept) {
  return new Promise(res => {
    const i = h('input', { type: 'file', accept, style: { display: 'none' } });
    i.onchange = () => { res(i.files[0] || null); i.remove(); };
    document.body.append(i); i.click();
  });
}
