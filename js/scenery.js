'use strict';
/* 美編素材（2026-10-31 請 ChatGPT 網頁版設計的 SVG 與配色，只送文字描述給它）：
   溫潤木地板拼貼、春夏秋冬窗景、窗台盆栽，以及牆面、窗框、陽光、天空的配色。 */

const SCENE = {
  floor: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" preserveAspectRatio="none"><rect width="256" height="256" fill="#B98250"/>'
    + '<path d="M0 0H64V64H0Z" fill="#C58E5C"/><path d="M64 0H128V64H64Z" fill="#E0B783"/><path d="M128 0H192V64H128Z" fill="#BD8553"/><path d="M192 0H256V64H192Z" fill="#D3A16D"/>'
    + '<path d="M0 64H96V128H0Z" fill="#D9AA78"/><path d="M96 64H160V128H96Z" fill="#A96F45"/><path d="M160 64H224V128H160Z" fill="#E0B783"/><path d="M224 64H256V128H224Z" fill="#C58E5C"/>'
    + '<path d="M0 128H64V192H0Z" fill="#BD8553"/><path d="M64 128H160V192H64Z" fill="#DDB080"/><path d="M160 128H224V192H160Z" fill="#B47A4C"/><path d="M224 128H256V192H224Z" fill="#D3A16D"/>'
    + '<path d="M0 192H96V256H0Z" fill="#E0B783"/><path d="M96 192H160V256H96Z" fill="#B98250"/><path d="M160 192H256V256H160Z" fill="#D5A36F"/>'
    + '<path d="M0 0H256M0 64H256M0 128H256M0 192H256M0 256H256" fill="none" stroke="#875B3D" stroke-width="1.5" opacity=".55"/>'
    + '<path d="M64 0V64M128 0V64M192 0V64M96 64V128M160 64V128M224 64V128M64 128V192M160 128V192M224 128V192M96 192V256M160 192V256" fill="none" stroke="#875B3D" stroke-width="1.5" opacity=".55"/>'
    + '<g fill="none" stroke="#F5D5A8" stroke-width="1.2" opacity=".4"><path d="M8 15Q22 11 42 17T60 15"/><path d="M70 36Q88 30 112 36"/><path d="M136 12Q150 18 180 12"/><path d="M199 44Q218 38 247 45"/><path d="M8 83Q35 76 80 84"/><path d="M105 103Q125 97 148 103"/><path d="M167 79Q188 85 213 78"/><path d="M10 148Q32 141 54 149"/><path d="M77 172Q103 165 143 173"/><path d="M173 151Q192 145 215 152"/><path d="M8 211Q38 204 82 213"/><path d="M108 231Q127 225 149 232"/><path d="M173 210Q207 202 247 211"/></g>'
    + '<g fill="none" stroke="#754A30" stroke-width=".8" opacity=".23"><path d="M12 23Q30 20 47 23"/><path d="M72 44Q90 40 116 44"/><path d="M138 27Q158 31 182 27"/><path d="M9 94Q39 91 77 95"/><path d="M169 91Q190 95 211 91"/><path d="M10 160Q30 156 53 160"/><path d="M82 181Q110 176 143 181"/><path d="M174 164Q196 159 217 164"/><path d="M10 222Q39 218 80 222"/><path d="M172 225Q205 218 246 225"/></g></svg>',
  spring: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 220" preserveAspectRatio="xMidYMid slice"><rect width="400" height="220" fill="#CDE9F2"/>'
    + '<g fill="#FFFFFF" opacity=".85"><ellipse cx="95" cy="38" rx="38" ry="13"/><circle cx="77" cy="31" r="13"/><circle cx="101" cy="27" r="17"/><ellipse cx="310" cy="55" rx="39" ry="12"/><circle cx="291" cy="48" r="13"/><circle cx="317" cy="44" r="16"/></g>'
    + '<path d="M0 145Q75 105 150 143Q245 95 400 145V220H0Z" fill="#B8D6B9"/><path d="M0 165Q110 125 220 163Q310 125 400 158V220H0Z" fill="#91BE9B"/>'
    + '<path d="M0 180Q190 155 400 180V220H0Z" fill="#D6C9AA"/><path d="M0 194Q180 175 400 194" fill="none" stroke="#F5E8D0" stroke-width="3"/>'
    + '<path d="M72 180Q84 125 78 80L94 55M79 112L47 85M84 126L119 88M78 94L62 56" fill="none" stroke="#85634F" stroke-width="9" stroke-linecap="round"/>'
    + '<g fill="#F4B8C8"><circle cx="48" cy="66" r="25"/><circle cx="76" cy="43" r="28"/><circle cx="104" cy="59" r="27"/><circle cx="120" cy="85" r="21"/><circle cx="53" cy="96" r="22"/><circle cx="84" cy="80" r="30"/></g>'
    + '<g fill="#FFE0E7"><circle cx="42" cy="58" r="9"/><circle cx="75" cy="37" r="10"/><circle cx="101" cy="54" r="9"/><circle cx="90" cy="86" r="10"/><circle cx="119" cy="82" r="8"/><circle cx="56" cy="91" r="8"/></g>'
    + '<g fill="#85B99A"><circle cx="235" cy="151" r="19"/><circle cx="260" cy="146" r="23"/><circle cx="290" cy="153" r="18"/></g><g fill="#A9CFAC"><circle cx="240" cy="142" r="12"/><circle cx="270" cy="139" r="13"/></g></svg>',
  summer: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 220" preserveAspectRatio="xMidYMid slice"><rect width="400" height="220" fill="#91D0EF"/>'
    + '<g fill="#FFFFFF" opacity=".95"><ellipse cx="110" cy="48" rx="48" ry="15"/><circle cx="87" cy="39" r="17"/><circle cx="115" cy="32" r="23"/><circle cx="143" cy="43" r="16"/><ellipse cx="320" cy="70" rx="39" ry="12"/><circle cx="301" cy="62" r="15"/><circle cx="326" cy="58" r="18"/></g>'
    + '<path d="M0 150Q95 105 190 150Q290 105 400 148V220H0Z" fill="#8FBD9A"/><path d="M0 175Q100 140 210 172Q320 135 400 166V220H0Z" fill="#67A878"/>'
    + '<path d="M0 184Q200 164 400 183V220H0Z" fill="#D8BE91"/><path d="M0 198Q200 181 400 198" fill="none" stroke="#F8E9C8" stroke-width="3"/>'
    + '<path d="M77 184Q91 130 80 83L96 60M83 117L49 91M86 106L116 76" fill="none" stroke="#876047" stroke-width="12" stroke-linecap="round"/>'
    + '<g fill="#3F9466"><circle cx="50" cy="73" r="28"/><circle cx="82" cy="49" r="32"/><circle cx="115" cy="69" r="30"/><circle cx="69" cy="96" r="27"/><circle cx="104" cy="96" r="25"/></g>'
    + '<g fill="#76BB83"><circle cx="54" cy="63" r="14"/><circle cx="84" cy="42" r="15"/><circle cx="113" cy="62" r="13"/></g>'
    + '<g fill="#5BA879"><circle cx="264" cy="148" r="20"/><circle cx="287" cy="142" r="23"/><circle cx="310" cy="150" r="19"/></g><path d="M287 157V181" stroke="#927052" stroke-width="6"/></svg>',
  autumn: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 220" preserveAspectRatio="xMidYMid slice"><rect width="400" height="220" fill="#D9E5E9"/>'
    + '<g fill="#F8F4EA"><ellipse cx="120" cy="44" rx="44" ry="12"/><circle cx="100" cy="36" r="14"/><circle cx="126" cy="32" r="17"/><ellipse cx="320" cy="65" rx="35" ry="11"/><circle cx="307" cy="57" r="14"/></g>'
    + '<path d="M0 150Q110 116 205 153Q300 110 400 149V220H0Z" fill="#C8B58D"/><path d="M0 174Q100 145 200 175Q300 143 400 172V220H0Z" fill="#A6B98D"/>'
    + '<path d="M0 185Q200 167 400 184V220H0Z" fill="#D6B58C"/>'
    + '<path d="M88 186Q91 131 83 90L101 63M87 127L51 91M91 110L124 78" fill="none" stroke="#815B43" stroke-width="10" stroke-linecap="round"/>'
    + '<g fill="#D66D43"><circle cx="51" cy="73" r="27"/><circle cx="81" cy="50" r="32"/><circle cx="114" cy="68" r="30"/><circle cx="60" cy="101" r="25"/><circle cx="101" cy="96" r="28"/></g>'
    + '<g fill="#E99A58"><circle cx="43" cy="63" r="13"/><circle cx="80" cy="43" r="15"/><circle cx="113" cy="61" r="14"/><circle cx="100" cy="95" r="12"/></g>'
    + '<g fill="#B94F3C"><circle cx="67" cy="52" r="9"/><circle cx="126" cy="82" r="10"/><circle cx="50" cy="102" r="9"/></g>'
    + '<g fill="#D88A4F"><circle cx="250" cy="151" r="18"/><circle cx="274" cy="144" r="23"/><circle cx="300" cy="152" r="18"/></g><path d="M275 160V182" stroke="#927052" stroke-width="6"/>'
    + '<g fill="#E59A52"><path d="M163 103Q179 91 181 107Q170 116 163 103Z"/><path d="M210 128Q226 117 226 133Q215 140 210 128Z"/><path d="M129 153Q143 143 147 157Q136 165 129 153Z"/></g></svg>',
  winter: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 220" preserveAspectRatio="xMidYMid slice"><rect width="400" height="220" fill="#D8E5ED"/>'
    + '<g fill="#F7FAFC"><ellipse cx="104" cy="47" rx="43" ry="12"/><circle cx="84" cy="39" r="14"/><circle cx="110" cy="34" r="18"/><ellipse cx="315" cy="61" rx="44" ry="12"/><circle cx="292" cy="54" r="15"/><circle cx="322" cy="48" r="18"/></g>'
    + '<path d="M0 155Q100 118 200 151Q310 112 400 152V220H0Z" fill="#B9CCD6"/><path d="M0 172Q120 142 220 171Q330 140 400 169V220H0Z" fill="#E7EFF1"/>'
    + '<path d="M0 180Q120 163 240 179Q330 163 400 177V220H0Z" fill="#FFFFFF"/>'
    + '<g fill="none" stroke="#8B9293" stroke-width="5" stroke-linecap="round"><path d="M85 185L88 102L65 73M88 128L113 96M87 112L75 91M88 103L99 72"/><path d="M290 183L293 124L272 101M293 145L316 119"/></g>'
    + '<path d="M0 188Q90 173 170 185Q280 172 400 186" fill="none" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round"/>'
    + '<g fill="#FFFFFF"><circle cx="45" cy="55" r="3"/><circle cx="172" cy="32" r="3"/><circle cx="230" cy="79" r="3"/><circle cx="357" cy="35" r="3"/><circle cx="190" cy="105" r="2.5"/><circle cx="330" cy="105" r="2.5"/><circle cx="135" cy="80" r="2.5"/></g>'
    + '<g fill="#F5FAFC"><ellipse cx="70" cy="198" rx="40" ry="10"/><ellipse cx="220" cy="198" rx="55" ry="11"/><ellipse cx="350" cy="197" rx="42" ry="10"/></g></svg>',
  plants: [
    '<svg viewBox="0 0 60 80"><path d="M13 45H47L42 74H18Z" fill="#D98F78"/><path d="M15 47H45L43 54H17Z" fill="#E9B19A"/><ellipse cx="30" cy="45" rx="17" ry="4" fill="#9D7656"/>'
    + '<g fill="#8EB99A"><ellipse cx="30" cy="34" rx="8" ry="17"/><ellipse cx="19" cy="39" rx="7" ry="14" transform="rotate(-48 19 39)"/><ellipse cx="41" cy="39" rx="7" ry="14" transform="rotate(48 41 39)"/><ellipse cx="17" cy="29" rx="6" ry="12" transform="rotate(-65 17 29)"/><ellipse cx="43" cy="29" rx="6" ry="12" transform="rotate(65 43 29)"/><ellipse cx="30" cy="21" rx="6" ry="12"/></g>'
    + '<g fill="#B9D4AD"><ellipse cx="30" cy="23" rx="3" ry="8"/><ellipse cx="20" cy="32" rx="3" ry="7" transform="rotate(-48 20 32)"/><ellipse cx="40" cy="32" rx="3" ry="7" transform="rotate(48 40 32)"/></g></svg>',
    '<svg viewBox="0 0 60 80"><path d="M13 49H47L42 75H18Z" fill="#E7A78D"/><path d="M11 46H49V52H11Z" fill="#F2C3A9"/><ellipse cx="30" cy="47" rx="17" ry="4" fill="#947252"/>'
    + '<path d="M30 47Q29 30 30 18" fill="none" stroke="#64966F" stroke-width="3" stroke-linecap="round"/><path d="M29 38Q16 25 15 37Q20 44 29 38Z" fill="#82B58B"/><path d="M30 33Q43 20 45 32Q39 40 30 33Z" fill="#9CC99B"/>'
    + '<g fill="#F5B6C7"><circle cx="30" cy="15" r="6"/><circle cx="22" cy="18" r="6"/><circle cx="25" cy="26" r="6"/><circle cx="35" cy="26" r="6"/><circle cx="38" cy="18" r="6"/></g><circle cx="30" cy="21" r="5" fill="#F4D47C"/></svg>',
    '<svg viewBox="0 0 60 80"><path d="M13 53H47L42 75H18Z" fill="#C98F70"/><path d="M11 50H49V56H11Z" fill="#E5B18E"/><ellipse cx="30" cy="52" rx="17" ry="4" fill="#8B6A4E"/>'
    + '<path d="M30 52V26" fill="none" stroke="#927052" stroke-width="4" stroke-linecap="round"/><path d="M30 38L19 28M30 35L41 24" fill="none" stroke="#927052" stroke-width="3" stroke-linecap="round"/>'
    + '<g fill="#6FA77D"><circle cx="30" cy="17" r="13"/><circle cx="19" cy="26" r="11"/><circle cx="41" cy="26" r="11"/><circle cx="30" cy="31" r="12"/></g>'
    + '<g fill="#A9CEA0"><circle cx="27" cy="12" r="6"/><circle cx="16" cy="23" r="5"/><circle cx="39" cy="21" r="6"/><circle cx="30" cy="28" r="5"/></g></svg>'
  ]
};
// 光線：一天的時段（光斑顏色與透明度、窗外天空色調）
const LIGHTS = {
  morning: { name: '早上', spot: [255, 242, 194, .5], sky: 'rgba(169,216,239,.18)', tint: 'rgba(255,250,236,.05)', elev: 34, from: 'left' },
  noon: { name: '中午', spot: [255, 232, 168, .4], sky: 'rgba(121,196,235,.12)', tint: 'rgba(255,248,230,.04)', elev: 62, from: 'left' },
  afternoon: { name: '下午', spot: [247, 201, 135, .48], sky: 'rgba(255,214,170,.18)', tint: 'rgba(255,214,160,.07)', elev: 30, from: 'right' },
  evening: { name: '傍晚', spot: [235, 168, 121, .42], sky: 'rgba(232,150,120,.32)', tint: 'rgba(255,170,120,.12)', elev: 14, from: 'right' }
};
const SEASONS = { spring: '春天', summer: '夏天', autumn: '秋天', winter: '冬天' };
// 光線與季節只記在這台電腦（自動＝依現在的時間和月份）
const Light = {
  get() { let o = {}; try { o = JSON.parse(localStorage.getItem('bxbox-light') || '{}') || {}; } catch (e) { } return Object.assign({ time: 'auto', season: 'auto' }, o); },
  set(k, v) { const o = this.get(); o[k] = v; try { localStorage.setItem('bxbox-light', JSON.stringify(o)); } catch (e) { } },
  time(d = new Date()) {
    const t = this.get().time; if (t !== 'auto') return t;
    const m = d.getHours() * 60 + d.getMinutes();
    return m < 11 * 60 ? 'morning' : m < 13 * 60 ? 'noon' : m < 16 * 60 ? 'afternoon' : 'evening';
  },
  season(d = new Date()) {
    const s = this.get().season; if (s !== 'auto') return s;
    const mo = d.getMonth() + 1;
    return mo >= 3 && mo <= 5 ? 'spring' : mo >= 6 && mo <= 8 ? 'summer' : mo >= 9 && mo <= 11 ? 'autumn' : 'winter';
  }
};
