'use strict';
/* 備份檔：匯出／匯入（本網頁的 .json，或「班班」的 .zip 備份檔） */

async function unzipJSON(buf) {
  const dv = new DataView(buf), u8 = new Uint8Array(buf), out = {};
  let eocd = -1;
  for (let i = u8.length - 22; i >= Math.max(0, u8.length - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('壞掉的 zip 檔');
  const n = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  for (let k = 0; k < n; k++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true);
    const nlen = dv.getUint16(p + 28, true), elen = dv.getUint16(p + 30, true), clen = dv.getUint16(p + 32, true), off = dv.getUint32(p + 42, true);
    const name = new TextDecoder().decode(u8.subarray(p + 46, p + 46 + nlen));
    p += 46 + nlen + elen + clen;
    if (!/\.json$/i.test(name)) continue;
    const start = off + 30 + dv.getUint16(off + 26, true) + dv.getUint16(off + 28, true);
    const data = u8.subarray(start, start + csize);
    if (method === 0) out[name] = data;
    else if (method === 8) {
      if (typeof DecompressionStream === 'undefined') throw new Error('這個瀏覽器太舊，請用新版 Chrome 或 Edge');
      out[name] = new Uint8Array(await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
    }
  }
  return out;
}

const Backup = {
  async exportFile() {
    let images = {};
    try { images = await ImgDB.all(); } catch (e) { }
    const o = Object.assign({}, D, { images, exportedAt: new Date().toISOString() });
    download((D.info.className || '班級') + '-班級百寶箱備份-' + dateKey() + '.json', JSON.stringify(o), 'application/json');
    D.info.lastBackup = dateKey(); save();
    toast('備份檔已下載，請存到 OneDrive 或隨身碟');
  },
  async importFile() {
    const f = await pickFile('.json,.zip,application/json,application/zip');
    if (!f) return;
    try {
      const buf = await f.arrayBuffer(), u8 = new Uint8Array(buf);
      let o;
      if (u8[0] === 0x50 && u8[1] === 0x4b) {
        const files = await unzipJSON(buf);
        if (!files['class.json']) throw new Error('zip 裡找不到班級資料（class.json）');
        o = JSON.parse(new TextDecoder().decode(files['class.json']));
      } else o = JSON.parse(new TextDecoder().decode(u8));
      if (o && o.app === '班級百寶箱') return this.applyOwn(o);
      if (o && o.app === '雲端動態牆') return this.applyWall(o);
      if (o && Array.isArray(o.students)) return this.applyBanban(o);
      throw new Error('看不懂這個檔案');
    } catch (e) { toast('匯入失敗：' + (e.message || e)); }
  },
  async applyOwn(o) {
    if (D.students.length && !await ask('匯入會取代這台電腦目前的全部資料（名單、分數、課表、動態牆…），確定嗎？', '匯入並取代', { danger: true })) return;
    const images = o.images || {};
    delete o.images; delete o.exportedAt;
    D = fillDefaults(o, defaultData()); rollDay();
    for (const [k, v] of Object.entries(images)) { try { await ImgDB.put(k, v); } catch (e) { } }
    UI.sel = null; UI.mode = 'normal'; UI.temp = null;
    saveNow(); Layers.slice().forEach(l => l.close()); refresh();
    toast('匯入完成：' + D.students.length + ' 位同學');
  },
  // 雲端動態牆匯出的檔案：只換動態牆，名單、分數、課表都不動
  async applyWall(o) {
    const n = ((o.wall && o.wall.pages) || []).length;
    if (!n) return toast('這個檔案裡沒有動態牆');
    if (!await ask('用雲端動態牆的版面（' + n + ' 頁）取代這台電腦的動態牆？名單、分數、課表等其他資料不會改變。', '取代動態牆')) return;
    for (const [k, v] of Object.entries(o.images || {})) { try { await ImgDB.put(k, v); } catch (e) { } }
    D.wall = { cur: o.wall.cur || null, pages: o.wall.pages, locked: !!o.wall.locked };
    saveNow(); Layers.slice().forEach(l => l.close());
    if (Wall.isOpen()) Wall.draw();
    toast('已換成雲端動態牆的版面（' + n + ' 頁）');
  },
  applyBanban(o) {
    const L = o.students.filter(s => s && (s.name || s.no));
    if (!L.length) return toast('這個備份檔裡沒有同學');
    const info = o.info || {}, opt = { name: true, score: true, seat: true, groups: true };
    const cols = +info.cols || 6, rows = +info.rows || Math.ceil(L.length / cols);
    const gNames = (o.groups && o.groups.names) || {}, gScores = (o.groups && o.groups.scores) || {};
    const gCount = Math.max(0, +(o.groups && o.groups.count) || 0, ...L.map(s => +s.group || 0));
    modal('從班班的備份檔匯入', c => {
      const tog = (k, t) => h('label', { class: 'tog' }, h('input', { type: 'checkbox', checked: opt[k], onchange: e => { opt[k] = e.target.checked; } }), h('span', null, t));
      c.body.append(h('p', null, '找到 ', h('b', null, L.length), ' 位同學' + (info.className ? '（' + info.className + '）' : '') + '。'),
        tog('name', '班名'), tog('score', '目前的分數'), tog('seat', '座位（' + rows + ' 排 × ' + cols + ' 行）'), gCount ? tog('groups', '小組（' + gCount + ' 組）') : null,
        h('div', { class: 'warnbox' }, '會用這份名單「取代」目前的名單；課表、聯絡簿、動態牆等其他設定不會改變。'));
      c.foot.append(h('button', { class: 'btn', onclick: () => c.close() }, '取消'), h('button', { class: 'btn pri', onclick: () => {
        if (opt.name && info.className) D.info.className = info.className;
        D.groups = [];
        const gid = {};
        if (opt.groups && gCount) for (let i = 1; i <= gCount; i++) {
          const g = { id: uid(), name: gNames[i] || gNames[i - 1] || '第 ' + i + ' 組', color: GROUP_COLORS[(i - 1) % GROUP_COLORS.length], score: +gScores[i] || 0 };
          D.groups.push(g); gid[i] = g.id;
        }
        if (opt.seat) { D.info.cols = clamp(cols, 1, 10); D.info.rows = clamp(rows, 1, 10); }
        D.students = L.sort((a, b) => (+a.no || 0) - (+b.no || 0)).map((s, i) => {
          let seat = null;
          if (opt.seat && Number.isInteger(s.seat) && s.seat >= 0) seat = [Math.floor(s.seat / cols), s.seat % cols];
          return { id: uid(), no: +s.no || i + 1, name: String(s.name || '').trim(), score: opt.score ? Math.round(+s.score || 0) : 0, seat, group: gid[+s.group] || null };
        });
        if (!opt.seat) { D.info.rows = clamp(Math.ceil(D.students.length / D.info.cols), 1, 10); D.students.forEach(s => { s.seat = null; }); }
        autoSeatSilent();
        D.log.items = []; D.lot.round = []; D.lot.range = null;
        if (opt.score && D.students.some(s => s.score)) D.info.scoreStart = D.info.scoreStart || dateKey();
        UI.sel = null; UI.mode = 'normal';
        saveNow(); Layers.slice().forEach(l => l.close()); refresh();
        toast('已從班班匯入 ' + D.students.length + ' 位同學');
      } }, '匯入'));
    });
  }
};
