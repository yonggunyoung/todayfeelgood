/* 글꾸미 — unicode-fonts.js : 텍스트 → 유니코드 멋글씨 변환 코어 (순수·무 DOM).
 * instafont류의 핵심: A~Z·a~z·0~9를 유니코드 수학 알파벳/원문자/전각 등으로 치환.
 * 모든 함수는 순수(입력만으로 결정) → tests/unicode-fonts.test.mjs 에서 검증.
 * 브라우저: ESM import / Node(test): 동일 ESM import. (DOM 미참조)
 */
"use strict";

// 범위 기반 스타일: 대문자/소문자/숫자 시작 코드포인트 + 예외표(블록 구멍 메우기).
// 유니코드 'Mathematical Alphanumeric Symbols'는 일부 글자가 'Letterlike Symbols'에
// 따로 들어가 있어(예: 스크립트 B=ℬ) 비워두면 예약/공백이 된다 → 예외표로 보정.
function fromRange(upperBase, lowerBase, digitBase, exceptions) {
  exceptions = exceptions || {};
  const map = {};
  for (let i = 0; i < 26; i++) {
    const U = String.fromCharCode(65 + i);
    const L = String.fromCharCode(97 + i);
    map[U] = exceptions[U] != null ? exceptions[U]
      : (upperBase != null ? String.fromCodePoint(upperBase + i) : U);
    map[L] = exceptions[L] != null ? exceptions[L]
      : (lowerBase != null ? String.fromCodePoint(lowerBase + i) : L);
  }
  for (let d = 0; d < 10; d++) {
    const D = String(d);
    if (exceptions[D] != null) map[D] = exceptions[D];
    else if (digitBase != null) map[D] = String.fromCodePoint(digitBase + d);
  }
  return map;
}

// 예외표 ----------------------------------------------------------------
const SCRIPT_EXC = {
  B: "ℬ", E: "ℰ", F: "ℱ", H: "ℋ", I: "ℐ",
  L: "ℒ", M: "ℳ", R: "ℛ",
  e: "ℯ", g: "ℊ", o: "ℴ",
};
const FRAKTUR_EXC = { C: "ℭ", H: "ℌ", I: "ℑ", R: "ℜ", Z: "ℨ" };
const DOUBLE_EXC = {
  C: "ℂ", H: "ℍ", N: "ℕ", P: "ℙ", Q: "ℚ", R: "ℝ", Z: "ℤ",
};
const ITALIC_EXC = { h: "ℎ" };

// 원/네모/괄호 숫자 (선형 base로는 안 잡혀서 명시).
const CIRCLED_DIGITS = { 0: "⓪", 1: "①", 2: "②", 3: "③", 4: "④",
  5: "⑤", 6: "⑥", 7: "⑦", 8: "⑧", 9: "⑨" };
const NEG_CIRCLED_DIGITS = { 0: "⓿", 1: "❶", 2: "❷", 3: "❸", 4: "❹",
  5: "❺", 6: "❻", 7: "❼", 8: "❽", 9: "❾" };
const PAREN_DIGITS = { 1: "⑴", 2: "⑵", 3: "⑶", 4: "⑷", 5: "⑸",
  6: "⑹", 7: "⑺", 8: "⑻", 9: "⑼" };

// 커스텀 맵 스타일 ------------------------------------------------------
const SMALLCAPS = "ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘǫʀꜱᴛᴜᴠᴡxʏᴢ";
const SUPER_L = { a:"ᵃ",b:"ᵇ",c:"ᶜ",d:"ᵈ",e:"ᵉ",f:"ᶠ",g:"ᵍ",h:"ʰ",i:"ⁱ",j:"ʲ",k:"ᵏ",l:"ˡ",
  m:"ᵐ",n:"ⁿ",o:"ᵒ",p:"ᵖ",q:"q",r:"ʳ",s:"ˢ",t:"ᵗ",u:"ᵘ",v:"ᵛ",w:"ʷ",x:"ˣ",y:"ʸ",z:"ᶻ" };
const SUPER_D = { 0:"⁰",1:"¹",2:"²",3:"³",4:"⁴",5:"⁵",6:"⁶",7:"⁷",8:"⁸",9:"⁹" };
const SUB_L = { a:"ₐ",e:"ₑ",h:"ₕ",i:"ᵢ",j:"ⱼ",k:"ₖ",l:"ₗ",m:"ₘ",n:"ₙ",o:"ₒ",p:"ₚ",
  r:"ᵣ",s:"ₛ",t:"ₜ",u:"ᵤ",v:"ᵥ",x:"ₓ" };
const SUB_D = { 0:"₀",1:"₁",2:"₂",3:"₃",4:"₄",5:"₅",6:"₆",7:"₇",8:"₈",9:"₉" };

// 뒤집기(상하반전) — 매핑 후 문자열을 역순으로.
const FLIP = {
  a:"ɐ",b:"q",c:"ɔ",d:"p",e:"ǝ",f:"ɟ",g:"ƃ",h:"ɥ",i:"ᴉ",j:"ɾ",k:"ʞ",l:"l",m:"ɯ",n:"u",
  o:"o",p:"d",q:"b",r:"ɹ",s:"s",t:"ʇ",u:"n",v:"ʌ",w:"ʍ",x:"x",y:"ʎ",z:"z",
  A:"∀",B:"𐐒",C:"Ɔ",D:"◖",E:"Ǝ",F:"Ⅎ",G:"⅁",H:"H",I:"I",J:"ſ",K:"ʞ",L:"˥",M:"W",N:"N",
  O:"O",P:"Ԁ",Q:"Ò",R:"ᴚ",S:"S",T:"⊥",U:"∩",V:"Λ",W:"M",X:"X",Y:"⅄",Z:"Z",
  0:"0",1:"Ɩ",2:"ᄅ",3:"Ɛ",4:"ㄣ",5:"ϛ",6:"9",7:"ㄥ",8:"8",9:"6",
  ".":"˙",",":"'","'":",",'"':"„","?":"¿","!":"¡","(":")",")":"(","[":"]","]":"[",
  "{":"}","}":"{","<":">",">":"<","&":"⅋","_":"‾",";":"؛","⁅":"⁆",
};

function customMap(builder) {
  const map = {};
  builder(map);
  return map;
}
const SMALLCAPS_MAP = customMap((m) => {
  for (let i = 0; i < 26; i++) {
    const c = String.fromCharCode(97 + i);
    m[c] = SMALLCAPS[i];
    m[c.toUpperCase()] = SMALLCAPS[i];
  }
});
const SUPER_MAP = Object.assign({}, SUPER_D, SUPER_L);
const SUB_MAP = Object.assign({}, SUB_D, SUB_L);

// 스타일 정의표 ---------------------------------------------------------
// kind: 'map'(치환) | 'combine'(결합문자 덧입힘) | 'flip'(치환+역순)
export const STYLES = [
  { id: "bold",          name: "볼드",            kind: "map", map: fromRange(0x1D400, 0x1D41A, 0x1D7CE) },
  { id: "italic",        name: "이탤릭",          kind: "map", map: fromRange(0x1D434, 0x1D44E, null, ITALIC_EXC) },
  { id: "bolditalic",    name: "볼드 이탤릭",     kind: "map", map: fromRange(0x1D468, 0x1D482, null) },
  { id: "script",        name: "필기체",          kind: "map", map: fromRange(0x1D49C, 0x1D4B6, null, SCRIPT_EXC) },
  { id: "boldscript",    name: "볼드 필기체",     kind: "map", map: fromRange(0x1D4D0, 0x1D4EA, null) },
  { id: "fraktur",       name: "고딕(프락투어)",  kind: "map", map: fromRange(0x1D504, 0x1D51E, null, FRAKTUR_EXC) },
  { id: "boldfraktur",   name: "볼드 프락투어",   kind: "map", map: fromRange(0x1D56C, 0x1D586, null) },
  { id: "doublestruck",  name: "더블스트럭",      kind: "map", map: fromRange(0x1D538, 0x1D552, 0x1D7D8, DOUBLE_EXC) },
  { id: "sans",          name: "산세리프",        kind: "map", map: fromRange(0x1D5A0, 0x1D5BA, 0x1D7E2) },
  { id: "sansbold",      name: "산세리프 볼드",   kind: "map", map: fromRange(0x1D5D4, 0x1D5EE, 0x1D7EC) },
  { id: "sansitalic",    name: "산세리프 이탤릭", kind: "map", map: fromRange(0x1D608, 0x1D622, null) },
  { id: "sansbolditalic",name: "산세 볼드이탤릭", kind: "map", map: fromRange(0x1D63C, 0x1D656, null) },
  { id: "mono",          name: "모노스페이스",    kind: "map", map: fromRange(0x1D670, 0x1D68A, 0x1D7F6) },
  { id: "fullwidth",     name: "전각",            kind: "map", map: fromRange(0xFF21, 0xFF41, 0xFF10) },
  { id: "smallcaps",     name: "작은 대문자",     kind: "map", map: SMALLCAPS_MAP },
  { id: "circled",       name: "동그라미",        kind: "map", map: fromRange(0x24B6, 0x24D0, null, CIRCLED_DIGITS) },
  { id: "circledneg",    name: "검은 동그라미",   kind: "map", map: fromRange(0x1F150, 0x1F150, null, NEG_CIRCLED_DIGITS) },
  { id: "squared",       name: "네모",            kind: "map", map: fromRange(0x1F130, 0x1F130, null) },
  { id: "squaredneg",    name: "검은 네모",       kind: "map", map: fromRange(0x1F170, 0x1F170, null) },
  { id: "parenthesized", name: "괄호",            kind: "map", map: fromRange(0x1F110, 0x249C, null, PAREN_DIGITS) },
  { id: "regional",      name: "국기 칸",         kind: "map", map: fromRange(0x1F1E6, 0x1F1E6, null) },
  { id: "superscript",   name: "위 첨자",         kind: "map", map: SUPER_MAP },
  { id: "subscript",     name: "아래 첨자",       kind: "map", map: SUB_MAP },
  { id: "upsidedown",    name: "뒤집기",          kind: "flip", map: FLIP },
  { id: "strike",        name: "취소선",          kind: "combine", combine: "̶" },
  { id: "slash",         name: "빗금",            kind: "combine", combine: "̷" },
  { id: "underline",     name: "밑줄",            kind: "combine", combine: "̲" },
  { id: "doubleunder",   name: "이중 밑줄",       kind: "combine", combine: "̳" },
  { id: "overline",      name: "윗줄",            kind: "combine", combine: "̅" },
  { id: "tilde",         name: "물결",            kind: "combine", combine: "̴" },
];

const STYLE_BY_ID = Object.create(null);
for (const s of STYLES) STYLE_BY_ID[s.id] = s;

// 호환성 주의 스타일(인스타·일부 구형 안드로이드에서 깨질 수 있음) 플래그.
const RISKY = new Set(["fraktur", "boldfraktur", "regional", "squared", "squaredneg",
  "circledneg", "parenthesized", "superscript", "subscript", "upsidedown",
  "strike", "slash", "underline", "doubleunder", "overline", "tilde"]);
for (const s of STYLES) s.risk = RISKY.has(s.id);
// 전각은 공백도 전각으로(자연스러운 전각 텍스트).
if (STYLE_BY_ID.fullwidth) STYLE_BY_ID.fullwidth.map[" "] = "　";

// 코드포인트 단위 순회(서로게이트 페어 보존).
function* codePoints(str) {
  for (const ch of String(str)) yield ch;
}

// 핵심: 텍스트를 styleId 스타일로 변환. 매핑 없는 문자는 원형 유지.
export function convert(text, styleId) {
  const st = STYLE_BY_ID[styleId];
  if (text == null) return "";
  text = String(text);
  if (!st) return text;

  if (st.kind === "combine") {
    let out = "";
    for (const ch of codePoints(text)) {
      out += ch;
      if (ch !== "\n" && ch !== "\r") out += st.combine; // 줄바꿈엔 결합문자 안 붙임
    }
    return out;
  }

  if (st.kind === "flip") {
    const chars = [];
    for (const ch of codePoints(text)) {
      const low = ch in st.map ? st.map[ch] : (ch.toLowerCase() in st.map ? st.map[ch.toLowerCase()] : ch);
      chars.push(low);
    }
    return chars.reverse().join("");
  }

  // kind === 'map'
  let out = "";
  for (const ch of codePoints(text)) out += (ch in st.map ? st.map[ch] : ch);
  return out;
}

// 미리보기 그리드용: 모든 스타일 결과를 한 번에(호환성 플래그 포함).
export function convertAll(text) {
  return STYLES.map((s) => ({ id: s.id, name: s.name, result: convert(text, s.id), risk: !!s.risk }));
}

export function styleName(styleId) {
  return STYLE_BY_ID[styleId] ? STYLE_BY_ID[styleId].name : styleId;
}
