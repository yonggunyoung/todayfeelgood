/* 글꾸미 — unicode-fonts.js : 텍스트 → 유니코드 멋글씨 변환 코어 (순수·무 DOM).
 * 호환성 등급제(tier 1 안전 / 2 주의 / 3 제외권장) — '뚜렷하게 변환되면서도 안 깨지게'.
 * tier 1을 기본 상단에 노출. 모든 함수 순수 → tests/unicode-fonts.test.mjs 검증.
 */
"use strict";

// 범위 기반 스타일: 대문자/소문자/숫자 시작 코드포인트 + 예외표(블록 구멍 메우기).
function fromRange(upperBase, lowerBase, digitBase, exceptions) {
  exceptions = exceptions || {};
  const map = {};
  for (let i = 0; i < 26; i++) {
    const U = String.fromCharCode(65 + i);
    const L = String.fromCharCode(97 + i);
    map[U] = exceptions[U] != null ? exceptions[U] : (upperBase != null ? String.fromCodePoint(upperBase + i) : U);
    map[L] = exceptions[L] != null ? exceptions[L] : (lowerBase != null ? String.fromCodePoint(lowerBase + i) : L);
  }
  for (let d = 0; d < 10; d++) {
    const D = String(d);
    if (exceptions[D] != null) map[D] = exceptions[D];
    else if (digitBase != null) map[D] = String.fromCodePoint(digitBase + d);
  }
  return map;
}

// 예외표 ----------------------------------------------------------------
const SCRIPT_EXC = { B: "ℬ", E: "ℰ", F: "ℱ", H: "ℋ", I: "ℐ", L: "ℒ", M: "ℳ", R: "ℛ", e: "ℯ", g: "ℊ", o: "ℴ" };
const FRAKTUR_EXC = { C: "ℭ", H: "ℌ", I: "ℑ", R: "ℜ", Z: "ℨ" };
const DOUBLE_EXC = { C: "ℂ", H: "ℍ", N: "ℕ", P: "ℙ", Q: "ℚ", R: "ℝ", Z: "ℤ" };
const ITALIC_EXC = { h: "ℎ" };
const CIRCLED_DIGITS = { 0: "⓪", 1: "①", 2: "②", 3: "③", 4: "④", 5: "⑤", 6: "⑥", 7: "⑦", 8: "⑧", 9: "⑨" };
const NEG_CIRCLED_DIGITS = { 0: "⓿", 1: "❶", 2: "❷", 3: "❸", 4: "❹", 5: "❺", 6: "❻", 7: "❼", 8: "❽", 9: "❾" };
const PAREN_DIGITS = { 1: "⑴", 2: "⑵", 3: "⑶", 4: "⑷", 5: "⑸", 6: "⑹", 7: "⑺", 8: "⑻", 9: "⑼" };

// 커스텀 맵 ------------------------------------------------------------
// 작은 대문자 — Q는 정식 small-cap ꞯ(U+A7AF)로 보정(기존 ǫ 오용 수정). x는 폴백.
const SMALLCAPS = "ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘꞯʀꜱᴛᴜᴠᴡxʏᴢ";
const SUPER_L = { a:"ᵃ",b:"ᵇ",c:"ᶜ",d:"ᵈ",e:"ᵉ",f:"ᶠ",g:"ᵍ",h:"ʰ",i:"ⁱ",j:"ʲ",k:"ᵏ",l:"ˡ",m:"ᵐ",n:"ⁿ",o:"ᵒ",p:"ᵖ",q:"q",r:"ʳ",s:"ˢ",t:"ᵗ",u:"ᵘ",v:"ᵛ",w:"ʷ",x:"ˣ",y:"ʸ",z:"ᶻ" };
const SUPER_D = { 0:"⁰",1:"¹",2:"²",3:"³",4:"⁴",5:"⁵",6:"⁶",7:"⁷",8:"⁸",9:"⁹" };
const SUB_L = { a:"ₐ",e:"ₑ",h:"ₕ",i:"ᵢ",j:"ⱼ",k:"ₖ",l:"ₗ",m:"ₘ",n:"ₙ",o:"ₒ",p:"ₚ",r:"ᵣ",s:"ₛ",t:"ₜ",u:"ᵤ",v:"ᵥ",x:"ₓ" };
const SUB_D = { 0:"₀",1:"₁",2:"₂",3:"₃",4:"₄",5:"₅",6:"₆",7:"₇",8:"₈",9:"₉" };
const FLIP = {
  a:"ɐ",b:"q",c:"ɔ",d:"p",e:"ǝ",f:"ɟ",g:"ƃ",h:"ɥ",i:"ᴉ",j:"ɾ",k:"ʞ",l:"l",m:"ɯ",n:"u",o:"o",p:"d",q:"b",r:"ɹ",s:"s",t:"ʇ",u:"n",v:"ʌ",w:"ʍ",x:"x",y:"ʎ",z:"z",
  A:"∀",B:"𐐒",C:"Ɔ",D:"◖",E:"Ǝ",F:"Ⅎ",G:"⅁",H:"H",I:"I",J:"ſ",K:"ʞ",L:"˥",M:"W",N:"N",O:"O",P:"Ԁ",Q:"Ò",R:"ᴚ",S:"S",T:"⊥",U:"∩",V:"Λ",W:"M",X:"X",Y:"⅄",Z:"Z",
  0:"0",1:"Ɩ",2:"ᄅ",3:"Ɛ",4:"ㄣ",5:"ϛ",6:"9",7:"ㄥ",8:"8",9:"6",
  ".":"˙",",":"'","'":",",'"':"„","?":"¿","!":"¡","(":")",")":"(","[":"]","]":"[","{":"}","}":"{","<":">",">":"<","&":"⅋","_":"‾",";":"؛",
};
function customMap(builder) { const m = {}; builder(m); return m; }
const SMALLCAPS_MAP = customMap((m) => { for (let i = 0; i < 26; i++) { const c = String.fromCharCode(97 + i); m[c] = SMALLCAPS[i]; m[c.toUpperCase()] = SMALLCAPS[i]; } });
const SUPER_MAP = Object.assign({}, SUPER_D, SUPER_L);
const SUB_MAP = Object.assign({}, SUB_D, SUB_L);

// Zalgo(채팅 뚫는 글씨) — 결합기호 스태킹. 결정론적(인덱스 해시) → 테스트 안정.
const Z_UP = [0x0300,0x0301,0x0302,0x0303,0x0304,0x0306,0x0307,0x0308,0x030A,0x030B,0x0312,0x0313,0x0314,0x033D,0x0346,0x034A,0x0350,0x0351,0x0357];
const Z_MID = [0x0334,0x0335,0x0336,0x0337,0x0338];
const Z_DOWN = [0x0316,0x0317,0x0318,0x0319,0x031C,0x031D,0x0320,0x0324,0x0325,0x0326,0x0329,0x032E,0x0331,0x0332,0x0345,0x0359];
export function zalgo(text, up, mid, down) {
  up = up == null ? 3 : up; mid = mid == null ? 1 : mid; down = down == null ? 3 : down;
  let out = "", i = 0;
  for (const ch of Array.from(String(text == null ? "" : text))) {
    out += ch;
    if (ch === "\n" || ch === "\r" || ch === " ") { i++; continue; }
    for (let j = 0; j < up; j++) out += String.fromCodePoint(Z_UP[(i * 7 + j * 13) % Z_UP.length]);
    for (let j = 0; j < mid; j++) out += String.fromCodePoint(Z_MID[(i * 5 + j * 11) % Z_MID.length]);
    for (let j = 0; j < down; j++) out += String.fromCodePoint(Z_DOWN[(i * 3 + j * 17) % Z_DOWN.length]);
    i++;
  }
  return out;
}

// 스타일 정의 — DEFAULT_ORDER(호환성 매트릭스 기반: tier1 안전 → tier2 주의 → tier3 제외) 순.
// kind: map(치환) | combine(결합) | flip(치환+역순) | wide(공백삽입) | zalgo
export const STYLES = [
  // ── Tier 1: 안전 + 변화 뚜렷 ──
  { id: "fullwidth",     name: "전각",            tier: 1, kind: "map", map: fromRange(0xFF21, 0xFF41, 0xFF10) },
  { id: "wide",          name: "와이드 띄어쓰기", tier: 1, kind: "wide" },
  { id: "bold",          name: "볼드",            tier: 1, kind: "map", map: fromRange(0x1D400, 0x1D41A, 0x1D7CE) },
  { id: "bolditalic",    name: "볼드 이탤릭",     tier: 1, kind: "map", map: fromRange(0x1D468, 0x1D482, null) },
  { id: "italic",        name: "이탤릭",          tier: 1, kind: "map", map: fromRange(0x1D434, 0x1D44E, null, ITALIC_EXC) },
  { id: "boldscript",    name: "볼드 필기체",     tier: 1, kind: "map", map: fromRange(0x1D4D0, 0x1D4EA, null) },
  { id: "script",        name: "필기체",          tier: 1, kind: "map", map: fromRange(0x1D49C, 0x1D4B6, null, SCRIPT_EXC) },
  { id: "doublestruck",  name: "더블스트럭",      tier: 1, kind: "map", map: fromRange(0x1D538, 0x1D552, 0x1D7D8, DOUBLE_EXC) },
  { id: "sansbold",      name: "산세리프 볼드",   tier: 1, kind: "map", map: fromRange(0x1D5D4, 0x1D5EE, 0x1D7EC) },
  { id: "sans",          name: "산세리프",        tier: 1, kind: "map", map: fromRange(0x1D5A0, 0x1D5BA, 0x1D7E2) },
  { id: "sansbolditalic",name: "산세 볼드이탤릭", tier: 1, kind: "map", map: fromRange(0x1D63C, 0x1D656, null) },
  { id: "sansitalic",    name: "산세리프 이탤릭", tier: 1, kind: "map", map: fromRange(0x1D608, 0x1D622, null) },
  { id: "mono",          name: "모노스페이스",    tier: 1, kind: "map", map: fromRange(0x1D670, 0x1D68A, 0x1D7F6) },
  { id: "smallcaps",     name: "작은 대문자",     tier: 1, kind: "map", map: SMALLCAPS_MAP },
  { id: "circled",       name: "동그라미",        tier: 1, kind: "map", map: fromRange(0x24B6, 0x24D0, null, CIRCLED_DIGITS) },
  { id: "upsidedown",    name: "뒤집기",          tier: 1, kind: "flip", map: FLIP },
  // ── Tier 2: 주의(일부 앱·구형에서 깨질 수 있음) ──
  { id: "fraktur",       name: "고딕(프락투어)",  tier: 2, kind: "map", map: fromRange(0x1D504, 0x1D51E, null, FRAKTUR_EXC) },
  { id: "boldfraktur",   name: "볼드 프락투어",   tier: 2, kind: "map", map: fromRange(0x1D56C, 0x1D586, null) },
  { id: "parenthesized", name: "괄호",            tier: 2, kind: "map", map: fromRange(0x1F110, 0x249C, null, PAREN_DIGITS) },
  { id: "squared",       name: "네모",            tier: 2, kind: "map", map: fromRange(0x1F130, 0x1F130, null) },
  { id: "circledneg",    name: "검은 동그라미",   tier: 2, kind: "map", map: fromRange(0x1F150, 0x1F150, null, NEG_CIRCLED_DIGITS) },
  { id: "squaredneg",    name: "검은 네모",       tier: 2, kind: "map", map: fromRange(0x1F170, 0x1F170, null) },
  { id: "superscript",   name: "위 첨자",         tier: 2, kind: "map", map: SUPER_MAP },
  { id: "subscript",     name: "아래 첨자",       tier: 2, kind: "map", map: SUB_MAP },
  { id: "zalgo",         name: "지옥체(채팅 뚫기)", tier: 2, kind: "zalgo" },
  { id: "strike",        name: "취소선",          tier: 2, kind: "combine", combine: "̶" },
  { id: "underline",     name: "밑줄",            tier: 2, kind: "combine", combine: "̲" },
  { id: "slash",         name: "빗금",            tier: 2, kind: "combine", combine: "̷" },
  { id: "doubleunder",   name: "이중 밑줄",       tier: 2, kind: "combine", combine: "̳" },
  { id: "overline",      name: "윗줄",            tier: 2, kind: "combine", combine: "̅" },
  { id: "tilde",         name: "물결",            tier: 2, kind: "combine", combine: "̴" },
  // ── Tier 3: 제외 권장(입력에 따라 국기로 합쳐져 글자가 사라짐) ──
  { id: "regional",      name: "국기 칸",         tier: 3, kind: "map", map: fromRange(0x1F1E6, 0x1F1E6, null) },
];

const STYLE_BY_ID = Object.create(null);
for (const s of STYLES) { STYLE_BY_ID[s.id] = s; s.risk = s.tier >= 2; }
if (STYLE_BY_ID.fullwidth) STYLE_BY_ID.fullwidth.map[" "] = "　"; // 전각 공백
export const DEFAULT_ORDER = STYLES.map((s) => s.id);

function* codePoints(str) { for (const ch of String(str)) yield ch; }

// 핵심: 텍스트를 styleId 스타일로 변환. 매핑 없는 문자는 원형 유지.
export function convert(text, styleId) {
  const st = STYLE_BY_ID[styleId];
  if (text == null) return "";
  text = String(text);
  if (!st) return text;
  if (st.kind === "wide") return Array.from(text).join(" ");
  if (st.kind === "zalgo") return zalgo(text);
  if (st.kind === "combine") {
    let out = "";
    for (const ch of codePoints(text)) { out += ch; if (ch !== "\n" && ch !== "\r") out += st.combine; }
    return out;
  }
  if (st.kind === "flip") {
    const chars = [];
    for (const ch of codePoints(text)) chars.push(ch in st.map ? st.map[ch] : (ch.toLowerCase() in st.map ? st.map[ch.toLowerCase()] : ch));
    return chars.reverse().join("");
  }
  let out = "";
  for (const ch of codePoints(text)) out += (ch in st.map ? st.map[ch] : ch);
  return out;
}

// 미리보기 그리드용: 모든 스타일 결과(호환성 tier/risk 포함).
export function convertAll(text) {
  return STYLES.map((s) => ({ id: s.id, name: s.name, result: convert(text, s.id), risk: !!s.risk, tier: s.tier }));
}

export function styleName(styleId) { return STYLE_BY_ID[styleId] ? STYLE_BY_ID[styleId].name : styleId; }
export function styleTier(styleId) { return STYLE_BY_ID[styleId] ? STYLE_BY_ID[styleId].tier : 99; }
