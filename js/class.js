'use strict';
/* 教室主畫面：上方列、黑板、座位、同學卡片、工具列、點名、排座位、班級設定 */

// 工具列：一個字當圖示，grp 不同的中間畫一條分隔線
const TOOLS = [
  { id: 'draw', icon: '抽', label: '抽籤', grp: 1, run: () => Lottery.start() },
  { id: 'multi', icon: '□', label: '多選', grp: 1, mode: 'multi', run: () => toggleMode('multi') },
  { id: 'all', icon: '+1', label: '全班加分', grp: 1, run: () => classPlus() },
  { id: 'rank', icon: '榜', label: '分數榜', grp: 1, run: () => Rank.open() },
  { id: 'gacha', icon: '蛋', label: '扭蛋', grp: 1, run: () => Gacha.open() },
  { id: 'groups', icon: '組', label: '小組', grp: 1, run: () => Groups.open() },
  { id: 'timer', icon: '計', label: '計時', grp: 2, run: () => Timer.open() },
  { id: 'board', icon: '板', label: '黑板', grp: 2, run: () => { D.board.mode = 'free'; save(); Board.edit(); } },
  { id: 'attend', icon: '點', label: '點名', grp: 3, mode: 'attend', run: () => toggleMode('attend') },
  { id: 'hw', icon: '作', label: '作業', grp: 3, mode: 'hw', run: () => Homework.open() },
  { id: 'ready', icon: '好', label: '我好了', grp: 3, run: () => Ready.open() },
  { id: 'contact', icon: '簿', label: '聯絡簿', grp: 3, run: () => { D.board.mode = 'contact'; save(); Board.edit(); } },
  { id: 'sched', icon: '課', label: '課表', grp: 3, run: () => Sched.open() },
  { id: 'clock', icon: '鐘', label: '大時鐘', grp: 4, run: () => BigClock.open() },
  { id: 'seats', icon: '座', label: '排座位', grp: 4, mode: 'arrange', run: () => toggleMode('arrange') },
  { id: 'wall', icon: '牆', label: '動態牆', grp: 4, run: () => Wall.open() }
];
const CARD_BTNS = [['herald', '宣', '小小宣導員'], ['gacha', '蛋', '來扭蛋']];

function refresh() { renderTop(); renderBoard(); renderBanner(); renderSeats(); renderSide(); renderDock(); }

function setMode(m) {
  if (UI.mode === 'arrange' && m !== 'arrange') UI.pickSeat = null;
  UI.mode = m;
  if (m !== 'hw') UI.hwId = null;
  if (m !== 'multi') UI.multi.clear();
  if (m !== 'normal') UI.sel = null;
  refresh();
}
function toggleMode(m) { setMode(UI.mode === m ? 'normal' : m); }

/* ---------- 上方列 ---------- */
function renderTop() {
  $('#clsName').textContent = D.info.className || '我們班';
  TeacherUI.chip($('#teacherChip'));
  document.documentElement.classList.toggle('font-wenkai', D.info.boardFont === 'wenkai');
  const n = D.students.length, p = presentList().length;
  const ac = $('#attChip'); ac.hidden = !n; ac.textContent = '應到 ' + n + '　實到 ' + p;
  $('#btnHide').textContent = D.info.hideScore ? '👁 顯示分數' : '🙈 隱藏分數';
  $('#btnSound').textContent = D.info.sound ? '🔊' : '🔇';
  $('#btnSound').title = D.info.sound ? '聲音：開（點一下關掉）' : '聲音：關（點一下打開）';
}
let lastNow = '';
Tick.add(() => {
  const t = hm() + '　' + nowLabel();
  if (t !== lastNow) { lastNow = t; $('#nowChip').textContent = t.trim(); }
});

/* ---------- 黑板 ---------- */
function renderBoard() {
  const b = $('#board'); b.replaceChildren();
  b.classList.toggle('small', !!D.info.boardSmall);
  // 收小時倒數、值日生放右邊一橫列，平常寫在聯絡簿前面
  const small = !!D.info.boardSmall, right = small ? Board.sideBox() : h('div');
  const main = h('div', { class: 'b-main', title: '點一下編輯黑板', onclick: () => Board.edit() }, Board.render(false, small ? undefined : {}));
  b.append(main, right,
    h('button', { class: 'b-min', title: D.info.boardSmall ? '展開黑板' : '收小黑板', onclick: e => { e.stopPropagation(); D.info.boardSmall = !D.info.boardSmall; save(); renderBoard(); } }, D.info.boardSmall ? '▾' : '▴'));
  requestAnimationFrame(() => { const inner = main.firstChild; if (inner) fitText(main, inner, 0, D.info.boardSmall ? 22 : 40); });
}

/* ---------- 模式提示列 ---------- */
function renderBanner() {
  const b = $('#banner'); b.replaceChildren(); b.hidden = UI.mode === 'normal';
  const done = h('button', { class: 'btn pri', onclick: () => setMode('normal') }, '完成');
  if (UI.mode === 'multi') {
    b.append(h('span', { class: 'bn-t' }, '☑️ 多選：點同學選取，已選 ' + UI.multi.size + ' 位'),
      h('button', { class: 'btn', onclick: () => { presentList().forEach(s => UI.multi.add(s.id)); refresh(); } }, '全選出席的'),
      h('button', { class: 'btn', onclick: () => { UI.multi.clear(); refresh(); } }, '清除'), done);
  } else if (UI.mode === 'attend') {
    const a = attToday(), cnt = k => Object.values(a).filter(v => v === k).length;
    b.append(h('span', { class: 'bn-t' }, '📋 點名：點同學切換 出席 → 病假 → 事假 → 遲到（病假 ' + cnt('sick') + '、事假 ' + cnt('personal') + '、遲到 ' + cnt('late') + '）'),
      h('button', { class: 'btn', onclick: () => { D.att[dateKey()] = {}; save(); refresh(); toast('全班都出席'); } }, '全班都出席'),
      h('button', { class: 'btn', onclick: () => attendSheet() }, '開啟點名表'),
      h('button', { class: 'btn', onclick: () => attendRecord() }, '出缺席紀錄'),
      h('button', { class: 'btn pri', onclick: () => { setMode('normal'); toast('點名完成：應到 ' + D.students.length + '，實到 ' + presentList().length); } }, '點名完成'));
  } else if (UI.mode === 'hw') {
    const w = D.hw.find(x => x.id === UI.hwId);
    b.append(h('span', { class: 'bn-t' }, '📚 檢查「' + (w ? w.name : '') + '」：點同學切換 缺交 → 要訂正 → 完成 → 清除'),
      h('button', { class: 'btn', onclick: () => Homework.listCheck(UI.hwId) }, '用名單點'),
      h('button', { class: 'btn', onclick: () => Homework.project(UI.hwId) }, '投影未交'), done);
  } else if (UI.mode === 'arrange') {
    const num = (k, lab, min, max) => h('span', { class: 'stepper' }, lab,
      h('button', { class: 'btn sm', onclick: () => { D.info[k] = clamp(D.info[k] - 1, min, max); save(); refresh(); } }, '−'),
      h('b', null, D.info[k]),
      h('button', { class: 'btn sm', onclick: () => { D.info[k] = clamp(D.info[k] + 1, min, max); save(); refresh(); } }, '＋'));
    b.append(h('span', { class: 'bn-t' }, '🪑 排座位：點一位同學，再點另一位就交換；點空位就搬過去'),
      num('rows', '排', 1, 10), num('cols', '行', 1, 10),
      h('button', { class: 'btn', onclick: () => autoSeat('random') }, '隨機排座'),
      h('button', { class: 'btn', onclick: () => autoSeat('no') }, '依座號排'),
      h('button', { class: 'btn', onclick: () => autoSeat('clear') }, '全部離開座位'),
      h('button', { class: 'btn', onclick: () => printSeats() }, '🖨 列印座位表'), done);
  }
}

/* ---------- 座位 ---------- */
function seatOK(s) { return s.seat && s.seat[0] < D.info.rows && s.seat[1] < D.info.cols; }
function renderSeats() {
  const wrap = $('#seats');
  wrap.classList.toggle('arranging', UI.mode === 'arrange');
  const room = D.students.length && D.info.view !== 'flat';
  wrap.classList.toggle('room-on', !!room);
  if (room) return Room.render(wrap);
  wrap.replaceChildren();
  if (!D.students.length) { wrap.append(welcome()); return; }
  const R = D.info.rows, C = D.info.cols, at = {};
  for (const s of D.students) if (seatOK(s)) at[s.seat[0] + ',' + s.seat[1]] = s;
  const grid = h('div', { class: 'grid', style: { gridTemplateColumns: 'repeat(' + C + ',minmax(0,1fr))', gridTemplateRows: 'repeat(' + R + ',minmax(0,1fr))' } });
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
    const s = at[r + ',' + c];
    grid.append(s ? tile(s) : emptySeat(r, c));
  }
  wrap.append(h('div', { class: 'flat-top' }, h('div', { class: 'desk' }, '講　台'),
    h('button', { class: 'btn sm', title: '改用 3D 教室', onclick: () => { D.info.view = '3d'; save(); refresh(); } }, '🏫 3D 教室')), grid);
  const un = roster().filter(s => !seatOK(s));
  if (un.length) wrap.append(h('div', { class: 'tray' }, h('span', { class: 'tray-t' }, '還沒有位子 ' + un.length + ' 位'), ...un.map(tile)));
}
function tile(s) {
  const st = statusOf(s.id), cls = ['seat'];
  if (st === 'sick' || st === 'personal') cls.push('absent');
  if (UI.sel === s.id) cls.push('sel');
  if ((UI.mode === 'multi' && UI.multi.has(s.id)) || UI.pickSeat === s.id) cls.push('picked');
  const t = h('button', { class: cls.join(' '), 'data-id': s.id, onclick: () => tileClick(s) },
    h('span', { class: 'no' }, pad(s.no)), h('span', { class: 'nm' }, s.name || '　'));
  if (!D.info.hideScore) t.append(h('span', { class: 'sc' + ((s.score || 0) < 0 ? ' neg' : '') }, s.score || 0));
  if (st) t.append(h('span', { class: 'badge att-' + st }, ABS_SHORT[st]));
  if (UI.mode === 'hw' && UI.hwId) {
    const m = Homework.mark(UI.hwId, s.id);
    if (m) { t.classList.add('hwm-' + m); t.append(h('span', { class: 'badge hw-' + m }, { miss: '缺', fix: '訂', done: '✓' }[m])); }   // 整個名牌也照狀態上色，投影時遠遠就看得出來
  }
  const gc = Groups.colorOf(s);
  if (gc) { t.classList.add('grouped'); t.style.setProperty('--gc', gc); }
  return t;
}
function emptySeat(r, c) {
  const arr = UI.mode === 'arrange';
  return h('div', { class: 'seat empty' + (arr ? ' can' : ''), onclick: () => {
    if (!arr || !UI.pickSeat) return;
    const a = stu(UI.pickSeat); a.seat = [r, c]; UI.pickSeat = null; save(); refresh();
  } }, arr ? '空位' : '');
}
function tileClick(s) {
  switch (UI.mode) {
    case 'multi': UI.multi.has(s.id) ? UI.multi.delete(s.id) : UI.multi.add(s.id); refresh(); break;
    case 'attend': cycleAtt(s.id); break;
    case 'hw': Homework.cycle(UI.hwId, s.id); break;
    case 'arrange':
      if (!UI.pickSeat) UI.pickSeat = s.id;
      else if (UI.pickSeat === s.id) UI.pickSeat = null;
      else { const a = stu(UI.pickSeat), tmp = a.seat; a.seat = s.seat; s.seat = tmp; UI.pickSeat = null; save(); }
      refresh(); break;
    default: UI.sel = UI.sel === s.id ? null : s.id; refresh();
  }
}
function autoSeat(how) {
  const before = D.students.map(s => [s.id, s.seat]);
  const R = D.info.rows, C = D.info.cols, list = how === 'random' ? shuffle(roster()) : roster();
  if (how === 'clear') D.students.forEach(s => { s.seat = null; });
  else {
    if (R * C < list.length) D.info.rows = Math.min(10, Math.ceil(list.length / C));
    const RR = D.info.rows;
    // 依座號：一直行一直行從前面往後排
    list.forEach((s, i) => { s.seat = [i % RR, Math.floor(i / RR)]; });
    if (Math.ceil(list.length / RR) > C) list.forEach((s, i) => { s.seat = [Math.floor(i / C), i % C]; });
  }
  save(); refresh();
  toast({ random: '已隨機排座', no: '已依座號排好', clear: '全班離開座位了，點同學再點空位排上去' }[how], {
    undo: () => { for (const [id, seat] of before) { const s = stu(id); if (s) s.seat = seat; } save(); refresh(); }
  });
}
function printSeats() {
  const R = D.info.rows, C = D.info.cols, at = {};
  for (const s of D.students) if (seatOK(s)) at[s.seat[0] + ',' + s.seat[1]] = s;
  let rows = '';
  // 講台在下，左右和站在講台看到的一樣
  for (let r = R - 1; r >= 0; r--) {
    rows += '<tr>';
    for (let c = C - 1; c >= 0; c--) {
      const s = at[r + ',' + c], g = s && s.group && grp(s.group);
      rows += '<td>' + (s ? '<span class="box"></span><b>' + pad(s.no) + '</b><div class="n">' + escHTML(s.name) + '</div>' + (g ? '<div class="g">' + escHTML(g.name) + '</div>' : '') : '') + '</td>';
    }
    rows += '</tr>';
  }
  printHTML(D.info.className + ' 座位表', '<h1>' + escHTML(D.info.className) + ' 座位表　<small>' + fmtMD(new Date()) + '</small></h1><table class="seat">' + rows + '</table><div class="desk">講　台</div>',
    'table.seat td{height:70px;width:' + Math.floor(100 / C) + '%;position:relative;font-size:18px}.box{position:absolute;left:6px;top:6px;width:14px;height:14px;border:1.5px solid #555}.n{font-size:20px}.g{font-size:13px;color:#666}.desk{margin:14px auto;width:30%;text-align:center;border:2px solid #555;padding:8px;font-size:18px}@page{size:A4 landscape}');
}

/* ---------- 歡迎畫面（還沒有同學） ---------- */
function welcome() {
  const ta = h('textarea', { class: 'inp', rows: 8, placeholder: '一行一位，例如：\n王小明\n陳小美\n（有空號時在名字前寫座號，例如「5 林大同」）' });
  const num = h('input', { class: 'inp', type: 'number', min: 1, max: 60, value: 25, style: { width: '6em' } });
  return h('div', { class: 'welcome' },
    h('h2', null, '先把同學請進教室'),
    h('div', { class: 'wcards' },
      h('div', { class: 'wcard' }, h('h3', null, '📋 貼上名字清單'), h('p', { class: 'muted' }, '從 Excel、Word 複製貼上，一行一位。'), ta,
        h('button', { class: 'btn pri', onclick: () => { const L = parseNames(ta.value); if (!L.length) return toast('請先貼上名字'); createStudents(L); } }, '建立名單')),
      h('div', { class: 'wcard' }, h('h3', null, '🔢 先建立座號'), h('p', { class: 'muted' }, '還沒有名單，先建立 1 號到 N 號，名字之後再補。'),
        h('div', { class: 'row' }, num, h('button', { class: 'btn pri', onclick: () => { const n = clamp(+num.value || 0, 1, 60); createStudents(Array.from({ length: n }, (_, i) => ({ no: i + 1, name: '' }))); } }, '建立 1 號到 N 號'))),
      h('div', { class: 'wcard' }, h('h3', null, '📦 匯入備份檔'), h('p', { class: 'muted' }, '別台電腦用過班級百寶箱，或想把「班班」的備份檔（.zip）搬過來。'),
        h('button', { class: 'btn pri', onclick: () => Backup.importFile() }, '選擇備份檔'))));
}
function parseNames(text) {
  const out = [], used = new Set(); let auto = 1;
  for (let line of String(text).split(/\r?\n/)) {
    line = line.replace(/\t+/g, ' ').trim(); if (!line) continue;
    const m = line.match(/^(\d{1,2})\s*[.、,，:：號]?\s*(.*)$/);
    let no, name;
    if (m) { no = +m[1]; name = m[2].trim(); } else { while (used.has(auto)) auto++; no = auto; name = line; }
    if (used.has(no)) continue;
    used.add(no); auto = Math.max(auto, no + 1);
    out.push({ no, name });
  }
  return out;
}
function createStudents(list, replace = true) {
  if (replace) D.students = [];
  for (const x of list) D.students.push({ id: uid(), no: x.no, name: x.name, score: 0, seat: null, group: null });
  D.info.cols = D.info.cols || 6;
  D.info.rows = clamp(Math.ceil(D.students.length / D.info.cols), 1, 10);
  autoSeatSilent();
  save(); refresh();
  toast('已建立 ' + list.length + ' 位同學');
}
function autoSeatSilent() {
  const R = D.info.rows, C = D.info.cols, taken = new Set();
  D.students.forEach(s => { if (seatOK(s)) taken.add(s.seat + ''); });
  const free = [];
  for (let c = 0; c < C; c++) for (let r = 0; r < R; r++) if (!taken.has(r + ',' + c)) free.push([r, c]);
  for (const s of roster()) if (!seatOK(s) && free.length) s.seat = free.shift();
}

/* ---------- 同學卡片 ---------- */
function renderSide() {
  const side = $('#side'); side.replaceChildren();
  let c = null;
  if (UI.mode === 'multi' && UI.multi.size) c = multiCard();
  else if (UI.mode === 'normal' && UI.sel && stu(UI.sel)) c = studentCard(stu(UI.sel));
  side.hidden = !c; document.body.classList.toggle('has-side', !!c);
  if (c) side.append(c);
}
function scoreButtons(sids, who) {
  return h('div', { class: 'sbtns' }, D.info.scoreBtns.map(d => h('button', {
    class: 'sbtn ' + (d > 0 ? 'plus' : 'minus'),
    onclick: () => pointsToast(addPoints(sids, d, ''), who + ' ' + (d > 0 ? '+' : '−') + Math.abs(d))
  }, (d > 0 ? '+' : '−') + Math.abs(d))));
}
function reasonChips(sids, who) {
  return h('div', null,
    h('div', { class: 'lbl' }, '加分理由 ', h('button', { class: 'link', onclick: () => Settings.open('reasons') }, '✎ 編輯')),
    h('div', { class: 'reasons' }, D.plus.map(r => h('button', { class: 'chip plus', onclick: () => pointsToast(addPoints(sids, 1, r), who + ' +1 ' + r) }, r))),
    h('div', { class: 'lbl' }, '扣分理由'),
    h('div', { class: 'reasons' }, D.minus.map(r => h('button', { class: 'chip minus', onclick: () => pointsToast(addPoints(sids, -1, r), who + ' −1 ' + r) }, r))));
}
function studentCard(s) {
  const st = statusOf(s.id);
  const items = D.log.items.filter(i => i.sid === s.id).slice().reverse();
  const pend = Homework.pendingOf(s.id);
  return h('div', { class: 'card' },
    h('div', { class: 'c-head' }, h('span', { class: 'c-no' }, pad(s.no)), h('span', { class: 'c-name' }, s.name || '（還沒有名字）'),
      h('button', { class: 'x', title: '關閉', onclick: () => { UI.sel = null; refresh(); } }, '×')),
    h('div', { class: 'c-score' }, D.info.hideScore ? h('span', { class: 'muted' }, '分數隱藏中') : ['目前 ', h('b', null, s.score || 0), ' 分']),
    scoreButtons([s.id], nameOf(s)),
    reasonChips([s.id], nameOf(s)),
    h('div', { class: 'lbl' }, '今天出缺席'),
    h('div', { class: 'seg' }, [['', '出席'], ['sick', '病假'], ['personal', '事假'], ['late', '遲到']].map(([k, t]) =>
      h('button', { class: st === k ? 'on' : '', onclick: () => setAtt(s.id, k) }, t))),
    pend.length ? h('div', null, h('div', { class: 'lbl' }, '還沒完成的作業'), h('ul', { class: 'plain' }, pend.map(p => h('li', null, p.name + '（' + (p.m === 'miss' ? '缺交' : '要訂正') + '）')))) : null,
    h('div', { class: 'c-acts' },
      Herald.of(s.id) ? [h('button', { class: 'btn', onclick: () => Herald.pick(s.id) }, '🪧 換一句'), h('button', { class: 'btn', onclick: () => Herald.back(s.id) }, '回到座位')]
        : !D.info.cardHidden.includes('herald') ? h('button', { class: 'btn', onclick: () => Herald.pick(s.id) }, '🪧 小小宣導員') : null,
      !D.info.cardHidden.includes('gacha') ? h('button', { class: 'btn', onclick: () => Gacha.open(s.id) }, '🎁 來扭蛋') : null),
    h('details', { class: 'c-log', open: items.length > 0 && items.length <= 5 },
      h('summary', null, '今天的加減分（' + items.length + '）'),
      items.length ? h('ul', { class: 'plain loglist' }, items.map(i => h('li', null,
        h('span', { class: 'muted' }, i.t), ' ', h('b', { class: i.d > 0 ? 'pos' : 'negc' }, (i.d > 0 ? '+' : '−') + Math.abs(i.d)), ' ', i.why,
        h('button', { class: 'link danger', onclick: async () => { if (await ask('刪除這一筆（' + (i.d > 0 ? '+' : '−') + Math.abs(i.d) + ' ' + i.why + '）？分數會改回來。', '刪除', { danger: true })) removeLog([i]); } }, '刪除'))))
        : h('p', { class: 'muted' }, '今天還沒有加減分。')));
}
function multiCard() {
  const ids = [...UI.multi];
  const who = '已選 ' + ids.length + ' 位';
  return h('div', { class: 'card' },
    h('div', { class: 'c-head' }, h('span', { class: 'c-name' }, who), h('button', { class: 'x', onclick: () => setMode('normal') }, '×')),
    h('p', { class: 'muted small' }, ids.map(id => nameOf(stu(id))).join('、')),
    scoreButtons(ids, who), reasonChips(ids, who),
    h('div', { class: 'c-acts col' },
      h('button', { class: 'btn', onclick: () => { D.lot.range = { type: 'only', ids }; save(); setMode('normal'); Lottery.start(true); } }, '🎯 只從這 ' + ids.length + ' 人抽籤'),
      h('button', { class: 'btn', onclick: () => { D.lot.range = { type: 'exclude', ids }; save(); setMode('normal'); Lottery.start(true); } }, '🎯 抽籤時排除這 ' + ids.length + ' 人')));
}

/* ---------- 工具列 ---------- */
function renderDock() {
  const d = $('#dock'); d.replaceChildren();
  // 工具列可以收起來（記在這台電腦 localStorage 'bxbox-dock'），收起時下面只留一個小按鈕
  if (UI.dockFold == null) { try { UI.dockFold = localStorage.getItem('bxbox-dock') === 'fold'; } catch (e) { UI.dockFold = false; } }
  d.hidden = UI.dockFold;
  let show = $('#dockShow');
  if (UI.dockFold && !show) document.body.append(show = h('button', { id: 'dockShow', class: 'dock-show', title: '打開工具列', onclick: () => foldDock(false) }, '︿ 工具列'));
  if (!UI.dockFold && show) show.remove();
  if (UI.dockFold) return;
  let g = 0;
  for (const t of TOOLS) {
    if (D.info.dockHidden.includes(t.id)) continue;
    if (g && t.grp !== g) d.append(h('i', { class: 'dsep' }));
    g = t.grp;
    d.append(h('button', { class: 'dbtn' + (t.id === 'draw' ? ' main' : '') + (t.mode && UI.mode === t.mode ? ' on' : ''), title: t.label, onclick: () => t.run() },
      h('span', { class: 'di' }, t.icon), h('span', { class: 'dl' }, t.id === 'draw' && D.lot.range ? '抽 ' + Lottery.pool(true).length + ' 人' : t.label)));
  }
  d.append(h('button', { class: 'dbtn fold', title: '收起工具列（下面會留一個小按鈕，可以再打開）', onclick: () => foldDock(true) }, h('span', { class: 'di' }, '﹀'), h('span', { class: 'dl' }, '收起')));
}
function foldDock(v) {
  UI.dockFold = !!v;
  try { if (v) localStorage.setItem('bxbox-dock', 'fold'); else localStorage.removeItem('bxbox-dock'); } catch (e) { }
  renderDock(); renderBoard();
}
function classPlus() {
  const ids = presentList().map(s => s.id);
  if (!ids.length) return toast('還沒有同學');
  const go = d => pointsToast(addPoints(ids, d, '全班加分'), '全班 ' + ids.length + ' 位 +' + d);
  if (!D.info.allAsk) return go(1);
  const m = modal('全班加分：加幾分？', c => {
    c.body.append(h('div', { class: 'bigbtns' }, [1, 2, 3, 5, 10].map(d => h('button', { class: 'sbtn plus big', onclick: () => { m.close(); go(d); } }, '+' + d))),
      h('p', { class: 'muted' }, '請假的同學不算。'));
  });
}

/* ---------- 點名 ---------- */
const ATT_CYCLE = ['', 'sick', 'personal', 'late'];
function setAtt(sid, v) {
  const k = dateKey(), a = D.att[k] || (D.att[k] = {});
  if (v) a[sid] = v; else delete a[sid];
  save(); refresh();
}
function cycleAtt(sid) { setAtt(sid, ATT_CYCLE[(ATT_CYCLE.indexOf(statusOf(sid)) + 1) % 4]); }
function attendSheet() {
  modal('點名表　' + fmtMD(new Date()), c => {
    const tb = h('div', { class: 'attlist' });
    for (const s of roster()) {
      const st = statusOf(s.id);
      tb.append(h('div', { class: 'attrow' }, h('span', { class: 'nm' }, nameOf(s)),
        h('div', { class: 'seg' }, [['', '出席'], ['sick', '病假'], ['personal', '事假'], ['late', '遲到']].map(([k, t]) =>
          h('button', { class: st === k ? 'on' : '', onclick: () => { setAtt(s.id, k); c.rebuild(); } }, t)))));
    }
    c.body.append(h('p', { class: 'muted' }, '應到 ' + D.students.length + '，實到 ' + presentList().length + '（遲到算出席）'), tb);
    c.foot.append(h('button', { class: 'btn', onclick: () => { D.att[dateKey()] = {}; save(); refresh(); c.rebuild(); } }, '全班都出席'),
      h('button', { class: 'btn', onclick: () => attendRecord() }, '出缺席紀錄'), h('button', { class: 'btn pri', onclick: () => c.close() }, '完成'));
  });
}
function attendRecord() {
  const today = new Date(), st = { from: dateKey(weekStart(today)), to: dateKey(today), view: 'sum' };
  modal('出缺席紀錄', c => {
    const setR = (a, b) => { st.from = a; st.to = b; c.rebuild(); };
    const mStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const from = h('input', { class: 'inp', type: 'date', value: st.from, onchange: e => setR(e.target.value, st.to) });
    const to = h('input', { class: 'inp', type: 'date', value: st.to, onchange: e => setR(st.from, e.target.value) });
    c.body.append(h('div', { class: 'row wrap' },
      h('button', { class: 'btn sm', onclick: () => setR(dateKey(), dateKey()) }, '今天'),
      h('button', { class: 'btn sm', onclick: () => setR(dateKey(weekStart(today)), dateKey()) }, '本週'),
      h('button', { class: 'btn sm', onclick: () => setR(dateKey(mStart), dateKey()) }, '本月'),
      from, '～', to,
      h('span', { class: 'seg' }, h('button', { class: st.view === 'sum' ? 'on' : '', onclick: () => { st.view = 'sum'; c.rebuild(); } }, '統計'),
        h('button', { class: st.view === 'day' ? 'on' : '', onclick: () => { st.view = 'day'; c.rebuild(); } }, '每日'))));
    const days = Object.keys(D.att).filter(k => k >= st.from && k <= st.to).sort();
    let rows;
    if (st.view === 'sum') {
      rows = [['座號', '姓名', '病假', '事假', '遲到']];
      for (const s of roster()) {
        const n = { sick: 0, personal: 0, late: 0 };
        for (const k of days) { const v = D.att[k][s.id]; if (v) n[v]++; }
        rows.push([pad(s.no), s.name, n.sick, n.personal, n.late]);
      }
    } else {
      rows = [['日期', '座號', '姓名', '狀況']];
      for (const k of days) for (const s of roster()) { const v = D.att[k][s.id]; if (v) rows.push([fmtMD(k), pad(s.no), s.name, ABS[v]]); }
    }
    c.body.append(tableEl(rows), h('p', { class: 'muted' }, '沒有標記的日子當作全班到齊。'));
    c.foot.append(h('button', { class: 'btn', onclick: () => download('出缺席紀錄_' + st.from + '_' + st.to + '.csv', toCSV(rows), 'text/csv') }, '匯出 CSV'),
      h('button', { class: 'btn', onclick: () => printHTML('出缺席紀錄', '<h1>' + escHTML(D.info.className) + ' 出缺席紀錄（' + st.from + '～' + st.to + '）</h1>' + tableHTML(rows)) }, '列印'),
      h('button', { class: 'btn pri', onclick: () => c.close() }, '完成'));
  }, { cls: 'wide' });
}
function tableEl(rows) {
  return h('div', { class: 'tblwrap' }, h('table', { class: 'tbl' },
    h('thead', null, h('tr', null, rows[0].map(x => h('th', null, x)))),
    h('tbody', null, rows.slice(1).map(r => h('tr', null, r.map(x => h('td', null, x)))))));
}
function tableHTML(rows) {
  return '<table><thead><tr>' + rows[0].map(x => '<th>' + escHTML(x) + '</th>').join('') + '</tr></thead><tbody>' +
    rows.slice(1).map(r => '<tr>' + r.map(x => '<td>' + escHTML(x) + '</td>').join('') + '</tr>').join('') + '</tbody></table>';
}

/* ---------- 班級設定 ---------- */
const Settings = {
  tab: 'class',
  open(tab) {
    if (tab) this.tab = tab;
    modal('班級設定', c => this.build(c), { cls: 'wide', onClose: () => refresh() });
  },
  build(c) {
    const tabs = [['class', '班級'], ['roster', '名單'], ['reasons', '加扣分理由'], ['look', '外觀'], ['data', '資料'], ['lock', '螢幕鎖'], ['about', '關於']];
    if (!this['tab_' + this.tab]) this.tab = 'look';
    c.body.append(h('div', { class: 'tabs' }, tabs.map(([k, t]) => h('button', { class: this.tab === k ? 'on' : '', onclick: () => { this.tab = k; c.rebuild(); } }, t))));
    const p = h('div', { class: 'tabpane' }); c.body.append(p);
    this['tab_' + this.tab](p, c);
  },
  tab_class(p, c) {
    const tog = (k, t, hint, def = false) => h('label', { class: 'tog' },
      h('input', { type: 'checkbox', checked: D.info[k] === undefined ? def : !!D.info[k], onchange: e => { D.info[k] = e.target.checked; save(); refresh(); } }), h('span', null, t), hint ? h('small', { class: 'muted' }, hint) : null);
    p.append(
      h('label', { class: 'lbl' }, '班名'),
      h('input', { class: 'inp', value: D.info.className, oninput: e => { D.info.className = e.target.value; save(); renderTop(); } }),
      h('label', { class: 'lbl' }, '老師'),
      h('button', { class: 'btn tchip-btn', onclick: () => { c.close(); TeacherUI.open(); } }, h('span', { class: 'tc-mini', innerHTML: avatarSVG(D.info.teacher.avatar, false) }), TeacherUI.name() + '　換頭像和稱呼'),
      h('label', { class: 'lbl' }, '同學卡片的分數按鈕（1～100，扣分用負數）'),
      h('div', { class: 'row' }, D.info.scoreBtns.map((v, i) => h('input', { class: 'inp num', type: 'number', min: -100, max: 100, value: v, onchange: e => { const n = Math.round(+e.target.value); if (n) { D.info.scoreBtns[i] = clamp(n, -100, 100); save(); } else e.target.value = D.info.scoreBtns[i]; } }))),
      tog('hideScore', '隱藏分數', '名牌上只顯示座號和名字'),
      tog('allAsk', '按全班加分時先選分數'),
      tog('drawAsk', '按抽籤時先問要抽幾位'),
      tog('teacherWalk', '加分、抽籤時老師走到同學旁邊稱讚', '3D 教室', true));
  },
  tab_roster(p, c) {
    const list = h('div', { class: 'rlist' });
    for (const s of roster()) {
      list.append(h('div', { class: 'rrow' },
        h('input', { class: 'inp num', type: 'number', min: 1, max: 99, value: s.no, title: '座號', onchange: e => {
          const n = clamp(Math.round(+e.target.value) || s.no, 1, 99); const o = D.students.find(x => x.no === n && x !== s);
          if (o) o.no = s.no; s.no = n; save(); c.rebuild(); refresh();
        } }),
        h('input', { class: 'inp', value: s.name, placeholder: '姓名', oninput: e => { s.name = e.target.value.trim(); save(); } , onchange: () => refresh() }),
        h('span', { class: 'muted' }, (s.score || 0) + ' 分'),
        h('button', { class: 'link danger', onclick: async () => {
          if (!await ask('把 ' + nameOf(s) + ' 從名單移除？他的分數也會一起刪掉。', '移除', { danger: true })) return;
          D.students = D.students.filter(x => x !== s); if (UI.sel === s.id) UI.sel = null; save(); c.rebuild(); refresh();
        } }, '移除')));
    }
    p.append(h('p', { class: 'muted' }, '共 ' + D.students.length + ' 位。改成別人的座號時，兩人會互換座號。'), list,
      h('div', { class: 'row wrap' },
        h('button', { class: 'btn', onclick: () => { const no = Math.max(0, ...D.students.map(s => s.no)) + 1; D.students.push({ id: uid(), no, name: '', score: 0, seat: null, group: null }); autoSeatSilent(); save(); c.rebuild(); refresh(); } }, '＋ 加一位同學'),
        h('button', { class: 'btn', onclick: async () => {
          const t = await askText('貼上名字清單', '一行一位；有空號時在名字前寫座號（例如「5 林大同」）', '', { multi: true });
          if (t == null) return; const L = parseNames(t); if (!L.length) return;
          const rep = D.students.length ? await ask('要用這份清單「取代」目前的名單嗎？（取消＝加在後面）', '取代', { danger: true }) : true;
          if (rep) createStudents(L, true);
          else { const base = Math.max(0, ...D.students.map(s => s.no)); createStudents(L.map((x, i) => ({ no: D.students.some(s => s.no === x.no) ? base + i + 1 : x.no, name: x.name })), false); }
          c.rebuild();
        } }, '📋 貼上名字清單'),
        h('button', { class: 'btn danger', onclick: async () => {
          if (!await ask('清空整份名單？分數、點名、作業紀錄裡的這些同學也會不見。建議先到「資料」匯出備份檔。', '清空名單', { danger: true })) return;
          D.students = []; UI.sel = null; save(); c.rebuild(); refresh();
        } }, '清空名單')));
  },
  tab_reasons(p, c) {
    const ed = (key, title, cls) => {
      const inp = h('input', { class: 'inp', placeholder: '輸入新的理由，可一次貼「A、B、C」' });
      const add = () => { for (const t of inp.value.split(/[、,，\n]/).map(x => x.trim()).filter(Boolean)) if (!D[key].includes(t) && D[key].length < 30) D[key].push(t); save(); c.rebuild(); };
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') add(); });
      return h('div', { class: 'redit' }, h('div', { class: 'lbl' }, title + '（最多 30 個，點 ‹ › 調整順序）'),
        h('div', { class: 'reasons' }, D[key].map((r, i) => h('span', { class: 'chip ' + cls },
          h('button', { class: 'mv', title: '往前', onclick: () => { if (i) { [D[key][i - 1], D[key][i]] = [D[key][i], D[key][i - 1]]; save(); c.rebuild(); } } }, '‹'),
          h('span', { class: 'ct', title: '點一下改名', onclick: async () => { const t = await askText('改名', '理由', r); if (t && t.trim()) { D[key][i] = t.trim(); save(); c.rebuild(); } } }, r),
          h('button', { class: 'mv', title: '往後', onclick: () => { if (i < D[key].length - 1) { [D[key][i + 1], D[key][i]] = [D[key][i], D[key][i + 1]]; save(); c.rebuild(); } } }, '›'),
          h('button', { class: 'del', title: '刪除', onclick: () => { D[key].splice(i, 1); save(); c.rebuild(); } }, '×')))),
        h('div', { class: 'row' }, inp, h('button', { class: 'btn', onclick: add }, '加入')));
    };
    p.append(ed('plus', '加分理由（點一下 +1）', 'plus'), ed('minus', '扣分理由（點一下 −1）', 'minus'));
  },
  tab_look(p, c) {
    const I = D.info;
    const seg = (cur, opts, set) => h('div', { class: 'seg' }, opts.map(([k, t]) => h('button', { class: cur === k ? 'on' : '', onclick: () => { set(k); save(); refresh(); c.rebuild(); } }, t)));
    const row = (label, ctl, ...notes) => h('div', { class: 'lk-row' }, h('span', { class: 'lk-l' }, label), h('div', { class: 'lk-c' }, ctl, notes.length ? h('ul', { class: 'lk-notes' }, notes.map(n => h('li', null, n))) : null));
    const tiles = (list, hidden, onTog) => h('div', { class: 'dockedit' }, list.map((t, i) => {
      const hid = hidden.includes(t.id);
      return [i && list[i - 1].grp && t.grp !== list[i - 1].grp ? h('i', { class: 'dsep' }) : null,
        h('button', { class: 'dbtn' + (hid ? ' hid' : ''), onclick: () => { onTog(t.id, hid); save(); c.rebuild(); renderDock(); refresh(); } },
          h('span', { class: 'di' }, t.icon), h('span', { class: 'dl' }, hid ? '藏起來了' : t.label))];
    }));
    p.append(
      h('h3', { class: 'set-h' }, '教室佈景'),
      themeCards(() => c.rebuild()),
      h('h3', { class: 'set-h' }, '教室裡'),
      row('教室畫面', seg(I.view === 'flat' ? 'flat' : '3d', [['3d', '3D 教室'], ['flat', '平面座位表']], v => { I.view = v; })),
      row('教室地板', seg(I.floor, [['terrazzo', '磨石子'], ['wood', '木地板']], v => { I.floor = v; })),
      row('同學桌上', seg(I.deskItem, [['none', '空桌子'], ['book', '課本和筆'], ['milk', '牛奶']], v => { I.deskItem = v; }), '佈景是考試、閱讀時光、午餐時間時，桌上改放佈景的東西。'),
      row('教室冷氣', seg(I.ac === false ? 'off' : 'on', [['off', '沒有冷氣'], ['on', '有冷氣']], v => { I.ac = v === 'on'; }), '掛在後牆公佈欄的兩邊；點一下開，再點一下關。講桌上的遙控器可以調溫度和風速。'),
      row('教室時鐘', seg(D.clockStyle, [['analog', '指針式'], ['digital', '電子式']], v => { D.clockStyle = v; }), '牆上的時鐘和大時鐘一起換；點牆上的時鐘會打開大時鐘。'),
      row('公佈欄', h('button', { class: 'btn', onclick: () => Room.editBoard() }, '編輯班級公約、榮譽榜、小叮嚀')),
      h('h3', { class: 'set-h' }, '黑板'),
      row('黑板字體', seg(I.boardFont, [['kai', '楷書'], ['wenkai', '霞鶩文楷']], v => { I.boardFont = v; }),
        '黑板、公佈欄和投影的字。', '楷書用電腦內建的標楷體；霞鶩文楷比較活潑，要連上網路才下載得到（沒網路時先用楷書）。'),
      row('應到、實到', seg(I.attPos === 'none' ? 'none' : 'right', [['none', '不寫'], ['right', '寫在黑板上']], v => { I.attPos = v; }), '寫在聯絡簿前面第一行、倒數的後面（直書時是最右邊那一行）。'),
      h('h3', { class: 'set-h' }, '哪些按鈕要出現'),
      h('p', { class: 'muted' }, '點一下就藏起來，再點一下回來。藏起來不會刪掉資料。'),
      h('div', { class: 'lbl small' }, '下方工具列'),
      tiles(TOOLS, I.dockHidden, (id, hid) => {
        if (hid) I.dockHidden = I.dockHidden.filter(x => x !== id);
        else if (I.dockHidden.length < TOOLS.length - 1) I.dockHidden.push(id);
      }),
      h('div', { class: 'lbl small' }, '同學卡片'),
      tiles(CARD_BTNS.map(([id, icon, label]) => ({ id, icon, label })), I.cardHidden, (id, hid) => { I.cardHidden = hid ? I.cardHidden.filter(x => x !== id) : I.cardHidden.concat(id); }),
      h('h3', { class: 'set-h' }, '只影響這台電腦'),
      row('老師和同學的樣子', seg(Look.fine ? 'fine' : 'simple', [['fine', '精緻'], ['simple', '簡單']], v => Look.set(v)),
        '精緻：大眼睛、有表情（加分會笑、抽中會驚訝）和小動作，需要比較好的電腦。', '畫面卡卡的時候，改成簡單。'),
      row('教室名牌大小', seg(Look.tag, [['m', '標準'], ['l', '大'], ['xl', '特大']], v => Look.setTag(v)),
        '3D 教室裡同學的名牌（座號、名字、分數、缺／訂／✓）。投影時後面的同學看不清楚就選大一點。', '名牌會自動避開同學的臉，太擠的地方會稍微縮小。'));
  },
  tab_lock(p, c) { Lock.settings(p, c); },
  tab_data(p, c) {
    p.append(
      h('div', { class: 'warnbox' }, h('b', null, '資料只存在這台電腦的這個瀏覽器裡。'), '換電腦、換瀏覽器、清除瀏覽資料都會不見，請定期匯出備份檔（建議每週一次，存到 OneDrive 或隨身碟）。'),
      h('div', { class: 'row wrap' },
        h('button', { class: 'btn pri', onclick: () => Backup.exportFile() }, '⬇ 匯出備份檔'),
        h('button', { class: 'btn', onclick: () => Backup.importFile() }, '⬆ 匯入備份檔（本網頁、班班或雲端動態牆）')),
      h('p', { class: 'muted small' }, '雲端動態牆：把這裡匯出的備份檔匯入雲端動態牆，任何電腦登入 claude.ai 都能用同一面動態牆；雲端動態牆匯出的檔案從「匯入備份檔」帶回來，只會換掉動態牆。'),
      h('div', { class: 'row wrap' }, cloudWallLink('btn', '☁ 打開雲端動態牆')),
      h('h3', null, '重來'),
      h('div', { class: 'row wrap' },
        h('button', { class: 'btn', onclick: async () => {
          if (!await ask('全班分數歸零？同學的分數和今天的加減分紀錄會清掉（小組分數、結算紀錄保留）。想留下這一期，請改用分數榜的「結算本期分數」。', '歸零', { danger: true })) return;
          D.students.forEach(s => { s.score = 0; }); D.log.items = D.log.items.filter(i => i.gid); D.info.scoreStart = null; save(); refresh(); toast('全班分數歸零了');
        } }, '全班分數歸零'),
        h('button', { class: 'btn danger', onclick: async () => {
          if (!await ask('清空整個班，從頭開始？名單、分數、點名、作業、課表、動態牆全部刪掉，無法復原。', '清空整個班', { danger: true })) return;
          D = defaultData(); UI.sel = null; UI.mode = 'normal'; saveNow(); c.close(); refresh(); toast('已清空，可以重新開始');
        } }, '清空整個班')));
  },
  tab_about(p) {
    p.append(h('p', null, h('b', null, '班級百寶箱'), '：班級經營小工具。座位、加扣分、點名、作業、抽籤、扭蛋、小組、黑板、計時、課表、大時鐘、分數榜和動態牆都在同一個畫面。'),
      h('ul', null,
        h('li', null, '不用安裝、不用帳號、不用網路，直接用瀏覽器（Chrome、Edge）打開 index.html。'),
        h('li', null, '資料只存在這台電腦的瀏覽器，不會上傳。'),
        h('li', null, '分數會一直累積；分數榜的「結算本期分數」可以存下一期再歸零。'),
        h('li', null, '學生個人資料請依學校規定和《個人資料保護法》使用。')));
  }
};
