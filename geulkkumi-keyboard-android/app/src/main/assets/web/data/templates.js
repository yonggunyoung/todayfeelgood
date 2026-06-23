/* 글꾸미 — data/templates.js : 프레임(틀)·구분선·Y2K 텍대 블록.
 * FRAMES의 tpl 은 '{}' 자리에 사용자 텍스트가 들어감(decorate.applyFrame).
 * DECO_LINES / BLOCKS 는 그대로 복사하는 장식 모음.
 */
"use strict";

export const FRAMES = [
  { id: "sparkle", name: "반짝", tpl: "✧･ﾟ: *✧･ﾟ:* {} *:･ﾟ✧*:･ﾟ✧" },
  { id: "star1", name: "별먼지", tpl: "☆*: .｡. {} .｡.:*☆" },
  { id: "dash", name: "˗ˏˋ", tpl: "˗ˏˋ {} ´ˎ˗" },
  { id: "cross", name: "⊹ ࣪ ˖", tpl: "⊹ ࣪ ˖ {} ⊹ ࣪ ˖" },
  { id: "cup", name: "꒰ ꒱", tpl: "꒰ {} ꒱" },
  { id: "wing", name: "➶ ➷", tpl: "➶ {} ➷" },
  { id: "heart", name: "하트", tpl: "♡ {} ♡" },
  { id: "diamond", name: "⟡", tpl: "⟡ {} ⟡" },
  { id: "ear", name: "˚ʚ ɞ˚", tpl: "˚ʚ {} ɞ˚" },
  { id: "starline", name: "⋆｡°✩", tpl: "⋆｡°✩ {} ✩°｡⋆" },
  { id: "arrow", name: "╰┈➤", tpl: "╰┈➤ {}" },
  { id: "wave", name: "⌒⌒", tpl: "⌒⌒ {} ⌒⌒" },
  { id: "bullet", name: "•·.·✶", tpl: "•·.·✶ {} ✶·.·•" },
  { id: "florette", name: "❀", tpl: "❀ {} ❀" },
  { id: "flower2", name: "✿｡.｡", tpl: "✿｡.｡:* {} *:｡.｡✿" },
  { id: "box", name: "┌─ ─┐", tpl: "┌─ {} ─┐" },
  { id: "lenticular", name: "【 】", tpl: "【 {} 】" },
  { id: "note", name: "♬♩♪", tpl: "♬♩♪♩ {} ♩♪♩♬" },
  { id: "moon", name: "☾ ☽", tpl: "☾ {} ☽" },
  { id: "curl", name: "⊰ ⊱", tpl: "⊰ {} ⊱" },
  { id: "shootingstar", name: "ᯓ★", tpl: "ᯓ★ {}" },
  { id: "fish", name: "𓆉", tpl: "𓆉 {} 𓆉" },
  { id: "twinkle", name: "⭒˚｡⋆", tpl: "⭒˚｡⋆ {} ⭒˚｡⋆" },
  { id: "stitch", name: "꒷꒦꒷", tpl: "꒷꒦꒷ {} ꒷꒦꒷" },
];

export const DECO_LINES = [
  "┄┄┄┄┄┄┄┄┄┄",
  "•─────────•",
  "─── ⋆⋅☆⋅⋆ ───",
  "꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦",
  "✦•·············•✦",
  "═════ ✾ ═════",
  "·｡°✩₊˚.⋆",
  "⋆˚࿔ ⋆˚࿔ ⋆˚࿔",
  "☆.｡.:*・°☆.｡.:*・°",
  "━━━━ ◦ ❖ ◦ ━━━━",
  "✩₊˚.⋆☾⋆⁺₊✧",
  "❀◦.°˚°.◦❀",
  "▱▰▱▰▱▰▱▰▱▰",
  "⊱ ────── ⋆⋅☆⋅⋆ ────── ⊰",
  "・━・━・━・━・━・",
  "✧───────────✧",
  "♡｡⋆ ｡⋆｡ ⋆｡♡",
  "≪ °❈° ≫",
  "꒷꒦ ✿ ꒷꒦ ✿ ꒷꒦",
  "┈┈┈♡┈┈┈",
  "⋆ ˚｡⋆୨୧˚ ˚୨୧⋆｡˚ ⋆",
  "· · ────── ꒰ঌ·✦",
  "── ∘◦ ⛤ ◦∘ ──",
  "₊˚ ‿︵‿︵‿︵୨୧ ·",
  "︶︶︶꒰୨୧꒱︶︶︶",
  "༶•┈┈୨♡୧┈┈•༶",
  "╰┈•┈୨୧┈•┈╯",
  "»»———— ‹ ✦ › ————««",
  "┍━☽❖☾━┑",
];

// Y2K/감성 텍대 — 멀티라인. tpl 에 '{}' 있으면 사용자 텍스트 삽입.
export const BLOCKS = [
  { id: "cloud", name: "구름", tpl: "｡˚ ⟢\n　{}\n⟣ ˚｡" },
  { id: "route", name: "길찾기", tpl: "╭┈─────── ೄྀ࿐ ˊˎ-\n╰┈➤ {}\n┊┊┊┊" },
  { id: "ladder", name: "사다리", tpl: "┊　┊　┊　┊\n┊　┊　┊　✧\n┊　┊　⋆\n┊　✦ {}\n✧" },
  { id: "moonbar", name: "달밤", tpl: "⋆｡˚ ☁︎ ˚｡⋆｡˚☽˚｡⋆\n　{}\n⋆｡˚ ☁︎ ˚｡⋆｡˚☾˚｡⋆" },
  { id: "tag", name: "태그", tpl: "❏ {}\n┊\n❀" },
  { id: "frameblock", name: "액자", tpl: "╔═══ ❀•°✿°•❀ ═══╗\n　　{}\n╚═══ ❀•°✿°•❀ ═══╝" },
  { id: "heartbox", name: "하트박스", tpl: "｡˚ʚ♡ɞ˚｡\n　{}\n｡˚ʚ♡ɞ˚｡" },
  { id: "ribbon", name: "리본", tpl: "✁┄┄┄┄┄┄┄┄\n{}\n┄┄┄┄┄┄┄┄✁" },
  { id: "dotbox", name: "점선상자", tpl: "·˚ ༘ ⋆｡˚\n{}\n˚｡⋆ ༘ ˚·" },
  { id: "linebox", name: "라인박스", tpl: "╭───────────╮\n│ {}\n╰───────────╯" },
  { id: "petal", name: "꽃잎", tpl: "❀ ❀ ❀ ❀ ❀\n　{}\n❀ ❀ ❀ ❀ ❀" },
  { id: "moon3", name: "달밤2", tpl: "˚₊‧꒰ {} ꒱‧₊˚" },
  { id: "arrowblk", name: "화살", tpl: "➶➶➶\n{}\n➷➷➷" },
  { id: "diary", name: "다이어리", tpl: "📖 ┊ {}\n┊\n✎ᝰ" },
  { id: "wave2", name: "물결2", tpl: "～～～～～～～\n{}\n～～～～～～～" },
  { id: "spark2", name: "반짝2", tpl: "⋆ ˚｡⋆୨୧˚ {} ˚୨୧⋆｡˚ ⋆" },
  { id: "arch", name: "아치", tpl: "╭──────༺♡༻──────╮\n　　{}\n╰──────༺♡༻──────╯" },
  { id: "starnight", name: "별밤", tpl: "╔═══*.·:·.☽✧ ✦ ✧☾.·:·.*═══╗\n　　{}\n╚═══*.·:·.☽✧ ✦ ✧☾.·:·.*═══╝" },
  { id: "beadbox", name: "구슬틀", tpl: "╔══•●•══╗\n　{}\n╚══•●•══╝" },
  { id: "wavebox", name: "물결틀", tpl: "⏔⏔⏔ ꒰ ᧔ෆ᧓ ꒱ ⏔⏔⏔\n　{}\n︵︵︵ ๑ ♡ ๑ ︵︵︵" },
];

export function renderTemplate(tpl, text) {
  const t = String(text == null ? "" : text);
  return String(tpl).includes("{}") ? String(tpl).split("{}").join(t) : String(tpl);
}
