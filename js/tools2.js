'use strict';
/* 作業、我好了、計時器、黑板與聯絡簿、課表、大時鐘、螢幕鎖 */

/* ---------- 指針時鐘（大時鐘與動態牆共用） ---------- */
function analogClock() {
  const parts = [svg('circle', { cx: 100, cy: 100, r: 96, class: 'face' })];
  for (let i = 0; i < 60; i++) {
    const a = i * Math.PI / 30, big = i % 5 === 0, r1 = big ? 83 : 89;
    parts.push(svg('line', { x1: 100 + r1 * Math.sin(a), y1: 100 - r1 * Math.cos(a), x2: 100 + 93 * Math.sin(a), y2: 100 - 93 * Math.cos(a), class: big ? 'tk big' : 'tk' }));
  }
  for (let i = 1; i <= 12; i++) { const a = i * Math.PI / 6; parts.push(svg('text', { x: 100 + 70 * Math.sin(a), y: 100 - 70 * Math.cos(a) + 6, 'text-anchor': 'middle', class: 'num' }, i)); }
  const hh = svg('line', { x1: 100, y1: 100, x2: 100, y2: 54, class: 'hh' });
  const mh = svg('line', { x1: 100, y1: 100, x2: 100, y2: 30, class: 'mh' });
  const sh = svg('line', { x1: 100, y1: 114, x2: 100, y2: 22, class: 'sh' });
  const el = svg('svg', { viewBox: '0 0 200 200', class: 'analog' }, parts, hh, mh, sh, svg('circle', { cx: 100, cy: 100, r: 4.5, class: 'pin' }));
  return {
    el,
    update(d = new Date(), sec = true) {
      const s = d.getSeconds(), m = d.getMinutes() + s / 60, hr = d.getHours() % 12 + m / 60;
      hh.setAttribute('transform', 'rotate(' + hr * 30 + ' 100 100)');
      mh.setAttribute('transform', 'rotate(' + m * 6 + ' 100 100)');
      sh.setAttribute('transform', 'rotate(' + s * 6 + ' 100 100)');
      sh.style.display = sec ? '' : 'none';
    }
  };
}
// 計時器的指針式錶面（計時器和動態牆的計時器共用）：一圈 60 分鐘，扇形是剩下（碼錶是已經過）的時間，長針指分、紅色細針指秒。
// 倒數的刻度像視覺計時器一樣逆時針排，時間越來越少時扇形和指針都往順時針走回 0
function timerDial(down) {
  const dir = down ? -1 : 1, pt = (deg, r) => [100 + r * Math.sin(deg * Math.PI / 180), 100 - r * Math.cos(deg * Math.PI / 180)];
  const parts = [svg('circle', { cx: 100, cy: 100, r: 96, class: 'face' })], wedge = svg('path', { class: 'wedge' + (down ? '' : ' up') });
  parts.push(wedge);
  for (let i = 0; i < 60; i++) {
    const big = i % 5 === 0, [x1, y1] = pt(i * 6, big ? 83 : 89), [x2, y2] = pt(i * 6, 93);
    parts.push(svg('line', { x1, y1, x2, y2, class: big ? 'tk big' : 'tk' }));
  }
  for (let m = 0; m < 60; m += 5) { const [x, y] = pt(dir * m * 6, 72); parts.push(svg('text', { x, y: y + 6, 'text-anchor': 'middle', class: 'num' }, m)); }
  const mh = svg('line', { x1: 100, y1: 100, x2: 100, y2: 30, class: 'mh' }), sh = svg('line', { x1: 100, y1: 114, x2: 100, y2: 22, class: 'sh' });
  const el = svg('svg', { viewBox: '0 0 200 200', class: 'analog tdial' }, parts, mh, sh, svg('circle', { cx: 100, cy: 100, r: 4.5, class: 'pin' }));
  return {
    el,
    update(sec) {
      sec = Math.max(0, sec);
      const a = Math.min(sec, 3600) / 10, [x, y] = pt(dir * a, 64);
      wedge.setAttribute('d', a >= 359.9 ? 'M100 36A64 64 0 1 1 99.99 36Z' : a <= 0 ? '' : `M100 100L100 36A64 64 0 ${a > 180 ? 1 : 0} ${down ? 0 : 1} ${x.toFixed(2)} ${y.toFixed(2)}Z`);
      mh.setAttribute('transform', 'rotate(' + dir * (sec / 10 % 360) + ' 100 100)');
      sh.setAttribute('transform', 'rotate(' + dir * ((down ? Math.ceil(sec) : Math.floor(sec)) % 60) * 6 + ' 100 100)');   // 和數字一樣：倒數無條件進位、碼錶捨去
    }
  };
}
function clockInfo(now = new Date()) {
  const S = schedNow(now);
  if (!S.school) return { per: '', left: '' };
  if (S.cur) {
    const ex = isExam(S.cur.subj);
    return { per: periodText(S.cur), left: (ex ? '距離考試結束還有 ' : S.cur.kind === 'class' ? '距離下課還有 ' : '距離結束還有 ') + fmtLeft((S.cur.e - S.m) * 60), exam: ex };
  }
  if (S.next) return { per: S.list.indexOf(S.next) === 0 ? '還沒上課' : '下課時間', left: '下一節 ' + S.next.start + '　' + periodText(S.next) };
  return { per: '放學了', left: '' };
}
function fitText(box, inner, step = 0, max = 600) {
  // 扣掉框框的內距，直書的字才不會超出下緣被切掉
  const cs = getComputedStyle(box), W = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight), H = box.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  const fits = () => inner.scrollHeight <= H + 1 && inner.scrollWidth <= W + 1 && inner.offsetWidth <= W + 1;
  let lo = 8, hi = max;
  for (let i = 0; i < 16; i++) { const mid = (lo + hi) / 2; inner.style.fontSize = mid + 'px'; if (fits()) lo = mid; else hi = mid; }
  inner.style.fontSize = Math.floor(lo * (1 + 0.12 * step)) + 'px';
}

/* ================= 作業 ================= */
const HW_NEXT = { '': 'miss', miss: 'fix', fix: 'done', done: '' };
const HW_T = { miss: '缺交', fix: '要訂正', done: '完成' };
const Homework = {
  showNames: false,
  get(id) { return D.hw.find(w => w.id === id); },
  mark(id, sid) { const w = this.get(id); return w ? w.marks[sid] || '' : ''; },
  setMark(w, sid, v) {
    if (v) w.marks[sid] = v; else { delete w.marks[sid]; delete w.everMiss[sid]; delete w.everFix[sid]; }
    if (v === 'miss') w.everMiss[sid] = 1;
    if (v === 'fix') w.everFix[sid] = 1;
    save(); refresh();
  },
  cycle(id, sid) { const w = this.get(id); if (w) this.setMark(w, sid, HW_NEXT[w.marks[sid] || '']); },
  pendingOf(sid) { return D.hw.filter(w => w.marks[sid] === 'miss' || w.marks[sid] === 'fix').map(w => ({ name: w.name, m: w.marks[sid] })); },
  owing(w) { return roster().filter(s => w.marks[s.id] === 'miss' || w.marks[s.id] === 'fix'); },
  add(name) { name = name.trim(); if (name) { D.hw.unshift({ id: uid(), name, date: dateKey(), marks: {}, everMiss: {}, everFix: {} }); save(); } },
  check(id) { UI.hwId = id; setMode('hw'); UI.hwId = id; refresh(); },
  open() {
    modal('作業', c => {
      const inp = h('input', { class: 'inp', placeholder: '作業名稱，例如：數習 P.32～33' });
      const add = () => { if (!inp.value.trim()) return; this.add(inp.value); c.rebuild(); };
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') add(); });
      c.body.append(h('div', { class: 'row' }, inp, h('button', { class: 'btn pri', onclick: add }, '新增')));
      const fromBoard = D.board.contact.items.filter(i => i.cat === 'hw' && i.text.trim() && !D.hw.some(w => w.name === i.text.trim() && w.date === dateKey()));
      if (fromBoard.length) c.body.append(h('div', { class: 'row wrap' }, h('span', { class: 'muted' }, '從聯絡簿的功課加入：'),
        fromBoard.map(i => h('button', { class: 'chip', onclick: () => { this.add(i.text); c.rebuild(); } }, '＋ ' + i.text))));
      if (!D.hw.length) c.body.append(h('p', { class: 'muted' }, '還沒有作業。新增後按「檢查」，再點教室裡的同學標記 缺交 → 要訂正 → 完成。'));
      c.body.append(h('div', { class: 'hwlist' }, D.hw.map(w => {
        const cnt = k => Object.values(w.marks).filter(v => v === k).length;
        return h('div', { class: 'hwrow' },
          h('div', { class: 'hw-t' }, h('b', null, w.name), h('small', { class: 'muted' }, '　' + fmtMD(w.date))),
          h('div', { class: 'hw-c' }, h('span', { class: 'tag miss' }, '缺 ' + cnt('miss')), h('span', { class: 'tag fix' }, '訂 ' + cnt('fix')), h('span', { class: 'tag done' }, '✓ ' + cnt('done'))),
          h('div', { class: 'row' },
            h('button', { class: 'btn sm pri', onclick: () => { c.close(); this.check(w.id); } }, '檢查'),
            h('button', { class: 'btn sm', onclick: () => this.listCheck(w.id) }, '名單'),
            h('button', { class: 'btn sm', onclick: () => this.project(w.id) }, '投影'),
            h('button', { class: 'link danger', onclick: async () => { if (await ask('刪除「' + w.name + '」和它的檢查紀錄？', '刪除', { danger: true })) { D.hw = D.hw.filter(x => x !== w); save(); c.rebuild(); } } }, '刪除')));
      })));
      c.foot.append(h('button', { class: 'btn', onclick: () => this.projectAll() }, '全部投影'), h('button', { class: 'btn', onclick: () => this.stats() }, '統計'), h('button', { class: 'btn pri', onclick: () => c.close() }, '完成'));
    }, { cls: 'wide' });
  },
  listCheck(id) {
    const w = this.get(id); if (!w) return;
    modal('檢查：' + w.name, c => {
      c.body.append(h('div', { class: 'attlist' }, roster().map(s => h('div', { class: 'attrow' }, h('span', { class: 'nm' }, nameOf(s)),
        h('div', { class: 'seg' }, [['', '—'], ['miss', '缺交'], ['fix', '要訂正'], ['done', '完成']].map(([k, t]) =>
          h('button', { class: (w.marks[s.id] || '') === k ? 'on' : '', onclick: () => { this.setMark(w, s.id, k); c.rebuild(); } }, t)))))));
    });
  },
  // 投影的卡片：點一下切換 缺交 → 要訂正 → 完成 → 清除（使用者要求）。點過的同學留在畫面上（keep），變成完成、清除也不會消失，才能再點回來
  oweCard(w, s, keep, c) {
    const m = w.marks[s.id] || '';
    return h('button', { class: 'owe ' + (m || 'none'), title: '點一下切換：缺交 → 要訂正 → 完成 → 清除', onclick: () => { keep.add(s.id); this.cycle(w.id, s.id); c.rebuild(); } },
      h('b', null, pad(s.no)), this.showNames ? h('span', null, s.name) : null, h('small', null, m === 'done' ? '✓ 完成' : HW_T[m] || '已清除'));
  },
  oweHead(c, all, setAll) {
    return [h('span', { class: 'owe-tip' }, '點卡片切換：缺交 → 要訂正 → 完成 → 清除'),
      setAll ? h('button', { class: 'btn sm', onclick: () => { setAll(!all); c.rebuild(); } }, all ? '只看還沒交齊' : '顯示全班') : null,
      h('button', { class: 'btn sm', onclick: () => { this.showNames = !this.showNames; c.rebuild(); } }, this.showNames ? '只顯示座號' : '顯示名字')];
  },
  project(id) {
    const w = this.get(id); if (!w) return;
    const keep = new Set(this.owing(w).map(s => s.id));   // 打開時還沒交齊的同學
    let all = false;
    proj('還沒交齊：' + w.name, c => {
      c.headExtra = this.oweHead(c, all, v => { all = v; });
      const L = roster().filter(s => all || keep.has(s.id) || w.marks[s.id] === 'miss' || w.marks[s.id] === 'fix');
      if (!L.length) { c.body.append(h('div', { class: 'bigmsg' }, '🎉 全部交齊了！')); return; }
      if (!this.owing(w).length) c.body.append(h('div', { class: 'owe-ok' }, '🎉 全部交齊了！'));
      // 人少時卡片放大，投影從後面也看得清楚
      c.body.append(h('div', { class: 'owe-grid', style: '--ow:' + (L.length <= 6 ? 1.6 : L.length <= 12 ? 1.3 : 1) }, L.map(s => this.oweCard(w, s, keep, c))));
    }, { cls: 'owep' });
  },
  projectAll() {
    const W = D.hw.filter(w => this.owing(w).length), keep = new Map(W.map(w => [w.id, new Set(this.owing(w).map(s => s.id))]));   // 打開時還欠的作業和同學
    proj('還沒交齊的作業', c => {
      c.headExtra = this.oweHead(c);
      if (!W.length) { c.body.append(h('div', { class: 'bigmsg' }, '🎉 作業都交齊了！')); return; }
      c.body.append(h('div', { class: 'owe-all' }, W.filter(w => D.hw.includes(w)).map(w => {
        const k = keep.get(w.id), L = roster().filter(s => k.has(s.id) || w.marks[s.id] === 'miss' || w.marks[s.id] === 'fix');
        return h('div', { class: 'owe-sec' }, h('h3', null, w.name, this.owing(w).length ? null : h('span', { class: 'owe-ok sm' }, '　🎉 交齊了')),
          h('div', { class: 'owe-grid sm' }, L.map(s => this.oweCard(w, s, k, c))));
      })));
    }, { cls: 'owep' });
  },
  stats() {
    let range = 'week';
    modal('作業統計', c => {
      const from = range === 'week' ? dateKey(weekStart()) : range === 'month' ? dateKey(new Date(new Date().getFullYear(), new Date().getMonth(), 1)) : '0000';
      const W = D.hw.filter(w => w.date >= from);
      c.body.append(h('div', { class: 'seg' }, [['week', '本週'], ['month', '本月'], ['all', '全部']].map(([k, t]) => h('button', { class: range === k ? 'on' : '', onclick: () => { range = k; c.rebuild(); } }, t))));
      const rows = [['座號', '姓名', '缺交次數', '訂正次數', '現在還欠']].concat(roster().map(s => [pad(s.no), s.name,
        W.filter(w => w.everMiss[s.id]).length, W.filter(w => w.everFix[s.id]).length, D.hw.filter(w => w.marks[s.id] === 'miss' || w.marks[s.id] === 'fix').length]));
      c.body.append(h('p', { class: 'muted' }, '共 ' + W.length + ' 份作業。後來補交的也算一次缺交。'), tableEl(rows));
      c.foot.append(h('button', { class: 'btn', onclick: () => download('作業統計.csv', toCSV(rows), 'text/csv') }, '匯出 CSV'), h('button', { class: 'btn pri', onclick: () => c.close() }, '完成'));
    }, { cls: 'wide' });
  }
};

/* ================= 我好了 ================= */
const Ready = {
  opt: { plus: false, min: 0 },
  item(id) { return D.ready.items.find(i => i.id === id); },
  open() {
    modal('🙋 我好了', c => {
      const inp = h('input', { class: 'inp', placeholder: '要確認的事，例如：學習單寫完了（可以不填）' });
      const go = t => { c.close(); this.start(t); };
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') go(inp.value); });
      c.body.append(h('p', { class: 'muted' }, '學習單、潔牙、回條……讓小朋友自己上來按名字，老師不用一個一個問。'),
        h('div', { class: 'row' }, inp, h('button', { class: 'btn pri', onclick: () => go(inp.value) }, '開始')),
        h('div', { class: 'lbl' }, '常用 ', h('button', { class: 'link', onclick: () => this.editCommon(c) }, '✎ 編輯常用')),
        h('div', { class: 'reasons' }, D.readyCommon.map(t => h('button', { class: 'chip', onclick: () => go(t) }, t))),
        h('label', { class: 'tog' }, h('input', { type: 'checkbox', checked: this.opt.plus, onchange: e => { this.opt.plus = e.target.checked; } }), h('span', null, '完成自動 +1')),
        h('div', { class: 'row wrap' }, '一起計時：', h('div', { class: 'seg' }, [0, 1, 3, 5, 10, 15, 20, 30].map(m => h('button', { class: this.opt.min === m ? 'on' : '', onclick: () => { this.opt.min = m; c.rebuild(); } }, m ? m + ' 分' : '不計時')))));
      if (D.ready.items.length) {
        c.body.append(h('div', { class: 'lbl' }, '今天'), h('div', { class: 'hwlist' }, D.ready.items.map(it => {
          const n = presentList().length, d = presentList().filter(s => it.done[s.id]).length;
          return h('div', { class: 'hwrow' }, h('div', { class: 'hw-t' }, h('b', null, it.title || '（沒有名稱）'), h('small', { class: 'muted' }, '　完成 ' + d + ' / ' + n + (it.plus ? '　完成 +1' : ''))),
            h('div', { class: 'row' }, h('button', { class: 'btn sm pri', onclick: () => { c.close(); this.project(it.id); } }, '投影'),
              h('button', { class: 'btn sm', onclick: () => this.list(it.id) }, '名單'),
              h('button', { class: 'link danger', onclick: () => { D.ready.items = D.ready.items.filter(x => x !== it); save(); c.rebuild(); } }, '刪除')));
        })), h('p', { class: 'muted small' }, '只留到今天，明天自動收起來。'));
      }
    }, { cls: 'wide' });
  },
  editCommon(parent) {
    askText('編輯常用', '一行一項', D.readyCommon.join('\n'), { multi: true }).then(t => {
      if (t == null) return; D.readyCommon = t.split('\n').map(x => x.trim()).filter(Boolean); save(); parent.rebuild();
    });
  },
  start(title) {
    const it = { id: uid(), title: (title || '').trim(), done: {}, plus: this.opt.plus };
    D.ready.items.push(it); save();
    if (this.opt.min) Timer.countdown(this.opt.min * 60, it.title || '我好了');
    this.project(it.id);
  },
  tap(it, s) {
    if (it.done[s.id]) return;
    const made = it.plus ? addPoints([s.id], 1, '我好了' + (it.title ? '：' + it.title : ''), true) : [];
    it.done[s.id] = { t: Date.now(), log: made.map(m => m.id) };
    Snd.ding(); save();
  },
  untap(it, s) {
    const d = it.done[s.id]; if (!d) return;
    if (d.log && d.log.length) removeLog(D.log.items.filter(x => d.log.includes(x.id)));
    delete it.done[s.id]; save();
  },
  project(id) {
    const it = this.item(id); if (!it) return;
    let tk = null;
    proj('🙋 ' + (it.title || '我好了'), c => {
      const P = presentList(), done = P.filter(s => it.done[s.id]);
      const order = done.slice().sort((a, b) => it.done[a.id].t - it.done[b.id].t).map(s => s.id);
      const tm = h('span', { class: 'rd-timer' });
      c.headExtra = [h('span', { class: 'rd-count' }, '已完成 ' + done.length + ' / ' + P.length), tm];
      if (P.length && done.length === P.length) c.body.append(h('div', { class: 'rd-all' }, '🎉 全部完成！'));
      c.body.append(h('div', { class: 'rd-grid' }, roster().map(s => {
        const abs = isAbsent(s.id), ok = !!it.done[s.id], rk = order.indexOf(s.id);
        const b = h('button', { class: 'rd-btn' + (ok ? ' ok' : '') + (abs ? ' abs' : ''), disabled: abs },
          h('span', { class: 'rd-no' }, pad(s.no)), h('span', { class: 'rd-nm' }, s.name || ''),
          ok ? h('span', { class: 'rd-mark' }, rk >= 0 && rk < 3 ? ['🥇', '🥈', '🥉'][rk] : '✓') : null);
        let timer = null, long = false;
        b.addEventListener('pointerdown', () => { long = false; if (ok) timer = setTimeout(() => { long = true; this.untap(it, s); c.rebuild(); toast('已取消 ' + nameOf(s)); }, 900); });
        const clear = () => { clearTimeout(timer); };
        b.addEventListener('pointerup', clear); b.addEventListener('pointerleave', clear);
        b.addEventListener('click', () => {
          if (long || ok) return;
          const before = presentList().filter(x => it.done[x.id]).length;
          this.tap(it, s);
          if (it.plus) { const f = h('div', { class: 'bigplus' }, '+1'); c.box.append(f); setTimeout(() => f.remove(), 900); }
          if (before + 1 === presentList().length) Snd.win();
          c.rebuild();
        });
        return b;
      })), h('p', { class: 'muted center small' }, '做完的同學上來按自己的名字；按錯了，按住名字一秒取消。'));
      if (tk) Tick.delete(tk);
      tk = () => {
        const s = Timer.s;
        if (s.mode === 'down' && (s.running || s.rang)) {
          const v = Timer.value();
          tm.textContent = v > 0 ? '還有 ' + fmtSec(v) : '時間到！還沒好的有 ' + (presentList().length - presentList().filter(x => it.done[x.id]).length) + ' 位';
          tm.className = 'rd-timer on' + (v <= 60 ? ' warn' : '') + (v <= 0 ? ' end' : '');
        } else tm.textContent = '';
      };
      Tick.add(tk); tk();
    }, { cls: 'readyp', onClose: () => Tick.delete(tk) });
  },
  list(id) {
    const it = this.item(id); if (!it) return;
    modal('名單：' + (it.title || '我好了'), c => {
      c.body.append(h('div', { class: 'reasons' }, roster().map(s => h('button', { class: 'chip' + (it.done[s.id] ? ' on' : '') + (isAbsent(s.id) ? ' out' : ''), onclick: () => { it.done[s.id] ? this.untap(it, s) : this.tap(it, s); c.rebuild(); } }, (it.done[s.id] ? '✓ ' : '') + nameOf(s)))));
      c.foot.append(h('button', { class: 'btn', onclick: () => { c.close(); this.project(id); } }, '投影'), h('button', { class: 'btn pri', onclick: () => c.close() }, '完成'));
    });
  }
};

/* ================= 計時器 ================= */
const TKEY = 'bxbox-timer';
const Timer = {
  s: { mode: 'down', total: 300, remain: 300, running: false, endAt: 0, startAt: 0, elapsed: 0, title: '', rang: false, face: 'digital' },   // face：數字／指針（analog）
  load() { try { Object.assign(this.s, JSON.parse(localStorage.getItem(TKEY) || '{}')); } catch (e) { } },
  persist() { try { localStorage.setItem(TKEY, JSON.stringify(this.s)); } catch (e) { } },
  value() {
    const s = this.s;
    if (s.mode === 'down') return s.running ? (s.endAt - Date.now()) / 1000 : s.remain;
    return s.running ? s.elapsed + (Date.now() - s.startAt) / 1000 : s.elapsed;
  },
  start() {
    const s = this.s; if (s.running) return;
    if (s.mode === 'down') { if (s.remain <= 0) s.remain = s.total; if (s.remain <= 0) return; s.endAt = Date.now() + s.remain * 1000; s.rang = false; }
    else s.startAt = Date.now();
    s.running = true; this.persist(); this.redraw();
  },
  pause() {
    const s = this.s; if (!s.running) return;
    if (s.mode === 'down') s.remain = Math.max(0, (s.endAt - Date.now()) / 1000); else s.elapsed += (Date.now() - s.startAt) / 1000;
    s.running = false; this.persist(); this.redraw();
  },
  reset() { const s = this.s; s.running = false; s.remain = s.total; s.elapsed = 0; s.rang = false; this.persist(); this.redraw(); },
  zero() { const s = this.s; s.running = false; s.remain = 0; s.total = 0; s.elapsed = 0; s.rang = false; this.persist(); this.redraw(); },
  set(sec) { const s = this.s; s.mode = 'down'; s.total = sec; s.remain = sec; s.running = false; s.rang = false; this.persist(); this.redraw(); },
  add(sec) {
    const s = this.s; s.mode = 'down'; s.rang = false;
    if (s.running) s.endAt = Math.max(Date.now(), s.endAt + sec * 1000); else s.remain = Math.max(0, s.remain + sec);
    if (!s.running) s.total = Math.max(s.total, s.remain);
    this.persist(); this.redraw();
  },
  countdown(sec, title) { this.s.title = title || ''; this.set(sec); this.start(); },
  tick() {
    const s = this.s;
    if (s.running && s.mode === 'down' && s.endAt <= Date.now()) {
      s.running = false; s.remain = 0; s.rang = true; this.persist();
      Snd.ring(s.sound || 'bell'); toast('⏰ 時間到！' + (s.title ? '（' + s.title + '）' : ''), { ms: 8000 });
      this.redraw();
    }
    const chip = $('#timerChip');
    if (chip) {
      const show = s.running || (s.mode === 'down' && s.rang);
      chip.hidden = !show;
      if (show) chip.textContent = '⏱ ' + (s.mode === 'down' && this.value() <= 0 ? '時間到' : fmtSec(this.value())) + (s.title ? ' ' + s.title : '');
    }
    if (this.digits) {
      const v = this.value();
      this.digits.textContent = fmtSec(s.mode === 'down' ? Math.max(0, v) : Math.floor(v));
      const box = this.digits.parentNode;
      box.classList.toggle('warn', s.mode === 'down' && s.running && v <= 60);
      box.classList.toggle('end', s.mode === 'down' && s.rang);
      if (this.dial) this.dial.update(v);
    }
  },
  redraw() { if (this.p && !this.p.closed) this.p.rebuild(); },
  open() {
    if (this.p && !this.p.closed) return;
    // 空白鍵：開始／暫停（計時器畫面在最上層、不是在打字時）
    const onKey = e => {
      if (e.key !== ' ' || e.repeat || Layers[Layers.length - 1] !== this.p) return;
      const t = e.target; if (t.closest && t.closest('input, textarea, select, [contenteditable="true"]')) return;
      e.preventDefault(); if (t.closest && t.closest('button')) t.blur();
      this.s.running ? this.pause() : this.start();
    };
    document.addEventListener('keydown', onKey);
    this.p = proj('計時器', c => this.build(c), { cls: 'timerp', onClose: () => { this.digits = this.dial = null; document.removeEventListener('keydown', onKey); } });
  },
  build(c) {
    const s = this.s, down = s.mode === 'down';
    c.headExtra = [h('div', { class: 'seg' },
      h('button', { class: down ? 'on' : '', onclick: () => { this.pause(); s.mode = 'down'; this.persist(); this.redraw(); } }, '倒數計時'),
      h('button', { class: !down ? 'on' : '', onclick: () => { this.pause(); s.mode = 'up'; this.persist(); this.redraw(); } }, '碼錶')),
      h('div', { class: 'seg' }, [['digital', '數字'], ['analog', '指針']].map(([k, t]) => h('button', { class: (s.face || 'digital') === k ? 'on' : '', onclick: () => { s.face = k; this.persist(); this.redraw(); } }, t)))];
    const title = h('input', { class: 'tm-title', value: s.title, placeholder: '標題（可以不填）', oninput: e => { s.title = e.target.value; this.persist(); } });
    this.digits = h('div', { class: 'tm-digits' });
    this.dial = s.face === 'analog' ? timerDial(down) : null;
    c.body.append(title,
      h('div', { class: 'reasons center' }, D.timerTitles.map(t => h('button', { class: 'chip', onclick: () => { s.title = t; this.persist(); this.redraw(); } }, t)),
        h('button', { class: 'chip ghost', onclick: () => { const t = s.title.trim(); if (t && !D.timerTitles.includes(t)) { D.timerTitles.push(t); save(); this.redraw(); } } }, '＋ 加到常用'),
        h('button', { class: 'chip ghost', onclick: async () => { const t = await askText('編輯常用標題', '一行一個', D.timerTitles.join('\n'), { multi: true }); if (t != null) { D.timerTitles = t.split('\n').map(x => x.trim()).filter(Boolean); save(); this.redraw(); } } }, '✎ 編輯')),
      h('div', { class: 'tm-box' + (this.dial ? ' ana' : '') }, this.dial ? this.dial.el : null, this.digits));
    if (down) {
      const mm = h('input', { class: 'inp num', type: 'number', min: 0, max: 600, placeholder: '分' }), ss = h('input', { class: 'inp num', type: 'number', min: 0, max: 59, placeholder: '秒' });
      c.body.append(h('div', { class: 'row center wrap' }, [1, 3, 5, 10, 15, 20, 30].map(m => h('button', { class: 'btn', onclick: () => this.set(m * 60) }, m + ' 分')),
        h('span', { class: 'row' }, mm, '分', ss, '秒', h('button', { class: 'btn', onclick: () => { const t = (+mm.value || 0) * 60 + (+ss.value || 0); if (t > 0) this.set(t); } }, '設定')),
        h('button', { class: 'btn', onclick: () => this.add(-60) }, '−1 分'),
        h('button', { class: 'btn', onclick: () => this.add(60) }, '+1 分')),
        h('div', { class: 'row center' }, '時間到的鈴聲',
          h('select', { class: 'inp', onchange: e => { s.sound = e.target.value; this.persist(); } }, SOUNDS.map(([k, t]) => h('option', { value: k, selected: (s.sound || 'bell') === k }, t))),
          h('button', { class: 'btn sm', onclick: () => Snd.ring(s.sound || 'bell') }, '🔊 試聽')));
    }
    c.body.append(h('div', { class: 'row center' },
      s.running ? h('button', { class: 'btn big', onclick: () => this.pause() }, '⏸ 暫停') : h('button', { class: 'btn big yellow', onclick: () => this.start() }, (down ? s.remain > 0 && s.remain < s.total : s.elapsed > 0) ? '▶ 繼續' : '▶ 開始'),
      down ? h('button', { class: 'btn big', onclick: () => this.reset() }, '↺ 回到 ' + fmtSec(s.total)) : null,
      h('button', { class: 'btn big', onclick: () => this.zero() }, '歸零')),
      h('p', { class: 'muted center small' }, '按空白鍵開始／暫停。關掉這個畫面也會繼續計時，上方會顯示剩下的時間；時間到會響鈴。'));
    this.tick();
  }
};
Tick.add(() => Timer.tick());

/* ================= 黑板與聯絡簿 ================= */
const CATS = { hw: '功課', bring: '攜帶', test: '考試', note: '通知' };
const EMOJI = ['⭐', '✅', '📌', '❗', '❓', '💡', '📖', '✏️', '📝', '🎒', '🧹', '🍱', '🦷', '📣', '⏰', '🎉', '👍', '❤️', '🌟', '⚠️', '➡️', '①', '②', '③'];
const DUTY_MAX = 5;
// 直書時半形英數字不要躺著：4 位以內的數字（含「1.」這種編號）併成一格橫寫（縱中橫），英文字母和標點直立；括號、~、- 照直書轉成直的，全形～也轉直（黑板、動態牆文字共用）
function vtHTML(s) {
  const UP = /^[A-Za-z.,:;!?#%&*+/=@$"'^`\\]/, sp = (c, t) => '<span class="' + c + '">' + t + '</span>';
  const num = d => sp(d.length <= 4 ? 'tcy' : 'upr', d);
  return String(s).replace(/[!-~]+|[～〜－]/g, run => /^[～〜－]$/.test(run) ? sp('sdw', run)
    : run.replace(/\d+\.(?!\d)|\d+|[A-Za-z.,:;!?#%&*+/=@$"'^`\\]+|./g, t => /^\d/.test(t) ? (!t.endsWith('.') ? num(t) : t.length <= 3 ? sp('tcy', t) : num(t.slice(0, -1)) + sp('upr', '.'))
      : UP.test(t) ? sp('upr', escHTML(t)) : escHTML(t)));
}
const Board = {
  freeHTML(text, vert) {
    const map = { 紅: 'r', 黃: 'y', 藍: 'b', 綠: 'g' }, t = vert ? vtHTML : escHTML;
    const col = s => { let out = '', at = 0; s.replace(/\[(紅|黃|藍|綠)\]([\s\S]*?)\[\/\]/g, (m, c, x, i) => { out += t(s.slice(at, i)) + '<span class="ck ck-' + map[c] + '">' + t(x) + '</span>'; at = i + m.length; }); return out + t(s.slice(at)); };
    return String(text).split('\n').map(l => /^#/.test(l) ? '<div class="bd-h">' + col(l.replace(/^#\s*/, '')) + '</div>' : '<div>' + (col(l) || '&nbsp;') + '</div>').join('');
  },
  // info：要不要在聯絡簿前面寫倒數、應到實到、值日生（undefined＝不寫，例如 3D 教室的小黑板；{ att } 可指定要不要應到實到）
  render(big, info) {
    const b = D.board, v = !!b.vertical;
    const tx = s => v ? h('span', { innerHTML: vtHTML(s) }) : s;
    const el = h('div', { class: 'bd' + (v ? ' vert' : '') + (big ? ' big' : '') });
    if (b.mode === 'contact') {
      const items = b.contact.items.filter(i => i.text.trim());
      el.append(h('div', { class: 'bd-h' }, tx(fmtMD(new Date()) + ' 聯絡簿')));
      if (!items.length && !big) el.append(h('div', { class: 'bd-empty' }, '（點這裡寫今天的聯絡簿）'));
      items.forEach((it, i) => el.append(h('div', { class: 'bd-it' }, h('span', { class: 'bd-n' }, tx((i + 1) + '.')), h('span', { class: 'bd-cat c-' + it.cat }, CATS[it.cat] || ''), tx(' ' + it.text))));
    } else if (b.free.trim()) el.innerHTML = this.freeHTML(b.free, v);
    else if (!big) el.append(h('div', { class: 'bd-empty' }, '（點這裡在黑板上寫字）'));
    if (info) el.prepend(...this.infoLines(info.att));
    return el;
  },
  // 聯絡簿前面的資訊（有開才寫）：第一行倒數、空幾格、應到實到，第二行值日生，再空一行；直書時就是最右邊的兩直行
  // att：true＝照今天點名、false＝不寫、[應到, 實到]＝直接用這兩個數字（動態牆跟「應到實到」小工具連動）
  infoLines(att = D.info.attPos !== 'none') {
    const v = !!D.board.vertical, tx = s => v ? h('span', { innerHTML: vtHTML(s) }) : String(s), num = s => h('em', null, tx(s));
    const c = D.board.countdown, duty = this.dutyToday(), first = [], out = [];
    if (this.countdownText()) {
      const n = daysBetween(dateKey(), c.date);
      first.push(h('span', { class: 'b-cd' }, n > 1 ? [h('b', null, tx(c.name)), '還有', num(n), '天'] : [n ? '明天' : '今天', h('b', null, tx(c.name))]));
    }
    const A = Array.isArray(att) ? att : att && D.students.length ? [D.students.length, presentList().length] : null;
    if (A) first.push(h('span', { class: 'b-att' }, h('span', { class: 'b-tag' }, '應到'), num(A[0]), '　', h('span', { class: 'b-tag' }, '實到'), num(A[1])));
    if (first.length) out.push(h('div', { class: 'bd-info' }, first));
    if (duty.length) out.push(h('div', { class: 'bd-info' }, h('span', { class: 'b-tag' }, '值日生'), num(duty.map(s => s.no).join('、')), '號'));
    if (out.length) out.push(h('div', { class: 'bd-gap' }));
    return out;
  },
  // 主畫面黑板收小時，倒數、值日生、應到實到改成右邊一橫列
  sideBox() {
    const out = [], duty = this.dutyToday(), c = D.board.countdown, big = s => h('span', { class: 'b-big' }, s);
    if (this.countdownText()) {
      const n = daysBetween(dateKey(), c.date);
      out.push(h('div', { class: 'b-cd' }, n > 1 ? [h('b', null, c.name), h('small', null, '還有'), big(n), h('small', null, '天')] : [h('small', null, n ? '明天' : '今天'), h('b', null, c.name)]));
    }
    if (duty.length) out.push(h('div', { class: 'b-duty' }, h('small', { class: 'b-tag' }, '值日生'), big(duty.map(s => s.no).join('、')), h('small', null, '號')));
    if (D.info.attPos !== 'none' && D.students.length) out.push(h('div', { class: 'b-att' }, h('small', null, '應到'), big(D.students.length), h('small', null, ' 實到'), big(presentList().length)));
    return h('div', { class: 'b-side' }, out);
  },
  schoolDays(a, b) {
    let x = parseKey(a), y = parseKey(b), sign = 1;
    if (y < x) { [x, y] = [y, x]; sign = -1; }
    let n = 0; const d = new Date(x);
    for (;;) { d.setDate(d.getDate() + 1); if (d > y) break; const w = d.getDay(); if (w >= 1 && w <= 5) n++; }
    return n * sign;
  },
  // 值日生輪的名單：班級名單；還沒有名單時（例如雲端動態牆沒匯入名單）用座號 1～du.size 號
  dutyRoster() {
    const L = roster();
    return L.length ? L : Array.from({ length: D.board.duty.size || 30 }, (_, i) => ({ id: 'no' + (i + 1), no: i + 1, name: '' }));
  },
  dutyToday() {
    const du = D.board.duty, L = this.dutyRoster();
    if (!du.on || !L.length) return [];
    const k = this.schoolDays(du.anchorDate, dateKey()), n = L.length, out = [];
    const takeFrom = i => { for (let j = 0; j < n; j++) { const s = L[((i + j) % n + n) % n]; if (!isAbsent(s.id) && !out.includes(s)) return s; } return null; };
    if (du.mode === 'fixed') {
      for (const no of du.fixed) { const i = L.findIndex(s => s.no === no); if (i < 0) continue; const s = takeFrom(i + k + du.anchorIdx); if (s) out.push(s); }
    } else {
      const start = du.anchorIdx + k * du.count;
      let i = start;
      while (out.length < Math.min(du.count, n)) { const s = takeFrom(i); if (!s) break; out.push(s); i = L.indexOf(s) + 1; }
    }
    return out;
  },
  countdownText() {
    const c = D.board.countdown;
    if (!c.on || !c.date || !c.name) return '';
    const n = daysBetween(dateKey(), c.date);
    return n > 1 ? c.name + ' 還有 ' + n + ' 天' : n === 1 ? '明天' + c.name : n === 0 ? '今天' + c.name : '';
  },
  edit() {
    modal('黑板', c => this.buildEditor(c), { cls: 'wide boarded', onClose: () => { D.board.contact.items = D.board.contact.items.filter((i, k, a) => i.text.trim() || a.length === 1); save(); refresh(); } });
  },
  buildEditor(c) {
    const b = D.board;
    const prev = h('div', { class: 'bd-prev' });
    const drawPrev = () => {
      const box = h('div', { class: 'bd-box' }, this.render(true, {}));
      prev.replaceChildren(box);
      requestAnimationFrame(() => { const inner = box.firstChild; if (inner) fitText(box, inner, 0, 64); });
    };
    const left = h('div', { class: 'bed-left' });
    left.append(h('div', { class: 'row wrap' },
      h('div', { class: 'seg' }, h('button', { class: b.mode === 'contact' ? 'on' : '', onclick: () => { b.mode = 'contact'; save(); c.rebuild(); } }, '聯絡簿'), h('button', { class: b.mode === 'free' ? 'on' : '', onclick: () => { b.mode = 'free'; save(); c.rebuild(); } }, '自由書寫')),
      h('div', { class: 'seg' }, h('button', { class: !b.vertical ? 'on' : '', onclick: () => { b.vertical = false; save(); c.rebuild(); } }, '橫書'), h('button', { class: b.vertical ? 'on' : '', onclick: () => { b.vertical = true; save(); c.rebuild(); } }, '直書'))));
    if (b.mode === 'contact') {
      const L = b.contact.items;
      left.append(h('div', { class: 'ct-list' }, L.map((it, i) => h('div', { class: 'ct-row' },
        h('span', { class: 'bd-n' }, (i + 1) + '.'),
        h('select', { class: 'inp cat c-' + it.cat, onchange: e => { it.cat = e.target.value; save(); c.rebuild(); } }, Object.entries(CATS).map(([k, t]) => h('option', { value: k, selected: it.cat === k }, t))),
        h('input', { class: 'inp', value: it.text, placeholder: '例如：數習 P.32～33', oninput: e => { it.text = e.target.value; save(); drawPrev(); }, onkeydown: e => { if (e.key === 'Enter') { L.splice(i + 1, 0, { cat: it.cat, text: '' }); save(); c.rebuild(); setTimeout(() => $$('.ct-row .inp:not(.cat)', c.body)[i + 1]?.focus(), 20); } } }),
        h('button', { class: 'mv', title: '往上', onclick: () => { if (i) { [L[i - 1], L[i]] = [L[i], L[i - 1]]; save(); c.rebuild(); } } }, '↑'),
        h('button', { class: 'mv', title: '刪除', onclick: () => { L.splice(i, 1); if (!L.length) L.push({ cat: 'hw', text: '' }); save(); c.rebuild(); } }, '×')))),
        h('div', { class: 'row' },
          h('button', { class: 'btn', onclick: () => { L.push({ cat: L.length ? L[L.length - 1].cat : 'hw', text: '' }); save(); c.rebuild(); setTimeout(() => { const ins = $$('.ct-row .inp:not(.cat)', c.body); ins[ins.length - 1]?.focus(); }, 20); } }, '＋ 加一項'),
          h('button', { class: 'btn', onclick: async () => { if (await ask('清空今天的聯絡簿？', '清空', { danger: true })) { b.contact.items = [{ cat: 'hw', text: '' }]; save(); c.rebuild(); } } }, '清空')));
    } else {
      const ta = h('textarea', { class: 'inp free', rows: 10, value: b.free, placeholder: '在這裡寫黑板。\n一行開頭打 # 變成黃色標題。\n選取文字再按顏色，可以用彩色粉筆標重點。', oninput: e => { b.free = e.target.value; save(); drawPrev(); } });
      const wrap = (tag) => { const s = ta.selectionStart, e = ta.selectionEnd; if (s === e) return toast('先選取要上色的字'); ta.setRangeText('[' + tag + ']' + ta.value.slice(s, e) + '[/]', s, e, 'end'); b.free = ta.value; save(); drawPrev(); ta.focus(); };
      const ins = t => { ta.setRangeText(t, ta.selectionStart, ta.selectionEnd, 'end'); b.free = ta.value; save(); drawPrev(); ta.focus(); };
      left.append(h('div', { class: 'row wrap' }, '粉筆：', ['紅', '黃', '藍', '綠'].map(t => h('button', { class: 'btn sm chalk-' + t, onclick: () => wrap(t) }, t)),
        h('button', { class: 'btn sm', onclick: () => ins('# ') }, '# 標題'),
        h('details', { class: 'emo' }, h('summary', { class: 'btn sm' }, '😊 小圖案'), h('div', { class: 'emo-grid' }, EMOJI.map(e => h('button', { onclick: () => ins(e) }, e))))), ta);
      left.append(h('div', { class: 'lbl' }, '常用板書（點一下套用）'),
        h('div', { class: 'reasons' }, b.saved.map(sv => h('span', { class: 'chip' },
          h('span', { class: 'ct', onclick: () => { b.free = sv.text; save(); c.rebuild(); toast('已套用「' + sv.name + '」'); } }, sv.name),
          h('button', { class: 'mv', title: '用目前內容更新這張', onclick: async () => { if (await ask('用黑板目前的內容更新「' + sv.name + '」？', '更新')) { sv.text = b.free; save(); toast('已更新'); } } }, '⟳'),
          h('button', { class: 'del', title: '刪除', onclick: async () => { if (await ask('刪除常用板書「' + sv.name + '」？', '刪除', { danger: true })) { b.saved = b.saved.filter(x => x !== sv); save(); c.rebuild(); } } }, '×'))),
          h('button', { class: 'chip ghost', onclick: async () => { if (!b.free.trim()) return toast('黑板上還沒有字'); if (b.saved.length >= 20) return toast('最多 20 張'); const n = await askText('存成常用板書', '取個名字，例如：早自習、午餐提醒、放學準備'); if (n && n.trim()) { b.saved.push({ id: uid(), name: n.trim(), text: b.free }); save(); c.rebuild(); } } }, '＋ 把目前的內容存成常用板書')));
    }
    // 聯絡簿前面也寫
    const du = b.duty, cd = b.countdown;
    const side = h('div', { class: 'bed-side' }, h('div', { class: 'lbl' }, '聯絡簿前面也寫（橫書在最上面，直書在最右邊）'),
      h('label', { class: 'tog' }, h('input', { type: 'checkbox', checked: du.on, onchange: e => { du.on = e.target.checked; save(); c.rebuild(); } }), h('span', null, '值日生')));
    if (du.on) {
      const today = this.dutyToday(), L = this.dutyRoster(), at = s => L.findIndex(x => x.no === s.no);
      if (!roster().length) {
        const openRoster = typeof Roster === 'object' ? () => Roster.open() : typeof Settings === 'object' ? () => Settings.open('roster') : null;
        side.append(h('div', { class: 'row wrap' }, h('span', { class: 'muted small' }, '還沒有班級名單，先用座號輪：'), '全班',
          h('input', { class: 'inp num', type: 'number', min: 1, max: 60, value: du.size || 30, onchange: e => { du.size = clamp(Math.round(+e.target.value) || 30, 1, 60); du.fixed = du.fixed.filter(n => n <= du.size); save(); c.rebuild(); } }), '號',
          openRoster ? h('button', { class: 'btn sm', onclick: () => { c.close(); openRoster(); } }, '👥 建立班級名單') : null));
      }
      side.append(h('div', { class: 'row wrap' }, '怎麼輪：', h('div', { class: 'seg' },
        h('button', { class: du.mode === 'seq' ? 'on' : '', onclick: () => { du.mode = 'seq'; save(); c.rebuild(); } }, '照座號連著輪'),
        h('button', { class: du.mode === 'fixed' ? 'on' : '', onclick: () => { du.mode = 'fixed'; du.anchorDate = dateKey(); du.anchorIdx = 0; save(); c.rebuild(); } }, '指定座號'))));
      if (du.mode === 'seq') {
        side.append(h('div', { class: 'row wrap' }, '每天', h('select', { class: 'inp', onchange: e => { const first = this.dutyToday()[0]; du.count = +e.target.value; if (first) { du.anchorDate = dateKey(); du.anchorIdx = at(first); } save(); c.rebuild(); } }, Array.from({ length: DUTY_MAX }, (_, k) => k + 1).map(n => h('option', { value: n, selected: du.count === n }, n))), '位　今天從',
          h('select', { class: 'inp', onchange: e => { du.anchorDate = dateKey(); du.anchorIdx = +e.target.value; save(); c.rebuild(); } }, L.map((s, i) => h('option', { value: i, selected: !!today[0] && today[0].no === s.no }, pad(s.no) + ' 號'))), '開始'));
      } else {
        side.append(h('div', { class: 'muted small' }, '點座號選今天的值日生（最多 ' + DUTY_MAX + ' 位），之後每個上課日每個號碼各換下一號。'),
          h('div', { class: 'reasons' }, L.map(s => h('button', { class: 'chip' + (du.fixed.includes(s.no) ? ' on' : ''), onclick: () => {
            if (du.fixed.includes(s.no)) du.fixed = du.fixed.filter(x => x !== s.no); else if (du.fixed.length < DUTY_MAX) du.fixed.push(s.no); else return toast('值日生最多 ' + DUTY_MAX + ' 位');
            du.anchorDate = dateKey(); du.anchorIdx = 0; save(); c.rebuild();
          } }, pad(s.no)))));
      }
      side.append(h('div', { class: 'row wrap' }, '今天：', h('b', null, today.map(s => pad(s.no)).join('、') || '—'),
        h('button', { class: 'btn sm', onclick: () => { du.anchorIdx -= du.mode === 'seq' ? du.count : 1; save(); c.rebuild(); } }, '上一組'),
        h('button', { class: 'btn sm', onclick: () => { du.anchorIdx += du.mode === 'seq' ? du.count : 1; save(); c.rebuild(); } }, '下一組')));
    }
    side.append(h('label', { class: 'tog' }, h('input', { type: 'checkbox', checked: cd.on, onchange: e => { cd.on = e.target.checked; save(); c.rebuild(); } }), h('span', null, '倒數（例如：段考還有 5 天）')));
    if (cd.on) side.append(h('div', { class: 'row wrap' },
      h('input', { class: 'inp', style: { width: '8em' }, value: cd.name, placeholder: '段考', oninput: e => { cd.name = e.target.value; save(); drawPrev(); } }),
      h('input', { class: 'inp', type: 'date', value: cd.date, onchange: e => { cd.date = e.target.value; save(); c.rebuild(); } }),
      h('span', { class: 'muted' }, this.countdownText() || '（填名稱和日期）')));
    left.append(side);
    c.body.append(h('div', { class: 'bed' }, left, h('div', { class: 'bed-right' }, h('div', { class: 'lbl' }, '投影的樣子'), prev)));
    c.foot.append(h('button', { class: 'btn', onclick: () => { c.close(); this.project(); } }, '🖥 投影大字版'), h('button', { class: 'btn pri', onclick: () => c.close() }, '完成'));
    drawPrev();
  },
  project() {
    let onR = null;
    proj('黑板', c => {
      const b = D.board, mode = b.mode;
      const fit = () => { const box = c.body.querySelector('.bd-box'), inner = box && box.firstChild; if (inner) fitText(box, inner, b.scale[mode] || 0); };
      c.headExtra = [
        h('button', { class: 'btn sm', onclick: () => { b.scale[mode] = (b.scale[mode] || 0) - 1; save(); fit(); } }, 'A−'),
        h('button', { class: 'btn sm', onclick: () => { b.scale[mode] = 0; save(); fit(); } }, '自動'),
        h('button', { class: 'btn sm', onclick: () => { b.scale[mode] = (b.scale[mode] || 0) + 1; save(); fit(); } }, 'A+'),
        mode === 'free' && b.saved.length ? h('select', { class: 'inp sm', onchange: e => { const sv = b.saved.find(x => x.id === e.target.value); if (sv) { b.free = sv.text; save(); refresh(); c.rebuild(); } } },
          h('option', { value: '' }, '換板書…'), b.saved.map(sv => h('option', { value: sv.id }, sv.name))) : null,
        h('button', { class: 'btn sm', onclick: () => { c.close(); this.edit(); } }, '✎ 編輯')];
      c.body.append(h('div', { class: 'bd-stage' }, h('div', { class: 'bd-box' }, this.render(true, {}))));
      requestAnimationFrame(fit);
      if (onR) window.removeEventListener('resize', onR);
      onR = () => fit(); window.addEventListener('resize', onR);
    }, { cls: 'boardp', onClose: () => window.removeEventListener('resize', onR) });
  }
};

/* ================= 作息與課表 ================= */
const Sched = {
  open() {
    proj('課表', c => {
      const S = schedNow(), wd = new Date().getDay();
      let k = -1;
      c.body.append(h('div', { class: 'tblwrap' }, h('table', { class: 'tbl sched' },
        h('thead', null, h('tr', null, h('th', null, ''), [1, 2, 3, 4, 5].map(d => h('th', { class: d === wd ? 'today' : '' }, '星期' + WD[d])))),
        h('tbody', null, S.list.map(p => {
          if (p.kind === 'class') k++;
          const ci = k, now = S.cur === p;
          return h('tr', { class: (now ? 'now ' : '') + (p.kind !== 'class' ? 'other' : '') },
            h('th', null, p.label, h('small', null, p.start + '–' + p.end)),
            p.kind === 'class' ? [1, 2, 3, 4, 5].map(d => { const t = (D.sched.week[d] || [])[ci] || ''; return h('td', { class: (d === wd ? 'today ' : '') + (isExam(t) ? 'exam' : '') }, t); })
              : h('td', { colspan: 5, class: 'muted' }, ''));
        })))));
      c.foot.append(h('button', { class: 'btn', onclick: () => { c.close(); BigClock.open(); } }, '🕘 大時鐘'), h('button', { class: 'btn pri', onclick: () => { c.close(); this.edit(); } }, '✎ 編輯作息與課表'));
    }, { cls: 'schedp' });
  },
  hasExam() { return Object.values(D.sched.week).some(a => (a || []).some(isExam)); },
  edit() {
    const before = JSON.parse(JSON.stringify({ periods: D.sched.periods, week: D.sched.week }));
    modal('編輯作息與課表', c => {
      const P = D.sched.periods;
      c.body.append(h('div', { class: 'lbl' }, '作息（每一節的時間）'), h('div', { class: 'per-list' }, P.map((p, i) => h('div', { class: 'per-row' },
        h('input', { class: 'inp', value: p.label, style: { width: '7em' }, oninput: e => { p.label = e.target.value; save(); } }),
        h('input', { class: 'inp', type: 'time', value: p.start, onchange: e => { p.start = e.target.value; save(); } }), '–',
        h('input', { class: 'inp', type: 'time', value: p.end, onchange: e => { p.end = e.target.value; save(); } }),
        h('select', { class: 'inp', onchange: e => { p.kind = e.target.value; save(); c.rebuild(); } }, h('option', { value: 'class', selected: p.kind === 'class' }, '上課'), h('option', { value: 'other', selected: p.kind !== 'class' }, '其他（下課、午休…）')),
        h('button', { class: 'link danger', onclick: () => { P.splice(i, 1); save(); c.rebuild(); } }, '刪除')))),
        h('div', { class: 'row wrap' },
          h('button', { class: 'btn sm', onclick: () => { const last = P[P.length - 1]; const s = last ? toMin(last.end) + 10 : 480; P.push({ label: '第' + '一二三四五六七八九十'[P.filter(x => x.kind === 'class').length] + '節', start: minToHM(s), end: minToHM(s + 40), kind: 'class' }); save(); c.rebuild(); } }, '＋ 加一節'),
          h('button', { class: 'btn sm', onclick: () => { P.sort((a, b) => toMin(a.start) - toMin(b.start)); save(); c.rebuild(); } }, '依時間排序'),
          h('button', { class: 'btn sm', onclick: async () => { if (await ask('作息換回預設時間？', '換回')) { D.sched.periods = defaultPeriods(); save(); c.rebuild(); } } }, '換回預設作息')));
      const cls = P.filter(p => p.kind === 'class');
      c.body.append(h('div', { class: 'lbl' }, '課表（考試時把科目寫成「考國語」這樣以「考」開頭，大時鐘就會寫「考試中」）'),
        h('div', { class: 'tblwrap' }, h('table', { class: 'tbl sched-ed' },
          h('thead', null, h('tr', null, h('th', null, ''), [1, 2, 3, 4, 5].map(d => h('th', null, '星期' + WD[d])))),
          h('tbody', null, cls.map((p, ci) => h('tr', null, h('th', null, p.label),
            [1, 2, 3, 4, 5].map(d => h('td', null, h('input', { class: 'inp' + (isExam((D.sched.week[d] || [])[ci]) ? ' exam' : ''), value: (D.sched.week[d] || [])[ci] || '', oninput: e => {
              const w = D.sched.week[d] || (D.sched.week[d] = []);
              while (w.length <= ci) w.push('');
              w[ci] = e.target.value; e.target.classList.toggle('exam', isExam(e.target.value));
              if (isExam(e.target.value) && !D.sched.saved) { D.sched.saved = before; toast('已先把考試前的課表存起來，考完可以改回來'); }
              save();
            } })))))))));
      const ex = this.hasExam();
      c.body.append(h('div', { class: 'row wrap' },
        h('button', { class: 'btn', disabled: ex, title: ex ? '課表裡還有「考」開頭的科目，不能存' : '', onclick: () => { D.sched.saved = JSON.parse(JSON.stringify({ periods: D.sched.periods, week: D.sched.week })); save(); toast('已存成班上目前使用的課表'); c.rebuild(); } }, '💾 把現在的課表存成班上目前使用的課表'),
        D.sched.saved ? h('button', { class: 'btn', onclick: () => this.revert(c) }, '↩ 改回存好的課表') : null),
        ex ? h('p', { class: 'muted small' }, '課表裡有考試科目，暫時不能存，免得把考試存進去。') : null);
    }, { cls: 'wide', onClose: () => refresh() });
  },
  async revert(c) {
    if (!D.sched.saved) return;
    if (!await ask('改回班上目前使用的課表？這次的修改（例如考試科目）會換掉。', '改回')) return;
    const old = JSON.parse(JSON.stringify({ periods: D.sched.periods, week: D.sched.week }));
    const sv = JSON.parse(JSON.stringify(D.sched.saved));
    D.sched.periods = sv.periods; D.sched.week = sv.week; save(); refresh();
    if (c) c.rebuild();
    toast('已改回存好的課表', { undo: () => { D.sched.periods = old.periods; D.sched.week = old.week; save(); refresh(); if (c && !c.closed) c.rebuild(); } });
  }
};
// 考完了，提醒改回課表
Tick.add(() => {
  const chip = $('#examChip'); if (!chip) return;
  const S = schedNow(), ex = S.list.filter(p => isExam(p.subj));
  chip.hidden = !(S.school && ex.length && D.sched.saved && S.m >= Math.max(...ex.map(p => p.e)));
});

/* ================= 大時鐘 ================= */
const BigClock = {
  tk: null,
  open() { proj('大時鐘', c => this.build(c), { cls: 'clockp', onClose: () => Tick.delete(this.tk) }); },
  build(c) {
    if (this.tk) Tick.delete(this.tk);
    const st = D.clockStyle;
    c.headExtra = [h('div', { class: 'seg' }, [['digital', '電子式'], ['analog', '指針式']].map(([k, t]) => h('button', { class: st === k ? 'on' : '', onclick: () => { D.clockStyle = k; save(); c.rebuild(); } }, t)))];
    const A = st === 'analog' ? analogClock() : null;
    const dateEl = h('div', { class: 'bc-date' }), timeEl = h('div', { class: 'bc-time' }), perEl = h('div', { class: 'bc-per' }), leftEl = h('div', { class: 'bc-left' });
    c.body.append(h('div', { class: 'bc ' + st }, dateEl, A ? h('div', { class: 'bc-analog' }, A.el) : null, timeEl, perEl, leftEl,
      D.clockNote ? h('div', { class: 'bc-note' }, D.clockNote) : null));
    c.foot.append(h('button', { class: 'btn', onclick: () => this.editNote(c) }, '✎ 小提醒'), h('button', { class: 'btn', onclick: () => { c.close(); Lock.lock(); } }, '🔒 鎖定'));
    let last = '';
    this.tk = () => {
      const now = new Date(), key = now.getSeconds();
      if (key === last) return; last = key;
      if (A) A.update(now);
      dateEl.textContent = fmtMD(now);
      timeEl.textContent = hm(now) + (st === 'digital' ? ':' + pad(now.getSeconds()) : '');
      const I = clockInfo(now);
      perEl.textContent = I.per; perEl.classList.toggle('exam', !!I.exam); leftEl.textContent = I.left;
    };
    Tick.add(this.tk); this.tk();
  },
  editNote(parent) {
    modal('小提醒', c => {
      const inp = h('input', { class: 'inp', value: D.clockNote, placeholder: '例如：寫完檢查姓名、座號，再檢查答案' });
      c.body.append(inp, h('div', { class: 'lbl' }, '常用（點一下換上）'),
        h('div', { class: 'reasons' }, D.clockNotes.map((t, i) => h('span', { class: 'chip' }, h('span', { class: 'ct', onclick: () => { D.clockNote = t; save(); c.close(); parent.rebuild(); } }, t),
          h('button', { class: 'del', onclick: () => { D.clockNotes.splice(i, 1); save(); c.rebuild(); } }, '×')))));
      c.foot.append(h('button', { class: 'btn', onclick: () => { D.clockNote = ''; save(); c.close(); parent.rebuild(); } }, '清除'),
        h('button', { class: 'btn', onclick: () => { const t = inp.value.trim(); if (t && !D.clockNotes.includes(t)) D.clockNotes.push(t); save(); c.rebuild(); } }, '＋ 加到常用'),
        h('button', { class: 'btn pri', onclick: () => { D.clockNote = inp.value.trim(); save(); c.close(); parent.rebuild(); } }, '好'));
    });
  }
};

/* ================= 螢幕鎖 ================= */
const Lock = {
  fails: 0, waitUntil: 0, tk: null,
  hash(p) { let x = 5381; for (const ch of 'bx|' + p + '|' + D.classId) x = ((x << 5) + x + ch.charCodeAt(0)) | 0; return String(x); },
  isLocked() { try { return localStorage.getItem('bxbox-lock') === '1'; } catch (e) { return false; } },
  lock() {
    if (!D.lock.pin) return this.setPin(() => this.lock());
    try { localStorage.setItem('bxbox-lock', '1'); } catch (e) { }
    Layers.slice().forEach(l => l.close());
    this.show();
  },
  show() {
    $('#lockScreen')?.remove();
    const A = analogClock();
    const timeEl = h('div', { class: 'ls-time' }), perEl = h('div', { class: 'ls-per' }), leftEl = h('div', { class: 'ls-left' }), tmEl = h('div', { class: 'ls-tm' });
    const note = D.clockNote || D.lock.note;
    const el = h('div', { id: 'lockScreen', class: 'lockscreen ' + D.clockStyle },
      h('div', { class: 'ls-date' }, fmtMD(new Date())), D.clockStyle === 'analog' ? h('div', { class: 'bc-analog' }, A.el) : null, timeEl, perEl, leftEl, tmEl,
      note ? h('div', { class: 'bc-note' }, note) : null,
      h('button', { class: 'ls-unlock', onclick: () => this.keypad() }, '🔒 解鎖'));
    document.body.append(el);
    if (this.tk) Tick.delete(this.tk);
    this.tk = () => {
      const now = new Date(), I = clockInfo(now);
      A.update(now);
      timeEl.textContent = hm(now) + (D.clockStyle === 'digital' ? ':' + pad(now.getSeconds()) : '');
      perEl.textContent = I.per; perEl.classList.toggle('exam', !!I.exam); leftEl.textContent = I.left;
      const s = Timer.s; tmEl.textContent = s.running && s.mode === 'down' ? '⏱ ' + (s.title ? s.title + ' ' : '') + '還有 ' + fmtSec(Timer.value()) : '';
    };
    Tick.add(this.tk); this.tk();
  },
  unlock() {
    try { localStorage.removeItem('bxbox-lock'); } catch (e) { }
    Tick.delete(this.tk); $('#lockScreen')?.remove(); this.fails = 0;
  },
  keypad() {
    let code = '';
    const m = modal('輸入密碼解鎖', c => {
      const wait = Math.ceil((this.waitUntil - Date.now()) / 1000);
      c.body.append(h('div', { class: 'pin-dots' }, [0, 1, 2, 3].map(i => h('span', { class: i < code.length ? 'on' : '' }))),
        wait > 0 ? h('p', { class: 'center' }, '密碼錯太多次，請等 ' + wait + ' 秒') : null,
        h('div', { class: 'keypad' }, [1, 2, 3, 4, 5, 6, 7, 8, 9, '清除', 0, '⌫'].map(k => h('button', { class: 'btn big', disabled: wait > 0, onclick: () => {
          if (k === '清除') code = ''; else if (k === '⌫') code = code.slice(0, -1); else code += k;
          if (code.length === 4) {
            if (this.hash(code) === D.lock.pin) { m.close(); this.unlock(); return; }
            this.fails++; code = ''; toast('密碼不對');
            if (this.fails >= 5) { this.fails = 0; this.waitUntil = Date.now() + 30000; setTimeout(() => !m.closed && m.rebuild(), 30500); }
          }
          c.rebuild();
        } }, k))));
      c.foot.append(h('button', { class: 'btn', onclick: () => this.forgot(m) }, '忘記密碼？'), h('button', { class: 'btn', onclick: () => m.close() }, '取消'));
    }, { sticky: true });
  },
  async forgot(m) {
    if (!await ask('忘記密碼時，可以選「這個班」的班級百寶箱備份檔來解鎖。要選備份檔嗎？', '選備份檔')) return;
    const f = await pickFile('.json,application/json'); if (!f) return;
    try {
      const o = JSON.parse(await f.text());
      if (o.classId === D.classId) { m.close(); this.unlock(); D.lock.pin = null; save(); toast('已解鎖，請到班級設定 → 螢幕鎖 重新設定密碼'); }
      else toast('這不是這個班的備份檔');
    } catch (e) { toast('讀不到這個檔案'); }
  },
  setPin(done) {
    let a = '', step = 1;
    const inp = () => h('input', { class: 'inp pin', type: 'password', inputmode: 'numeric', maxlength: 4, pattern: '[0-9]*', placeholder: '4 位數字' });
    const m = modal('設定螢幕鎖密碼', c => {
      const i = inp();
      c.body.append(h('p', null, step === 1 ? '請設定 4 位數字的密碼（解鎖時要輸入）。' : '請再輸入一次，確認密碼。'), i,
        h('p', { class: 'muted small' }, '密碼只存在這台電腦。忘記時可以用這個班的備份檔解鎖。'));
      const ok = () => {
        if (!/^\d{4}$/.test(i.value)) return toast('請輸入 4 位數字');
        if (step === 1) { a = i.value; step = 2; c.rebuild(); return; }
        if (i.value !== a) { toast('兩次不一樣，請重新設定'); step = 1; c.rebuild(); return; }
        D.lock.pin = this.hash(a); save(); m.close(); toast('密碼設定好了'); done && done();
      };
      i.addEventListener('keydown', e => { if (e.key === 'Enter') ok(); });
      c.foot.append(h('button', { class: 'btn', onclick: () => m.close() }, '取消'), h('button', { class: 'btn pri', onclick: ok }, step === 1 ? '下一步' : '設定'));
      setTimeout(() => i.focus(), 30);
    });
  },
  settings(p, c) {
    p.append(h('p', null, '老師暫時離開或科任課時，按右上角 🔒 鎖定，畫面只剩時間、第幾節和你留的話。重新整理也還是鎖著。'),
      h('label', { class: 'lbl' }, '鎖住時顯示的話'),
      h('input', { class: 'inp', value: D.lock.note, oninput: e => { D.lock.note = e.target.value; save(); } }),
      h('p', { class: 'muted small' }, '大時鐘有設定「小提醒」時，鎖住畫面會顯示小提醒。'),
      h('div', { class: 'row wrap' }, D.lock.pin ? [
        h('span', null, '已設定密碼。'),
        h('button', { class: 'btn', onclick: () => this.checkThen(() => { D.lock.pin = null; save(); this.setPin(() => c.rebuild()); }) }, '改密碼'),
        h('button', { class: 'btn danger', onclick: () => this.checkThen(() => { D.lock.pin = null; save(); c.rebuild(); toast('已取消螢幕鎖密碼'); }) }, '不用螢幕鎖')
      ] : h('button', { class: 'btn pri', onclick: () => this.setPin(() => c.rebuild()) }, '設定密碼')));
  },
  async checkThen(fn) {
    const t = await askText('先輸入目前的密碼', '目前的 4 位數密碼', '');
    if (t == null) return;
    if (this.hash(t.trim()) === D.lock.pin) fn(); else toast('密碼不對');
  }
};
