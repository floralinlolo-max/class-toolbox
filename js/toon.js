'use strict';
/* 立體同學與老師：用球、膠囊、圓錐組成的 Q 版 3D 人物，依鏡頭角度算出投影，畫成 SVG 貼在直立的立牌上（不需外部程式庫）。
   模型座標：原點在腳下的地板，Y 往上、Z 往人物面向的前方、X 是從正面看時畫面的右邊；單位和教室地板一樣。
   畫法：鏡頭在人物的 θ 方向（0＝正面）、俯角 e，用正交投影算出每個零件，由遠到近畫；整張圖再垂直拉長 1/cos e，
   因為立牌是直立的，CSS 3D 從上面斜看會壓扁回來。表情（fn/fh/fs）、眨眼（eyes）、舉手（arm/arm2）用 CSS 切換。
   臉、頭髮、帽子是畫在頭這顆球的「表面」上（capPath：球冠在畫面上看得到的部分），所以轉到側面、後面也對。 */

const Toon = (() => {
  const RAD = Math.PI / 180, f1 = v => Math.round(v * 10) / 10;
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = a => mul(a, 1 / (Math.hypot(a[0], a[1], a[2]) || 1));
  // 球面上的方向：lat 緯度（往上為正）、lon 經度（0 是正前方，往畫面右邊為正）
  const dirOf = (lat, lon) => [Math.sin(lon * RAD) * Math.cos(lat * RAD), Math.sin(lat * RAD), Math.cos(lon * RAD) * Math.cos(lat * RAD)];
  const eastOf = lon => [Math.cos(lon * RAD), 0, -Math.sin(lon * RAD)];
  const northOf = (lat, lon) => [-Math.sin(lon * RAD) * Math.sin(lat * RAD), Math.cos(lat * RAD), -Math.cos(lon * RAD) * Math.sin(lat * RAD)];
  const ring = (n, fn) => Array.from({ length: n }, (_, i) => fn(i / n * 2 * Math.PI));
  const path = pts => 'M' + pts.map(p => f1(p[0]) + ' ' + f1(p[1])).join('L') + 'Z';
  function hull(pts) {   // 平面凸包
    pts = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], up = [];
    for (const p of pts) { while (lo.length > 1 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
    for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (up.length > 1 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
    return lo.slice(0, -1).concat(up.slice(0, -1));
  }

  /* ---------- 畫家：收集零件，最後由遠到近排 ---------- */
  function painter(theta, e, fine) {
    const ct = Math.cos(theta * RAD), st = Math.sin(theta * RAD), ce = Math.cos(e * RAD), se = Math.sin(e * RAD);
    const V = ([x, y, z]) => { const xr = x * ct - z * st, zr = x * st + z * ct; return [xr, y * ce - zr * se, y * se + zr * ce]; };   // 模型 → 畫面（x 右、y 上、z 朝鏡頭）
    // 模型 → SVG（y 往下）；第三個值是排序用的遠近：以水平方向為主，高度只用來分上下疊在一起的零件（頭在身體上面）
    const kd = .04 + .2 * se;
    const P = ([x, y, z]) => { const xr = x * ct - z * st, zr = x * st + z * ct; return [xr, -(y * ce - zr * se), zr + y * kd]; };
    const items = [], grads = new Map();
    // 精緻樣式：立體的零件用柔和的漸層（左上亮、右下暗）和淡淡的外框，看起來比較圓潤清新
    // 漸層的 id 只看顏色，同色的定義都一樣，畫面上重複也沒關係
    const fillOf = c => {
      if (!fine || c[0] !== '#') return c;
      const id = 'tg' + c.slice(1);
      if (!grads.has(id)) grads.set(id, `<radialGradient id="${id}" cx="36%" cy="30%" r="80%"><stop offset="0" stop-color="${shade(c, .22)}"/><stop offset=".55" stop-color="${c}"/><stop offset="1" stop-color="${shade(c, -.12)}"/></radialGradient>`);
      return `url(#${id})`;
    };
    const line = c => fine ? ` stroke="${shade(c, -.14)}" stroke-width=".7" stroke-linejoin="round"` : '';
    const S = {
      V, P, fine, ce,
      put(depth, svg) { items.push([depth, svg]); },
      ballSvg(c, r, fill, extra = '') { const p = P(c); return `<circle cx="${f1(p[0])}" cy="${f1(p[1])}" r="${r}" fill="${fillOf(fill)}"${line(fill)}${extra}/>`; },
      ball(c, r, fill, dz = 0, extra = '') { S.put(P(c)[2] + dz, S.ballSvg(c, r, fill, extra)); },
      // 膠囊：兩端是球（可以不一樣大）
      capsSvg(a, ra, b, rb, fill, extra = '') {
        const pa = P(a), pb = P(b);
        const pts = ring(12, t => [pa[0] + ra * Math.cos(t), pa[1] + ra * Math.sin(t)]).concat(ring(12, t => [pb[0] + rb * Math.cos(t), pb[1] + rb * Math.sin(t)]));
        return `<path d="${path(hull(pts))}" fill="${fillOf(fill)}"${line(fill)}${extra}/>`;
      },
      caps(a, ra, b, rb, fill, dz = 0, extra = '') { S.put((P(a)[2] + P(b)[2]) / 2 + dz, S.capsSvg(a, ra, b, rb, fill, extra)); },
      // 水平圓（帽簷）、圓錐（帽子）、上下兩個圓之間（裙子）
      disk(c, r, fill, dz = 0) { const pts = ring(28, t => P(add(c, [r * Math.cos(t), 0, r * Math.sin(t)]))); S.put(P(c)[2] + dz, `<path d="${path(hull(pts))}" fill="${fillOf(fill)}"${line(fill)}/>`); },
      cone(c, r, tip, fill, dz = 0, extra = '') {
        const pts = ring(24, t => P(add(c, [r * Math.cos(t), 0, r * Math.sin(t)]))).concat([P(tip)]);
        S.put((P(c)[2] + P(tip)[2]) / 2 + dz, `<path d="${path(hull(pts))}" fill="${fillOf(fill)}"${line(fill)}${extra}/>`);
      },
      frustum(c, r1, y2, r2, fill, dz = 0) {
        const c2 = [c[0], y2, c[2]];
        const pts = ring(24, t => P(add(c, [r1 * Math.cos(t), 0, r1 * Math.sin(t)]))).concat(ring(24, t => P(add(c2, [r2 * Math.cos(t), 0, r2 * Math.sin(t)]))));
        S.put((P(c)[2] + P(c2)[2]) / 2 + dz, `<path d="${path(hull(pts))}" fill="${fillOf(fill)}"${line(fill)}/>`);
      }
    };
    S.done = (vb, extra = '') => {
      items.sort((a, b) => a[0] - b[0]);
      return `<svg viewBox="${vb}"${extra}>${grads.size ? '<defs>' + [...grads.values()].join('') + '</defs>' : ''}<g transform="scale(1 ${f1(1 / ce * 100) / 100})">${items.map(x => x[1]).join('')}</g></svg>`;
    };
    return S;
  }

  /* ---------- 球面上的東西 ---------- */
  // 球冠（中心方向 n、角半徑 a）在畫面上看得到的部分；cv 是球心（畫面座標），回傳 SVG 點或 'all'／null
  function capPts(cv, R, n, a) {
    const u = norm(cross(n, Math.abs(n[1]) < .9 ? [0, 1, 0] : [1, 0, 0])), v = cross(n, u);
    const cc = Math.cos(a), ss = Math.sin(a), N = 24;
    const Q = ring(N, t => add(mul(n, cc), add(mul(u, ss * Math.cos(t)), mul(v, ss * Math.sin(t)))));
    const vis = Q.map(q => q[2] >= 0);
    const svg = q => [cv[0] + R * q[0], -(cv[1] + R * q[1])];
    if (!vis.some(Boolean)) return n[2] >= cc ? 'all' : null;
    if (vis.every(Boolean)) return Q.map(svg);
    const cut = (qa, qb) => { const t = qa[2] / (qa[2] - qb[2]), p = add(qa, mul(add(qb, mul(qa, -1)), t)), l = Math.hypot(p[0], p[1]) || 1; return [p[0] / l, p[1] / l, 0]; };
    const limb = (q1, q2) => {   // 沿著球的外框，從 q1 走到 q2，走在球冠裡面的那一邊
      const a1 = Math.atan2(q1[1], q1[0]); let d = Math.atan2(q2[1], q2[0]) - a1;
      while (d <= 0) d += 2 * Math.PI;
      const m = a1 + d / 2;
      if (Math.cos(m) * n[0] + Math.sin(m) * n[1] < cc) d -= 2 * Math.PI;
      const k = Math.max(2, Math.ceil(Math.abs(d) / .18)), out = [];
      for (let i = 1; i < k; i++) { const t = a1 + d * i / k; out.push([Math.cos(t), Math.sin(t), 0]); }
      return out;
    };
    const k0 = vis.indexOf(false), out = [];
    let exit = null, first = null;
    for (let j = 1; j <= N; j++) {
      const i = (k0 + j) % N, ip = (k0 + j - 1) % N;
      if (vis[i] && !vis[ip]) { const en = cut(Q[ip], Q[i]); if (exit) out.push(...limb(exit, en)); else first = en; out.push(en); }
      if (vis[i]) out.push(Q[i]);
      if (!vis[i] && vis[ip]) { exit = cut(Q[i], Q[ip]); out.push(exit); }
    }
    if (exit && first) out.push(...limb(exit, first));
    return out.map(svg);
  }
  function capSvg(S, H, R, dirModel, deg, fill, extra = '') {
    const cv = S.V(H), n = norm(S.V(dirModel)), pts = capPts(cv, R, n, deg * RAD);
    if (!pts) return '';
    if (pts === 'all') return `<circle cx="${f1(cv[0])}" cy="${f1(-cv[1])}" r="${R}" fill="${fill}"${extra}/>`;
    return `<path d="${path(pts)}" fill="${fill}"${extra}/>`;
  }
  // 貼在球面上的小橢圓（眼睛、腮紅）；a 往東、b 往北
  function patch(S, H, R, lat, lon, a, b, fill, extra = '', min = .12) {
    const d = dirOf(lat, lon);
    if (S.V(d)[2] < min) return '';
    const C = add(H, mul(d, R)), E = eastOf(lon), N = northOf(lat, lon);
    return `<path d="${path(ring(14, t => S.P(add(C, add(mul(E, a * Math.cos(t)), mul(N, b * Math.sin(t)))))))}" fill="${fill}"${extra}/>`;
  }
  const spot = (S, H, R, lat, lon, de, dn) => S.P(add(add(H, mul(dirOf(lat, lon), R)), add(mul(eastOf(lon), de), mul(northOf(lat, lon), dn))));
  // 球面上的曲線（嘴巴、頭髮反光）
  function curve(S, H, R, pts3, stroke, w, min = .1) {
    if (S.V(dirOf(pts3[1][0], pts3[1][1]))[2] < min) return '';
    const [a, b, c] = pts3.map(([lat, lon]) => S.P(add(H, mul(dirOf(lat, lon), R))));
    const q = [2 * b[0] - (a[0] + c[0]) / 2, 2 * b[1] - (a[1] + c[1]) / 2];
    return `<path d="M${f1(a[0])} ${f1(a[1])}Q${f1(q[0])} ${f1(q[1])} ${f1(c[0])} ${f1(c[1])}" stroke="${stroke}" stroke-width="${w}" fill="none" stroke-linecap="round"/>`;
  }
  // 繞著頭的帶子（髮帶、帽子邊）：只畫看得到的那一段
  function band(S, H, R, lat, stroke, w) {
    const pts = ring(28, t => [Math.cos(t), t]).map(([, t]) => { const d = [Math.sin(t) * Math.cos(lat * RAD), Math.sin(lat * RAD), Math.cos(t) * Math.cos(lat * RAD)]; return [d, S.V(d)[2]]; });
    let s = '', run = [];
    const flush = () => { if (run.length > 1) s += `<path d="M${run.map(p => f1(p[0]) + ' ' + f1(p[1])).join('L')}" stroke="${stroke}" stroke-width="${w}" fill="none" stroke-linecap="round"/>`; run = []; };
    const start = pts.findIndex(p => p[1] < 0);
    for (let j = 0; j <= pts.length; j++) { const [d, z] = pts[((start < 0 ? 0 : start) + j) % pts.length]; if (z >= 0) run.push(S.P(add(H, mul(d, R)))); else flush(); }
    flush();
    return s;
  }

  /* ---------- 頭：臉、頭髮、配件 ---------- */
  const BANG_CAPS = {   // [緯度, 經度, 角半徑]，最後幾個是瀏海一撮一撮的尖角
    clump: [[58, 0, 44], [20, -36, 8], [19, -18, 8], [20, 0, 8], [19, 18, 8], [20, 36, 8]],
    swept: [[57, -12, 46], [18, -32, 9], [17, -12, 9], [19, 8, 8], [6, 46, 12]],
    straight: [[53, 0, 41]],
    side: [[60, 28, 48], [22, 4, 10]],
    middle: [[47, -36, 34], [47, 36, 34]],
    spiky: [[62, 0, 44], [24, -24, 8], [24, 0, 8], [24, 24, 8]],
    neat: [[63, -14, 45]],
    bowl: [[49, 0, 39]],
    slick: [[72, 0, 44]]
  };
  function head(S, H, R, L, o = {}) {
    const fine = S.fine, hc = L.hair, cv = S.V(H), hp = S.P(H), hd = hp[2];
    const curly = L.front === 'curly', mush = L.front === 'mush', F = L.face || {};
    if (!mush) {
      // 後面一顆大一點的頭髮球，讓頭髮有厚度
      S.put(hd - .3, S.ballSvg(add(H, [0, R * .1, -R * .12]), R + 2, hc));
      // 耳朵（瓜皮頭蓋住耳朵，不用畫）
      for (const sx of [-1, 1]) S.ball(add(H, [sx * R * .97, -R * .08, -R * .08]), R * .18, L.skin, 0);
    }
    let s = S.ballSvg(H, R, L.skin);
    // 頭髮蓋住頭頂和後腦，前面留臉
    if (!mush) s += capSvg(S, H, R, dirOf(20, 180), L.back === 'cap' || !L.back ? 104 : 112, hc);
    // 臉：大家同一種表情（黑色圓眼睛＋白色亮點、粉紅腮紅、小小的微笑），照使用者給的參考圖；同學的眼睛、腮紅、嘴巴顏色另外照 ChatGPT 的建議（L.face）
    const face = [], k = R / 25, bl = ` opacity="${F.blushA || (fine ? .8 : .65)}"`, ew = F.ew || 3.3, eh = F.eh || 4.3, ec = F.eye || '#231d20', bc = F.blush || '#f7a1a6';
    face.push(patch(S, H, R, -15, -44, 4.6 * k, 2.8 * k, bc, bl), patch(S, H, R, -15, 44, 4.6 * k, 2.8 * k, bc, bl));
    const eye = (lon, big) => {
      const e = patch(S, H, R, 0, lon, (big ? ew + .5 : ew) * k, (big ? eh + .7 : eh) * k, ec);
      if (!e) return '';
      const h1 = spot(S, H, R, 0, lon, 1 * k, 1.5 * k * eh / 4.3), h2 = spot(S, H, R, 0, lon, -.9 * k, -1.7 * k * eh / 4.3);
      return e + `<circle cx="${f1(h1[0])}" cy="${f1(h1[1])}" r="${f1(1.35 * k)}" fill="#fff"/>` + (fine ? `<circle cx="${f1(h2[0])}" cy="${f1(h2[1])}" r="${f1(.55 * k)}" fill="#fff" opacity=".85"/>` : '');
    };
    const mouth = curve(S, H, R, [[-25, -7], [-28.5, 0], [-25, 7]], F.mouth || '#9b4f4b', 1.5 * k);
    face.push(`<g class="fn"><g class="eyes">${eye(-23)}${eye(23)}</g>${mouth}</g>`);
    if (fine && o.expr !== false) {
      const arc = lon => curve(S, H, R, [[-1, lon - 9], [5, lon], [-1, lon + 9]], '#231d20', 2.3 * k);
      face.push(`<g class="fh">${arc(-23)}${arc(23)}${patch(S, H, R, -28, 0, 4.6 * k, 3.6 * k, '#9f4f54')}${patch(S, H, R, -30, 0, 2.6 * k, 1.4 * k, '#f7a1a6')}</g>`);
      face.push(`<g class="fs">${eye(-23, true)}${eye(23, true)}${patch(S, H, R, -29, 0, 2.6 * k, 3.4 * k, '#743c43')}</g>`);
    }
    s += face.join('');
    if (L.acc === 'beard') s += capSvg(S, H, R + .3, dirOf(-48, 0), 42, hc) + patch(S, H, R + .5, -22, 0, 6 * k, 2 * k, hc);
    // 瓜皮頭（2026-11-03 使用者要求，形狀照 ChatGPT 的建議）：比頭大一圈的圓形髮罩，前面剪在眼睛上方、兩側包住耳朵到臉頰外側、後面到脖子上緣
    // 做法：髮罩球（半徑 1.1 倍）上一個往後傾的球冠——中心在後上方緯度 60°、角半徑 100°，邊緣在前面緯度 20°、兩側約 −12°、後面 −40°
    if (mush) {
      const Hh = add(H, [0, R * .03, -R * .02]), Rh = R * 1.1;
      s += capSvg(S, Hh, Rh, dirOf(60, 180), 100, hc);
      if (fine) s += curve(S, Hh, Rh + .3, [[58, -32], [67, 0], [58, 32]], L.shine || shade(hc, .22), 1.7 * k, .05);   // 頭頂的反光（ChatGPT 建議 #80604D）
    }
    // 瀏海
    else if (!curly) for (const [la, lo, a] of BANG_CAPS[L.front] || BANG_CAPS.clump) s += capSvg(S, H, R + .2, dirOf(la, lo), a, hc);
    if (fine && !curly && !mush) s += curve(S, H, R + .3, [[58, -32], [70, -4], [62, 24]], shade(hc, .22), 2.2 * k, .05);
    // 眼鏡
    if (L.glasses) {
      for (const lon of [-23, 23]) s += patch(S, H, R + .6, 0, lon, 6.6 * k, 6.2 * k, 'none', ` stroke="#4a3a3a" stroke-width="${f1(1.4 * k)}"`, .2);
      const a = spot(S, H, R + .6, 0, -23, 6.6 * k, 0), b = spot(S, H, R + .6, 0, 23, -6.6 * k, 0);
      if (S.V(dirOf(0, 0))[2] > .2) s += `<path d="M${f1(a[0])} ${f1(a[1])}L${f1(b[0])} ${f1(b[1])}" stroke="#4a3a3a" stroke-width="${f1(1.4 * k)}"/>`;
    }
    // 戴在頭上的帽子、配件（畫在頭的表面）
    const ac = L.accC || '#ef5a7a';
    if (L.acc === 'beret') s += capSvg(S, H, R + 2.5, norm([.25, 1, -.1]), 58, ac);
    if (L.acc === 'cap') s += capSvg(S, H, R + 1.5, dirOf(80, 0), 62, ac);
    if (L.acc === 'knit') s += capSvg(S, H, R + 2, dirOf(88, 0), 62, ac) + band(S, H, R + 2.5, 30, shade(ac, -.18), 7 * k);
    if (L.acc === 'headband') s += band(S, H, R + 1, 34, ac, 6 * k);
    const th = o.theme;
    if (th === 'moon') s += capSvg(S, H, R + 2, dirOf(86, 0), 60, '#c2d462');
    if (th === 'cny') s += capSvg(S, H, R + 1.5, dirOf(90, 0), 52, '#a4161a') + band(S, H, R + 1.8, 38, '#f6c445', 4.5 * k);
    if (th === 'sports') s += band(S, H, R + 1, 32, o.band || '#e8574a', 6.5 * k);
    S.put(hd, s);
    // 頭上凸出來的東西：各自依遠近排
    const top = add(H, [0, R, 0]);
    if (curly) {
      for (const [la, lo] of [[50, -40], [58, 0], [50, 40], [28, -60], [28, 60], [72, -30], [72, 30], [84, 0], [40, 110], [40, -110], [45, 160], [45, -160], [20, 140], [20, -140], [15, 180], [65, 120], [65, -120]])
        S.ball(add(H, mul(dirOf(la, lo), R * .92)), R * .32, hc);
    }
    if (L.front === 'spiky') for (const lo of [-50, -20, 10, 40, 160, -160, 100, -100]) { const d = dirOf(55, lo); S.cone(add(H, mul(d, R * .8)), R * .25, add(H, mul(dirOf(64, lo), R * 1.32)), hc); }
    const tie = L.tie || '#ff8fab';
    const ex = L.extra;
    if (ex === 'twintails') for (const sx of [-1, 1]) { S.caps(add(H, [sx * R * .95, R * .15, -R * .35]), R * .26, add(H, [sx * R * 1.25, -R * .9, -R * .45]), R * .32, hc); S.ball(add(H, [sx * R * .9, R * .28, -R * .3]), R * .15, tie); }
    if (ex === 'ponytail') { S.caps(add(H, [0, R * .5, -R * .98]), R * .28, add(H, [R * .2, -R * .6, -R * 1.25]), R * .36, hc); S.ball(add(H, [0, R * .58, -R * .86]), R * .15, tie); }
    if (ex === 'bun') { S.ball(add(H, [0, R * 1.02, -R * .25]), R * .46, hc); S.ball(add(H, [0, R * .9, -R * .05]), R * .12, tie); }
    if (ex === 'twinbuns') for (const sx of [-1, 1]) S.ball(add(H, [sx * R * .7, R * .78, -R * .1]), R * .38, hc);
    if (ex === 'braids') for (const sx of [-1, 1]) { for (let i = 0; i < 4; i++) S.ball(add(H, [sx * R * .92, -R * (.2 + i * .36), R * .02]), R * .22, hc); S.ball(add(H, [sx * R * .92, -R * 1.6, R * .02]), R * .12, tie); }
    if (ex === 'ahoge') S.caps(add(H, [0, R * .98, 0]), R * .07, add(H, [R * .18, R * 1.45, R * .12]), R * .05, hc, .5);
    if (L.back === 'long') S.caps(add(H, [0, -R * .2, -R * .45]), R * .86, add(H, [0, -R * 1.55, -R * .5]), R * .72, hc);
    if (L.back === 'bob') {   // 鮑伯頭：後面一塊、兩邊垂到下巴
      S.caps(add(H, [0, -R * .1, -R * .4]), R * .86, add(H, [0, -R * .5, -R * .45]), R * .8, hc);
      for (const sx of [-1, 1]) S.caps(add(H, [sx * R * .8, -R * .05, -R * .12]), R * .34, add(H, [sx * R * .82, -R * .62, -R * .16]), R * .3, hc);
    }
    if (L.acc === 'bow') { const c = add(H, mul(dirOf(46, 34), R * 1.02)), E = eastOf(34); S.ball(add(c, mul(E, 4 * k)), 3.8 * k, ac, 1); S.ball(add(c, mul(E, -4 * k)), 3.8 * k, ac, 1); S.ball(c, 2 * k, shade(ac, -.2), 1.1); }
    if (L.acc === 'flower') { const c = add(H, mul(dirOf(40, -40), R * 1.02)), E = eastOf(-40), N = northOf(40, -40); for (let i = 0; i < 5; i++) { const t = i / 5 * 2 * Math.PI; S.ball(add(c, add(mul(E, 3.2 * k * Math.cos(t)), mul(N, 3.2 * k * Math.sin(t)))), 2.6 * k, L.accC || '#ff9fbc', 1); } S.ball(c, 2 * k, '#ffd166', 1.1); }
    if (L.acc === 'beret') S.ball(add(H, [R * .25, R * 1.22, -R * .1]), 2.4 * k, ac, 1);
    if (L.acc === 'cap') S.disk(add(H, [0, R * .28, R * .9]), R * .55, shade(ac, -.25), 1);
    if (L.acc === 'knit') S.ball(add(top, [0, R * .25, 0]), R * .26, '#ffffff', 1);
    // 主題帽子
    if (th === 'halloween') {
      S.disk(add(H, [0, R * .55, 0]), R + 10 * k, '#3d2458', 1);
      S.frustum(add(H, [0, R * .55, 0]), R * .66, H[1] + R * .55 + 6 * k, R * .63, '#f28c28', 1.1);
      S.cone(add(H, [0, R * .55 + 6 * k, 0]), R * .63, add(H, [R * .3, R * 2.3, -R * .25]), '#5b3a84', 1.1 + R * .3);   // 帽錐一定蓋在帽帶上面，從上面看才不會變成一片橘色
    }
    if (th === 'xmas') {
      S.frustum(add(H, [0, R * .5, 0]), R * 1.02, H[1] + R * .5 + 8 * k, R * .98, '#ffffff', 1.1);
      S.cone(add(H, [0, R * .5 + 8 * k, 0]), R * .95, add(H, [R * .65, R * 1.9, -R * .3]), '#d93838', 1.1 + R * .3);
      S.ball(add(H, [R * .7, R * 1.9, -R * .3]), 6 * k, '#ffffff', 1.2 + R * .3);
    }
    if (th === 'kids') {
      const c = ['#ef476f', '#ffd166', '#06d6a0', '#118ab2'][o.seed % 4];
      S.cone(add(H, [0, R * .82, 0]), R * .45, add(H, [0, R * 2.4, 0]), c, 1);
      S.ball(add(H, [0, R * 2.45, 0]), 4.5 * k, '#ffd166', 1.1);
    }
    if (th === 'moon') { S.caps(add(top, [0, 0, 0]), 1.5 * k, add(top, [0, 9 * k, 0]), 1.5 * k, '#5d7d22', 1); S.caps(add(top, [1 * k, 8 * k, 0]), 1.2 * k, add(top, [12 * k, 10 * k, 0]), 3 * k, '#6aa84f', 1.1); }
    if (th === 'cny') S.ball(add(top, [0, 2 * k, 0]), 4.5 * k, '#e63946', 1);
    if (th === 'sports') for (const dy of [3, -3]) S.caps(add(H, [R * .05, R * .55, -R * .95]), 2 * k, add(H, [R * .35, R * .45 + dy * k, -R * 1.3]), 3 * k, o.band || '#e8574a');
  }

  /* ---------- 衣服的小東西 ---------- */
  function collar(S, B, r, kind, shirt, wc = '#ffffff') {   // 畫在身體上方那顆球的表面；wc 是領子的顏色
    const dk = shade(shirt, -.16);
    if (kind === 0) return capSvg(S, B, r + .3, dirOf(42, -22), 18, wc) + capSvg(S, B, r + .3, dirOf(42, 22), 18, wc);
    if (kind === 1) return capSvg(S, B, r + .3, dirOf(36, 0), 32, wc) + capSvg(S, B, r + .5, dirOf(30, 0), 14, shirt);
    if (kind === 2) return capSvg(S, B, r + .3, dirOf(55, 0), 24, dk);
    return capSvg(S, B, r + .3, dirOf(46, 0), 16, wc);
  }

  /* ---------- 坐著的同學 ---------- */
  // 頭的大小、高度（2026-11-03 使用者要求頭縮小：ChatGPT 建議頭寬約桌面寬的 0.36）；room.js 照這個算臉的位置
  const KID = { R: 17.5, Y: 85, SY: 105 };
  function kid(L, theta, e, o = {}) {
    const S = painter(theta, e, o.fine !== false), sh = L.shirt, sk = L.skin, pants = '#6f8fbf';
    // 腳（大多藏在桌子下面）
    for (const sx of [-1, 1]) {
      S.caps([sx * 6.5, 34, 2], 6.5, [sx * 7, 33, 21], 6, pants);
      S.caps([sx * 7, 32, 22], 5.2, [sx * 7, 7, 24], 4.8, pants);
      S.ball([sx * 7, 4.6, 27], 5.2, '#eef1f4');
    }
    // 身體
    const B = [0, 59, -1];
    S.put(S.P([0, 50, -1])[2], S.capsSvg([0, 41, -1], 14.5, B, 13, sh) + collar(S, B, 13, L.collar, sh, L.collarC)
      + (L.collar === 1 ? S.ballSvg([0, 59, 11.6], 2.8, '#e45b6b') : '')
      + (o.theme === 'mom' ? S.ballSvg([-6, 55, 12], 3.4, '#e63950') : '') + (o.theme === 'dragon' ? S.ballSvg([0, 52, 13.5], 3.4, '#f6c445') : ''));
    if (L.collar === 2) S.ball([0, 67, -11], 8, shade(sh, -.12));
    // 手（短袖）：肩膀 → 手肘 → 放在桌上的手
    for (const sx of [-1, 1]) {
      S.caps([sx * 14, 62, 0], 5.6, [sx * 17.5, 56, 7], 5.2, sh);
      S.caps([sx * 18, 55.5, 8], 4.2, [sx * 11, 58.5, 25], 4, sk);
      S.ball([sx * 10.5, 59, 26], 4.6, sk);
    }
    head(S, [0, KID.Y, 0], KID.R, L, o);
    // 畫布下緣在腳底上面一點（-2），立牌才不會穿過地板、影子和桌下的圓圈，3D 前後順序才不會亂（不然後排同學的椅背會蓋在胸前）
    return S.done('-55 -235 110 233', o.style || '');
  }
  /* ---------- 站著舉牌的同學（牌子另外是一片 3D 平面） ---------- */
  function standKid(L, theta, e, o = {}) {
    const S = painter(theta, e, o.fine !== false), sh = L.shirt, sk = L.skin, pants = '#6f8fbf';
    for (const sx of [-1, 1]) { S.caps([sx * 6.5, 54, 0], 6.5, [sx * 6.5, 9, 1], 5.6, pants); S.ball([sx * 6.5, 5.5, 4], 5.6, '#eef1f4'); }
    const B = [0, 80, 0];
    S.put(S.P([0, 70, 0])[2], S.capsSvg([0, 62, 0], 14, B, 13, sh) + collar(S, B, 13, L.collar, sh, L.collarC));
    S.caps([26, 70, 8], 2.4, [26, 184, 8], 2.4, '#b07a43');   // 牌子的木棍（在頭的旁邊）
    S.caps([14, 83, 0], 5.6, [21, 88, 5], 5, sh); S.caps([21, 88, 5], 4.2, [25, 96, 8], 4, sk); S.ball([25.5, 97, 8], 4.6, sk, .3);   // 右手握木棍
    S.caps([-14, 83, 0], 5.6, [-17, 72, 2], 5, sh); S.caps([-17, 72, 2], 4.2, [-18.5, 64, 4], 4, sk); S.ball([-18.5, 62, 4], 4.6, sk);
    head(S, [0, KID.SY, 0], KID.R, L, o);
    return S.done('-55 -260 110 330', o.style || '');
  }
  /* ---------- 老師（站著；右手兩種：放下 arm、舉起來揮手 arm2） ---------- */
  function teacher(a, theta, e, o = {}) {
    const S = painter(theta, e, o.fine !== false), p = a.p, sk = p.skin || SKINS[0], c = p.oc, out = p.outfit;
    const sl = out === 'vest' || out === 'bowtie' ? '#f4f5fb' : shade(c, -.04), body = out === 'vest' ? c : out === 'bowtie' ? '#f4f5fb' : c;
    for (const sx of [-1, 1]) {
      if (out === 'dress') S.caps([sx * 6, 64, 0], 4.6, [sx * 6, 10, 0], 4.4, sk);
      else S.caps([sx * 7, 82, 0], 7.5, [sx * 7, 11, 0], 6.6, '#465172');
      S.ball([sx * 7, 5.5, 4], 6.5, '#3a2a22');
    }
    if (out === 'dress') S.frustum([0, 58, 0], 27, 100, 18, c);
    const B = [0, 120, 0];
    let tor = S.capsSvg([0, 88, 0], 19, B, 17.5, body);
    const front = (y, a2, b2, fill) => { const d = S.V([0, 0, 1]); if (d[2] < .15) return ''; const C = [0, y, 18.6]; return `<path d="${path(ring(14, t => S.P(add(C, [a2 * Math.cos(t), b2 * Math.sin(t), 0]))))}" fill="${fill}"/>`; };
    if (out === 'cardigan') tor += front(104, 6.5, 22, '#fff8f0') + S.ballSvg([3.5, 110, 18.8], 1.6, shade(c, -.25)) + S.ballSvg([3.5, 98, 18.8], 1.6, shade(c, -.25));
    if (out === 'vest' || out === 'tie' || out === 'bowtie' || out === 'sweater') tor += collar(S, B, 17.5, 3, body);
    if (out === 'vest') tor += front(108, 6, 18, '#f4f5fb');
    if (out === 'jacket' || out === 'sport') tor += front(104, 1.2, 22, shade(c, -.2)) + collar(S, B, 17.5, 2, c);
    if (out === 'polo') tor += collar(S, B, 17.5, 2, c) + S.ballSvg([0, 112, 18.8], 1.5, '#fff') + S.ballSvg([0, 104, 19], 1.5, '#fff');
    if (out === 'tee' || out === 'dress') tor += collar(S, B, 17.5, out === 'dress' ? 0 : 3, c);
    S.put(S.P([0, 104, 0])[2], tor);
    if (out === 'tie') S.caps([0, 119, 17.5], 2.4, [0, 96, 19.6], 3.4, '#d64545', 1);
    if (out === 'bowtie') { S.ball([-4, 120, 16.5], 3.2, '#2d3a6b', 1); S.ball([4, 120, 16.5], 3.2, '#2d3a6b', 1); }
    if (out === 'coat') { S.frustum([0, 121, 0], 14, 128, 13, p.scarf || '#e2475e', .5); S.caps([5, 121, 14], 3.4, [8, 98, 19], 3.6, p.scarf || '#e2475e', 1); }
    S.caps([0, 120, 0], 6, [0, 132, 0], 6, sk, -1);   // 脖子
    // 左手（畫面左邊）
    S.caps([-19, 124, 0], 6.6, [-25, 92, 3], 6, sl); S.ball([-25.5, 87, 4], 6.5, sk);
    // 右手：放下／舉起來
    const r1 = S.capsSvg([19, 124, 0], 6.6, [25, 92, 3], 6, sl) + S.ballSvg([25.5, 87, 4], 6.5, sk);
    const r2 = S.capsSvg([19, 124, 0], 6.6, [30, 152, 6], 6, sl) + S.ballSvg([31, 158, 6], 6.8, sk);
    S.put(S.P([22, 105, 2])[2], `<g class="arm">${r1}</g><g class="arm2">${r2}</g>`);
    const L = Object.assign({}, p, { skin: sk, back: p.back || (p.front === 'curly' ? '' : 'cap') });
    head(S, [0, 160, 0], 31, L, Object.assign({ theme: ['cap', 'knit', 'beret'].includes(p.acc) ? '' : o.theme, seed: 1 }, o));
    return S.done('-65 -320 130 390', o.style || '');
  }
  return { kid, standKid, teacher, KID };
})();
