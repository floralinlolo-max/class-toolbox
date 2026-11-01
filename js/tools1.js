'use strict';
/* 抽籤、扭蛋機、小組、分數榜與結算 */

/* ================= 抽籤 ================= */
const Lottery = {
  last: [], count: 1, phase: 'done', chosen: [], p: null,
  pool(all) {
    let L = presentList();
    const r = D.lot.range;
    if (r) L = r.type === 'only' ? L.filter(s => r.ids.includes(s.id)) : L.filter(s => !r.ids.includes(s.id));
    return all ? L : L.filter(s => !D.lot.round.includes(s.id));
  },
  start(keepRange) {
    if (!D.students.length) return toast('還沒有同學，先到班級設定建立名單');
    const go = () => {
      if (!D.info.drawAsk) return this.draw(1);
      const max = Math.min(6, this.pool(true).length);
      const m = modal('要抽幾位？', c => c.body.append(h('div', { class: 'bigbtns' },
        Array.from({ length: max }, (_, i) => h('button', { class: 'sbtn plus big', onclick: () => { m.close(); this.draw(i + 1); } }, '抽 ' + (i + 1) + ' 位')))));
    };
    if (D.lot.range && !keepRange && !(this.p && !this.p.closed)) {
      const r = D.lot.range, n = this.pool(true).length;
      const m = modal('抽籤範圍', c => {
        c.body.append(h('p', null, '目前的範圍：' + (r.type === 'only' ? '只從選取的 ' : '排除選取的人，剩 ') + n + ' 人。'));
        c.foot.append(h('button', { class: 'btn', onclick: () => { D.lot.range = null; save(); renderDock(); m.close(); go(); } }, '改回全班'),
          h('button', { class: 'btn pri', onclick: () => { m.close(); go(); } }, '繼續用這個範圍'));
      });
      return;
    }
    go();
  },
  draw(n) {
    const full = this.pool(true);
    if (!full.length) return toast('沒有可以抽的同學（請假的不會抽到）');
    n = Math.min(n, full.length);
    let avail = this.pool(false);
    const chosen = [];
    while (chosen.length < n) {
      if (!avail.length) {
        D.lot.round = chosen.map(s => s.id);
        avail = full.filter(s => !chosen.includes(s));
        const fresh = avail.filter(s => !this.last.includes(s.id));
        if (fresh.length >= n - chosen.length) avail = fresh;
      }
      const s = avail.splice(Math.floor(Math.random() * avail.length), 1)[0];
      chosen.push(s); if (!D.lot.round.includes(s.id)) D.lot.round.push(s.id);
    }
    this.last = chosen.map(s => s.id); this.chosen = chosen; this.count = n;
    save(); renderDock();
    this.phase = 'spin';
    if (this.p && !this.p.closed) this.p.rebuild();
    else this.p = proj('抽籤', c => this.build(c), { cls: 'lotp' });
    this.spin(full);
  },
  spin(full) {
    const el = this.p.body.querySelector('.lot-name');
    let i = 0; const steps = 24;
    const step = () => {
      if (this.p.closed) return;
      if (i >= steps) { this.phase = 'done'; Snd.win(); this.p.rebuild(); if (typeof Room !== 'undefined') Room.react(this.chosen.map(s => s.id), 0, '', 'wow'); return; }
      const s = pick(full);
      el.replaceChildren(h('span', { class: 'lno' }, pad(s.no)), h('span', null, s.name || ''));
      Snd.tick(); i++;
      setTimeout(step, 40 + Math.pow(i / steps, 3) * 320);
    };
    step();
  },
  build(c) {
    if (this.phase === 'spin') { c.body.append(h('div', { class: 'lot-stage' }, h('div', { class: 'lot-name spinning' }))); return; }
    const ids = this.chosen.map(s => s.id), one = this.chosen.length === 1;
    c.body.append(h('div', { class: 'lot-res' + (one ? ' one' : '') }, this.chosen.map(s => h('div', { class: 'lot-card' },
      h('div', { class: 'lno' }, pad(s.no)), h('div', { class: 'lnm' }, s.name || ''),
      h('button', { class: 'sbtn plus', onclick: () => pointsToast(addPoints([s.id], 1, '抽籤回答'), nameOf(s) + ' +1') }, '+1')))));
    const r = D.lot.range, left = this.pool(false).length;
    const cnt = h('div', { class: 'seg' }, [1, 2, 3, 4, 5, 6].map(k => h('button', { class: this.count === k ? 'on' : '', disabled: k > this.pool(true).length, onclick: () => { this.count = k; c.rebuild(); } }, k)));
    c.body.append(h('div', { class: 'lot-ctl' },
      !one ? h('button', { class: 'btn', onclick: () => pointsToast(addPoints(ids, 1, '抽籤回答'), '抽到的 ' + ids.length + ' 位各 +1') }, '每人 +1') : null,
      one ? h('button', { class: 'btn', onclick: () => { c.close(); Gacha.open(ids[0]); } }, '🎁 來扭蛋') : null,
      h('span', { class: 'lot-again' }, '再抽 ', cnt, ' 位'),
      h('button', { class: 'btn big yellow', onclick: () => this.draw(this.count) }, '抽！')),
      h('p', { class: 'muted center' }, '這一輪還有 ' + left + ' 位沒抽到',
        h('button', { class: 'link', onclick: () => { D.lot.round = []; save(); c.rebuild(); toast('重新開始一輪'); } }, '重新開始'),
        r ? ['　範圍：', r.type === 'only' ? '只從選取的人' : '排除選取的人', h('button', { class: 'link', onclick: () => { D.lot.range = null; save(); renderDock(); c.rebuild(); } }, '改回全班')] : null));
  }
};

/* ================= 扭蛋機 ================= */
const Gacha = {
  kind: 'prize', sid: null, phase: 'idle', last: null, p: null, tab: 'prize',
  cost() { return this.kind === 'prize' ? Math.max(0, Math.round(+D.gacha.cost || 0)) : 0; },
  poolOf(k) { return k === 'prize' ? D.gacha.prizes.filter(p => p.name && (!p.limited || p.left > 0)) : D.gacha.tasks.filter(t => t.name); },
  open(sid) {
    if (sid) this.sid = sid;
    this.phase = 'idle';
    if (this.p && !this.p.closed) return this.p.rebuild();
    this.p = proj('扭蛋機', c => this.build(c), { cls: 'gachap' });
  },
  machine() {
    const col = this.kind === 'prize' ? '#ef8a2c' : '#1f9e89', dark = this.kind === 'prize' ? '#c96a14' : '#167a69';
    const caps = [];
    const palette = ['#f25c54', '#f7b32b', '#4ecdc4', '#5b8def', '#a66cff', '#ff8fab', '#7ed957'];
    const spots = [[95, 175], [135, 185], [175, 180], [210, 168], [115, 145], [155, 150], [195, 138], [85, 140], [130, 110], [170, 108], [225, 130], [105, 80], [150, 72], [195, 85]];
    spots.forEach(([x, y], i) => {
      const c = palette[i % palette.length];
      caps.push(svg('g', { transform: 'translate(' + x + ' ' + y + ') rotate(' + (i * 37 % 360) + ')' },
        svg('circle', { r: 17, fill: '#fff', stroke: 'rgba(0,0,0,.18)', 'stroke-width': 1.5 }),
        svg('path', { d: 'M-17 0 A17 17 0 0 1 17 0 Z', fill: c }),
        svg('line', { x1: -17, y1: 0, x2: 17, y2: 0, stroke: 'rgba(0,0,0,.2)', 'stroke-width': 1.5 })));
    });
    const dropC = palette[Math.floor(Math.random() * palette.length)];
    return svg('svg', { viewBox: '0 0 300 440', class: 'gmach' + (this.phase === 'spin' ? ' spin' : ''), role: 'img', 'aria-label': '扭蛋機' },
      svg('rect', { x: 60, y: 405, width: 34, height: 26, rx: 6, fill: dark }), svg('rect', { x: 206, y: 405, width: 34, height: 26, rx: 6, fill: dark }),
      svg('rect', { x: 36, y: 222, width: 228, height: 190, rx: 26, fill: col }),
      svg('rect', { x: 36, y: 222, width: 228, height: 22, rx: 11, fill: dark }),
      svg('circle', { cx: 150, cy: 128, r: 114, fill: '#eaf6ff', stroke: '#b9d7ea', 'stroke-width': 6 }),
      svg('g', { class: 'gcaps' }, caps),
      svg('path', { d: 'M78 60 A100 100 0 0 1 150 30', fill: 'none', stroke: '#fff', 'stroke-width': 10, 'stroke-linecap': 'round', opacity: 0.8 }),
      svg('rect', { x: 92, y: 256, width: 116, height: 34, rx: 10, fill: '#fff8ea' }),
      svg('text', { x: 150, y: 280, 'text-anchor': 'middle', 'font-size': 20, 'font-weight': 700, fill: dark }, this.kind === 'prize' ? '獎勵扭蛋' : '任務扭蛋'),
      svg('g', { class: 'gknob' },
        svg('circle', { cx: 150, cy: 334, r: 34, fill: '#fff', stroke: dark, 'stroke-width': 5 }),
        svg('rect', { x: 140, y: 304, width: 20, height: 60, rx: 9, fill: dark })),
      svg('rect', { x: 196, y: 372, width: 52, height: 30, rx: 10, fill: '#3a2a1a' }),
      svg('g', { class: 'gdrop' },
        svg('circle', { cx: 222, cy: 387, r: 13, fill: '#fff' }),
        svg('path', { d: 'M209 387 A13 13 0 0 1 235 387 Z', fill: dropC })));
  },
  build(c) {
    const k = this.kind, cost = this.cost(), pool = this.poolOf(k);
    const s = this.sid && stu(this.sid);
    c.headExtra = [h('div', { class: 'seg gk' }, [['prize', '🎁 獎勵扭蛋'], ['task', '📝 任務扭蛋']].map(([v, t]) =>
      h('button', { class: k === v ? 'on' : '', onclick: () => { this.kind = v; this.phase = 'idle'; c.rebuild(); } }, t)))];
    const mach = h('div', { class: 'gm-wrap', title: '點把手轉一下', onclick: () => this.spin() }, this.machine());
    const side = h('div', { class: 'g-side' });
    const sel = h('select', { class: 'inp big', onchange: e => { this.sid = e.target.value || null; this.phase = 'idle'; c.rebuild(); } },
      h('option', { value: '' }, cost ? '— 請選誰來扭 —' : '— 不指定 —'),
      presentList().map(x => {
        const sc = x.score || 0, times = cost ? Math.floor(sc / cost) : null;
        return h('option', { value: x.id, selected: x.id === this.sid }, nameOf(x) + (cost ? '（' + sc + ' 分，可扭 ' + times + ' 次）' : ''));
      }));
    side.append(h('label', { class: 'lbl' }, '誰來扭？'), sel,
      h('div', { class: 'g-cost' }, k === 'task' ? '任務扭蛋不用分數' : cost ? '扭一次扣 ' + cost + ' 分' : '不用分數'));
    if (k === 'prize') side.append(h('div', { class: 'g-list' }, D.gacha.prizes.filter(p => p.name).map(p =>
      h('span', { class: 'chip' + (p.limited && p.left <= 0 ? ' out' : '') }, p.name, p.limited ? h('small', null, p.left > 0 ? ' 剩 ' + p.left : ' 送完了') : null))));
    else side.append(h('div', { class: 'g-list' }, D.gacha.tasks.filter(t => t.name).map(t => h('span', { class: 'chip' }, t.name))));
    let status = '';
    if (!pool.length) status = k === 'prize' ? '獎勵都送完了，到「扭蛋設定」補數量。' : '還沒有任務，到「扭蛋設定」加入。';
    else if (cost && !s) status = '先選同學，再按「轉一下！」';
    else if (cost && s && (s.score || 0) < cost) status = nameOf(s) + ' 目前 ' + (s.score || 0) + ' 分，還差 ' + (cost - (s.score || 0)) + ' 分。';
    side.append(h('p', { class: 'g-status' }, status),
      h('button', { class: 'btn big yellow', disabled: this.phase === 'spin', onclick: () => this.spin() }, this.phase === 'spin' ? '轉動中…' : '轉一下！'),
      h('button', { class: 'btn', onclick: () => this.settings() }, '⚙ 扭蛋設定（獎勵、數量、分數）'));
    c.body.append(h('div', { class: 'g-grid' }, mach, side));
    if (this.phase === 'open' && this.last) {
      const L = this.last;
      c.body.append(h('div', { class: 'g-result', onclick: e => { if (e.target.classList.contains('g-result')) { this.phase = 'idle'; c.rebuild(); } } },
        h('div', { class: 'g-card' },
          h('div', { class: 'g-cap' }, h('span', { class: 'top' }), h('span', { class: 'bot' })),
          h('div', { class: 'g-who' }, L.rec.who ? L.rec.who + (L.rec.kind === 'prize' ? ' 扭到了' : ' 的任務是') : (L.rec.kind === 'prize' ? '扭到了' : '任務是')),
          h('div', { class: 'g-item' }, L.rec.item),
          L.rec.cost ? h('div', { class: 'muted' }, '扣 ' + L.rec.cost + ' 分，剩 ' + ((stu(L.rec.sid) || {}).score || 0) + ' 分') : null,
          h('div', { class: 'row center' },
            h('button', { class: 'btn', onclick: () => this.undo() }, '這次不算'),
            h('button', { class: 'btn pri', onclick: () => { this.phase = 'idle'; c.rebuild(); } }, '好！')))));
    }
  },
  spin() {
    if (this.phase === 'spin') return;
    const k = this.kind, pool = this.poolOf(k), cost = this.cost(), s = this.sid && stu(this.sid);
    if (!pool.length) return toast(k === 'prize' ? '獎勵都送完了，到扭蛋設定補數量' : '還沒有任務，到扭蛋設定加入');
    if (cost) {
      if (!s) return toast('用分數兌換時，要先選誰來扭');
      if ((s.score || 0) < cost) return toast(nameOf(s) + ' 分數不夠：目前 ' + (s.score || 0) + ' 分，扭一次要 ' + cost + ' 分');
    }
    const item = pick(pool);
    const made = cost ? addPoints([s.id], -cost, '扭蛋：' + item.name, true) : [];
    if (k === 'prize' && item.limited) item.left = Math.max(0, item.left - 1);
    const rec = { id: uid(), at: new Date().toISOString(), sid: s ? s.id : null, who: s ? nameOf(s) : '', kind: k, item: item.name, itemId: item.id, cost };
    D.gacha.history.unshift(rec);
    if (D.gacha.history.length > 500) D.gacha.history.length = 500;
    save();
    this.last = { rec, made };
    this.phase = 'spin'; this.p.rebuild(); Snd.crank();
    setTimeout(() => { if (this.p.closed) return; this.p.body.querySelector('.gmach').classList.add('drop'); Snd.pop(); }, 1300);
    setTimeout(() => { if (this.p.closed) return; this.phase = 'open'; this.p.rebuild(); Snd.win(); }, 2200);
  },
  undo() {
    const L = this.last; if (!L) return;
    if (L.made.length) removeLog(L.made);
    if (L.rec.kind === 'prize') { const it = D.gacha.prizes.find(p => p.id === L.rec.itemId); if (it && it.limited) it.left++; }
    D.gacha.history = D.gacha.history.filter(r => r.id !== L.rec.id);
    this.last = null; this.phase = 'idle'; save();
    if (this.p && !this.p.closed) this.p.rebuild();
    toast('這次不算：分數和獎品都退回了');
  },
  settings() {
    modal('扭蛋設定（後台）', c => {
      c.body.append(h('div', { class: 'tabs' }, [['prize', '🎁 獎勵與分數'], ['task', '📝 任務'], ['hist', '🧾 兌換紀錄']].map(([k, t]) =>
        h('button', { class: this.tab === k ? 'on' : '', onclick: () => { this.tab = k; c.rebuild(); } }, t))));
      const p = h('div', { class: 'tabpane' }); c.body.append(p);
      if (this.tab === 'prize') {
        const cur = Math.max(0, Math.round(+D.gacha.cost || 0));
        const costIn = h('input', { class: 'inp num', type: 'number', min: 0, max: 100000, value: cur, onchange: e => { D.gacha.cost = Math.max(0, Math.round(+e.target.value || 0)); save(); c.rebuild(); } });
        p.append(h('div', { class: 'lbl' }, '扭一次要用多少分兌換？'),
          h('div', { class: 'row wrap' }, h('div', { class: 'seg' }, [0, 10, 20, 50, 100, 200].map(v => h('button', { class: cur === v ? 'on' : '', onclick: () => { D.gacha.cost = v; save(); c.rebuild(); } }, v ? v + ' 分' : '不用'))), '自訂：', costIn, '分'),
          h('ul', { class: 'muted hints' }, cur ? [h('li', null, '扭一次從同學的分數扣 ' + cur + ' 分；分數不夠就不能扭。'), h('li', null, '扣掉的分數記在今天的加減分裡（理由是「扭蛋：獎品名稱」）。')] : h('li', null, '選「不用」時，扭蛋不會動到分數。')),
          h('div', { class: 'lbl' }, '獎勵（每一種扭到的機會一樣；限量的送完就不會再扭到）'));
        const list = h('div', { class: 'glist' });
        D.gacha.prizes.forEach((it, i) => list.append(h('div', { class: 'grow-row' },
          h('input', { class: 'inp', value: it.name, placeholder: '獎勵名稱', oninput: e => { it.name = e.target.value; save(); } }),
          h('div', { class: 'seg' },
            h('button', { class: !it.limited ? 'on' : '', onclick: () => { it.limited = false; save(); c.rebuild(); } }, '不限'),
            h('button', { class: it.limited ? 'on' : '', onclick: () => { it.limited = true; if (!(it.left > 0)) it.left = 10; save(); c.rebuild(); } }, '限量')),
          it.limited ? h('span', { class: 'row' }, '還剩', h('input', { class: 'inp num', type: 'number', min: 0, value: it.left, onchange: e => { it.left = Math.max(0, Math.round(+e.target.value || 0)); save(); } }), '個') : h('span', { class: 'muted' }, '數量不限'),
          h('button', { class: 'link danger', onclick: () => { D.gacha.prizes.splice(i, 1); save(); c.rebuild(); } }, '刪除'))));
        p.append(list, h('div', { class: 'row wrap' },
          h('button', { class: 'btn', onclick: () => { D.gacha.prizes.push({ id: uid(), name: '', limited: false, left: 0 }); save(); c.rebuild(); setTimeout(() => { const ins = $$('.glist .inp:not(.num)', c.body); ins[ins.length - 1]?.focus(); }, 30); } }, '＋ 新增獎勵'),
          h('button', { class: 'btn', onclick: async () => { const t = await askText('一次加入好幾個獎勵', '一行一個，或用「、」分開', '', { multi: true }); if (!t) return; t.split(/[、,，\n]/).map(x => x.trim()).filter(Boolean).forEach(n => D.gacha.prizes.push({ id: uid(), name: n, limited: false, left: 0 })); save(); c.rebuild(); } }, '一次貼上好幾個')));
      } else if (this.tab === 'task') {
        p.append(h('ul', { class: 'muted hints' }, h('li', null, '一個問題、一件小差事，扭到的同學來做。'), h('li', null, '任務扭蛋不用分數，也不限數量。')));
        const list = h('div', { class: 'glist' });
        D.gacha.tasks.forEach((it, i) => list.append(h('div', { class: 'grow-row' },
          h('input', { class: 'inp', value: it.name, placeholder: '任務內容', oninput: e => { it.name = e.target.value; save(); } }),
          h('button', { class: 'link danger', onclick: () => { D.gacha.tasks.splice(i, 1); save(); c.rebuild(); } }, '刪除'))));
        p.append(list, h('button', { class: 'btn', onclick: () => { D.gacha.tasks.push({ id: uid(), name: '' }); save(); c.rebuild(); } }, '＋ 新增任務'));
      } else {
        const H = D.gacha.history;
        const rows = [['時間', '同學', '種類', '扭到', '扣分']].concat(H.map(r => { const d = new Date(r.at); return [fmtMD(d) + ' ' + hm(d), r.who || '（不指定）', r.kind === 'prize' ? '獎勵' : '任務', r.item, r.cost || '']; }));
        p.append(h('p', { class: 'muted' }, '最近的扭蛋紀錄（最多保留 500 筆），可以用來核對誰兌換了什麼。'),
          H.length ? tableEl(rows.slice(0, 101)) : h('p', null, '還沒有紀錄。'),
          h('div', { class: 'row wrap' },
            h('button', { class: 'btn', disabled: !H.length, onclick: () => download('扭蛋紀錄_' + dateKey() + '.csv', toCSV(rows), 'text/csv') }, '匯出 CSV'),
            h('button', { class: 'btn danger', disabled: !H.length, onclick: async () => { if (await ask('清除全部扭蛋紀錄？（分數不會改變）', '清除', { danger: true })) { D.gacha.history = []; save(); c.rebuild(); } } }, '清除紀錄')));
      }
      c.foot.append(h('button', { class: 'btn', onclick: () => { c.close(); this.open(); } }, '投影扭蛋機'), h('button', { class: 'btn pri', onclick: () => c.close() }, '完成'));
    }, { cls: 'wide', onClose: () => { D.gacha.prizes = D.gacha.prizes.filter(p => p.name.trim()); D.gacha.tasks = D.gacha.tasks.filter(t => t.name.trim()); save(); if (this.p && !this.p.closed) this.p.rebuild(); } });
  }
};

/* ================= 小組 ================= */
const Groups = {
  showMembers: false, comp: null, p: null,
  colorOf(s) {
    if (UI.temp) { const g = UI.temp.find(g => g.ids.includes(s.id)); return g ? g.color : null; }
    const g = s.group && grp(s.group); return g ? g.color : null;
  },
  members(gid) { return roster().filter(s => s.group === gid); },
  open() {
    if (!D.students.length) return toast('還沒有同學');
    if (UI.temp || D.groups.length) return this.board();
    const n = h('input', { class: 'inp num', type: 'number', min: 2, max: 10, value: 4 });
    const m = modal('小組', c => {
      c.body.append(h('div', { class: 'wcards' },
        h('div', { class: 'wcard' }, h('h3', null, '🗣 臨時小組討論'), h('p', { class: 'muted' }, '全班隨機分組，討論完就結束，不會留下來。'),
          h('div', { class: 'row' }, n, '組', h('button', { class: 'btn pri', onclick: () => { m.close(); this.startTemp(clamp(+n.value || 4, 2, 10)); } }, '開始'))),
        h('div', { class: 'wcard' }, h('h3', null, '👥 設定固定小組'), h('p', { class: 'muted' }, '組員固定、可以累積小組分數。'),
          h('button', { class: 'btn pri', onclick: () => { m.close(); this.setup(); } }, '設定小組'))));
    });
  },
  startTemp(n) {
    const L = shuffle(presentList());
    UI.temp = Array.from({ length: n }, (_, i) => ({ name: '第 ' + (i + 1) + ' 組', color: GROUP_COLORS[i % GROUP_COLORS.length], ids: [] }));
    L.forEach((s, i) => UI.temp[i % n].ids.push(s.id));
    refresh(); this.board();
  },
  board() {
    if (this.p && !this.p.closed) return this.p.rebuild();
    this.p = proj('小組', c => this.buildBoard(c), { cls: 'grpp' });
  },
  buildBoard(c) {
    const temp = !!UI.temp;
    const list = temp ? UI.temp.map((g, i) => ({ id: 't' + i, name: g.name, color: g.color, ids: g.ids })) : D.groups.map(g => ({ ...g, ids: this.members(g.id).map(s => s.id) }));
    c.setTitle(temp ? '臨時小組討論' : '小組計分板');
    const grid = h('div', { class: 'gb-grid n' + list.length });
    for (const g of list) {
      const card = h('div', { class: 'gb-card', style: { '--gc': g.color } }, h('div', { class: 'gb-name' }, g.name));
      if (!temp) {
        card.append(h('div', { class: 'gb-score' }, D.info.hideScore ? '？' : (g.score || 0)),
          h('div', { class: 'sbtns' }, D.info.scoreBtns.map(d => h('button', { class: 'sbtn ' + (d > 0 ? 'plus' : 'minus'), onclick: () => { pointsToast(addGroupPoints(g.id, d, ''), g.name + ' ' + (d > 0 ? '+' : '−') + Math.abs(d)); c.rebuild(); } }, (d > 0 ? '+' : '−') + Math.abs(d)))));
      }
      if (temp || this.showMembers) card.append(h('div', { class: 'gb-mem' }, g.ids.map(id => { const s = stu(id); return h('span', { class: isAbsent(id) ? 'abs' : '' }, nameOf(s) + (isAbsent(id) ? '（假）' : '')); })));
      else card.append(h('div', { class: 'muted' }, g.ids.length + ' 人'));
      grid.append(card);
    }
    c.body.append(grid);
    if (temp) {
      c.foot.append(h('button', { class: 'btn', onclick: () => this.startTemp(UI.temp.length) }, '🔀 重新分組'),
        h('button', { class: 'btn', onclick: () => this.compStart(list) }, '🏆 單次競賽計分'),
        h('button', { class: 'btn pri', onclick: () => { UI.temp = null; refresh(); c.close(); toast('討論結束，回到座位'); } }, '結束討論'));
    } else {
      c.foot.append(h('button', { class: 'btn', onclick: () => { this.showMembers = !this.showMembers; c.rebuild(); } }, this.showMembers ? '收起組員' : '顯示組員'),
        h('button', { class: 'btn', onclick: () => this.setup() }, '⚙ 設定小組'),
        h('button', { class: 'btn', onclick: () => this.compStart(list) }, '🏆 單次競賽計分'),
        h('button', { class: 'btn', onclick: () => this.print() }, '🖨 列印組員'),
        h('button', { class: 'btn', disabled: !D.groups.some(g => g.score), onclick: async () => { if (await ask('小組分數歸零？組員和個人分數不變。', '歸零', { danger: true })) { D.groups.forEach(g => { g.score = 0; }); save(); c.rebuild(); } } }, '小組分數歸零'));
    }
  },
  setup() {
    let into = D.groups[0] ? D.groups[0].id : null;
    modal('設定小組', c => {
      const setCount = n => {
        n = clamp(n, 0, 10);
        while (D.groups.length < n) { const i = D.groups.length; D.groups.push({ id: uid(), name: '第 ' + (i + 1) + ' 組', color: GROUP_COLORS[i % GROUP_COLORS.length], score: 0 }); }
        while (D.groups.length > n) { const g = D.groups.pop(); D.students.forEach(s => { if (s.group === g.id) s.group = null; }); }
        if (!grp(into)) into = D.groups[0] ? D.groups[0].id : null;
        save(); c.rebuild(); refresh();
      };
      c.body.append(h('div', { class: 'row wrap' },
        h('span', { class: 'stepper' }, '組數 ', h('button', { class: 'btn sm', onclick: () => setCount(D.groups.length - 1) }, '−'), h('b', null, D.groups.length), h('button', { class: 'btn sm', onclick: () => setCount(D.groups.length + 1) }, '＋')),
        h('button', { class: 'btn', disabled: !D.groups.length, onclick: () => {
          const L = shuffle(presentList()).concat(roster().filter(s => isAbsent(s.id)));
          L.forEach((s, i) => { s.group = D.groups[i % D.groups.length].id; }); save(); c.rebuild(); refresh();
        } }, '🔀 隨機分組'),
        h('button', { class: 'btn', onclick: () => {
          const C = D.info.cols; setCount(C);
          D.students.forEach(s => { s.group = seatOK(s) ? D.groups[s.seat[1]].id : null; }); save(); c.rebuild(); refresh();
        } }, '依座位直行分組'),
        h('button', { class: 'btn danger', disabled: !D.groups.length, onclick: async () => {
          if (!await ask('取消分組？組員、組名和小組分數會清掉。', '取消分組', { danger: true })) return;
          D.groups = []; D.students.forEach(s => { s.group = null; }); save(); c.rebuild(); refresh();
        } }, '取消分組')));
      if (!D.groups.length) { c.body.append(h('p', { class: 'muted' }, '按「＋」設定組數。')); return; }
      c.body.append(h('div', { class: 'lbl' }, '先點一組（放進），再點下面同學的名字，就把他放進那一組。組名可以直接改。'));
      c.body.append(h('div', { class: 'gs-cols' }, D.groups.map(g => h('div', { class: 'gs-col' + (into === g.id ? ' on' : ''), style: { '--gc': g.color }, onclick: e => { if (e.target.tagName !== 'INPUT') { into = g.id; c.rebuild(); } } },
        h('input', { class: 'inp', value: g.name, oninput: e => { g.name = e.target.value; save(); } }),
        h('div', { class: 'gs-mem' }, this.members(g.id).map(s => h('span', { class: 'chip' }, nameOf(s)))),
        h('div', { class: 'muted small' }, into === g.id ? '▶ 放進這一組' : '點這裡選這一組')))));
      c.body.append(h('div', { class: 'reasons' }, roster().map(s => { const g = s.group && grp(s.group); return h('button', { class: 'chip', style: g ? { background: g.color, color: '#fff' } : null, onclick: () => { s.group = s.group === into ? null : into; save(); c.rebuild(); refresh(); } }, nameOf(s)); })));
    }, { cls: 'wide', onClose: () => { refresh(); if (this.p && !this.p.closed) this.p.rebuild(); } });
  },
  print() {
    const cols = D.groups.map(g => '<td style="vertical-align:top"><b style="color:' + g.color + '">' + escHTML(g.name) + '</b><br>' + this.members(g.id).map(s => escHTML(nameOf(s))).join('<br>') + '</td>').join('');
    printHTML('小組名單', '<h1>' + escHTML(D.info.className) + ' 小組名單</h1><table><tr>' + cols + '</tr></table>', 'td{text-align:left;font-size:17px;line-height:1.8}@page{size:A4 landscape}');
  },
  compStart(list) {
    this.comp = { teams: list.map(g => ({ name: g.name, color: g.color, score: 0, hist: [] })), done: false };
    proj('單次競賽計分', c => this.buildComp(c), { cls: 'compp', onClose: () => {} });
  },
  buildComp(c) {
    const C = this.comp;
    if (C.done) {
      const sorted = C.teams.slice().sort((a, b) => b.score - a.score);
      c.body.append(h('div', { class: 'comp-res' }, sorted.map(t => {
        const rank = 1 + sorted.filter(x => x.score > t.score).length;
        return h('div', { class: 'comp-row', style: { '--gc': t.color } }, h('span', { class: 'rk' }, '第 ' + rank + ' 名'), h('span', { class: 'nm' }, t.name), h('b', null, t.score + ' 分'));
      })));
      c.foot.append(h('button', { class: 'btn', onclick: () => { C.done = false; c.rebuild(); } }, '繼續計分'),
        h('button', { class: 'btn pri', onclick: () => { this.comp = null; c.close(); } }, '確認結束並清除'));
      return;
    }
    c.body.append(h('p', { class: 'muted center' }, '這場另外計分，每組從 0 分開始，不會影響平常的小組和個人分數。'),
      h('div', { class: 'gb-grid n' + C.teams.length }, C.teams.map(t => h('div', { class: 'gb-card', style: { '--gc': t.color } },
        h('div', { class: 'gb-name' }, t.name), h('div', { class: 'gb-score' }, t.score),
        h('div', { class: 'sbtns' }, [1, 2, 3, -1].map(d => h('button', { class: 'sbtn ' + (d > 0 ? 'plus' : 'minus'), onclick: () => { t.score += d; t.hist.push(d); d > 0 ? Snd.plus() : Snd.minus(); c.rebuild(); } }, (d > 0 ? '+' : '−') + Math.abs(d)))),
        t.hist.length ? h('button', { class: 'link', onclick: () => { t.score -= t.hist.pop(); c.rebuild(); } }, '↶ 復原上一筆') : null))));
    c.foot.append(h('button', { class: 'btn pri', onclick: () => { C.done = true; Snd.win(); c.rebuild(); } }, '結束競賽・看結果'));
  }
};

/* ================= 分數榜、結算 ================= */
const Rank = {
  view: 'stu',
  ranked(rows) {
    const s = rows.slice().sort((a, b) => b.score - a.score || a.no - b.no);
    s.forEach(r => { r.rank = 1 + s.filter(x => x.score > r.score).length; });
    return s;
  },
  open() {
    if (!D.students.length) return toast('還沒有同學');
    proj('分數榜', c => this.build(c), { cls: 'rankp' });
  },
  podium(rows, hide) {
    const R = this.ranked(rows);
    const step = k => R.filter(r => r.rank === k && r.score > 0);
    const col = (k, cls) => h('div', { class: 'pd-col ' + cls },
      h('div', { class: 'pd-names' }, step(k).map(r => h('div', { class: 'pd-n' }, h('small', null, pad(r.no)), ' ', r.name))),
      h('div', { class: 'pd-step' }, h('div', { class: 'pd-medal' }, ['🥇', '🥈', '🥉'][k - 1]), !hide && step(k).length ? h('div', { class: 'pd-sc' }, step(k)[0].score + ' 分') : null));
    const rest = R.filter(r => r.rank > 3 || r.score <= 0);
    return h('div', { class: 'podium-wrap' },
      h('div', { class: 'podium' }, col(2, 'p2'), col(1, 'p1'), col(3, 'p3')),
      h('div', { class: 'rk-rest' }, rest.map(r => h('div', { class: 'rk-item' }, h('span', { class: 'rk-no' }, r.score > 0 ? r.rank : ''), h('span', null, pad(r.no) + ' ' + r.name), h('b', null, r.score > 0 ? (hide ? '' : r.score) : '加油！')))));
  },
  build(c) {
    const hasG = D.groups.length > 0;
    if (hasG) c.headExtra = [h('div', { class: 'seg' }, h('button', { class: this.view === 'stu' ? 'on' : '', onclick: () => { this.view = 'stu'; c.rebuild(); } }, '個人'), h('button', { class: this.view === 'grp' ? 'on' : '', onclick: () => { this.view = 'grp'; c.rebuild(); } }, '小組'))];
    const since = D.info.scoreStart ? '累計：' + fmtMD(D.info.scoreStart) + ' ～ ' + fmtMD(new Date()) : '尚未開始計分';
    c.body.append(h('div', { class: 'rk-top' }, h('span', { class: 'muted' }, since),
      h('button', { class: 'btn sm', onclick: () => { D.info.hideScore = !D.info.hideScore; save(); refresh(); c.rebuild(); } }, D.info.hideScore ? '👁 顯示分數' : '🙈 隱藏分數')));
    if (this.view === 'grp' && hasG) {
      const G = D.groups.slice().sort((a, b) => (b.score || 0) - (a.score || 0));
      c.body.append(h('div', { class: 'gb-grid n' + G.length }, G.map(g => h('div', { class: 'gb-card', style: { '--gc': g.color } }, h('div', { class: 'gb-name' }, g.name), h('div', { class: 'gb-score' }, D.info.hideScore ? '？' : (g.score || 0))))));
    } else c.body.append(this.podium(roster().map(s => ({ no: s.no, name: s.name, score: s.score || 0 })), D.info.hideScore));
    c.foot.append(h('button', { class: 'btn', onclick: () => this.settle() }, '結算本期分數'),
      h('button', { class: 'btn', onclick: () => this.table(this.current()) }, '看分數表格'),
      h('button', { class: 'btn', onclick: () => this.history() }, '歷次結算紀錄'));
  },
  current() {
    return { name: '目前分數', start: D.info.scoreStart, end: dateKey(), rows: roster().map(s => ({ id: s.id, no: s.no, name: s.name, score: s.score || 0 })), groups: D.groups.map(g => ({ name: g.name, color: g.color, score: g.score || 0 })) };
  },
  settle() {
    const st = { name: '', reset: true, withG: true };
    const today = new Date();
    modal('結算本期分數', c => {
      const inp = h('input', { class: 'inp', value: st.name, placeholder: '例如：10月第3週', oninput: e => { st.name = e.target.value; } });
      const ws = weekStart(today), we = new Date(ws); we.setDate(ws.getDate() + 4);
      const wkNo = Math.ceil((today.getDate() + new Date(today.getFullYear(), today.getMonth(), 1).getDay() - 1) / 7) || 1;
      c.body.append(h('p', null, '保存每位同學目前累積的分數。'), h('label', { class: 'lbl' }, '這一期叫什麼'), inp,
        h('div', { class: 'row wrap' }, '幫這一期取名：',
          h('button', { class: 'btn sm', onclick: () => { st.name = fmtMD(today); c.rebuild(); } }, '今天'),
          h('button', { class: 'btn sm', onclick: () => { st.name = (today.getMonth() + 1) + '月第' + wkNo + '週'; c.rebuild(); } }, '本週（' + fmtMD(ws) + '～' + fmtMD(we) + '）'),
          h('button', { class: 'btn sm', onclick: () => { st.name = (today.getMonth() + 1) + '月'; c.rebuild(); } }, '本月')),
        h('label', { class: 'tog' }, h('input', { type: 'checkbox', checked: st.reset, onchange: e => { st.reset = e.target.checked; } }), h('span', null, '結算後全班分數歸零'), h('small', { class: 'muted' }, '下一期從 0 分開始')),
        D.groups.length ? h('label', { class: 'tog' }, h('input', { type: 'checkbox', checked: st.withG, onchange: e => { st.withG = e.target.checked; } }), h('span', null, '小組分數一起結算（也一起歸零）')) : null);
      c.foot.append(h('button', { class: 'btn', onclick: () => c.close() }, '取消'), h('button', { class: 'btn pri', onclick: () => {
        const cur = this.current();
        const rec = { id: uid(), name: st.name.trim() || fmtMD(today) + ' 結算', at: new Date().toISOString(), start: cur.start, end: cur.end, rows: cur.rows, groups: D.groups.length && st.withG ? cur.groups : [] };
        D.settles.unshift(rec);
        if (st.reset) { D.students.forEach(s => { s.score = 0; }); D.log.items = D.log.items.filter(i => i.gid); D.info.scoreStart = null; }
        if (st.reset && st.withG) { D.groups.forEach(g => { g.score = 0; }); D.log.items = D.log.items.filter(i => i.sid); }
        save(); refresh(); c.close(); toast('已結算「' + rec.name + '」'); this.table(rec);
      } }, '結算'));
    });
  },
  table(rec) {
    let sort = 'no';
    modal(rec.name + ' 分數表格', c => {
      const R = this.ranked(rec.rows.map(r => ({ ...r })));
      const L = sort === 'no' ? R.slice().sort((a, b) => a.no - b.no) : R;
      const rows = [['座號', '姓名', '分數', '名次']].concat(L.map(r => [pad(r.no), r.name, r.score, r.rank]));
      c.body.append(h('p', { class: 'muted' }, (rec.start ? fmtMD(rec.start) : '開始時間未記錄') + ' ～ ' + fmtMD(rec.end)),
        rec.groups && rec.groups.length ? h('div', { class: 'row wrap' }, rec.groups.map(g => h('span', { class: 'chip', style: { background: g.color, color: '#fff' } }, g.name + ' ' + g.score + ' 分'))) : null,
        h('div', { class: 'seg' }, h('button', { class: sort === 'no' ? 'on' : '', onclick: () => { sort = 'no'; c.rebuild(); } }, '依座號'), h('button', { class: sort === 'rank' ? 'on' : '', onclick: () => { sort = 'rank'; c.rebuild(); } }, '依名次')),
        tableEl(rows));
      c.foot.append(h('button', { class: 'btn', onclick: () => proj(rec.name + ' 頒獎台', p => p.body.append(this.podium(rec.rows, false)), { cls: 'rankp' }) }, '頒獎台（投影）'),
        h('button', { class: 'btn', onclick: () => download(rec.name + '_分數.csv', toCSV(rows), 'text/csv') }, '匯出 CSV'),
        h('button', { class: 'btn', onclick: () => printHTML(rec.name, '<h1>' + escHTML(D.info.className) + ' ' + escHTML(rec.name) + '</h1>' + tableHTML(rows)) }, '列印'),
        h('button', { class: 'btn pri', onclick: () => c.close() }, '完成'));
    }, { cls: 'wide' });
  },
  history() {
    const pickd = new Set();
    modal('歷次結算紀錄', c => {
      if (!D.settles.length) { c.body.append(h('p', null, '還沒有結算紀錄。在分數榜按「結算本期分數」就會存一筆。')); return; }
      c.body.append(h('p', { class: 'muted' }, '勾選好幾期再按「合計」，可以算學期總成績。每期結算後有歸零，合計才不會重複計算。'),
        h('div', { class: 'hist' }, D.settles.map(r => h('div', { class: 'hist-row' },
          h('input', { type: 'checkbox', checked: pickd.has(r.id), onchange: e => { e.target.checked ? pickd.add(r.id) : pickd.delete(r.id); } }),
          h('button', { class: 'link', onclick: () => this.table(r) }, r.name),
          h('span', { class: 'muted' }, (r.start ? fmtMD(r.start) : '—') + ' ～ ' + fmtMD(r.end)),
          h('button', { class: 'link danger', onclick: async () => { if (await ask('刪除「' + r.name + '」這筆結算紀錄？', '刪除', { danger: true })) { D.settles = D.settles.filter(x => x !== r); save(); c.rebuild(); } } }, '刪除')))));
      c.foot.append(h('button', { class: 'btn pri', onclick: () => {
        const S = D.settles.filter(r => pickd.has(r.id)).reverse();
        if (S.length < 1) return toast('請先勾選要合計的期別');
        const keyOf = r => r.id || 'no' + r.no, who = {};
        S.forEach(rec => rec.rows.forEach(r => { who[keyOf(r)] = who[keyOf(r)] || { no: r.no, name: r.name }; }));
        const people = Object.entries(who).sort((a, b) => a[1].no - b[1].no);
        const rows = [['座號', '姓名', ...S.map(r => r.name), '合計']].concat(people.map(([k, p]) => {
          const vals = S.map(rec => { const r = rec.rows.find(x => keyOf(x) === k); return r ? r.score : 0; });
          return [pad(p.no), p.name, ...vals, vals.reduce((a, b) => a + b, 0)];
        }));
        modal('合計', m => {
          m.body.append(tableEl(rows));
          m.foot.append(h('button', { class: 'btn', onclick: () => download('分數合計.csv', toCSV(rows), 'text/csv') }, '匯出 CSV'),
            h('button', { class: 'btn', onclick: () => printHTML('分數合計', '<h1>' + escHTML(D.info.className) + ' 分數合計</h1>' + tableHTML(rows)) }, '列印'),
            h('button', { class: 'btn pri', onclick: () => m.close() }, '完成'));
        }, { cls: 'wide' });
      } }, '合計'));
    }, { cls: 'wide' });
  }
};
