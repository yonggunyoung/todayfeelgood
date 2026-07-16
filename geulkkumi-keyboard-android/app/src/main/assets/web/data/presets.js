/* 글꾸미 — data/presets.js : 완성 닉네임 프리셋(조합 레시피) 갤러리.
 * 완성본을 저장하지 않고 {글꼴 × 사이기호 × 프레임} 레시피만 두고 사용자의 글자로 생성한다
 * (조합 생성 구조 — piliapp류 '완성 텍스트 목록'보다 무한하고 가볍다).
 * style: STYLES id | "mix"(믹스체) | ""(원본). renderNick 으로 적용.
 */
"use strict";

import { convert, mixStyle } from "../engine/unicode-fonts.js";
import { mix } from "../engine/decorate.js";

export const NICK_PRESETS = [
  // ── 감성 (인스타 바이오·프사) ──
  { id: "aster",    name: "별가루",     style: "boldscript", sep: "", frame: "⋆｡°✩ {} ✩°｡⋆" },
  { id: "moonveil", name: "달빛",       style: "script",     sep: "", frame: "☾ ⋆｡˚ {} ˚｡⋆ ☽" },
  { id: "cloudy",   name: "구름결",     style: "",           sep: "", frame: "˚｡⋆ ☁︎ {} ☁︎ ⋆｡˚" },
  { id: "petal",    name: "꽃잎",       style: "italic",     sep: "", frame: "✿｡.｡:* {} *:｡.｡✿" },
  { id: "dawn",     name: "새벽감성",   style: "",           sep: "˚", frame: "⊹ ࣪ ˖ {} ˖ ࣪ ⊹" },
  { id: "ribbon",   name: "리본",       style: "bold",       sep: "", frame: "🎀 ꒰ {} ꒱ 🎀" },
  { id: "peachy",   name: "복숭아",     style: "",           sep: "", frame: "🍑 ˚ʚ {} ɞ˚ 🍑" },
  { id: "milk",     name: "우유거품",   style: "smallcaps",  sep: "·", frame: "( {} )♡" },
  { id: "librae",   name: "은하수",     style: "doublestruck", sep: "", frame: "✧･ﾟ: {} :･ﾟ✧" },
  { id: "velvet",   name: "벨벳",       style: "bolditalic", sep: "", frame: "⟡ {} ⟡" },
  // ── 시크/힙 ──
  { id: "noir",     name: "느와르",     style: "fraktur",    sep: "", frame: "† {} †" },
  { id: "chrome",   name: "크롬 Y2K",   style: "fullwidth",  sep: "", frame: "◢ {} ◣" },
  { id: "static",   name: "스태틱",     style: "mono",       sep: "", frame: "[ {} ]" },
  { id: "slash",    name: "슬래시",     style: "sansbold",   sep: "", frame: "⫽ {} ⫽" },
  { id: "hexed",    name: "룬각인",     style: "runes",      sep: "", frame: "ᛝ {} ᛝ" },
  { id: "moscow",   name: "모스크바",   style: "fauxcyr",    sep: "", frame: "★ {} ★" },
  { id: "olympus",  name: "올림포스",   style: "greek",      sep: "", frame: "⚡ {} ⚡" },
  { id: "cash",     name: "재벌 2세",   style: "currency",   sep: "", frame: "💰 {} 💰" },
  { id: "glitchy",  name: "글리치",     style: "zalgo",      sep: "", frame: "{}" },
  { id: "vapor",    name: "베이퍼",     style: "fullwidth",  sep: "　", frame: "【 {} 】" },
  // ── 귀염뽀짝 ──
  { id: "mochi",    name: "모찌",       style: "roundy",     sep: "", frame: "꒰ᐢ {} ᐢ꒱" },
  { id: "bunny",    name: "토끼귀",     style: "",           sep: "", frame: "/) /) ˖ {} ˖ (\\ (\\" },
  { id: "cateye",   name: "야옹",       style: "smallcaps",  sep: "", frame: "^•ﻌ•^ {} ₊˚⊹" },
  { id: "bubbly",   name: "동글보글",   style: "circled",    sep: "", frame: "{}" },
  { id: "candy",    name: "사탕",       style: "",           sep: "🍬", frame: "{}" },
  { id: "sprout",   name: "새싹",       style: "",           sep: "", frame: "☘ {} ☘" },
  { id: "twinkle",  name: "밑별콕콕",   style: "underspark", sep: "", frame: "{}" },
  { id: "glitzy",   name: "반짝가루",   style: "glitter",    sep: "", frame: "{}" },
  { id: "puffy",    name: "푹신",       style: "roundy",     sep: "·", frame: "( ⑅ {} ⑅ )" },
  { id: "strawb",   name: "딸기우유",   style: "",           sep: "", frame: "🍓 ⋆ {} ⋆ 🍓" },
  // ── 게임/닉 전용(짧고 안전 위주) ──
  { id: "blade",    name: "검격",       style: "bold",       sep: "", frame: "⚔ {} ⚔" },
  { id: "shadow",   name: "그림자",     style: "sansbolditalic", sep: "", frame: "乂 {} 乂" },
  { id: "royal",    name: "왕관",       style: "boldscript", sep: "", frame: "♛ {} ♛" },
  { id: "sniper",   name: "조준선",     style: "mono",       sep: "", frame: "⌖ {} ⌖" },
  { id: "flameko",  name: "불꽃",       style: "bold",       sep: "", frame: "🔥 {} 🔥" },
  { id: "frost",    name: "서리",       style: "doublestruck", sep: "", frame: "❄ {} ❄" },
  { id: "phantom",  name: "유령단",     style: "fraktur",    sep: "", frame: "࿐ {} ࿐" },
  { id: "ace",      name: "에이스",     style: "squaredneg", sep: "", frame: "{}" },
  // ── 믹스(글자마다 다른 글꼴 — 시드 고정) ──
  { id: "mixpop",   name: "믹스팝",     style: "mix", seed: 11, sep: "", frame: "✦ {} ✦" },
  { id: "mixjelly", name: "믹스젤리",   style: "mix", seed: 23, sep: "", frame: "꒰ {} ꒱" },
  { id: "mixwave",  name: "믹스웨이브", style: "mix", seed: 42, sep: "", frame: "〰 {} 〰" },
  { id: "mixstar",  name: "믹스별",     style: "mix", seed: 77, sep: "", frame: "★ {} ☆" },
  // ── 한 줄 데코(스타일 없이 프레임 강함 — 한글에 특히) ──
  { id: "arrowtag", name: "화살표 태그", style: "", sep: "", frame: "╰┈➤ {}" },
  { id: "waveline", name: "물결선",      style: "", sep: "", frame: "︶꒷꒦ {} ꒷꒦︶" },
  { id: "starlane", name: "별길",        style: "", sep: "⋆", frame: "✦ {} ✦" },
  { id: "hearts",   name: "하트샤워",    style: "", sep: "♡", frame: "{}" },
  { id: "royalko",  name: "궁전",        style: "", sep: "", frame: "『 {} 』" },
  { id: "aurora",   name: "오로라",      style: "", sep: "", frame: "⌜ {} ⌟ ✧" },
];

// 프리셋 레시피 적용: 글꼴(또는 믹스체) → 사이기호 → 프레임.
export function renderNick(preset, text) {
  const t = String(text == null ? "" : text);
  if (!preset) return t;
  const styled = preset.style === "mix" ? mixStyle(t, preset.seed || 7)
    : preset.style ? convert(t, preset.style) : t;
  return mix(styled, { interleaveSep: preset.sep || "", frame: preset.frame || "" });
}
