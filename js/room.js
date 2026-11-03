'use strict';
/* 3D 教室：用 CSS 3D 畫出教室、桌椅、同學和老師；名牌另外浮在最上層（字才清楚、好點）。另有佈景、冷氣、小小宣導員。
   座標都用「地板座標」：x 向右、y 往前（靠近鏡頭＝講桌那邊）、z 往上；鏡頭站在講台看教室，所以第 1 排在最前面、左右和老師看到的一樣。
   人物圖案在 art.js。 */

// 2026-11-03：課桌加大（DW、DD）、同學頭縮小；講桌縮小（TDW、TDD、TDH）。同日第二次：座位往中間聚攏（CW、CD 縮小，牆邊走道 SIDE、BACK 加寬），名牌靠 placeLabels 避開不重疊
const RM = { CW: 170, CD: 172, SIDE: 124, BACK: 150, FRONT: 200, WH: 300, DW: 112, DD: 58, DH: 56, TD: 84, TDW: 160, TDD: 58, TDH: 74, TILT: 52, KW: 102, KH: 186, SILL: 106 };
const svgURL = s => 'url("data:image/svg+xml,' + encodeURIComponent(s) + '")';
const THEMES = {
  auto: { name: '自動', desc: '依日期換節日佈景', sw: ['#e8e1d3', '#9fd3c1', '#f6b93b'] },
  none: { name: '一般教室', desc: '平常的教室', sw: ['#9fd3c1', '#f7efdf', '#f6b93b'] },
  moon: { name: '中秋節', desc: '月亮・柚子帽・燈籠', sw: ['#2d3561', '#ffe28a', '#c2d462'] },
  halloween: { name: '萬聖節', desc: '南瓜・蝙蝠・巫師帽', sw: ['#6b3fa0', '#f28c28', '#2b2b2b'] },
  sports: { name: '運動會', desc: '萬國旗・小組頭巾・獎盃', sw: ['#e8574a', '#f7f3ea', '#3c7be0'] },
  xmas: { name: '聖誕節', desc: '聖誕樹・花圈・聖誕帽', sw: ['#2e8b57', '#d93838', '#f7f1e6'] },
  cny: { name: '農曆新年', desc: '紅燈籠・春聯・橘子', sw: ['#d62828', '#f6c445', '#8a1c1c'] },
  lantern: { name: '元宵節', desc: '花燈・猜燈謎・湯圓', sw: ['#f28c38', '#f6c445', '#9b59d0'] },
  kids: { name: '兒童節', desc: '氣球・彩旗・派對帽', sw: ['#4fb3e8', '#ffd166', '#ef476f'] },
  mom: { name: '母親節', desc: '康乃馨・感謝有您', sw: ['#ef7f9f', '#fbd3df', '#d63a5c'] },
  dragon: { name: '端午節', desc: '龍舟・粽子・香包', sw: ['#3f8f4f', '#f2c14e', '#d64545'] },
  lunch: { name: '午餐時間', desc: '餐盤・餐車・分類桶', sw: ['#ef8a3c', '#f7ead3', '#6aae4d'] },
  reading: { name: '閱讀時光', desc: '打開的書・閱讀角', sw: ['#5b8c5f', '#f4e4c8', '#e08a4f'] },
  exam: { name: '考試', desc: '安靜作答・考試中', sw: ['#4f6f85', '#eef2f5', '#8aa3b4'] }
};
const THEME_ICON = { auto: '🗓', none: '🏫', moon: '🥮', halloween: '🎃', sports: '🏃', xmas: '🎄', cny: '🧧', lantern: '🏮', kids: '🎈', mom: '💐', dragon: '🐉', lunch: '🍱', reading: '📖', exam: '📝' };
const LUNAR = {
  cny: ['2025-01-29', '2026-02-17', '2027-02-06', '2028-01-26', '2029-02-13', '2030-02-03', '2031-01-23', '2032-02-11'],
  moon: ['2025-10-06', '2026-09-25', '2027-09-15', '2028-10-03', '2029-09-22', '2030-09-12', '2031-10-01', '2032-09-19'],
  dragon: ['2025-05-31', '2026-06-19', '2027-06-09', '2028-05-28', '2029-06-16', '2030-06-05', '2031-06-24', '2032-06-12']
};
function mothersDay(y) { const d = new Date(y, 4, 1); return new Date(y, 4, 8 + (7 - d.getDay()) % 7); }
function autoTheme(d = new Date()) {
  const k = dateKey(d), md = k.slice(5);
  const near = (list, before, after) => list.some(x => { const n = daysBetween(x, k); return n >= -before && n <= after; });
  if (near(LUNAR.cny, 14, 7)) return 'cny';
  if (near(LUNAR.cny.map(x => { const t = parseKey(x); t.setDate(t.getDate() + 14); return dateKey(t); }), 6, 1)) return 'lantern';
  if (near(LUNAR.moon, 10, 1)) return 'moon';
  if (near(LUNAR.dragon, 7, 1)) return 'dragon';
  if (near([dateKey(mothersDay(d.getFullYear()))], 6, 0)) return 'mom';
  if (md >= '10-20' && md <= '11-01') return 'halloween';
  if (md >= '12-10' && md <= '12-26') return 'xmas';
  if (md >= '03-30' && md <= '04-05') return 'kids';
  return 'none';
}
// 佈景卡片（設定和 3D 畫面左下角都用這個）
function themeCards(onPick) {
  const cur = D.info.theme || 'auto', at = autoTheme();
  return h('div', { class: 'th-grid' }, Object.entries(THEMES).map(([k, t]) => h('button', { class: 'th-card' + (cur === k ? ' on' : ''), onclick: () => { D.info.theme = k; save(); refresh(); onPick && onPick(); } },
    h('span', { class: 'th-sw' }, t.sw.map(c => h('i', { style: { background: c } }))),
    h('b', { class: 'th-name' }, k === 'auto' ? '自動換' : t.name), h('small', null, k === 'auto' ? '依日期換節日，現在是' + THEMES[at].name : t.desc))));
}

/* ---------- 3D 擺放（matrix3d：原點、元素的 x 軸、y 軸、法線各對到地板座標的哪個方向） ---------- */
function m3(o, ex, ey, ez) { return 'matrix3d(' + [...ex, 0, ...ey, 0, ...ez, 0, ...o, 1].map(v => +v.toFixed(3)).join(',') + ')'; }
const flatAt = (x, y, z = 0) => m3([x, y, z], [1, 0, 0], [0, 1, 0], [0, 0, 1]);          // 平放：左上角在 (x,y)，離地 z
const standAt = (x, y, ht) => m3([x, y, ht], [1, 0, 0], [0, 0, -1], [0, 1, 0]);         // 直立朝前：左下角在 (x,y)，高 ht
const faceR = (x, yFront, ht) => m3([x, yFront, ht], [0, -1, 0], [0, 0, -1], [1, 0, 0]); // 朝右的面，由前往後畫
const faceL = (x, yBack, ht) => m3([x, yBack, ht], [0, 1, 0], [0, 0, -1], [-1, 0, 0]);   // 朝左的面，由後往前畫
const backAt = (xRight, y, ht) => m3([xRight, y, ht], [-1, 0, 0], [0, 0, -1], [0, -1, 0]); // 直立朝後：右下角在 (x,y)
// 立牌：底邊中點在 (x,y,z)，轉向鏡頭（yaw 度）並往後仰 deg 度；yaw=0 是從講台看
function billAt(x, y, w, ht, deg, z, yaw) {
  const a = deg * Math.PI / 180, s = Math.sin(a), c = Math.cos(a), Y = yaw * Math.PI / 180, cx = Math.sin(Y), cy = Math.cos(Y);
  return m3([x - cy * w / 2 - cx * s * ht, y + cx * w / 2 - cy * s * ht, z + ht * c], [cy, -cx, 0], [cx * s, cy * s, -c], [cx * c, cy * c, s]);
}
// 鏡頭：yaw 左右轉、tilt 俯角（越小越從上面看）、zoom 放大；記在這台電腦
const EYE0 = { yaw: 0, tilt: RM.TILT, zoom: 1 };
const EYES = { teacher: { yaw: 0, tilt: RM.TILT }, student: { yaw: 180, tilt: 64 } };

/* ---------- 教室裡的東西（全部自己畫的 SVG） ---------- */
const BAT_PATH = 'M30 8C24 6 14 2 2 6c6 3 7 7 6 11 5-4 10-3 13 1 2-5 6-6 9-4 3-2 7-1 9 4 3-4 8-5 13-1-1-4 0-8 6-11-12-4-22 0-28 2zM26 7l1-6 2 4h2l2-4 1 6z';
const ART = {
  plant: '<svg viewBox="0 0 64 120"><path d="M32 70C10 60 6 30 14 18C22 34 30 50 32 70Z" fill="#4f9d5d"/><path d="M32 70C52 58 60 34 52 20C42 36 34 50 32 70Z" fill="#5fb36c"/><path d="M32 72C28 44 30 20 34 4C40 24 38 48 32 72Z" fill="#6cc277"/><path d="M14 72H50L45 118H19Z" fill="#d9774e"/><rect x="11" y="68" width="42" height="10" rx="3" fill="#e88a5f"/></svg>',
  books: '<svg viewBox="0 0 60 34"><rect x="2" y="22" width="56" height="10" rx="2" fill="#4f6fd8"/><rect x="6" y="12" width="48" height="10" rx="2" fill="#e8574a"/><rect x="10" y="2" width="40" height="10" rx="2" fill="#43a865"/><path d="M6 25H54M10 15H50M14 5H46" stroke="#fff" stroke-opacity=".6"/></svg>',
  remote: '<svg viewBox="0 0 22 40"><rect x="2" y="1" width="18" height="38" rx="6" fill="#f4f6f8" stroke="#b8c0c8" stroke-width="1.5"/><rect x="5" y="5" width="12" height="8" rx="2" fill="#9fd8c8"/><circle cx="11" cy="20" r="3" fill="#e8574a"/><rect x="6" y="27" width="4" height="3" rx="1" fill="#b8c0c8"/><rect x="12" y="27" width="4" height="3" rx="1" fill="#b8c0c8"/><rect x="6" y="32" width="4" height="3" rx="1" fill="#b8c0c8"/><rect x="12" y="32" width="4" height="3" rx="1" fill="#b8c0c8"/></svg>',
  milk: '<svg viewBox="0 0 16 24"><path d="M2 7L5 2H11L14 7Z" fill="#e9eef2"/><rect x="2" y="7" width="12" height="16" fill="#e23b3b"/><rect x="2" y="12" width="12" height="6" fill="#fff"/><path d="M5 15h6" stroke="#e23b3b" stroke-width="1.4"/></svg>',
  pumpkin: '<svg viewBox="0 0 64 56"><path d="M32 12C31 6 34 2 39 1" stroke="#4d7c2a" stroke-width="4" fill="none" stroke-linecap="round"/><ellipse cx="19" cy="34" rx="16" ry="20" fill="#e5762a"/><ellipse cx="45" cy="34" rx="16" ry="20" fill="#e5762a"/><ellipse cx="32" cy="34" rx="16" ry="21" fill="#f28c38"/><path d="M20 30L27 26L26 34ZM44 30L37 26L38 34Z" fill="#5a2a0c"/><path d="M19 40Q32 51 45 40L41 43L37 41L32 45L27 41L23 43Z" fill="#5a2a0c"/></svg>',
  ghost: '<svg viewBox="0 0 40 46"><path d="M4 44V20C4 6 36 6 36 20V44L30 39L24 44L18 39L12 44L8 40Z" fill="#fff" stroke="#d8d8e8"/><ellipse cx="15" cy="21" rx="3" ry="4" fill="#333"/><ellipse cx="25" cy="21" rx="3" ry="4" fill="#333"/><ellipse cx="20" cy="30" rx="3" ry="2.4" fill="#333"/></svg>',
  bats: '<svg viewBox="0 0 90 60"><path d="' + BAT_PATH + '" fill="#2c2238"/><g transform="translate(40 32) scale(.75)"><path d="' + BAT_PATH + '" fill="#2c2238"/></g></svg>',
  tree: '<svg viewBox="0 0 140 240"><rect x="60" y="196" width="20" height="34" fill="#8a5a33"/><path d="M70 30L120 110H95L132 170H100L138 210H2L40 170H8L45 110H20Z" fill="#2e8b57"/><path d="M70 30L95 70H45Z" fill="#37a067"/><path d="M70 8L75 22H90L78 31L83 46L70 37L57 46L62 31L50 22H65Z" fill="#f6c445"/><circle cx="58" cy="98" r="6" fill="#e63946"/><circle cx="88" cy="128" r="6" fill="#f6c445"/><circle cx="50" cy="152" r="6" fill="#4ea8de"/><circle cx="96" cy="186" r="7" fill="#e63946"/><circle cx="38" cy="196" r="6" fill="#f6c445"/><circle cx="76" cy="168" r="5" fill="#fff"/></svg>',
  gift: c => '<svg viewBox="0 0 50 46"><rect x="4" y="16" width="42" height="28" rx="3" fill="' + c + '"/><rect x="1" y="10" width="48" height="10" rx="3" fill="' + c + '"/><rect x="21" y="10" width="8" height="34" fill="#f6c445"/><path d="M25 10C16 0 8 4 14 10ZM25 10C34 0 42 4 36 10Z" fill="#f6c445"/></svg>',
  wreath: '<svg viewBox="0 0 80 84"><circle cx="40" cy="40" r="28" fill="none" stroke="#2e8b57" stroke-width="16"/><circle cx="40" cy="40" r="28" fill="none" stroke="#37a067" stroke-width="6" stroke-dasharray="6 8"/><circle cx="22" cy="26" r="4" fill="#e63946"/><circle cx="58" cy="30" r="4" fill="#e63946"/><circle cx="56" cy="58" r="4" fill="#e63946"/><path d="M40 64L30 80L38 75L40 82L42 75L50 80Z" fill="#d62828"/><ellipse cx="40" cy="64" rx="9" ry="6" fill="#d62828"/></svg>',
  stocking: '<svg viewBox="0 0 50 70"><path d="M14 14H38V44C38 56 30 62 20 62C10 62 4 56 6 50C8 44 14 44 14 40Z" fill="#d62828"/><rect x="11" y="6" width="30" height="12" rx="3" fill="#fff"/></svg>',
  lantern: '<svg viewBox="0 0 54 100"><path d="M27 0V12" stroke="#7a4a1d" stroke-width="2"/><rect x="15" y="10" width="24" height="7" rx="2" fill="#f6c445"/><ellipse cx="27" cy="44" rx="25" ry="28" fill="#d62828"/><path d="M27 16C14 30 14 58 27 72M27 16C40 30 40 58 27 72" stroke="#a4161a" stroke-width="2" fill="none"/><rect x="15" y="70" width="24" height="7" rx="2" fill="#f6c445"/><path d="M21 78V98M27 78V100M33 78V98" stroke="#f6c445" stroke-width="2.5"/></svg>',
  plantern: c => '<svg viewBox="0 0 44 74"><path d="M22 0V10" stroke="#7a4a1d" stroke-width="2"/><rect x="13" y="9" width="18" height="5" rx="2" fill="#7a4a1d"/><ellipse cx="22" cy="34" rx="20" ry="21" fill="' + c + '"/><path d="M6 26H38M4 34H40M6 42H38" stroke="#fff" stroke-opacity=".45" stroke-width="2"/><rect x="13" y="54" width="18" height="5" rx="2" fill="#7a4a1d"/><path d="M22 59V72" stroke="#e63946" stroke-width="3"/></svg>',
  flantern: c => '<svg viewBox="0 0 50 80"><path d="M25 0V10" stroke="#7a4a1d" stroke-width="2"/><path d="M25 10C8 14 2 28 6 42C10 56 18 62 25 62C32 62 40 56 44 42C48 28 42 14 25 10Z" fill="' + c + '"/><path d="M25 12C16 24 16 50 25 61M25 12C34 24 34 50 25 61M8 30Q25 38 42 30" stroke="#fff" stroke-opacity=".5" stroke-width="1.6" fill="none"/><circle cx="25" cy="37" r="5" fill="#ffe28a"/><path d="M19 63V78M25 63V80M31 63V78" stroke="#e63946" stroke-width="2"/></svg>',
  riddles: '<svg viewBox="0 0 96 86"><path d="M0 4Q48 12 96 4" stroke="#8a6a4f" stroke-width="2" fill="none"/>' + ['#f6c445', '#ff9fb8', '#9fd8ff', '#b8f28a'].map((c, i) => '<rect x="' + (6 + i * 23) + '" y="7" width="17" height="64" rx="2" fill="' + c + '"/><text x="' + (14.5 + i * 23) + '" y="46" font-size="15" font-weight="700" text-anchor="middle" fill="#8a1c1c">謎</text>').join('') + '</svg>',
  tangyuan: '<svg viewBox="0 0 50 34"><path d="M4 14H46Q44 32 25 32Q6 32 4 14Z" fill="#fff" stroke="#e0d6c4"/><ellipse cx="25" cy="14" rx="21" ry="5" fill="#f5e6c8"/><circle cx="18" cy="12" r="5" fill="#fff"/><circle cx="29" cy="11" r="5" fill="#ffd1dc"/><circle cx="24" cy="15" r="5" fill="#fff"/><path d="M8 22Q25 26 42 22" stroke="#e05a5a" stroke-width="2" fill="none"/></svg>',
  carnations: '<svg viewBox="0 0 60 90"><path d="M30 86L24 40M30 86L36 40M30 86L30 34" stroke="#4f9d5d" stroke-width="2.4"/><path d="M14 60L46 60L30 88Z" fill="#fbd3df"/>' + [[22, 32, '#e63950'], [38, 32, '#ff7a9c'], [30, 22, '#d63a5c']].map(([x, y, c]) => '<circle cx="' + x + '" cy="' + y + '" r="10" fill="' + c + '"/><circle cx="' + x + '" cy="' + y + '" r="6" fill="' + shade(c, .25) + '"/>').join('') + '</svg>',
  vase: '<svg viewBox="0 0 40 70"><path d="M20 40V16M20 40L12 20M20 40L28 22" stroke="#4f9d5d" stroke-width="2"/><circle cx="20" cy="14" r="7" fill="#e63950"/><circle cx="11" cy="19" r="6" fill="#ff7a9c"/><circle cx="29" cy="21" r="6" fill="#d63a5c"/><path d="M10 38H30L27 68H13Z" fill="#9fd3e8"/></svg>',
  zongzi: '<svg viewBox="0 0 60 44"><path d="M6 42L18 16L30 42Z" fill="#5e9e3c"/><path d="M30 42L42 16L54 42Z" fill="#6aa84f"/><path d="M17 32L30 6L43 32Z" fill="#4f8f32"/><path d="M10 34L26 34M34 34L50 34M21 24L39 24" stroke="#d9b56c" stroke-width="2"/></svg>',
  sachets: '<svg viewBox="0 0 70 70">' + [[18, '#e8574a'], [52, '#f6c445']].map(([x, c]) => '<path d="M' + x + ' 0V16" stroke="#d62828" stroke-width="1.6"/><path d="M' + x + ' 16L' + (x - 12) + ' 32L' + x + ' 48L' + (x + 12) + ' 32Z" fill="' + c + '"/><circle cx="' + x + '" cy="32" r="4" fill="#fff" opacity=".6"/><path d="M' + (x - 4) + ' 48V66M' + x + ' 48V68M' + (x + 4) + ' 48V66" stroke="#d62828" stroke-width="1.6"/>').join('') + '</svg>',
  boat: '<svg viewBox="0 0 140 46"><path d="M6 24Q70 40 128 24L124 34Q70 46 10 34Z" fill="#e8574a"/><path d="M124 27C130 18 128 8 137 3C139 12 135 21 129 29Z" fill="#2e8b57"/><circle cx="133" cy="9" r="1.6" fill="#fff"/><path d="M8 27C3 19 5 10 1 5C7 9 9 18 13 27Z" fill="#2e8b57"/>' + [30, 44, 58, 82, 96, 110].map((x, i) => '<circle cx="' + x + '" cy="22" r="5" fill="' + ['#ffd166', '#7fd1ff', '#ff9fb8'][i % 3] + '"/>').join('') + '<rect x="65" y="12" width="12" height="12" rx="3" fill="#a4161a"/></svg>',
  herbs: '<svg viewBox="0 0 40 120"><path d="M20 10L14 118M20 10L26 116M20 10L20 118" stroke="#3f7d3a" stroke-width="4" stroke-linecap="round"/><path d="M20 30C6 40 4 60 10 80M20 30C34 40 36 60 30 80" stroke="#6aa84f" stroke-width="6" fill="none" stroke-linecap="round"/><rect x="13" y="18" width="14" height="8" rx="2" fill="#d62828"/></svg>',
  trophy: '<svg viewBox="0 0 50 60"><path d="M12 6H38V20C38 30 31 36 25 36C19 36 12 30 12 20Z" fill="#f6c445"/><path d="M12 10H5C5 20 10 24 14 24M38 10H45C45 20 40 24 36 24" stroke="#f6c445" stroke-width="4" fill="none"/><rect x="21" y="36" width="8" height="10" fill="#e0a82e"/><rect x="13" y="46" width="24" height="10" rx="2" fill="#8a5a33"/><path d="M25 12L27 17H32L28 20L29.5 25L25 22L20.5 25L22 20L18 17H23Z" fill="#fff6c8"/></svg>',
  megaphone: '<svg viewBox="0 0 60 40"><path d="M8 14H18L44 4V36L18 26H8Z" fill="#e8574a"/><rect x="4" y="13" width="8" height="14" rx="2" fill="#555"/><path d="M50 12Q56 20 50 28M54 7Q63 20 54 33" stroke="#e8574a" stroke-width="3" fill="none" stroke-linecap="round"/></svg>',
  medal: '<svg viewBox="0 0 44 64"><path d="M10 0L22 26L34 0H26L22 10L18 0Z" fill="#3c7be0"/><circle cx="22" cy="42" r="16" fill="#f6c445"/><circle cx="22" cy="42" r="11" fill="#ffe28a"/><text x="22" y="48" font-size="15" font-weight="700" text-anchor="middle" fill="#b8860b">1</text></svg>',
  balloons: '<svg viewBox="0 0 90 220"><path d="M45 218C40 170 22 130 22 80M45 218C46 160 50 120 48 64M45 218C52 170 70 140 70 92" stroke="#888" stroke-width="1.5" fill="none"/><ellipse cx="22" cy="58" rx="20" ry="25" fill="#ef476f"/><ellipse cx="48" cy="40" rx="20" ry="25" fill="#ffd166"/><ellipse cx="70" cy="70" rx="19" ry="24" fill="#06d6a0"/><ellipse cx="15" cy="50" rx="5" ry="8" fill="#fff" opacity=".4"/><ellipse cx="41" cy="32" rx="5" ry="8" fill="#fff" opacity=".4"/><ellipse cx="63" cy="62" rx="5" ry="8" fill="#fff" opacity=".4"/></svg>',
  star: '<svg viewBox="0 0 60 60"><path d="M30 4L37 22H56L41 34L47 53L30 42L13 53L19 34L4 22H23Z" fill="#ffd166" stroke="#f4a261" stroke-width="2"/></svg>',
  pomelos: '<svg viewBox="0 0 80 60"><circle cx="22" cy="42" r="17" fill="#b9cf5c"/><circle cx="56" cy="42" r="17" fill="#c5d86d"/><circle cx="39" cy="24" r="17" fill="#cfe07a"/><path d="M39 8V3" stroke="#5d7d22" stroke-width="3"/><path d="M39 5C45-1 52 1 54 5C48 8 43 8 39 5Z" fill="#6aa84f"/></svg>',
  oranges: '<svg viewBox="0 0 70 50"><circle cx="20" cy="24" r="12" fill="#f39c12"/><circle cx="50" cy="24" r="12" fill="#f39c12"/><circle cx="35" cy="17" r="12" fill="#f5a623"/><path d="M35 6C39 1 45 2 46 5C42 7 38 7 35 6Z" fill="#4f9d5d"/><path d="M4 28H66L58 48H12Z" fill="#b5651d"/><path d="M8 34H62M10 41H60" stroke="#8a4b14" stroke-width="2"/></svg>',
  cart: '<svg viewBox="0 0 120 100"><rect x="8" y="36" width="104" height="44" rx="5" fill="#c8d0d8" stroke="#9aa4ae" stroke-width="2"/><path d="M8 58H112" stroke="#9aa4ae" stroke-width="2"/><circle cx="22" cy="90" r="8" fill="#555"/><circle cx="98" cy="90" r="8" fill="#555"/>' + [[16, '#e8574a'], [46, '#f6c445'], [76, '#4fb58b']].map(([x, c]) => '<rect x="' + x + '" y="12" width="26" height="24" rx="3" fill="#dfe5ea" stroke="#9aa4ae"/><rect x="' + (x - 2) + '" y="8" width="30" height="6" rx="3" fill="' + c + '"/>').join('') + '</svg>',
  bins: '<svg viewBox="0 0 130 80">' + [[4, '#4f9d5d', '廚餘'], [46, '#3c7be0', '回收'], [88, '#8a939c', '一般']].map(([x, c, t]) => '<rect x="' + x + '" y="10" width="38" height="66" rx="4" fill="' + c + '"/><rect x="' + (x - 2) + '" y="4" width="42" height="9" rx="3" fill="' + shade(c, -.2) + '"/><text x="' + (x + 19) + '" y="48" font-size="12" font-weight="700" text-anchor="middle" fill="#fff">' + t + '</text>').join('') + '</svg>',
  shelf: '<svg viewBox="0 0 100 130"><rect x="2" y="2" width="96" height="126" rx="3" fill="#b5844e"/>' + [8, 48, 88].map(y => '<rect x="8" y="' + y + '" width="84" height="34" fill="#5e3f22"/>' + [0, 1, 2, 3, 4, 5, 6].map(i => '<rect x="' + (10 + i * 12) + '" y="' + (y + 4 + (i % 3) * 2) + '" width="10" height="' + (30 - (i % 3) * 2) + '" fill="' + ['#e8574a', '#f6c445', '#4fb58b', '#5d90e8', '#b88ee2', '#f39257', '#7fcfc0'][(i + y) % 7] + '"/>').join('')).join('') + '</svg>',
  beanbag: '<svg viewBox="0 0 70 50"><path d="M6 46C0 30 10 8 34 6C58 4 70 26 64 46Z" fill="#f39257"/><path d="M14 30Q34 20 56 30" stroke="#fff" stroke-opacity=".4" stroke-width="3" fill="none"/></svg>'
};
const WIN_ART = {
  none: '<svg viewBox="0 0 160 140" preserveAspectRatio="none"><g fill="#fff" opacity=".9"><ellipse cx="40" cy="40" rx="22" ry="10"/><ellipse cx="55" cy="34" rx="16" ry="12"/><ellipse cx="112" cy="84" rx="24" ry="10"/><ellipse cx="124" cy="78" rx="14" ry="11"/></g></svg>',
  halloween: '<svg viewBox="0 0 160 140" preserveAspectRatio="none"><rect width="160" height="140" fill="#3b3363"/><circle cx="108" cy="44" r="24" fill="#fff3b0"/><circle cx="100" cy="38" r="4" fill="#eadf9a"/><circle cx="115" cy="52" r="3" fill="#eadf9a"/><g transform="translate(18 70) scale(.8)"><path d="' + BAT_PATH + '" fill="#1c1626"/></g></svg>',
  xmas: '<svg viewBox="0 0 160 140" preserveAspectRatio="none"><rect width="160" height="140" fill="#9cc7e4"/><path d="M0 120Q40 108 80 118T160 114V140H0Z" fill="#fff"/><g stroke="#fff" stroke-width="2" stroke-linecap="round"><path d="M40 30v16M32 38h16M34 32l12 12M46 32l-12 12"/><path d="M110 50v12M104 56h12M105 51l10 10M115 51l-10 10"/><path d="M76 80v10M71 85h10"/></g></svg>',
  cny: '<svg viewBox="0 0 160 140" preserveAspectRatio="none"><circle cx="80" cy="70" r="40" fill="#d62828"/><circle cx="80" cy="70" r="33" fill="none" stroke="#f6c445" stroke-width="2" stroke-dasharray="4 4"/><text x="80" y="84" font-size="38" text-anchor="middle" fill="#f6c445" font-weight="700">春</text></svg>',
  moon: '<svg viewBox="0 0 160 140" preserveAspectRatio="none"><rect width="160" height="140" fill="#2d3561"/><circle cx="80" cy="64" r="38" fill="#ffe28a"/><g fill="#d9b85e"><ellipse cx="76" cy="80" rx="12" ry="9"/><circle cx="88" cy="70" r="6.5"/><ellipse cx="86" cy="57" rx="2.4" ry="8"/><ellipse cx="91" cy="58" rx="2.4" ry="8"/></g><g fill="#fff"><circle cx="30" cy="24" r="1.5"/><circle cx="132" cy="30" r="1.5"/><circle cx="140" cy="110" r="1.5"/><circle cx="22" cy="100" r="1.2"/></g></svg>',
  lantern: '<svg viewBox="0 0 160 140" preserveAspectRatio="none"><rect width="160" height="140" fill="#273056"/>' + [[34, '#f28c38'], [80, '#d62828'], [126, '#9b59d0']].map(([x, c]) => '<path d="M' + x + ' 0V30" stroke="#ccc"/><ellipse cx="' + x + '" cy="46" rx="15" ry="17" fill="' + c + '"/><ellipse cx="' + x + '" cy="46" rx="6" ry="8" fill="#ffe28a" opacity=".7"/>').join('') + '</svg>',
  kids: '<svg viewBox="0 0 160 140" preserveAspectRatio="none"><g fill="none" stroke-width="9"><path d="M20 120A60 60 0 0 1 140 120" stroke="#ef476f"/><path d="M29 120A51 51 0 0 1 131 120" stroke="#ffd166"/><path d="M38 120A42 42 0 0 1 122 120" stroke="#06d6a0"/><path d="M47 120A33 33 0 0 1 113 120" stroke="#118ab2"/></g></svg>',
  sports: '<svg viewBox="0 0 160 140" preserveAspectRatio="none"><circle cx="120" cy="34" r="18" fill="#ffd166"/><g stroke="#ffd166" stroke-width="3"><path d="M120 6v-6M148 34h8M140 14l5-5M100 14l-5-5"/></g><g fill="#fff" opacity=".9"><ellipse cx="44" cy="70" rx="24" ry="10"/><ellipse cx="58" cy="64" rx="15" ry="11"/></g></svg>',
  mom: '<svg viewBox="0 0 160 140" preserveAspectRatio="none"><rect width="160" height="140" fill="#ffe1ea"/>' + [[40, 40, 1], [112, 56, 1.3], [70, 100, .9]].map(([x, y, k]) => '<path transform="translate(' + x + ' ' + y + ') scale(' + k + ')" d="M0 8C-14-4-8-16 0-8C8-16 14-4 0 8Z" fill="#ef7f9f"/>').join('') + '</svg>',
  dragon: '<svg viewBox="0 0 160 140" preserveAspectRatio="none"><circle cx="128" cy="30" r="15" fill="#ffd166"/><path d="M0 104Q20 96 40 104T80 104T120 104T160 104V140H0Z" fill="#5aa9e6"/><path d="M0 116Q20 108 40 116T80 116T120 116T160 116" stroke="#fff" stroke-width="2" fill="none" opacity=".7"/></svg>'
};
// 運動會的萬國旗（簡化的花樣，不是特定國家）
function flagsSVG(w) {
  const n = Math.max(4, Math.round(w / 42)), Y = t => 6 + 88 * t * (1 - t), r1 = v => +v.toFixed(1);
  const pat = [
    (x, y) => `<rect x="${x}" y="${y}" width="28" height="7" fill="#e8574a"/><rect x="${x}" y="${y + 7}" width="28" height="6" fill="#fff"/><rect x="${x}" y="${y + 13}" width="28" height="7" fill="#3c7be0"/>`,
    (x, y) => `<rect x="${x}" y="${y}" width="28" height="20" fill="#fff"/><circle cx="${x + 14}" cy="${y + 10}" r="5.5" fill="#e8574a"/>`,
    (x, y) => `<rect x="${x}" y="${y}" width="9.4" height="20" fill="#43a865"/><rect x="${x + 9.4}" y="${y}" width="9.3" height="20" fill="#fff"/><rect x="${x + 18.7}" y="${y}" width="9.3" height="20" fill="#e8574a"/>`,
    (x, y) => `<rect x="${x}" y="${y}" width="28" height="20" fill="#3c7be0"/><path d="M${x} ${y + 10}H${x + 28}M${x + 10} ${y}V${y + 20}" stroke="#f6c445" stroke-width="4"/>`,
    (x, y) => `<rect x="${x}" y="${y}" width="28" height="20" fill="#e8574a"/><path d="M${x + 14} ${y + 4}l1.8 4h4.2l-3.4 2.6 1.3 4.2-3.9-2.6-3.9 2.6 1.3-4.2-3.4-2.6h4.2Z" fill="#f6c445"/>`,
    (x, y) => `<rect x="${x}" y="${y}" width="28" height="20" fill="#f6c445"/><path d="M${x} ${y + 20}L${x + 28} ${y}V${y + 20}Z" fill="#43a865"/>`
  ];
  let s = '<svg viewBox="0 0 ' + w + ' 70" width="' + w + '" height="70"><path d="M0 6Q' + w / 2 + ' 50 ' + w + ' 6" stroke="#8a6a4f" stroke-width="2" fill="none"/>';
  for (let i = 0; i < n; i++) { const t = (i + .5) / n; s += pat[i % pat.length](r1(t * w - 14), r1(Y(t))); }
  return s + '</svg>';
}
// 桌上的東西（平放在桌面上；桌面 104×54）
const DESK_ART = {
  book: '<svg viewBox="0 0 104 54"><g transform="translate(6 9)"><path d="M0 4L17 1L34 4V34L17 31L0 34Z" fill="#fff" stroke="#c9b48e"/><path d="M17 1V31" stroke="#c9b48e"/><path d="M4 10H14M4 15H14M4 20H13M20 10H30M20 15H30M20 20H28" stroke="#b8c4d6" stroke-width="1.2"/></g><g transform="rotate(-18 86 20)"><rect x="72" y="18" width="26" height="4" rx="1" fill="#f2c14e"/><path d="M98 18L103 20L98 22Z" fill="#f4d9b0"/><rect x="70" y="18" width="3" height="4" fill="#e8807a"/></g></svg>',
  paper: '<svg viewBox="0 0 104 54"><g transform="rotate(-4 40 27)"><rect x="18" y="5" width="44" height="44" fill="#fff" stroke="#c9ced6"/><path d="M23 12H44" stroke="#5a6a7a" stroke-width="2"/><path d="M23 20H57M23 26H57M23 32H54M23 38H57M23 44H48" stroke="#b8c4d6" stroke-width="1.2"/></g><g transform="rotate(-25 86 30)"><rect x="72" y="28" width="26" height="4" rx="1" fill="#f2c14e"/><path d="M98 28L103 30L98 32Z" fill="#f4d9b0"/></g></svg>',
  read: '<svg viewBox="0 0 104 54"><g transform="translate(18 6)"><path d="M0 5L34 1L68 5V42L34 38L0 42Z" fill="#fff" stroke="#c9b48e"/><path d="M34 1V38" stroke="#c9b48e"/><rect x="5" y="9" width="24" height="14" rx="2" fill="#bfe3c8"/><path d="M5 28H29M5 33H26M39 10H63M39 15H63M39 20H60M39 25H63M39 30H58" stroke="#b8c4d6" stroke-width="1.2"/></g></svg>',
  tray: '<svg viewBox="0 0 104 54"><rect x="8" y="6" width="62" height="42" rx="6" fill="#d9dee3" stroke="#aab3bc"/><rect x="12" y="10" width="26" height="18" rx="4" fill="#fffaf0"/><rect x="41" y="10" width="25" height="18" rx="4" fill="#9fcf7a"/><rect x="12" y="31" width="25" height="13" rx="4" fill="#f2a65a"/><rect x="40" y="31" width="26" height="13" rx="4" fill="#f6d77a"/><circle cx="86" cy="26" r="13" fill="#fff" stroke="#c9ced6"/><circle cx="86" cy="26" r="9.5" fill="#f2d49b"/><path d="M76 46L98 40M76 49L98 43" stroke="#a87c52" stroke-width="1.8"/></svg>'
};

/* ---------- 冷氣（只記在這台電腦） ---------- */
const AC = {
  st: null,
  get() {
    if (!this.st) { let o = {}; try { o = JSON.parse(localStorage.getItem('bxbox-ac') || '{}') || {}; } catch (e) { } this.st = Object.assign({ on: false, temp: 26, fan: 1 }, o); }
    return this.st;
  },
  put() { try { localStorage.setItem('bxbox-ac', JSON.stringify(this.st)); } catch (e) { } Room.drawAC(); },
  toggle() { const s = this.get(); s.on = !s.on; Snd.pop(); this.put(); },
  color(t) { const k = clamp((t - 20) / 10, 0, 1), a = [37, 99, 201], b = [169, 216, 255]; return 'rgb(' + a.map((v, i) => Math.round(v + (b[i] - v) * k)).join(',') + ')'; },
  remote() {
    modal('冷氣遙控器', c => {
      const s = this.get(), set = f => { f(); Snd.tick(); this.put(); c.rebuild(); };
      c.body.append(h('div', { class: 'rmt' },
        h('div', { class: 'rmt-lcd' + (s.on ? ' on' : '') },
          h('div', { class: 'rmt-t' }, s.on ? s.temp + '°C' : '關'),
          h('div', { class: 'rmt-s' }, s.on ? '冷氣　風速：' + '弱中強'[s.fan - 1] : '冷氣關著'),
          s.on && s.temp >= 26 ? h('div', { class: 'rmt-leaf' }, '🍃 省電') : null),
        h('div', { class: 'rmt-btns' },
          h('button', { class: 'rbtn power', onclick: () => set(() => { s.on = !s.on; }) }, '轉／停'),
          h('button', { class: 'rbtn', onclick: () => set(() => { s.fan = s.fan % 3 + 1; }) }, '風速'),
          h('div', { class: 'rmt-temp' }, h('span', null, '室溫'),
            h('button', { class: 'rbtn', onclick: () => set(() => { s.temp = Math.min(30, s.temp + 1); }) }, '▲'),
            h('button', { class: 'rbtn', onclick: () => set(() => { s.temp = Math.max(20, s.temp - 1); }) }, '▼')))),
        h('p', { class: 'muted small' }, '設得越冷，吹出的風越藍；風速越強，風越多。26 度以上會亮省電葉子。冷氣只記在這台電腦。'));
    }, { cls: 'acp' });
  }
};

/* ---------- 小小宣導員（到教室後面舉牌，不會存下來） ---------- */
const Herald = {
  of(sid) { return UI.heralds.find(x => x.sid === sid); },
  pick(sid) {
    const s = stu(sid); if (!s) return;
    if (!this.of(sid) && UI.heralds.length >= 6) return toast('最多 6 位同學一起舉牌');
    const inp = h('input', { class: 'inp', placeholder: '例如：走廊不奔跑', maxlength: 16 });
    const m = modal('🪧 小小宣導員：' + nameOf(s), c => {
      const go = t => { t = String(t || '').trim(); if (!t) return toast('請選一句或自己寫一句'); this.set(sid, t); m.close(); };
      const others = UI.heralds.filter(x => x.sid !== sid).map(x => x.text);
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') go(inp.value); });
      c.body.append(h('p', { class: 'muted' }, '點一句，' + (s.name || pad(s.no) + ' 號') + '就會到教室後面舉牌。'),
        (D.info.rules || []).length ? [h('div', { class: 'lbl' }, '班級公約'), h('div', { class: 'reasons' }, D.info.rules.map(t => h('button', { class: 'chip', onclick: () => go(t) }, t)))] : null,
        others.length ? [h('div', { class: 'lbl' }, '別的同學正在舉的'), h('div', { class: 'reasons' }, [...new Set(others)].map(t => h('button', { class: 'chip', onclick: () => go(t) }, t)))] : null,
        h('div', { class: 'lbl' }, '自己寫一句'), h('div', { class: 'row' }, inp, h('button', { class: 'btn pri', onclick: () => go(inp.value) }, '舉牌')));
    });
  },
  set(sid, text) { const x = this.of(sid); if (x) x.text = text; else UI.heralds.push({ sid, text }); Snd.pop(); refresh(); },
  back(sid) { UI.heralds = UI.heralds.filter(x => x.sid !== sid); refresh(); },
  menu() {
    const m = modal('🪧 ' + UI.heralds.length + ' 位舉牌', c => {
      c.body.append(h('div', { class: 'col-list' }, UI.heralds.map(x => h('div', { class: 'row' }, h('b', null, nameOf(stu(x.sid))), h('span', { class: 'muted grow' }, '「' + x.text + '」'),
        h('button', { class: 'btn sm', onclick: () => { this.back(x.sid); UI.heralds.length ? c.rebuild() : m.close(); } }, '回到座位')))));
      c.foot.append(h('button', { class: 'btn pri', onclick: () => { UI.heralds = []; refresh(); m.close(); } }, '全部回到座位'));
    });
  }
};

/* ---------- 3D 教室 ---------- */
const Room = {
  view: null, key: '', tKey: '', lastMin: -1, visit: null, sayFor: null, bbs: [],
  eye: (() => { let o = {}; try { o = JSON.parse(localStorage.getItem('bxbox-cam') || '{}') || {}; } catch (e) { } return Object.assign({}, EYE0, o); })(),
  theme() { const t = D.info.theme || 'auto'; return t === 'auto' || !THEMES[t] ? autoTheme() : t; },
  seatPos(r, c) { return { cx: RM.SIDE + (D.info.cols - 1 - c) * RM.CW + RM.CW / 2, y0: RM.BACK + (D.info.rows - 1 - r) * RM.CD }; },

  render(wrap) {
    if (!this.view || this.view.parentNode !== wrap) this.mount(wrap);
    const k = this.layoutKey();
    if (k !== this.key) { this.key = k; this.build(); this.fit(); }
    this.update();
  },
  mount(wrap) {
    wrap.replaceChildren();
    this.floor = h('div', { class: 'r-floor' });
    this.cam = h('div', { class: 'r-cam' }, this.floor);
    this.scaler = h('div', { class: 'r-scale' }, this.cam);
    this.labs = h('div', { class: 'r-labs' });
    this.ctl = h('div', { class: 'r-ctl' });
    this.ctl2 = h('div', { class: 'r-ctl2' });
    const eyeBtn = (t, tip, f) => h('button', { class: 'btn sm', title: tip, onclick: f }, t);
    this.ctl3 = h('div', { class: 'r-ctl3' },
      eyeBtn('老師視角', '從講台看同學', () => this.setEye(EYES.teacher)),
      eyeBtn('學生視角', '從教室後面看黑板', () => this.setEye(EYES.student)),
      eyeBtn('↺ 重設', '回到原本的角度和大小', () => this.setEye(EYE0)),
      h('span', { class: 'r-hint' }, '拖曳空地轉動・滾輪縮放'));
    this.tintEl = h('div', { class: 'r-tint' });   // 這個時段的整體色調（傍晚偏橘）
    this.view = h('div', { class: 'r-view' }, this.scaler, this.tintEl, this.labs, this.ctl, this.ctl2, this.ctl3);
    wrap.append(this.view);
    this.teacherEl = null; this.trayEl = null; this.cells = []; this.bbs = []; this.key = ''; this.tKey = ''; this.sayFor = null; this.base = null;
    if (!this.ro) this.ro = new ResizeObserver(() => this.fit());
    this.ro.disconnect(); this.ro.observe(this.view);
    if (!this.blinkT) this.blinkT = setInterval(() => this.blink(), 600);
    // 拖曳轉動、滾輪或兩指縮放；拖過就不算點擊
    const V = this.view;
    V.addEventListener('pointerdown', e => this.onDown(e));
    V.addEventListener('pointermove', e => this.onMove(e));
    V.addEventListener('pointerup', e => this.onUp(e));
    V.addEventListener('pointercancel', e => this.onUp(e));
    V.addEventListener('click', e => { if (this.justDragged) { e.stopPropagation(); e.preventDefault(); } }, true);
    V.addEventListener('wheel', e => {
      if (e.target.closest('.r-ctl, .r-ctl2, .r-ctl3')) return;
      e.preventDefault(); this.eye.zoom = clamp(this.eye.zoom * Math.pow(1.0015, -e.deltaY), .6, 2.5); this.queueEye(); this.saveEye();
    }, { passive: false });
  },
  onDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (e.target.closest('.r-teacher') && this.base) { this.tdrag = { x: e.clientX, y: e.clientY, moved: false }; return; }
    if (e.target.closest('button, .r-lw, .r-ctl, .r-ctl2, .r-ctl3')) return;
    this.ptrs = this.ptrs || new Map();
    this.ptrs.set(e.pointerId, [e.clientX, e.clientY]);
    const P = [...this.ptrs.values()];
    this.drag = { x: e.clientX, y: e.clientY, yaw: this.eye.yaw, tilt: this.eye.tilt, zoom: this.eye.zoom, moved: this.drag && this.drag.moved, dist: P.length > 1 ? Math.hypot(P[0][0] - P[1][0], P[0][1] - P[1][1]) : 0 };
  },
  onMove(e) {
    if (this.tdrag) return this.tMove(e);
    const d = this.drag; if (!d || !this.ptrs || !this.ptrs.has(e.pointerId)) return;
    this.ptrs.set(e.pointerId, [e.clientX, e.clientY]);
    const P = [...this.ptrs.values()];
    if (P.length > 1) { if (d.dist) this.eye.zoom = clamp(d.zoom * Math.hypot(P[0][0] - P[1][0], P[0][1] - P[1][1]) / d.dist, .6, 2.5); d.moved = true; }
    else {
      const dx = e.clientX - d.x, dy = e.clientY - d.y;
      if (!d.moved && Math.hypot(dx, dy) < 6) return;
      if (!d.moved) { d.moved = true; try { this.view.setPointerCapture(e.pointerId); } catch (_) { } }
      this.eye.yaw = d.yaw - dx * .35; this.eye.tilt = clamp(d.tilt - dy * .25, 25, 80);   // 教室跟著滑鼠轉
    }
    this.view.classList.add('dragging');
    this.queueEye();
  },
  onUp(e) {
    if (this.tdrag) return this.tUp();
    if (this.ptrs) this.ptrs.delete(e.pointerId);
    if (!this.drag || (this.ptrs && this.ptrs.size)) return;
    const moved = this.drag.moved;
    this.drag = null; this.view.classList.remove('dragging');
    if (moved) { this.justDragged = true; setTimeout(() => { this.justDragged = false; }, 0); this.saveEye(); this.queueEye(); }   // 放開後把人物畫細
  },
  setEye(e) {
    Object.assign(this.eye, { zoom: 1 }, e);
    this.view.classList.add('dragging'); this.applyEye(); this.saveEye();
    setTimeout(() => this.view && this.view.classList.remove('dragging'), 50);
  },
  saveEye() {
    this.eye.yaw = ((this.eye.yaw % 360) + 540) % 360 - 180;
    try { localStorage.setItem('bxbox-cam', JSON.stringify(this.eye)); } catch (e) { }
  },
  queueEye() { if (!this.eyeQ) this.eyeQ = requestAnimationFrame(() => { this.eyeQ = 0; this.applyEye(); }); },
  floorTf(e) { return 'rotateX(' + e.tilt.toFixed(2) + 'deg) rotateZ(' + e.yaw.toFixed(2) + 'deg)'; },
  billTf(b) { return billAt(b.x, b.y, b.w, b.ht, (90 - this.eye.tilt) * b.k, b.z, this.eye.yaw); },
  // 換角度：地板轉、立牌都轉向鏡頭、從後面看時同學換成背影、名牌重新定位
  applyEye() {
    if (!this.floor || !this.base) return;
    this.floor.style.transform = this.floorTf(this.eye);
    for (const b of this.bbs) b.el.style.transform = this.billTf(b);
    for (const t of this.toons) this.drawToon(t);
    this.wallsFacing();
    this.applyZoom(); this.measure();
  },
  wallsFacing() {   // 鏡頭在哪一側，那一側的牆就不畫（窗台跟著藏）
    const sx = Math.sin(this.eye.yaw * Math.PI / 180);
    this.view.classList.toggle('hide-l', sx < -.02);
    this.view.classList.toggle('hide-r', sx > .02);
  },
  /* 立體人物（toon.js）：立牌直立、轉向鏡頭；依鏡頭和人物面向的角度差，每 10 度（簡單樣式 20 度）重畫一次，畫過的角度記起來 */
  toon(cls, x, y, w, ht, z, face, draw, props) {
    const t = { x, y, w, ht, z, k: 0, face, draw, key: '', cache: new Map() };
    t.el = this.add(cls, '', w, ht, props);
    t.svgEl = t.el;
    this.toons.push(t); this.drawToon(t);
    return t;
  },
  drawToon(t) {
    t.el.style.transform = this.billTf(t);
    // 拖曳中用粗一點的角度（省時間），放開後再畫細；最近用過的幾個角度連畫好的元素一起留著，轉回來不用重畫
    const step = (Look.fine ? 10 : 20) * (this.drag && this.drag.moved ? 2 : 1), e = Math.round(clamp(90 - this.eye.tilt, 5, 70) / 5) * 5;
    const th = Math.round((((this.eye.yaw - t.face) % 360 + 540) % 360 - 180) / step) * step, key = th + '|' + e;
    if (key === t.key) return;
    t.key = key;
    t.nodes = t.nodes || new Map();
    let node = t.nodes.get(key);
    if (!node) {
      let svg = t.cache.get(key);
      if (!svg) { svg = t.draw(th, e); t.cache.set(key, svg); if (t.cache.size > 90) t.cache.delete(t.cache.keys().next().value); }
      const tpl = document.createElement('template'); tpl.innerHTML = svg; node = tpl.content.firstChild;
      t.nodes.set(key, node); if (t.nodes.size > 10) t.nodes.delete(t.nodes.keys().next().value);
    }
    (t.svgEl || t.el).replaceChildren(node);
  },
  applyZoom() {
    const { k, tx, ty, w, h: ht } = this.base, z = this.eye.zoom, cx = w / 2, cy = ht / 2;
    this.scaler.style.transform = 'translate(' + (cx + z * (tx - cx)).toFixed(1) + 'px,' + (cy + z * (ty - cy)).toFixed(1) + 'px) scale(' + (k * z).toFixed(4) + ')';
  },
  // 立牌（同學、老師、擺飾）：k 是往後仰的比例，鏡頭越低仰得越多
  bill(cls, x, y, w, ht, k, z = 0, props) {
    const b = { x, y, w, ht, k, z };
    b.el = this.add(cls, this.billTf(b), w, ht, props);
    this.bbs.push(b); return b.el;
  },
  layoutKey() {
    const i = D.info, seats = D.students.map(s => s.id + ':' + (seatOK(s) ? s.seat.join('.') : '-') + ':' + (isAbsent(s.id) ? 1 : 0) + ':' + (Groups.colorOf(s) || '')).join('|');
    return [i.rows, i.cols, this.theme(), i.floor, i.deskItem, i.ac !== false, D.clockStyle, Look.fine, Look.tag, i.teacher.avatar, Light.time(), Light.season(), i.outfitSeed || '',
      UI.heralds.map(x => x.sid + '=' + x.text).join('|'), seats].join('/');
  },
  add(cls, tf, w, ht, props, ...kids) {
    const e = h('div', Object.assign({ class: 'r3 ' + cls }, props || {}), ...kids);
    Object.assign(e.style, { width: w + 'px', height: ht + 'px', transform: tf });
    this.floor.append(e); return e;
  },
  prop(art, x, y, w, ht, z = 0, k = .93) { return this.bill('r-prop', x, y, w, ht, k, z, { innerHTML: art }); },
  // 方塊（桌子、櫃子）：上面＋四個側面（背面朝鏡頭的面自動不畫，轉到哪裡都對）；x,y 是左後角
  box(cls, x, y, w, d, ht, onclick) {
    const [sx, sy] = this.shadowShift || [0, 0];   // 影子照到陽光的另一邊；沒有陽光時往右前方偏（ChatGPT 建議：柔和偏暖、往右下）
    this.add('r-shadow r-bshadow', flatAt(x - 4 + sx, y + 2 + sy, 0.5), w + 8, d + 8);
    const top = this.add(cls + '-top', flatAt(x, y, ht), w, d, { onclick });
    const fh = ht - 1.2;   // 側面離地 1.2，不要穿過地上的影子、陽光和圓圈（3D 前後順序才不會亂）
    const front = this.add(cls + '-front bf', standAt(x, y + d, ht), w, fh, { onclick });
    this.add(cls + '-back bf', backAt(x + w, y, ht), w, fh, { onclick });
    this.add(cls + '-side bf', faceR(x + w, y + d, ht), d, fh, { onclick });
    this.add(cls + '-side bf', faceL(x, y, ht), d, fh, { onclick });
    return { top, front };
  },

  build() {
    const R = D.info.rows, C = D.info.cols, th = this.th = this.theme(), fine = Look.fine;
    const W = this.W = RM.SIDE * 2 + C * RM.CW, L = this.L = RM.BACK + R * RM.CD + RM.FRONT;
    for (const e of [...this.floor.children]) if (e !== this.teacherEl) e.remove();
    this.floor.className = 'r-floor ' + (D.info.floor === 'terrazzo' ? 'terrazzo' : 'wood');
    Object.assign(this.floor.style, { width: W + 'px', height: L + 'px', transform: this.floorTf(this.eye) });
    Object.assign(this.cam.style, { width: W + 'px', height: L + 'px', perspective: Math.round(Math.max(1700, L * 1.55)) + 'px' });
    this.view.dataset.theme = th;
    const sc = THEME_SEL[th] || THEME_SEL.none;   // 點到的同學名牌、桌下圓圈的顏色跟著佈景換
    for (const [k, v] of Object.entries({ '--selc': sc.tag, '--seld': sc.edge, '--ringf': sc.fill, '--ringc': sc.ring })) this.view.style.setProperty(k, v);
    this.view.classList.toggle('fine', fine);
    this.view.classList.toggle('behind', Math.cos(this.eye.yaw * Math.PI / 180) < 0);
    this.cells = []; this.bbs = []; this.toons = []; this.shadowShift = [16, 14];
    this.time = Light.time(); this.season = Light.season(); this.lightKey = this.time + this.season;
    // 木地板：拼貼圖壓扁成長條木板（一片約 20×80）
    if (D.info.floor !== 'terrazzo') Object.assign(this.floor.style, { backgroundImage: svgURL(SCENE.floor), backgroundSize: '120px 480px', backgroundRepeat: 'repeat' });   // 直向木板
    else Object.assign(this.floor.style, { backgroundImage: '', backgroundSize: '', backgroundRepeat: '' });
    this.tintEl.style.background = (LIGHTS[this.time] || {}).tint || 'transparent';
    this.walls(); this.sunlight(); this.sills(); this.cubbies(); this.frontArea(); this.props(); this.wallsFacing();
    const at = {}, heralds = new Set(UI.heralds.map(x => x.sid));
    for (const s of D.students) if (seatOK(s)) at[s.seat[0] + ',' + s.seat[1]] = s;
    const item = { exam: 'paper', reading: 'read', lunch: 'tray' }[th] || D.info.deskItem;
    for (let r = R - 1; r >= 0; r--) for (let c = 0; c < C; c++) {   // 從後排畫到前排，名牌前排疊在上面
      const p = this.seatPos(r, c), s = at[r + ',' + c], hd = s && heralds.has(s.id), sit = s && !hd ? s : null, absent = sit && isAbsent(sit.id);
      const cell = { r, c, sid: sit ? sit.id : null, hsid: hd ? s.id : null, aw: RM.DW };
      const click = () => this.clickCell(cell);
      // 被點到的同學：桌子和椅子下面的地板亮起一圈（使用者要求，顏色照 ChatGPT 的建議）
      if (sit) cell.ring = this.add('r-ring', flatAt(p.cx - 84, p.y0 + 10, .9), 168, 128);
      // 椅子：座墊、椅背（連後腳）、前腳
      // 有同學坐的位子不畫座墊（反正被同學擋住）：瀏覽器排 3D 前後順序有時會出錯，把座墊畫到後排同學的胸前（原本就有，頭縮小後才看得出來）；
      // 椅腳和椅背離地 1.2，不碰到地上的影子和圓圈
      if (!sit || isAbsent(sit.id)) this.add('r-seat', flatAt(p.cx - 21, p.y0 + 23, 30), 42, 22, { onclick: click });
      this.add('r-chairback', standAt(p.cx - 22, p.y0 + 22, 60), 44, 58.8, { onclick: click });   // 椅背矮一點，才不會從縮小的頭和肩膀中間露出來
      this.add('r-chairlegs', standAt(p.cx - 21, p.y0 + 46, 30), 42, 28.8);
      if (sit && !absent) {   // 立牌比畫布大 1.15 倍，同學看起來大一點；地上一塊影子
        const [shx, shy] = this.shadowShift;
        this.add('r-shadow', flatAt(p.cx - 26 + shx * .6, p.y0 + 26 + shy * .6, .6), 52, 44);
        const L = this.kidLook(sit, th), o = { theme: th, band: Groups.colorOf(sit), seed: hashOf(sit.id), fine, style: ` style="--d:-${(hashOf(sit.id) % 50) / 10}s"` };
        cell.kid = this.toon('r-kid', p.cx, p.y0 + 50, 126, 267, 2.3, 0, (a, e) => Toon.kid(L, a, e, o), { 'data-id': sit.id, onclick: click }).el;
      }
      const { top } = this.box('r-desk', p.cx - RM.DW / 2, p.y0 + 64, RM.DW, RM.DD, RM.DH, click);
      if (sit && !absent && item && item !== 'none') {
        if (item === 'milk') this.prop(ART.milk, p.cx + 40, p.y0 + 86, 16, 24, RM.DH, .8);
        else if (DESK_ART[item]) top.append(h('div', { class: 'r-on', innerHTML: DESK_ART[item] }));
      }
      // 名牌大小照桌面；從正面看放在自己的桌子前方（下巴下面 → 桌面 → 桌子前面板，挑不會擋到任何人臉的位置），
      // 從側面、後面看放在頭頂上。臉的位置：頭的中心在 toon.js 的 Toon.KID.Y，立牌放大 1.15 倍
      const dy1 = p.y0 + 64 + RM.DD - 4, fz = Toon.KID.Y * 1.15;
      cell.anchor = top;
      // 錨點都離開桌面、立牌一點點（不要剛好貼在同一個平面上），瀏覽器排 3D 前後順序才不會亂
      cell.path = [this.add('r-anchor', flatAt(p.cx - 1, p.y0 + 70, RM.DH + 1), 2, 2), this.add('r-anchor', flatAt(p.cx - 1, dy1, RM.DH + 1), 2, 2), this.add('r-anchor', flatAt(p.cx - 1, dy1, 8), 2, 2)];
      cell.faceA = this.add('r-anchor', flatAt(p.cx - 1, p.y0 + 56, fz), 2, 2);
      cell.posTop = this.add('r-anchor', flatAt(p.cx - 1, p.y0 + 56, fz + Toon.KID.R * 1.15 * 2.3), 2, 2);
      this.cells.push(cell);
    }
    this.heralds(th, fine);
    // 老師：沿用同一個元素，走路的動畫才不會斷；平常面向同學（教室後面）
    const av = avatarOf(D.info.teacher.avatar), to = { theme: th, fine };
    if (!this.teacherEl) {
      this.teacherEl = this.add('r-teacher', '', 114, 343, { title: '老師', onclick: () => this.teacherCard() });   // 0.88 倍：同學的頭縮小後，老師也跟著小一點才不會像巨人
      this.teacherT = { x: this.W / 2, y: this.L - RM.FRONT + 150, w: 114, ht: 343, z: -62, k: 0, face: 180, key: '', el: this.teacherEl };
    }
    const T = this.teacherT;
    T.cache = new Map(); T.nodes = new Map(); T.key = ''; T.draw = (a, e) => Toon.teacher(av, a, e, to);
    this.teacherEl.replaceChildren(T.svgEl = h('div', { class: 'r-tsvg' }), this.sayEl = h('div', { class: 'r-say' }));
    this.toons.push(T); this.drawToon(T); this.sayFor = null;
    this.lastMin = -1; this.tickClock(); this.drawAC();
  },
  // 同學：臉、膚色、髮型、髮色大家一樣（使用者指定：瓜皮頭、中性臉，才不會男生配到綁辮子、蝴蝶結的女生樣子）；衣服顏色另外亂數，「換衣服顏色」會換一組
  kidLook(s, th) {
    const { p, collar } = kidLook(s, { theme: th });
    const shirt = Groups.colorOf(s) || KID_SHIRT[hashOf(s.id + '|' + (D.info.outfitSeed || '')) % KID_SHIRT.length];
    return Object.assign({}, p, { shirt, collar, collarC: KID3D.collar, skin: KID3D.skin, face: KID3D.face, mouth: 0, glasses: null, front: 'mush', back: 'mush', extra: null, acc: null, hair: KID3D.hair, shine: KID3D.shine });
  },
  walls() {
    // 2026-11-03：三角彩旗拿掉（只有運動會留萬國旗），改掛各主題的掛飾（GARLAND），牆面和牆裙也照主題換色（THEME_WALL）
    const { W, L, th } = this, WH = RM.WH, gar = GARLAND[th], [wc, wn] = THEME_WALL[th] || THEME_WALL.none;
    const paint = (el, k) => { const s = el.style; s.setProperty('--wallc', shade(wc, -.03 * k)); s.setProperty('--wain', shade(wn, -.05 * k)); s.setProperty('--wline', shade(wn, .45)); s.setProperty('--wbase', shade(wn, -.28)); return el; };
    const garland = (x, w, top, ht = 64) => h('div', { class: 'r-garland', style: 'left:' + Math.round(x) + 'px;width:' + Math.round(w) + 'px;top:' + top + 'px;height:' + ht + 'px;background-image:' + svgURL(gar) + ';background-size:' + ht * 2 + 'px ' + ht + 'px' });
    const bw = Math.round(clamp(W * .5, 260, 600)), sw = (W - bw) / 2, lc = Math.round(sw / 2), rc = Math.round(W - sw / 2);
    const at = (x, el) => { el.style.left = x + 'px'; return el; };
    // 後牆：冷氣、班名、公佈欄、時鐘
    const back = this.backWall = paint(this.add('r-wall back bf', standAt(0, 0, WH), W, WH), 0);
    this.signEl = at(lc, h('div', { class: 'r-sign' }));
    this.bb = h('div', { class: 'r-bb', title: '點一下編輯公佈欄', style: { width: bw + 'px' }, onclick: () => this.editBoard() });
    // 時鐘掛在右邊冷氣和右邊窗戶中間、和冷氣一樣高（使用者指定）：空間不夠就把右邊冷氣往公佈欄挪一點，還是不夠才掛到冷氣下面
    const ana = D.clockStyle === 'analog', ac = D.info.ac !== false, cw = ana ? 62 : 86, need = cw + 24;
    const acR = ac ? Math.round(Math.max(W - sw + 70, Math.min(rc, W - need - 64))) : rc, room = W - acR - 64 >= cw + 8;
    const ckX = !ac ? rc : room ? Math.round((acR + 64 + W) / 2) : acR;
    this.clockEl = at(ckX, h('div', { class: 'r-clock ' + (ac && !room ? 'under ' : 'side ') + (ana ? 'an' : 'dg'), title: '點一下打開大時鐘', onclick: () => BigClock.open(), innerHTML: ana ? ART_CLOCK : '<b></b>' }));
    back.append(this.signEl, this.bb);
    if (ac) for (const x of [lc, acR]) back.append(at(x, h('div', { class: 'r-ac', title: '點一下開關冷氣', onclick: () => AC.toggle() }, h('b', { class: 'r-ac-led' }), h('i'), h('div', { class: 'r-wind' }))));
    const poster = (t, cls = '') => '<div class="r-poster ' + cls + '">' + t + '</div>';
    const deco = {
      halloween: [ART.ghost, ART.bats], xmas: [ART.wreath, ART.stocking], cny: [ART.lantern, ART.lantern],
      moon: [ART.plantern('#e97a45') + ART.plantern('#f6c445'), ART.plantern('#7fb3d5') + ART.plantern('#e63946')],
      kids: [ART.star, ART.star], sports: [ART.medal, ART.megaphone], lantern: [ART.flantern('#f28c38') + ART.flantern('#9b59d0'), ART.riddles],
      mom: [ART.carnations, poster('感謝有您', 'pink')], dragon: [ART.sachets, ART.sachets],
      lunch: [poster('細嚼慢嚥'), poster('吃完分類')], reading: [poster('閱讀時光', 'green'), poster('好書分享', 'green')], exam: [poster('安靜作答', 'exam'), poster('考試中', 'exam')]
    }[th];
    if (deco) back.append(at(lc, h('div', { class: 'r-deco', innerHTML: deco[0] })), at(rc, h('div', { class: 'r-deco', innerHTML: deco[1] })));
    if (gar) back.append(garland(0, W, 0));
    if (th === 'sports') back.append(h('div', { class: 'r-bunt', innerHTML: flagsSVG(W) }));
    back.append(this.clockEl);
    // 兩側：大片窗戶（窗外是季節風景），窗戶下面是立體窗台。左牆由前往後畫、右牆由後往前畫
    const left = paint(this.add('r-wall side bf', faceR(0, L, WH), L, WH), 1);
    const right = paint(this.add('r-wall side bf', faceL(W, 0, WH), L, WH), 1);
    this.bands = [{ side: 'left', y1: 70, y2: L - 70 }, { side: 'right', y1: 60, y2: Math.max(260, L - 400) }];
    left.append(this.wband(70, L - 140));
    right.append(this.wband(60, this.bands[1].y2 - 60));
    if (gar) left.append(garland(56, L - 112, 14, 72)), right.append(garland(46, this.bands[1].y2 - 32, 14, 72));   // 掛在窗戶上緣，兩邊多出一點
    // 窗前再垂掛幾個大一點的應景吊飾（使用者舉例：元宵節在窗戶周圍掛燈籠），大約每兩格窗一個，顏色輪流
    const drop = {
      lantern: ['#f28c38', '#9b59d0', '#e98dad', '#4fb3e8'].map(c => ART.flantern(c)), cny: [ART.lantern], moon: ['#e97a45', '#f6c445', '#7fb3d5'].map(c => ART.plantern(c)),
      halloween: [ART.bats, ART.ghost], xmas: [ART.wreath, ART.stocking], dragon: [ART.sachets], kids: [ART.star], mom: [ART.carnations]
    }[th];
    if (drop) [[left, 70, L - 140], [right, 60, this.bands[1].y2 - 60]].forEach(([wall, x, w], j) => {
      const n = Math.max(1, Math.round(w / 230));
      for (let i = 0; i < n; i++) wall.append(h('div', { class: 'r-wdrop', style: { left: Math.round(x + (i + .5) * w / n) + 'px' }, innerHTML: drop[(i + j) % drop.length] }));
    });
    const door = h('div', { class: 'r-door', style: { left: (L - 340) + 'px' } }, h('i'));
    if (th === 'cny') door.append(h('b', { class: 'r-fu' }, h('span', null, '福')));
    if (th === 'halloween') door.append(h('div', { class: 'r-doordeco', innerHTML: ART.pumpkin }));
    if (th === 'xmas') door.append(h('div', { class: 'r-doordeco', innerHTML: ART.wreath }));
    if (th === 'exam') door.append(h('div', { class: 'r-doorsign' }, '考試中'));
    right.append(door);
    if (th === 'cny') right.append(h('div', { class: 'r-cl', style: { left: (L - 384) + 'px' } }, '五福臨門'), h('div', { class: 'r-cl', style: { left: (L - 192) + 'px' } }, '金玉滿堂'));
    if (th === 'dragon') right.append(h('div', { class: 'r-herbs', style: { left: (L - 384) + 'px' }, innerHTML: ART.herbs }), h('div', { class: 'r-herbs', style: { left: (L - 196) + 'px' }, innerHTML: ART.herbs }));
    if (th === 'sports') { left.append(h('div', { class: 'r-bunt', innerHTML: flagsSVG(L) })); right.append(h('div', { class: 'r-bunt', innerHTML: flagsSVG(L) })); }
    // 前牆：黑板（老師視角時在鏡頭這邊，自動不畫；轉到學生視角才看得到）
    const front = paint(this.add('r-wall front bf', backAt(W, L, WH), W, WH), 0);
    this.chalkEl = h('div', { class: 'r-chalk', title: '點一下編輯黑板', style: { width: Math.round(clamp(W * .64, 320, 820)) + 'px' }, onclick: () => Board.edit() });
    front.append(this.chalkEl);
    if (th === 'exam') front.append(at(Math.round(W * .1), h('div', { class: 'r-poster exam r-fp' }, '安靜作答')));
    if (gar) front.append(garland(0, W, 0, 48));
  },
  // 一整排大窗：底下是季節風景，上面一層是這個時段的天色，再上面是白色窗框（約每 110 一格）
  wband(x, w) {
    const pane = Math.max(1, Math.round(w / 110));
    const fr = h('div', { class: 'r-wframe' });
    fr.style.backgroundImage = `repeating-linear-gradient(90deg, #f5f0e5 0 7px, transparent 7px ${(w / pane).toFixed(1)}px), linear-gradient(transparent 36%, #f5f0e5 36%, #f5f0e5 calc(36% + 6px), transparent calc(36% + 6px))`;
    return h('div', { class: 'r-wband', style: { left: Math.round(x) + 'px', width: Math.round(w) + 'px' } },
      h('div', { class: 'r-wview', style: { backgroundImage: svgURL(SCENE[this.season] || SCENE.summer) } }),
      h('div', { class: 'r-wsky', style: { background: (LIGHTS[this.time] || {}).sky || 'transparent' } }), h('div', { class: 'r-glass' }), fr);
  },
  // 窗台：窗戶下緣的一塊木板（上面＋前緣），上面放盆栽和節日小東西
  sills() {
    const { W, th } = this, Z = RM.SILL, items = { halloween: ART.pumpkin, xmas: ART.gift('#e63946'), cny: ART.oranges, moon: ART.pomelos, mom: ART.vase, kids: ART.star, lantern: ART.flantern('#f28c38'), dragon: ART.zongzi }[th];
    for (const b of this.bands) {
      // sl-l／sl-r：那面牆轉到鏡頭這邊不畫時，窗台和上面的東西也一起藏起來
      const L2 = b.y2 - b.y1, x = b.side === 'left' ? 0 : W - 26, tag = b.side === 'left' ? ' sl-l' : ' sl-r';
      this.add('r-sill' + tag, flatAt(x, b.y1, Z), 26, L2);
      this.add('r-sill-edge' + tag, b.side === 'left' ? faceR(26, b.y2, Z) : faceL(W - 26, b.y1, Z), L2, 8);
      const n = Math.max(2, Math.floor(L2 / 150)), cx = b.side === 'left' ? 13 : W - 13;
      for (let i = 0; i < n; i++) {
        const y = b.y1 + (i + .5) * L2 / n, art = items && i % 2 === 1 ? items : SCENE.plants[i % 3];
        this.prop(art, cx, y, 34, 45, Z, .9).classList.add(tag.trim());
      }
    }
  },
  // 陽光：從有太陽那一側的每格窗戶，在地板上照出一塊光斑，再加一片斜斜的光束
  sunlight() {
    const Lt = LIGHTS[this.time]; if (!Lt) return;
    const b = this.bands.find(x => x.side === Lt.from); if (!b) return;
    const W = this.W, t = Math.tan(Lt.elev * Math.PI / 180), k = Lt.from === 'left' ? .3 : -.3, top = RM.WH - 34, bot = RM.SILL;
    const [r, g, bl, a] = Lt.spot, rgba = al => `rgba(${r},${g},${bl},${al})`;
    const pane = (b.y2 - b.y1) / Math.max(1, Math.round((b.y2 - b.y1 - 0) / 110)), dir = Lt.from === 'left' ? 1 : -1, wx = Lt.from === 'left' ? 0 : W;
    const d1 = Math.min(bot / t, W * .9), d2 = Math.min(top / t, W * .95);
    for (let y = b.y1; y < b.y2 - 1; y += pane) {
      const ya = y + 6, yb = y + pane - 6;
      // 地板上的光斑（平行四邊形）
      const pts = [[wx + dir * d1, ya + k * d1], [wx + dir * d1, yb + k * d1], [wx + dir * d2, yb + k * d2], [wx + dir * d2, ya + k * d2]];
      const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), x0 = Math.min(...xs), y0 = Math.min(...ys);
      const el = this.add('r-sun', flatAt(x0, y0, .7), Math.max(...xs) - x0, Math.max(...ys) - y0);
      el.style.clipPath = 'polygon(' + pts.map(p => (p[0] - x0).toFixed(0) + 'px ' + (p[1] - y0).toFixed(0) + 'px').join(',') + ')';
      el.style.background = `linear-gradient(${dir > 0 ? 90 : 270}deg, ${rgba(a)}, ${rgba(a * .55)})`;
      // 光束：從窗戶上緣斜斜照到光斑遠端
      const v = [dir * d2, k * d2, -top], len = Math.hypot(...v), ey = v.map(c => c / len), ex = [0, 1, 0];
      const ez = [ex[1] * ey[2] - ex[2] * ey[1], ex[2] * ey[0] - ex[0] * ey[2], ex[0] * ey[1] - ex[1] * ey[0]];
      const beam = this.add('r-beam', m3([wx, ya, top], ex, ey, ez), yb - ya, len);
      beam.style.background = `linear-gradient(${rgba(a * .55)}, ${rgba(0)} 92%)`;
    }
    // 影子落在陽光照過去的那一邊（窗戶在左邊，影子往右）；太長就截短，才不會蓋到隔壁
    const sl = Math.min(RM.DH / t * .45, 34);
    this.shadowShift = [dir * sl, k * sl + 4];
  },
  cubbies() {
    const n = clamp(D.students.length, 10, 40), cols = Math.ceil(n / 2);
    const cw = Math.min(cols * 32 + 12, this.W - 260), x = (this.W - cw) / 2;
    const { front } = this.box('r-cub', x, 0, cw, 36, RM.TD);
    front.style.gridTemplateColumns = 'repeat(' + cols + ',1fr)';
    for (let i = 1; i <= cols * 2; i++) front.append(h('i', null, i <= n ? i : ''));
    this.cub = { x, w: cw };
  },
  // 講桌（2026-11-03 使用者要求縮小）
  frontArea() {
    const W = this.W, tw = Math.min(RM.TDW, W - 140), y = this.L - RM.FRONT + 70, x = W / 2 - tw / 2;
    this.tdesk = { x, y, w: tw, d: RM.TDD };
    this.box('r-td', x, y, tw, RM.TDD, RM.TDH);
    this.prop(ART.books, x + 32, y + 34, 44, 25, RM.TDH, 1);
    if (D.info.ac !== false) this.bill('r-remote', x + 72, y + 36, 19, 34, 1, RM.TDH, { innerHTML: ART.remote, title: '冷氣遙控器', onclick: () => AC.remote() });
  },
  props() {
    const { W, L, th } = this, td = this.tdesk, dz = RM.TDH, dx = td.x + td.w - 36, dy = td.y + 36, cub = this.cub;
    if (th !== 'reading') this.prop(ART.plant, 52, 64, 64, 120);
    const P = (...a) => this.prop(...a);
    switch (th) {
      case 'halloween':
        P(ART.pumpkin, W - 58, 74, 72, 62); P(ART.pumpkin, 56, L - 200, 62, 54); P(ART.pumpkin, dx, dy, 44, 38, dz);
        P(ART.pumpkin, cub.x + 26, 22, 40, 35, RM.TD); P(ART.pumpkin, cub.x + cub.w - 26, 22, 40, 35, RM.TD); break;
      case 'xmas':
        P(ART.tree, W - 72, 82, 128, 220); P(ART.gift('#e63946'), W - 150, 112, 46, 42); P(ART.gift('#4ea8de'), W - 34, 128, 40, 37); P(ART.gift('#43a865'), dx, dy, 40, 37, dz); break;
      case 'cny': P(ART.oranges, dx - 6, dy, 62, 44, dz); P(ART.oranges, 56, L - 200, 66, 47); break;
      case 'moon': P(ART.pomelos, dx - 6, dy, 58, 44, dz); P(ART.pomelos, W - 58, 80, 76, 57); break;
      case 'kids': P(ART.balloons, W - 58, 80, 80, 196); P(ART.balloons, 58, L - 190, 80, 196); P(ART.gift('#ef476f'), dx, dy, 40, 37, dz); break;
      case 'sports': P(ART.trophy, dx, dy, 44, 52, dz); P(ART.trophy, cub.x + cub.w - 30, 22, 40, 48, RM.TD); break;
      case 'lantern': P(ART.tangyuan, dx - 4, dy, 50, 34, dz); P(ART.flantern('#d62828'), cub.x + 28, 22, 40, 64, RM.TD); P(ART.flantern('#f28c38'), cub.x + cub.w - 28, 22, 40, 64, RM.TD); break;
      case 'mom': P(ART.vase, dx, dy, 36, 63, dz); P(ART.carnations, cub.x + cub.w - 30, 22, 46, 69, RM.TD); break;
      case 'dragon': P(ART.zongzi, dx - 6, dy, 56, 41, dz); P(ART.boat, cub.x + cub.w / 2, 24, 150, 49, RM.TD); break;
      case 'lunch': P(ART.cart, td.x - 76, td.y + 60, 110, 92); P(ART.bins, W - 92, 92, 130, 80); break;
      case 'reading':
        this.add('r-rug', flatAt(14, 40, 0.6), 200, 130);
        P(ART.shelf, 70, 60, 100, 130); P(ART.beanbag, 160, 140, 70, 50); break;
    }
    // 教室右前方（老師視角畫面的右下角、門的前面）的地板上放一個大擺飾（2026-11-03 使用者要求，例如端午節的龍舟；圖是 ChatGPT 設計的 FLOOR_ART）
    const big = FLOOR_ART[th] ? [FLOOR_ART[th], 228, 133] : { halloween: [ART.pumpkin, 104, 91], sports: [ART.trophy, 76, 91], mom: [ART.carnations, 66, 99] }[th];
    if (big) P(big[0], W - 40 - big[1] / 2, L - 56, big[1], big[2]);
  },
  heralds(th, fine) {
    const L = UI.heralds.filter(x => stu(x.sid)), n = L.length;
    L.forEach((x, i) => {
      const s = stu(x.sid), X = n === 1 ? this.W / 2 : RM.SIDE + 80 + (this.W - 2 * RM.SIDE - 160) * i / (n - 1), Y = 96;
      const fs = x.text.length <= 5 ? 30 : x.text.length <= 10 ? 23 : 17;
      const L2 = this.kidLook(s, th), o = { theme: th, band: Groups.colorOf(s), seed: hashOf(s.id), fine };
      this.toon('r-herald', X, Y, 126, 378, -80, 0, (a, e) => Toon.standKid(L2, a, e, o), { 'data-id': s.id, onclick: () => tileClick(s) });
      // 牌子是固定朝前的一片板子（木棍在同學右手邊，立牌放大 1.15 倍），背面是空白的木板
      const sx = X + 30 - 75, sy = Y + 9;
      const sign = this.add('r-hsign bf', standAt(sx, sy, 270), 150, 90, { style: { fontSize: fs + 'px' }, onclick: () => tileClick(s) }, x.text);
      this.add('r-hsign back bf', backAt(sx + 150, sy, 270), 150, 90);
      this.cells.push({ sid: s.id, herald: true, X, Y, aw: 150, anchor: sign });
    });
  },

  /* 依畫面大小縮放，再量出每張桌子在畫面上的位置來放名牌 */
  fit() {
    if (!this.view || !this.view.isConnected || !this.backWall) return;
    const V = this.view.getBoundingClientRect();
    if (V.width < 20 || V.height < 20) return;
    // 用原本的角度量大小，轉過的角度和放大另外套上去，轉動時大小才不會跳
    this.scaler.style.transform = 'none';
    this.floor.style.transform = this.floorTf(EYE0);
    const a = this.floor.getBoundingClientRect(), b = this.backWall.getBoundingClientRect();
    const x0 = Math.min(a.left, b.left) - V.left, x1 = Math.max(a.right, b.right) - V.left;
    const y0 = Math.min(a.top, b.top) - V.top, y1 = Math.max(a.bottom, b.bottom) - V.top;
    const k = Math.min((V.width - 8) / (x1 - x0), (V.height - 8) / (y1 - y0), 2);
    this.base = { k, tx: (V.width - k * (x1 - x0)) / 2 - k * x0, ty: (V.height - k * (y1 - y0)) / 2 - k * y0, w: V.width, h: V.height };
    this.floor.style.transform = this.floorTf(this.eye);
    this.applyZoom(); this.measure(); this.drawLabels();
  },
  measure() {
    const V = this.view.getBoundingClientRect(), front = Math.cos(this.eye.yaw * Math.PI / 180) > .6;   // 同學面向黑板，鏡頭在前方 ±53 度內算正面
    this.labs.classList.toggle('top', !front);
    const pt = el => { const q = el.getBoundingClientRect(); return [q.left + q.width / 2 - V.left, q.top + q.height / 2 - V.top]; };
    for (const c of this.cells) {
      const r = c.anchor.getBoundingClientRect();
      // 名牌大小可在設定「外觀」選；舉牌同學的名牌本來就比較大，放大會蓋到牌子上的字，所以不跟著放大
      c.fs = clamp(Math.max(r.width, r.height * 1.6) / c.aw * (c.herald ? 17 : 12), 9, 20) * (c.herald ? 1 : Look.tagK);
      c.face = null; c.pts = null;
      if (c.herald) { c.ax = c.x = r.left + r.width / 2 - V.left; c.ay = c.y = r.top - V.top; continue; }   // 舉牌的同學名牌放在牌子上面
      if (c.kid && c.kid.isConnected) {   // 臉在畫面上的圓：中心量錨點，半徑照立牌寬度（立牌 110 單位寬，頭半徑 Toon.KID.R）
        const [x, y] = pt(c.faceA); c.face = { x, y, r: c.kid.getBoundingClientRect().width * Toon.KID.R / 110 };
      }
      if (front) c.pts = c.path.map(pt);
      [c.ax, c.ay] = [c.x, c.y] = front ? c.pts[0] : pt(c.posTop);
    }
    this.placeLabels();
  },
  update() {
    for (const el of this.floor.querySelectorAll('.r-kid[data-id], .r-herald')) {
      const id = el.dataset.id;
      el.classList.toggle('sel', UI.sel === id);
      el.classList.toggle('picked', UI.pickSeat === id || (UI.mode === 'multi' && UI.multi.has(id)));
    }
    for (const c of this.cells) if (c.ring) {
      c.ring.classList.toggle('on', UI.sel === c.sid);
      c.ring.classList.toggle('picked', UI.pickSeat === c.sid || (UI.mode === 'multi' && UI.multi.has(c.sid)));
    }
    this.fillBoard(); this.drawLabels(); this.moveTeacher(); this.drawTray(); this.drawCtl();
  },
  drawLabels() {
    const box = this.labs; box.replaceChildren();
    const arr = UI.mode === 'arrange';
    for (const c of this.cells) {
      c.lw = null;
      const s = c.sid && stu(c.sid);
      const t = s ? tile(s) : arr && !c.hsid && !c.herald ? emptySeat(c.r, c.c) : null;
      if (t) box.append(c.lw = h('div', { class: 'r-lw' + (c.herald ? ' hd' : '') }, t));
    }
    this.placeLabels();
  },
  /* 擺名牌（2026-11-03 改寫，使用者要求：各種角度名牌都不能疊在一起，正面看時尤其不要疊）
     離鏡頭近（畫面下方）的先放；每個名牌在自己的候選位置裡挑：一定不能疊到已經放好的名牌，再看蓋到臉多少、離原位多遠、縮多小。
     候選位置：正面看＝桌面後緣（手前）→ 往上到下巴下面、往下到桌面前緣、桌子前面板；側面、後面看＝頭頂上方往上、往下；舉牌＝牌子上方往上。
     每個位置也試左右偏一點。原本大小放不下就一次縮 1 成（字最小 6px），真的都放不下才挑疊最少的 */
  placeLabels() {
    const list = this.cells.filter(c => c.lw);
    for (const c of list) {
      if (c.ax == null) { c.lw.style.display = 'none'; continue; }
      Object.assign(c.lw.style, { display: '', fontSize: c.fs.toFixed(1) + 'px' });
    }
    // 要保護的是五官：眼睛在頭的中心、嘴巴在中心下面約 0.4 個半徑，上面是瀏海
    const faces = this.cells.filter(c => c.face).map(({ face: f }) => [f.x - f.r * .62, f.y - f.r * .3, f.x + f.r * .62, f.y + f.r * .62]);
    const area = (a, b) => Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])) * Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));
    const seg = (p, q, out, st = 3) => { const n = Math.max(1, Math.ceil(Math.hypot(q[0] - p[0], q[1] - p[1]) / st)); for (let j = 1; j <= n; j++) out.push([p[0] + (q[0] - p[0]) * j / n, p[1] + (q[1] - p[1]) * j / n]); return out; };
    const fa = faces.map(f => (f[2] - f[0]) * (f[3] - f[1])), placed = [], G = 2;   // 名牌之間至少留 2px
    const todo = list.filter(c => c.ax != null).sort((p, q) => q.ay - p.ay);
    for (const c of todo) { c.w0 = c.lw.offsetWidth; c.h0 = c.lw.offsetHeight; c.cap = 1; }
    // 先看同一高度左右相鄰的名牌：原位放不下就一起縮到剛好放得下（同一排大小一致，不會先放的很大、夾在中間的被擠到沒位子）
    for (let i = 0; i < todo.length; i++) for (let j = i + 1; j < todo.length; j++) {
      const p = todo[i], q = todo[j];
      if (Math.abs(p.ay - q.ay) >= (p.h0 + q.h0) / 2) continue;
      const k = (Math.abs(p.ax - q.ax) - G) / ((p.w0 + q.w0) / 2);
      if (k < p.cap) p.cap = k; if (k < q.cap) q.cap = k;
    }
    for (const c of todo) {
      const W0 = c.w0, H0 = c.h0, A = [c.ax, c.ay], minS = Math.min(1, 6 / c.fs), cap = Math.max(minS, Math.floor(c.cap * 100) / 100);
      const reach = W0 * .6 + 40, near = faces.map((f, i) => i).filter(i => faces[i][2] > A[0] - reach && faces[i][0] < A[0] + reach);
      const nearP = placed.filter(p => p[2] > A[0] - reach - W0 && p[0] < A[0] + reach + W0);
      let best = null, bestHit = null;
      for (let s = cap; s >= minS - 1e-6; s = Math.round((s - .1) * 100) / 100) {
        const w = W0 * s, ht = H0 * s, path = [A];
        if (c.herald) seg(A, [A[0], A[1] - ht * 2.2], path);
        else if (c.pts) {
          const [, B, C] = c.pts;
          if (c.face) { const minY = c.face.y + c.face.r * .62 + ht / 2 + 1; path.push(...seg(A, [c.face.x, c.face.y], []).filter(p => p[1] >= minY)); }
          seg(A, B, path); seg(B, C, path);
        } else { seg(A, [A[0], A[1] - ht * 1.8], path); seg(A, [A[0], A[1] + ht * 1.2], path); }
        let pick = null;
        for (const dx of [0, -.18, .18, -.34, .34]) {
          for (const [px, py] of path) {
            const x = px + dx * w, y = py, b = [x - w / 2, y - ht / 2, x + w / 2, y + ht / 2], bb = [b[0] - G, b[1] - G, b[2] + G, b[3] + G];
            let ov = 0; for (const p of nearP) ov += area(bb, p);
            let v = 10 * Math.hypot(x - A[0], y - A[1]) / ht + 25 * (cap - s) / .26;
            for (const i of near) v += 300 * area(b, faces[i]) / fa[i];
            if (ov > 0) { if (!bestHit || ov < bestHit.ov || (ov === bestHit.ov && v < bestHit.v)) bestHit = { x, y, b, v, s, ov }; continue; }
            if (!pick || v < pick.v) pick = { x, y, b, v, s };
          }
          if (pick && pick.v < 30) break;   // 不用左右偏就放得好
        }
        if (pick && (!best || pick.v < best.v)) best = pick;
        if (best && best.v < 40) break;   // 這個大小就放得下、不太擋臉
      }
      if (!best) {   // 還是放不下：用最小的字、往上下更遠的地方找空位
        const w = W0 * minS, ht = H0 * minS, path = seg(A, [A[0], A[1] - ht * 5], [], 2);
        seg(A, [A[0], A[1] + ht * 4], path, 2);
        for (const dx of [0, -.3, .3, -.6, .6]) for (const [px, py] of path) {
          const x = px + dx * w, b = [x - w / 2, py - ht / 2, x + w / 2, py + ht / 2], bb = [b[0] - G, b[1] - G, b[2] + G, b[3] + G];
          if (placed.some(p => area(bb, p) > 0)) continue;
          const v = Math.hypot(x - A[0], py - A[1]);
          if (!best || v < best.v) best = { x, y: py, b, v, s: minS };
        }
      }
      const p = best || bestHit;
      c.x = p.x; c.y = p.y; c.sc = p.s; placed.push(p.b);
    }
    for (const c of list) if (c.ax != null) Object.assign(c.lw.style, { left: c.x.toFixed(1) + 'px', top: c.y.toFixed(1) + 'px', zIndex: Math.round(c.ay), fontSize: (c.fs * (c.sc || 1)).toFixed(1) + 'px' });
  },
  clickCell(cell) {
    const s = stu(cell.sid || cell.hsid);
    if (s) return tileClick(s);
    if (UI.mode === 'arrange' && UI.pickSeat) { const a = stu(UI.pickSeat); if (a) { a.seat = [cell.r, cell.c]; UI.pickSeat = null; save(); refresh(); } }
  },
  // 老師：點選同學時走到他旁邊的走道；加分、抽中時走過去說一句話再回來
  moveTeacher() {
    const el = this.teacherEl; if (!el) return;
    if (this.tdrag && this.tdrag.moved) return;   // 正在被拖著走
    const sid = this.visit ? this.visit.sid : UI.mode === 'normal' ? UI.sel : null, s = sid && stu(sid), hm = this.homePos();
    let x = hm.x, y = hm.y, face = hm.face, look = null;   // 平常站在講桌旁（或老師拖到的地方），面向同學
    if (s) {
      const hp = this.cells.find(c => c.herald && c.sid === s.id);
      if (hp) { x = hp.X + 84; y = hp.Y + 50; look = [hp.X, hp.Y]; }
      else if (seatOK(s)) { const p = this.seatPos(s.seat[0], s.seat[1]); x = p.cx + RM.CW / 2; y = p.y0 + 70; look = [p.cx, p.y0 + 50]; }
    }
    if (look) face = Math.atan2(look[0] - x, look[1] - y) * 180 / Math.PI;   // 轉身看著那位同學
    const k = [x, y, this.W, this.L].join(','), moved = k !== this.tKey, T = this.teacherT;
    if (moved) {
      const first = !this.tKey;
      if (!first) { el.classList.add('walk'); clearTimeout(this.tWalk); this.tWalk = setTimeout(() => el.classList.remove('walk'), 1100); }
      this.tKey = k;
      if (first) el.style.transition = 'none';   // 第一次直接站好，不要從角落走出來
      Object.assign(T, { x, y, face });
      this.drawToon(T);
      if (first) { void el.offsetWidth; el.style.transition = ''; }
    } else if (T.face !== face) { T.face = face; this.drawToon(T); }
    if (this.visit !== this.sayFor) {
      this.sayFor = this.visit;
      clearTimeout(this.sayT); el.classList.remove('saying', 'happy');
      if (this.visit) { this.sayEl.textContent = this.visit.text; this.sayT = setTimeout(() => el.classList.add('saying', 'happy'), moved ? 1000 : 50); }
    }
  },
  // 老師平常站的地方：拖過就記在這台電腦（存比例，排數行數改了也還在教室裡）
  homePos() {
    let o = null; try { o = JSON.parse(localStorage.getItem('bxbox-tpos') || 'null'); } catch (e) { }
    if (!o) return { x: Math.min(this.W / 2 + 200, this.W - 50), y: this.L - RM.FRONT + 150, face: 180 };
    const [x, y] = this.freeSpot(o.fx * this.W, o.fy * this.L);
    return { x, y, face: o.face };
  },
  setHome(x, y, face) {
    try { if (x == null) localStorage.removeItem('bxbox-tpos'); else localStorage.setItem('bxbox-tpos', JSON.stringify({ fx: x / this.W, fy: y / this.L, face })); } catch (e) { }
  },
  // 不讓老師站進桌椅、講桌或牆裡：在裡面就推到最近的走道
  freeSpot(x, y) {
    const r = 18, boxes = [], td = this.tdesk;
    x = clamp(x, 34, this.W - 34); y = clamp(y, 64, this.L - 24);
    for (let i = 0; i < D.info.rows; i++) for (let j = 0; j < D.info.cols; j++) { const p = this.seatPos(i, j); boxes.push([p.cx - RM.DW / 2 - r, p.y0 + 20 - r, p.cx + RM.DW / 2 + r, p.y0 + 64 + RM.DD + r]); }
    if (td) boxes.push([td.x - r, td.y - r, td.x + td.w + r, td.y + td.d + r]);
    for (const [x1, y1, x2, y2] of boxes) {
      if (x <= x1 || x >= x2 || y <= y1 || y >= y2) continue;
      const m = [x - x1, x2 - x, y - y1, y2 - y], i = m.indexOf(Math.min(...m));
      if (i === 0) x = x1; else if (i === 1) x = x2; else if (i === 2) y = y1; else y = y2;
    }
    return [x, y];
  },
  // 畫面上的一點 → 地板座標（把 CSS 的縮放、透視、旋轉倒回去算）
  floorAt(cx, cy) {
    const V = this.view.getBoundingClientRect(), { k, tx, ty, w, h: ht } = this.base, z = this.eye.zoom, s = k * z;
    const px = (cx - V.left - (w / 2 + z * (tx - w / 2))) / s, py = (cy - V.top - (ht / 2 + z * (ty - ht / 2))) / s;
    const W = this.W, L = this.L, P = parseFloat(this.cam.style.perspective), ox = W * .5, oy = L * .42;
    const t = this.eye.tilt * Math.PI / 180, ps = this.eye.yaw * Math.PI / 180;
    const dx = px - ox, dy = py - oy, qx = W / 2 - ox, qy = L / 2 - oy;
    const yp = P * (dy - qy) / (P * Math.cos(t) + dy * Math.sin(t)), xp = dx * (P - yp * Math.sin(t)) / P - qx;
    return [W / 2 + xp * Math.cos(ps) + yp * Math.sin(ps), L / 2 - xp * Math.sin(ps) + yp * Math.cos(ps)];
  },
  // 拖老師：按住老師拖到任何走道、座位前後；放開就站在那裡（點一下不拖還是打開老師卡片）
  tMove(e) {
    const d = this.tdrag, T = this.teacherT;
    if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 6) return;
    if (!d.moved) { d.moved = true; this.visit = null; UI.sel = null; renderSide(); this.view.classList.add('dragging'); try { this.view.setPointerCapture(e.pointerId); } catch (_) { } }
    const [fx, fy] = this.floorAt(e.clientX, e.clientY), [x, y] = this.freeSpot(fx, fy);
    if (Math.hypot(x - T.x, y - T.y) > 2) T.face = Math.atan2(x - T.x, y - T.y) * 180 / Math.PI;
    T.x = x; T.y = y; this.tKey = [x, y, this.W, this.L].join(',');
    this.drawToon(T);
  },
  tUp() {
    const d = this.tdrag; this.tdrag = null;
    this.view.classList.remove('dragging');
    if (!d.moved) return;
    this.justDragged = true; setTimeout(() => { this.justDragged = false; }, 0);
    const T = this.teacherT; this.setHome(T.x, T.y, T.face); refresh();
  },
  react(sids, d, why, kind) {
    if (!this.view || !this.view.isConnected || !this.floor) return;
    const cls = kind === 'wow' ? 'wow' : d > 0 ? 'happy' : null;
    if (!cls) return;
    for (const id of sids) {
      const el = this.floor.querySelector('.r-kid[data-id="' + id + '"], .r-herald[data-id="' + id + '"]'); if (!el) continue;
      el.classList.remove('happy', 'wow'); el.classList.add(cls);
      clearTimeout(el._rt); el._rt = setTimeout(() => el.classList.remove(cls), kind === 'wow' ? 6000 : 2600);
    }
    if (sids.length !== 1 || D.info.teacherWalk === false || !stu(sids[0])) return;
    this.visit = { sid: sids[0], text: kind === 'wow' ? '你真幸運！' : (why ? why + '，好棒！' : '好棒！') };
    this.moveTeacher();
    clearTimeout(this.vT); this.vT = setTimeout(() => { this.visit = null; this.moveTeacher(); }, kind === 'wow' ? 7000 : 3800);
  },
  blink() {
    if (!this.view || !this.view.isConnected || !Look.fine || document.hidden) return;
    const all = this.floor.querySelectorAll('.r-kid[data-id], .r-herald, .r-teacher');
    for (let i = 0; i < 3 && all.length; i++) {
      const el = all[Math.floor(Math.random() * all.length)];
      el.classList.add('blink'); setTimeout(() => el.classList.remove('blink'), 160);
    }
  },
  teacherCard() {
    const m = modal(TeacherUI.name(), c => {
      c.body.append(h('div', { class: 'tc-top' }, h('span', { class: 'tc-av', innerHTML: avatarSVG(D.info.teacher.avatar) }),
        h('div', null, h('div', { class: 'muted small' }, avatarOf(D.info.teacher.avatar).name), h('button', { class: 'btn', onclick: () => { m.close(); TeacherUI.open(); } }, '換頭像和稱呼'))),
        h('label', { class: 'tog' }, h('input', { type: 'checkbox', checked: D.info.teacherWalk !== false, onchange: e => { D.info.teacherWalk = e.target.checked; save(); } }),
          h('span', null, '加分、抽籤時走到同學旁邊稱讚')));
      c.body.append(h('p', { class: 'muted small' }, '按住老師拖曳，可以走到任何走道、座位前後，放開就站在那裡。'));
      c.foot.append(h('button', { class: 'btn', onclick: () => { UI.sel = null; this.visit = null; this.setHome(null); refresh(); m.close(); } }, '回到講桌旁'), h('button', { class: 'btn pri', onclick: () => m.close() }, '完成'));
    });
  },
  fillBoard() {
    if (!this.bb) return;
    this.signEl.textContent = D.info.className || '我們班';
    if (this.chalkEl) this.chalkEl.replaceChildren(Board.render(false));
    const duty = Board.dutyToday();
    const card = (cls, title, lines, empty) => h('div', { class: 'r-card ' + cls }, h('b', null, title),
      lines.length ? lines.slice(0, 5).map(t => h('div', null, t)) : h('div', { class: 'r-empty' }, empty));
    this.bb.replaceChildren(
      card('c1', '班級公約', D.info.rules || [], '點一下寫公約'),
      card('c2', '榮譽榜', D.info.honor || [], '點一下寫榮譽榜'),
      card('c3', '今日值日生', duty.map(s => nameOf(s)), '黑板裡可設定'),
      card('c4', '小叮嚀', [D.info.tip || D.clockNote].filter(Boolean), '今天也要加油！'));
  },
  drawAC() {
    if (!this.backWall) return;
    const s = AC.get(), col = AC.color(s.temp), n = s.fan * 2 + 1;
    const wind = s.on ? '<svg viewBox="0 0 124 80">' + Array.from({ length: n }, (_, i) => '<path d="M' + (12 + i * 100 / (n - 1)).toFixed(1) + ' 0q7 13 0 26t0 26t0 26" stroke="' + col + '"/>').join('') + '</svg>' : '';
    for (const el of this.backWall.querySelectorAll('.r-ac')) {
      el.classList.toggle('on', s.on);
      el.querySelector('.r-ac-led').textContent = s.on ? s.temp + '°' : '';
      el.querySelector('.r-wind').innerHTML = wind;
    }
  },
  drawTray() {
    if (this.trayEl) this.trayEl.remove();
    this.trayEl = null;
    const un = roster().filter(s => !seatOK(s));
    if (un.length) { this.trayEl = h('div', { class: 'tray' }, h('span', { class: 'tray-t' }, '還沒有位子 ' + un.length + ' 位'), ...un.map(tile)); this.view.after(this.trayEl); }
  },
  drawCtl() {
    const th = this.th, cur = D.info.theme || 'auto';
    this.ctl.replaceChildren(
      h('button', { class: 'btn sm', title: '換佈景', onclick: () => this.pickTheme() }, THEME_ICON[th] + ' 佈景：' + THEMES[th].name + (cur === 'auto' ? '（自動）' : '')),
      h('button', { class: 'btn sm', title: '改用平面座位表', onclick: () => { D.info.view = 'flat'; save(); refresh(); } }, '▦ 平面'));
    this.ctl2.replaceChildren(UI.heralds.length ? h('button', { class: 'btn sm', onclick: () => Herald.menu() }, '🪧 ' + UI.heralds.length + ' 位舉牌') : '');
  },
  tickClock() {
    if (!this.clockEl || !this.clockEl.isConnected) return;
    const d = new Date(), m = d.getHours() * 60 + d.getMinutes();
    if (m === this.lastMin) return;
    this.lastMin = m;
    if (this.lightKey && this.lightKey !== Light.time() + Light.season()) { this.lightKey = ''; setTimeout(refresh, 0); }   // 早上變下午：重畫陽光
    if (this.clockEl.classList.contains('dg')) { this.clockEl.firstChild.textContent = hm(d); return; }
    this.clockEl.querySelector('.hh').setAttribute('transform', 'rotate(' + ((m % 720) / 2) + ' 50 50)');
    this.clockEl.querySelector('.mm').setAttribute('transform', 'rotate(' + d.getMinutes() * 6 + ' 50 50)');
  },

  pickTheme() {
    modal('教室佈景', c => {
      const lt = Light.get(), seg = (k, cur, opts) => h('div', { class: 'seg' }, opts.map(([v, t]) => h('button', { class: cur === v ? 'on' : '', onclick: () => { Light.set(k, v); refresh(); c.rebuild(); } }, t)));
      c.body.append(
        h('h3', { class: 'set-h' }, '季節與光線'),
        h('div', { class: 'lk-row' }, h('span', { class: 'lk-l' }, '窗外季節'), h('div', { class: 'lk-c' },
          seg('season', lt.season, [['auto', '自動'], ...Object.entries(SEASONS)]), h('ul', { class: 'lk-notes' }, h('li', null, '自動：3～5 月春天、6～8 月夏天、9～11 月秋天、12～2 月冬天。')))),
        h('div', { class: 'lk-row' }, h('span', { class: 'lk-l' }, '陽光'), h('div', { class: 'lk-c' },
          seg('time', lt.time, [['auto', '自動'], ...Object.entries(LIGHTS).map(([k, v]) => [k, v.name]), ['off', '不要']]),
          h('ul', { class: 'lk-notes' }, h('li', null, '自動：早上陽光從左邊窗戶照進來，下午、傍晚從右邊，傍晚比較橘。'), h('li', null, '季節和陽光只記在這台電腦。')))),
        h('div', { class: 'lk-row' }, h('span', { class: 'lk-l' }, '同學的衣服'), h('div', { class: 'lk-c' },
          h('button', { class: 'btn', onclick: () => { D.info.outfitSeed = uid(); save(); refresh(); } }, '🎲 換一組衣服顏色'),
          h('ul', { class: 'lk-notes' }, h('li', null, '有分組時，衣服是小組的顏色。')))),
        h('h3', { class: 'set-h' }, '佈景'),
        h('p', { class: 'muted' }, '選「自動」會依日期換：中秋節、萬聖節、聖誕節、農曆新年、元宵節、兒童節、母親節、端午節；運動會、午餐時間、閱讀時光、考試請自己選，用完再換回來。'),
        themeCards(() => c.close()));
    }, { cls: 'wide' });
  },
  editBoard() {
    modal('公佈欄', c => {
      const lines = (k, lab, ph) => [h('label', { class: 'lbl' }, lab), h('textarea', {
        class: 'inp', rows: 4, placeholder: ph, value: (D.info[k] || []).join('\n'),
        oninput: e => { D.info[k] = e.target.value.split(/\r?\n/).map(x => x.trim()).filter(Boolean).slice(0, 8); save(); }
      })];
      c.body.append(h('p', { class: 'muted' }, '貼在 3D 教室後面牆上的公佈欄。值日生會照「黑板 → 值日生」的設定自動換；小小宣導員也從班級公約挑句子。'),
        ...lines('rules', '班級公約（一行一條，最多顯示 5 條）', '上課專心聽講'),
        ...lines('honor', '榮譽榜（一行一條）', '例如：整潔比賽第一名'),
        h('label', { class: 'lbl' }, '小叮嚀'),
        h('input', { class: 'inp', value: D.info.tip || '', placeholder: '今天也要加油！', oninput: e => { D.info.tip = e.target.value.trim(); save(); } }));
    }, { onClose: () => refresh() });
  }
};
const ART_CLOCK = '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="#fff" stroke="#2f4a3f" stroke-width="6"/>'
  + Array.from({ length: 12 }, (_, i) => '<rect x="48.5" y="9" width="3" height="' + (i % 3 ? 6 : 10) + '" fill="#2f4a3f" transform="rotate(' + i * 30 + ' 50 50)"/>').join('')
  + '<rect class="hh" x="47" y="26" width="6" height="28" rx="3" fill="#2f4a3f"/><rect class="mm" x="48" y="14" width="4" height="40" rx="2" fill="#2f4a3f"/><circle cx="50" cy="50" r="4" fill="#e8574a"/></svg>';
Tick.add(() => Room.tickClock());
