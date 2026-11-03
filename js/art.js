'use strict';
/* 人物與老師頭像：日系可愛風，全部自己畫的 SVG。
   「精緻」有亮晶晶的大眼睛、腮紅、頭髮光澤、表情和小動作；「簡單」給比較慢的電腦用（只記在這台電腦）。
   頭都畫在「頭的座標」：臉的中心在 (0,0)、寬 52 高 49，再搬到身體上；頭髮分成後面（在身體後）和前面兩層。 */

const Look = {
  get fine() { try { return localStorage.getItem('bxbox-look') !== 'simple'; } catch (e) { return true; } },
  set(v) { try { localStorage.setItem('bxbox-look', v); } catch (e) { } },
  // 3D 教室名牌大小（投影用，只記在這台電腦）：標準／大／特大，預設大（2026-11-03 使用者要名牌放大）
  get tag() { try { return localStorage.getItem('bxbox-tag') || 'l'; } catch (e) { return 'l'; } },
  setTag(v) { try { localStorage.setItem('bxbox-tag', v); } catch (e) { } },
  get tagK() { return { m: 1, l: 1.5, xl: 1.9 }[this.tag] || 1.5; }
};
function hashOf(s) {   // FNV-1a 再打散，座號相近、建立時間相同的同學也會長得不一樣
  let x = 2166136261;
  for (const ch of String(s)) { x ^= ch.charCodeAt(0); x = Math.imul(x, 16777619); }
  x ^= x >>> 16; x = Math.imul(x, 0x85ebca6b); x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35); x ^= x >>> 16;
  return x >>> 0;
}
function shade(hex, k) { // k < 0 變暗，k > 0 變亮
  const n = parseInt(hex.slice(1), 16), f = v => clamp(Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k), 0, 255);
  return '#' + [n >> 16, (n >> 8) & 255, n & 255].map(v => f(v).toString(16).padStart(2, '0')).join('');
}
const circles = (list, c) => list.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`).join('');

// 配色參考 ChatGPT 的建議（2026-10-31）：膚色、髮色（黑和深棕多一點）、柔和的衣服
const SKINS = ['#f8dcc5', '#f3c9a8', '#e2b08a'];
const HAIRS = ['#292326', '#594139', '#292326', '#3a2c2a', '#594139', '#985b49', '#a87955', '#88766c'];
const TIES = ['#ff8fab', '#ffd166', '#7fd1ff', '#b8f28a', '#c9a0ff'];
// 衣服：活潑、色彩飽和（2026-11-03 使用者要求；12 色照 ChatGPT 的建議：莓果紅、橘子橙、向日葵黃、草莓粉、珊瑚粉、薄荷綠、森林綠、天空藍、湖水藍、薰衣草紫、葡萄紫、寶藍）
const KID_SHIRT = ['#e76f75', '#ef914c', '#e9be45', '#e98eae', '#e98278', '#63bfa0', '#398e72', '#55a9d6', '#4599ad', '#9b83c9', '#8066a8', '#426fbc'];
// 3D 教室的同學（瓜皮頭、中性臉）：髮色、頭頂反光、膚色、眼睛、腮紅、嘴巴、領口，照 ChatGPT 的建議
const KID3D = { hair: '#49352f', shine: '#80604d', skin: '#ffd9b8', collar: '#fff4df', face: { eye: '#382b27', ew: 3.2, eh: 3.5, blush: '#f58f91', blushA: .5, mouth: '#75483f' } };

/* ---------- 頭髮（瀏海畫好後整個往上移 6，露出眼睛） ---------- */
const BANGS = {
  swept: 'M-27-2Q-29-28-8-29Q15-33 27-12L19-15L13-6L5-17L-4-6L-13-14L-20-2Z',
  clump: 'M-27 5C-29-18-14-29 0-29C15-29 29-19 27 5L24-4L21 3L17-9L12-1L7-12L2-3L-3-13L-8-2L-13-11L-17 0L-21-8L-24 2Z',
  straight: 'M-27 6C-29-18-14-29 0-29C15-29 29-18 27 6L26-4L20-2L14-5L8-2L2-5L-4-2L-10-5L-16-2L-22-5L-26-4Z',
  side: 'M-27 6C-29-18-14-29 0-29C15-29 29-18 27 6L25-6C18-12 8-6-4-15C-10-8-19-6-26-1Z',
  middle: 'M-27 9C-29-18-14-29 0-29C15-29 29-18 27 9L24-1C20-10 9-15 0-19C-9-15-20-10-24-1Z',
  spiky: 'M-26 3C-30-10-26-22-18-26L-17-35L-9-29L-4-38L1-30L8-37L11-28L19-32L19-23C27-18 29-8 26 3L22-6L17 1L13-8L7-2L2-10L-4-2L-9-9L-14-1L-19-8Z',
  neat: 'M-26 1C-28-18-14-28 2-28C17-28 28-18 26 1L24-8C16-14 6-16-8-12C-14-10-20-7-24-6Z',
  bowl: 'M-27 3C-29-20-14-29 0-29C14-29 29-20 27 3L27-3H-27Z',
  slick: 'M-26-2C-28-20-12-30 2-30C18-30 28-20 26-2L24-10C18-18 6-20-6-18C-14-16-20-12-24-8Z'
};
const BACKS = {
  long: 'M-28 0C-31-25 31-25 28 0L32 50Q0 58-32 50Z',
  bob: 'M-29 0C-31-25 31-25 29 0L30 21Q0 27-30 21Z',
  short: 'M-27 0Q-31-29-12-35Q12-42 27-20Q33-8 27 17L22 27Q0 34-22 25L-27 12Z',   // ChatGPT 的短髮後髮
  cap: 'M-27 2C-30-26 30-26 27 2L26 8Q0 12-26 8Z'
};
// 主題帽子（也畫在頭的座標）
function hatFor(th, seed, band) {
  switch (th) {
    case 'halloween': return '<path d="M-34-19Q0-30 34-19Q0-10-34-19Z" fill="#3d2458"/><path d="M-18-21C-12-40-2-54 22-66C12-50 18-36 18-21Z" fill="#5b3a84"/><path d="M-17-27Q0-31 18-27L18-21Q0-25-18-21Z" fill="#f28c28"/>';
    case 'xmas': return '<path d="M-24-16C-22-42 6-52 26-44C34-40 38-32 40-24L32-26C28-30 26-24 26-16Z" fill="#d93838"/><rect x="-28" y="-21" width="56" height="10" rx="5" fill="#fff"/><circle cx="39" cy="-24" r="6.5" fill="#fff"/>';
    case 'kids': {
      const c = ['#ef476f', '#ffd166', '#06d6a0', '#118ab2'][seed % 4], c2 = ['#ffd166', '#118ab2', '#ef476f', '#06d6a0'][seed % 4];
      return `<path d="M-12-24L2-64L16-24Z" fill="${c}"/><path d="M-8-36H12L14-31H-10ZM-3-49H7L8.5-45H-4.5Z" fill="${c2}"/><circle cx="2" cy="-65" r="5" fill="${c2}"/>`;
    }
    case 'moon': return '<path d="M-28-6C-30-38 30-38 28-6L22-11L16-6L10-11L4-6L-2-11L-8-6L-14-11L-20-6Z" fill="#c2d462"/><path d="M0-30V-41" stroke="#5d7d22" stroke-width="3" stroke-linecap="round"/><path d="M0-39C6-46 14-44 17-40C11-36 5-36 0-39Z" fill="#6aa84f"/>';
    case 'cny': return '<path d="M-25-10C-25-38 25-38 25-10Z" fill="#a4161a"/><rect x="-25" y="-15" width="50" height="6" rx="3" fill="#f6c445"/><circle cx="0" cy="-32" r="5" fill="#e63946"/>';
    case 'sports': { const c = band || '#e8574a'; return `<path d="M-27-12Q0-21 27-12L27-5Q0-14-27-5Z" fill="${c}"/><path d="M25-10L37-16L35-4ZM25-8L36 1L28 3Z" fill="${c}"/>`; }
  }
  return '';
}

/* ---------- 臉：黑色小圓眼＋白色亮點、腮紅、小嘴（位置照 ChatGPT 建議：眼睛在臉中間、腮紅在兩頰、嘴巴在下方） ---------- */
function eyeSVG(x, y, fine) {
  return `<ellipse cx="${x}" cy="${y}" rx="2.9" ry="3.9" fill="#292326"/><circle cx="${x + .9}" cy="${y - 1.4}" r="1.1" fill="#fff"/>`
    + (fine ? `<circle cx="${x - .8}" cy="${y + 1.5}" r=".5" fill="#fff" opacity=".85"/>` : '');
}
const MOUTHS = [
  '<path d="M-2.8 12.5Q0 15.2 2.8 12.5" stroke="#a85f5b" stroke-width="1.5" fill="none" stroke-linecap="round"/>',
  '<path d="M-3.8 12.2Q-1.9 14.8 0 12.4Q1.9 14.8 3.8 12.2" stroke="#a85f5b" stroke-width="1.4" fill="none" stroke-linecap="round"/>',
  '<path d="M-2.6 11.8Q0 16.5 2.6 11.8Z" fill="#9f4f54"/>'
];
function faceSVG(p) {
  const op = p.fine ? .75 : .6;
  let s = `<ellipse cx="-18" cy="10" rx="4.6" ry="2.6" fill="#f5a6a5" opacity="${op}"/><ellipse cx="18" cy="10" rx="4.6" ry="2.6" fill="#f5a6a5" opacity="${op}"/>`;
  s += `<g class="fn"><g class="eyes">${eyeSVG(-10, 1, p.fine)}${eyeSVG(10, 1, p.fine)}</g>${MOUTHS[p.mouth || 0]}</g>`;
  if (p.expr) s += '<g class="fh"><path d="M-14.5 3Q-10-3.5-5.5 3M5.5 3Q10-3.5 14.5 3" stroke="#292326" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M-5 10Q0 7 5 10Q6 17 0 18Q-6 17-5 10Z" fill="#9f4f54"/><path d="M-3 11Q0 9 3 11" stroke="#f5a6a5" stroke-width="1.5" fill="none"/></g>'
    + '<g class="fs"><ellipse cx="-9.5" cy="1" rx="3.3" ry="4.6" fill="#292326"/><ellipse cx="9.5" cy="1" rx="3.3" ry="4.6" fill="#292326"/><circle cx="-8.4" cy="-.6" r="1.2" fill="#fff"/><circle cx="10.6" cy="-.6" r="1.2" fill="#fff"/><path d="M-4 11Q0 8 4 11Q6 17 0 20Q-6 17-4 11Z" fill="#743c43"/></g>';
  return s;
}

/* ---------- 頭（回傳後面、前面兩層） ---------- */
function headSVG(p) {
  const c = p.hair, fine = p.fine, tie = p.tie || '#ff8fab', ex = p.extra, curly = p.front === 'curly';
  let back = '', front = '';
  if (curly) back += circles([[-27, 8, 10], [27, 8, 10], [-26, -10, 11], [26, -10, 11], [-15, -24, 12], [15, -24, 12], [0, -29, 12]], c);
  else if (BACKS[p.back]) back += `<path d="${BACKS[p.back]}" fill="${c}"/>`;
  if (ex === 'twintails') back += `<path d="M-23-13C-41-12-46 18-37 42C-35 24-31 6-21-4Z" fill="${c}"/><path d="M23-13C41-12 46 18 37 42C35 24 31 6 21-4Z" fill="${c}"/>`;
  if (ex === 'ponytail') back += `<path d="M15-25C39-31 47 1 37 31C34 13 29-3 17-11Z" fill="${c}"/>`;
  if (ex === 'bun') back += `<circle cx="0" cy="-30" r="11.5" fill="${c}"/>`;
  if (ex === 'twinbuns') back += circles([[-20, -25, 9.5], [20, -25, 9.5]], c);
  if (ex === 'braids') for (const sx of [-25, 25]) { for (let i = 0; i < 4; i++) front += `<ellipse cx="${sx}" cy="${10 + i * 10}" rx="5.8" ry="6.4" fill="${c}"/>`; front += `<circle cx="${sx}" cy="50" r="3" fill="${tie}"/>`; }
  front += `<ellipse cx="-26" cy="2" rx="4" ry="6" fill="${p.skin}"/><ellipse cx="26" cy="2" rx="4" ry="6" fill="${p.skin}"/><ellipse cx="0" cy="0" rx="26" ry="24.5" fill="${p.skin}"/>`;
  front += faceSVG(p);
  if (p.acc === 'beard') front += `<path d="M-23 3C-24 24-11 33 0 33C11 33 24 24 23 3C19 15 10 21 4 21Q0 18-4 21C-10 21-19 15-23 3Z" fill="${c}"/><path d="M-7 12Q0 9 7 12Q0 15.5-7 12Z" fill="${c}"/>`;
  if (curly) {
    front += circles([[-21, -12, 8], [-11, -18, 8.5], [0, -20, 8.5], [11, -18, 8.5], [21, -12, 8], [-25, -1, 6.5], [25, -1, 6.5]], c);
    if (fine) front += circles([[-12, -21, 2.4], [3, -23, 2.4], [16, -17, 2.2]], shade(c, .25));
  } else {
    front += `<path d="${BANGS[p.front] || BANGS.clump}" fill="${c}" transform="translate(0 -6)"/>`;
    front += `<path d="M-15-24Q-3-33 11-29" stroke="${shade(c, .22)}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;   // 頭頂淡淡的反光
  }
  if (ex === 'twintails') front += `<circle cx="-23" cy="-11" r="3.2" fill="${tie}"/><circle cx="23" cy="-11" r="3.2" fill="${tie}"/>`;
  if (ex === 'ponytail') front += `<circle cx="18" cy="-21" r="3.2" fill="${tie}"/>`;
  if (ex === 'bun') front += `<ellipse cx="0" cy="-21" rx="7.5" ry="2.6" fill="${tie}"/>`;
  if (ex === 'ahoge') front += `<path d="M1-28C2-42 15-45 12-35C9-39 5-37 4-28Z" fill="${c}"/>`;
  if (p.glasses === 'round') front += '<g fill="none" stroke="#4a3a3a" stroke-width="1.5"><circle cx="-10" cy="1" r="6.8"/><circle cx="10" cy="1" r="6.8"/><path d="M-3.2.4Q0-1 3.2.4M-16.8 0L-25-2M16.8 0L25-2"/></g>';
  if (p.glasses === 'square') front += '<g fill="none" stroke="#3b3b44" stroke-width="1.7"><rect x="-17.5" y="-4.5" width="15" height="11" rx="2.6"/><rect x="2.5" y="-4.5" width="15" height="11" rx="2.6"/><path d="M-2.5 0H2.5M-17.5-.5L-25-2M17.5-.5L25-2"/></g>';
  const ac = p.accC || '#ef5a7a';
  if (p.acc === 'bow') front += `<g transform="translate(15 -22)"><path d="M0 0L-9.5-6.5V6.5ZM0 0L9.5-6.5V6.5Z" fill="${ac}"/><circle r="2.7" fill="${shade(ac, -.2)}"/></g>`;
  if (p.acc === 'flower') front += '<g transform="translate(-17 -17)">' + [0, 72, 144, 216, 288].map(a => `<circle cx="${(3.4 * Math.cos(a * Math.PI / 180)).toFixed(1)}" cy="${(3.4 * Math.sin(a * Math.PI / 180)).toFixed(1)}" r="3" fill="${p.accC || '#ff9fbc'}"/>`).join('') + '<circle r="2.1" fill="#ffd166"/></g>';
  if (p.acc === 'beret') front += `<ellipse cx="3" cy="-23" rx="25" ry="9.5" fill="${ac}" transform="rotate(-8 3 -23)"/><circle cx="6" cy="-33" r="2.6" fill="${ac}"/>`;
  if (p.acc === 'cap') front += `<path d="M-26-5C-27-34 27-34 26-5Z" fill="${ac}"/><path d="M-28-6Q0-1 28-6Q23 1 0 1.5Q-23 1-28-6Z" fill="${shade(ac, -.25)}"/><circle cx="0" cy="-30" r="2.2" fill="${shade(ac, -.25)}"/>`;
  if (p.acc === 'knit') front += `<path d="M-26-7C-27-36 27-36 26-7Z" fill="${ac}"/><rect x="-27.5" y="-13" width="55" height="9" rx="4.5" fill="${shade(ac, -.18)}"/><circle cx="0" cy="-35" r="6.5" fill="#fff"/>`
    + (fine ? `<path d="M-14-30V-14M-5-33V-14M5-33V-14M14-30V-14" stroke="${shade(ac, -.15)}" stroke-width="1.4"/>` : '');
  if (p.acc === 'headband') front += `<path d="M-27-12Q0-21 27-12L27-5Q0-14-27-5Z" fill="${ac}"/>`;
  if (p.hat) front += `<g transform="translate(0 -5)">${p.hat}</g>`;
  return { back, front };
}

/* ---------- 同學的長相（髮型、膚色、衣服依 id 決定；3D 人物在 toon.js） ---------- */
const KID_STYLES = [
  { front: 'swept', back: 'short' }, { front: 'clump', back: 'long' }, { front: 'straight', back: 'bob' },
  { front: 'swept', back: 'short', extra: 'twintails' }, { front: 'side', back: 'short', extra: 'ponytail' },
  { front: 'clump', back: 'short', extra: 'twinbuns' }, { front: 'spiky', back: 'cap' }, { front: 'clump', back: 'cap', extra: 'ahoge' },
  { front: 'middle', back: 'short', extra: 'braids' }, { front: 'neat', back: 'cap' }, { front: 'swept', back: 'bob' },
  { front: 'bowl', back: 'bob' }, { front: 'swept', back: 'cap' }, { front: 'clump', back: 'short', extra: 'bun' }
];
function kidLook(s, o) {
  const hs = hashOf(s.id), st = KID_STYLES[(hs >>> 6) % KID_STYLES.length], fine = o.fine !== false;
  const p = Object.assign({}, st, {
    skin: SKINS[hs % 3], hair: HAIRS[(hs >>> 3) % HAIRS.length], tie: TIES[(hs >>> 14) % TIES.length],
    fine, expr: fine, mouth: (hs >>> 17) % 3 === 1 ? 1 : 0, glasses: (hs >>> 19) % 9 === 0 ? 'round' : null,
    acc: ['long', 'bob', 'short'].includes(st.back) && !st.extra && (hs >>> 22) % 3 === 0 ? ((hs >>> 24) % 2 ? 'bow' : 'flower') : null,
    hat: hatFor(o.theme, hs, o.band)
  });
  return { hs, p, shirt: o.shirt || KID_SHIRT[(hs >>> 9) % KID_SHIRT.length], collar: (hs >>> 15) % 4 };
}
/* ---------- 老師頭像（平面小圖，上方列和選頭像用；教室裡的 3D 老師在 toon.js） ---------- */
const AVATARS = [
  { id: 'longsoft', name: '長髮溫柔', desc: '粉紅針織外套', bg: '#ffe3ec', p: { front: 'middle', back: 'long', hair: '#3a2a25', outfit: 'cardigan', oc: '#f4a3bb' } },
  { id: 'bun', name: '丸子頭', desc: '圓眼鏡', bg: '#dff4ec', p: { front: 'side', back: 'short', extra: 'bun', tie: '#7fcfc0', hair: '#4a3229', glasses: 'round', outfit: 'tee', oc: '#82cdb0' } },
  { id: 'pony', name: '活力馬尾', desc: '運動外套', bg: '#e2ebff', p: { front: 'clump', back: 'short', extra: 'ponytail', tie: '#ffd166', hair: '#2a2126', outfit: 'jacket', oc: '#5d90e8' } },
  { id: 'bobbow', name: '短髮蝴蝶結', desc: '黃色毛衣', bg: '#fff2cc', p: { front: 'straight', back: 'bob', hair: '#5e3f2c', acc: 'bow', accC: '#ef5a7a', outfit: 'sweater', oc: '#f6cd5a' } },
  { id: 'beret', name: '捲髮貝雷帽', desc: '紫色洋裝', bg: '#efe5ff', p: { front: 'curly', hair: '#6b4532', acc: 'beret', accC: '#c94545', outfit: 'dress', oc: '#b99be6' } },
  { id: 'braids', name: '麻花辮', desc: '小花髮夾', bg: '#e9f6dd', p: { front: 'straight', back: 'short', extra: 'braids', tie: '#ff8fab', hair: '#3a2a25', acc: 'flower', outfit: 'tee', oc: '#93d26f' } },
  { id: 'twin', name: '雙馬尾', desc: '天藍上衣', bg: '#e2f1ff', p: { front: 'clump', back: 'short', extra: 'twintails', tie: '#ff8fab', hair: '#4a3229', outfit: 'tee', oc: '#7fb2ee' } },
  { id: 'shoulder', name: '及肩直髮', desc: '薄荷綠外套', bg: '#e6f5ea', p: { front: 'straight', back: 'bob', hair: '#2a2126', outfit: 'cardigan', oc: '#9fd6b5' } },
  { id: 'scarf', name: '暖暖圍巾', desc: '灰色大衣', bg: '#f6ede0', p: { front: 'side', back: 'short', hair: '#2a2126', outfit: 'coat', oc: '#a9aeb5', scarf: '#e2475e' } },
  { id: 'neat', name: '清爽短髮', desc: '襯衫領帶', bg: '#e2ebff', p: { front: 'neat', hair: '#23202b', outfit: 'tie', oc: '#a6c8f0' } },
  { id: 'side', name: '旁分眼鏡', desc: '卡其背心', bg: '#f6ede0', p: { front: 'side', hair: '#3a2a25', glasses: 'square', outfit: 'vest', oc: '#d8c09a' } },
  { id: 'spiky', name: '刺刺頭', desc: '綠色 POLO 衫', bg: '#ddf3e9', p: { front: 'spiky', hair: '#2a2126', outfit: 'polo', oc: '#4fb58b' } },
  { id: 'grandpa', name: '花白捲髮', desc: '落腮鬍', bg: '#fde6d8', p: { front: 'curly', hair: '#a9a6a3', acc: 'beard', outfit: 'sweater', oc: '#e38a50' } },
  { id: 'cap', name: '棒球帽', desc: '運動服', bg: '#ffe3e1', p: { front: 'neat', hair: '#2a2126', acc: 'cap', accC: '#e0483e', outfit: 'sport', oc: '#eef0f6' } },
  { id: 'slick', name: '油頭', desc: '白襯衫領結', bg: '#ece6ff', p: { front: 'slick', hair: '#23202b', outfit: 'bowtie', oc: '#fbfbff' } },
  { id: 'bowl', name: '西瓜皮', desc: '黃色 T 恤', bg: '#fff2cc', p: { front: 'bowl', back: 'bob', hair: '#4a3229', outfit: 'tee', oc: '#f6cd5a' } },
  { id: 'knit', name: '毛線帽', desc: '藍色毛衣', bg: '#ffe3ec', p: { front: 'clump', back: 'short', hair: '#3a2a25', acc: 'knit', accC: '#e2475e', outfit: 'sweater', oc: '#5d90e8' } },
  { id: 'fluffy', name: '蓬蓬頭', desc: '圓眼鏡', bg: '#efe5ff', p: { front: 'curly', hair: '#7a5236', glasses: 'round', outfit: 'tee', oc: '#b88ee2' } },
  { id: 'band', name: '運動髮帶', desc: '橘色運動衫', bg: '#e2ebff', p: { front: 'clump', back: 'short', hair: '#2a2126', acc: 'headband', accC: '#3c7be0', outfit: 'sport', oc: '#f39257' } },
  { id: 'ahoge', name: '呆毛短髮', desc: '橘色襯衫', bg: '#fff0e0', p: { front: 'clump', extra: 'ahoge', hair: '#5e3f2c', outfit: 'tie', oc: '#f3b27c' } }
];
const avatarOf = id => AVATARS.find(a => a.id === id) || AVATARS[0];
const HAT_ACC = ['cap', 'knit', 'beret'];
function teacherLook(a, th, fine, expr) {
  const p = a.p;
  return Object.assign({}, p, { skin: p.skin || SKINS[0], fine, expr, hat: HAT_ACC.includes(p.acc) ? '' : hatFor(th, 1) });
}
// 衣服（全身的座標；脖子下緣在 (45,80)）
function outfitSVG(p, skin) {
  const c = p.oc, dk = shade(c, -.15), o = p.outfit, T = 'M22 172Q19 104 30 88Q45 81 60 88Q71 104 68 172Z';
  const shirtCollar = '<path d="M37 85L45 95L41 84ZM53 85L45 95L49 84Z" fill="#fff"/>';
  const sl = o === 'vest' || o === 'bowtie' ? '#f4f5fb' : shade(c, -.06), stripe = o === 'sport' ? 'M12.5 96V150' : '';
  // 右手（畫面右邊）另外包起來，老師稱讚同學時會舉手揮一揮
  let s = `<rect x="40.5" y="70" width="9" height="16" fill="${skin}"/><rect x="9" y="91" width="14" height="66" rx="7" fill="${sl}"/>`
    + (stripe ? `<path d="${stripe}" stroke="#fff" stroke-width="2.4"/>` : '') + `<circle cx="16" cy="160" r="6.5" fill="${skin}"/>`
    + `<g class="arm"><rect x="67" y="91" width="14" height="66" rx="7" fill="${sl}"/>` + (stripe ? '<path d="M77.5 96V150" stroke="#fff" stroke-width="2.4"/>' : '') + `<circle cx="74" cy="160" r="6.5" fill="${skin}"/></g>`;
  switch (o) {
    case 'cardigan': s += `<path d="${T}" fill="#fff8f0"/><path d="M22 172Q19 104 30 88Q37 85 40 86L42 172Z" fill="${c}"/><path d="M68 172Q71 104 60 88Q53 85 50 86L48 172Z" fill="${c}"/><circle cx="43.5" cy="112" r="1.6" fill="${dk}"/><circle cx="43.5" cy="132" r="1.6" fill="${dk}"/>`; break;
    case 'tie': s += `<path d="${T}" fill="${c}"/>${shirtCollar}<path d="M45 93L41.5 98L45 132L48.5 98Z" fill="#d64545"/>`; break;
    case 'jacket': s += `<path d="${T}" fill="${c}"/><path d="M45 89V172" stroke="${dk}" stroke-width="2"/><path d="M36 86L45 97L54 86" stroke="#fff" stroke-width="2.4" fill="none"/>`; break;
    case 'sweater': s += `<path d="${T}" fill="${c}"/>${shirtCollar}<path d="M24 164H66" stroke="${dk}" stroke-width="4"/>`; break;
    case 'dress': s += `<path d="M24 196L30 140Q24 104 30 88Q45 81 60 88Q66 104 60 140L66 196Z" fill="${c}"/><path d="M45 89C39 97 31 95 32 88Q38 85 45 89ZM45 89C51 97 59 95 58 88Q52 85 45 89Z" fill="#fff"/><path d="M30 140H60" stroke="${dk}" stroke-width="3"/>`; break;
    case 'polo': s += `<path d="${T}" fill="${c}"/><path d="M36 86L45 93L54 86L50 83L45 88L40 83Z" fill="${dk}"/><circle cx="45" cy="100" r="1.5" fill="#fff"/><circle cx="45" cy="108" r="1.5" fill="#fff"/>`; break;
    case 'vest': s += `<path d="${T}" fill="#f4f5fb"/><path d="M24 172Q22 112 31 92L45 122L59 92Q68 112 66 172Z" fill="${c}"/>${shirtCollar}`; break;
    case 'sport': s += `<path d="${T}" fill="${c}"/><path d="M45 89V172" stroke="${dk}" stroke-width="2"/><path d="M35 86Q45 92 55 86" stroke="${dk}" stroke-width="3" fill="none"/>`; break;
    case 'bowtie': s += `<path d="${T}" fill="#f4f5fb"/>${shirtCollar}<path d="M45 94L36 89V99ZM45 94L54 89V99Z" fill="#2d3a6b"/><circle cx="45" cy="94" r="2.2" fill="#1f2a4f"/><circle cx="45" cy="112" r="1.4" fill="#bbc"/><circle cx="45" cy="128" r="1.4" fill="#bbc"/>`; break;
    case 'coat': s += `<path d="${T}" fill="${c}"/><path d="M45 92L36 120L45 172M45 92L54 120" stroke="${dk}" stroke-width="2" fill="none"/><path d="M31 84Q45 96 59 84L59 93Q45 105 31 93Z" fill="${p.scarf}"/><path d="M50 94L56 126L47 123Z" fill="${p.scarf}"/>`; break;
    default: s += `<path d="${T}" fill="${c}"/><path d="M38 85Q45 93 52 85" fill="${skin}"/>`;
  }
  return s;
}
function avatarSVG(id, fine = true) {
  const a = avatarOf(id), p = teacherLook(a, 'none', fine, false), hd = headSVG(p);
  return `<svg viewBox="-40 -40 80 80"><circle r="40" fill="${a.bg}"/><g transform="translate(0 -5) scale(.8)">${hd.back}</g>`
    + `<g transform="translate(0 21) scale(.72) translate(-45 -80)">${outfitSVG(a.p, p.skin)}</g><g transform="translate(0 -5) scale(.8)">${hd.front}</g></svg>`;
}

/* ---------- 老師頭像與稱呼 ---------- */
const TeacherUI = {
  name() { return (D.info.teacher && D.info.teacher.name) || '老師'; },
  chip(el) { el.replaceChildren(h('span', { class: 'tc-mini', innerHTML: avatarSVG(D.info.teacher.avatar, false) }), h('span', null, this.name())); },
  open() {
    modal('老師頭像', c => {
      const t = D.info.teacher;
      c.body.append(h('label', { class: 'lbl' }, '怎麼稱呼老師'),
        h('input', { class: 'inp', value: t.name || '', placeholder: '例：林老師', maxlength: 10, oninput: e => { t.name = e.target.value.trim(); save(); renderTop(); } }),
        h('div', { class: 'av-grid' }, AVATARS.map(a => h('button', {
          class: 'av-card' + (t.avatar === a.id ? ' on' : ''), 'data-id': a.id,
          onclick: () => { t.avatar = a.id; save(); $$('.av-card', c.body).forEach(b => b.classList.toggle('on', b.dataset.id === a.id)); refresh(); }
        }, h('span', { class: 'av-pic', innerHTML: avatarSVG(a.id) }), h('b', { class: 'av-name' }, a.name), h('small', null, a.desc)))));
      c.foot.append(h('button', { class: 'btn pri big', onclick: () => c.close() }, '完成・回到教室'));
    }, { cls: 'wide' });
  }
};
