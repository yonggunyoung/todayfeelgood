/* 글꾸미 — data/symbols.js : 특수문자 대형 카탈로그(카테고리별).
 * 각 항목은 보통 한 글자(그래핌). 라이브러리의 검색·복사·즐겨찾기·혼합 원천.
 * keywords는 한글 검색용 보조 태그.
 */
"use strict";

export const SYMBOLS = [
  { id: "popular", name: "인기", keywords: "추천 자주",
    items: "✨ ⭐ 🌟 ♡ ♥ ❤ ★ ☆ ✩ ✿ ❀ ✦ ✧ ⋆ “ ” ‘ ’ • · ° ◦ ✔ ✖ → ← ↑ ↓ ☑ ✓ ☀ ☁ ☂ ☃ ☘ ✈ ☎ ✉ ⚡ ☮ ☯ ♪ ♬ ♛ ♚ ✌ ☜ ☞".split(" ") },

  { id: "hearts", name: "하트", keywords: "사랑 love 마음",
    items: "♡ ♥ ❤ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💕 💞 💓 💗 💖 💝 💘 💟 ❣ ❥ ღ ❦ ❧ ⓛⓞⓥⓔ ♡̩͙ ❤︎ ❥".split(" ") },

  { id: "stars", name: "별·반짝", keywords: "스타 sparkle 빛",
    items: "★ ☆ ✦ ✧ ✩ ✪ ✫ ✬ ✭ ✮ ✯ ✰ ⋆ ✢ ✣ ✤ ✥ ❋ ❂ ❉ ❈ ❊ ✺ ✹ ✸ ✷ ✶ ✵ ✴ ✳ ✲ ⁂ ٭ ꙰ 🌟 💫 ✨ ⭐ 🌠".split(" ") },

  { id: "arrows", name: "화살표", keywords: "방향 arrow",
    items: "→ ← ↑ ↓ ↔ ↕ ↖ ↗ ↘ ↙ ⇒ ⇐ ⇑ ⇓ ⇔ ⇄ ⇆ ➜ ➔ ➙ ➛ ➝ ➞ ➟ ➠ ➤ ➥ ➦ ➧ ⟶ ⟵ ⤴ ⤵ ↩ ↪ ↳ ↰ ➲ ⮕ ⇨ ⇦ ☞ ☜ ☝ ☟".split(" ") },

  { id: "shapes", name: "도형", keywords: "모양 네모 동그라미",
    items: "■ □ ▢ ▣ ▤ ▥ ▦ ▧ ▨ ▩ ▪ ▫ ◆ ◇ ◈ ○ ● ◌ ◍ ◎ ◐ ◑ ◒ ◓ ◔ ◕ ◖ ◗ △ ▲ ▽ ▼ ◁ ◀ ▷ ▶ ⬟ ⬠ ⬡ ⬢ ⬣ ⯃ ⯂ ❖ ⧫".split(" ") },

  { id: "lines", name: "선·구분", keywords: "라인 divider 줄",
    items: ["─", "━", "┄", "┅", "┈", "┉", "═", "╌", "╍", "▬", "▭", "╳", "╱", "╲", "꒷", "꒦", "⌒", "⌢", "⌣", "～", "〜", "︴", "❲❳", "⊰⊱", "⋆⌒⋆", "•───•", "──❖──", "꒰꒱", "⟢⟣", "═════", "▰▱▰", "┈┈✦┈┈", "─ ✶ ─", "✦•·············•✦"] },

  { id: "brackets", name: "괄호·따옴표", keywords: "bracket quote 인용",
    items: "「 」 『 』 【 】 〔 〕 〖 〗 〘 〙 〚 〛 ⌜ ⌝ ⌞ ⌟ ❪ ❫ ❬ ❭ ❮ ❯ ❰ ❱ ❲ ❳ ⟦ ⟧ ⟨ ⟩ ⟪ ⟫ ｟ ｠ ꒰ ꒱ ﹙ ﹚ “ ” ‘ ’ « » ‹ ›".split(" ") },

  { id: "flowers", name: "꽃·식물", keywords: "flower 자연 잎",
    items: "✿ ❀ ❁ ❃ ❋ ✾ ✽ ✼ ⚘ ⁂ ❦ ❧ ☘ ♧ ♣ 🌸 🌷 🌹 🌺 🌻 🌼 🌿 🍀 🍃 🌱 🪴 💐 ⚜ ⌘ ꕀ ✶".split(" ") },

  { id: "weather", name: "날씨·하늘", keywords: "weather 해 달 구름",
    items: "☀ ☼ ☁ ☂ ☔ ☃ ☄ ⚡ ❄ ❅ ❆ ☾ ☽ ☉ ✫ ☇ ☈ ♁ ⛅ ⛈ 🌙 🌛 🌜 🌝 🌞 ⭐ 🌈 🔥 💧 🌊 ❄️ ☔️".split(" ") },

  { id: "music", name: "음악·음표", keywords: "music note 멜로디",
    items: "♪ ♫ ♬ ♩ ♭ ♮ ♯ 🎵 🎶 🎼 𝄞 𝄢 𝅘𝅥 𝅗𝅥 ♪̇ 🎧 🎤 🎹 🎸 🥁 🎺 🎻".split(" ") },

  { id: "zodiac", name: "별자리", keywords: "zodiac 점성 띠",
    items: "♈ ♉ ♊ ♋ ♌ ♍ ♎ ♏ ♐ ♑ ♒ ♓ ⛎ ☉ ☽ ☿ ♀ ⊕ ♂ ♃ ♄ ♅ ♆ ♇".split(" ") },

  { id: "marks", name: "체크·기호", keywords: "check 표시 금지",
    items: "✓ ✔ ✗ ✘ ☑ ☒ ✕ ✖ ⊘ ∅ ⌀ ⚠ ☢ ☣ ♲ ♻ ⚐ ⚑ ⚖ ☠ ⌖ ✲ ⁇ ‼ ⁈ ⁉ ※ ⁕ ⌫ ⏎ ⎋ ⇧ ⌥ ⌘ ✦".split(" ") },

  { id: "currency", name: "통화·숫자", keywords: "money 돈 number 원",
    items: "₩ $ € £ ¥ ¢ ₿ ₽ ₹ ฿ ₫ ₴ ₦ ₱ № ℀ ℁ ℅ ¼ ½ ¾ ⅓ ⅔ ⅕ ① ② ③ ④ ⑤ ⑥ ⑦ ⑧ ⑨ ⑩ ⓵ ⓶ ⓷ ❶ ❷ ❸ ㊀ ㊁ ㊂".split(" ") },

  { id: "math", name: "수학·기호", keywords: "math 부호 plus",
    items: "± × ÷ ≠ ≈ ≡ ≤ ≥ ∞ ∑ ∏ ∫ √ ∛ ∂ ∇ ∆ π Σ Ω µ ∈ ∉ ⊂ ⊃ ∪ ∩ ∧ ∨ ¬ ∀ ∃ ∴ ∵ ° ′ ″ ‰ ⊕ ⊗ ⊙".split(" ") },

  { id: "dots", name: "점·불릿", keywords: "dot bullet 점",
    items: "• · ‣ ◦ ° ⸰ ⏺ ⦁ ⚫ ⚪ ∙ ⋅ ⋯ ⋮ ⋰ ⋱ ⁘ ⁙ ⁚ ⁛ ❍ ❏ ❐ ❑ ❒ ⊹ ✺ ⊰ ⊱ ⸱ ｡ ﹒ ٬".split(" ") },

  { id: "hands", name: "손·얼굴", keywords: "hand face 손가락",
    items: "☜ ☞ ☝ ☟ ✌ ✋ ✊ ✍ ♨ ☺ ☻ ☹ ㋡ ㋛ ☃ ⍢ ❛ ❜ ◕ ◔ ◑ ´ ᴗ ` 𐐦 ᕙ ᕗ ╭∩╮".split(" ") },

  { id: "cards", name: "카드·체스", keywords: "card chess 게임",
    items: "♠ ♣ ♥ ♦ ♤ ♧ ♡ ♢ ♔ ♕ ♖ ♗ ♘ ♙ ♚ ♛ ♜ ♝ ♞ ♟ ⚀ ⚁ ⚂ ⚃ ⚄ ⚅ 🀄".split(" ") },

  { id: "jamo", name: "한글 장식", keywords: "한글 자모 옛한글",
    items: "ㆍ ᆢ ㆎ ㅥ ㅿ ㆆ ㅸ ㅹ ㅱ ᄔ ᄕ ㆄ ꙮ ° ་ ꒰ ꒱ 〮 〯 ꙳ ᳂ ᳃ ᳄".split(" ") },

  { id: "deco", name: "장식·테두리", keywords: "deco 장식 코너",
    items: ["꒰⑅꒱", "˚｡⋆", "ೃ࿔", "⊹ ࣪ ˖", "˙✧˖°", "𓂃🖊", "ʚ♡ɞ", "✦ ✧", "ꕥ", "ꔚ", "ʚɞ", "⟡", "❀ೃ", "˗ˏˋ ´ˎ˗", "᯽", "⌗", "↳", "꒷꒦", "⊹˚", "𓆉", "𓏲", "𓂃", "⑅", "ᯓ", "ᯤ", "ᰔ", "ᰔᩚ", "♡̆̈"] },
];

// 전 항목 평탄화(검색 인덱스용).
export function allSymbolItems() {
  const out = [];
  for (const cat of SYMBOLS) for (const it of cat.items) out.push({ char: it, cat: cat.name, catId: cat.id, keywords: cat.keywords });
  return out;
}
