/* 글꾸미 — data/ramps.js : 사진·그리기 아트용 문자 램프 / 이모지 팔레트.
 * ramp 문자열은 '어두움 → 밝음' 순서(앞=잉크 진함, 뒤=배경).
 */
"use strict";

export const RAMPS = [
  { id: "classic", name: "클래식", chars: "@%#*+=-:. " },
  { id: "detailed", name: "디테일", chars: "$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,\"^`'. " },
  { id: "simple", name: "심플", chars: "#x+. " },
  { id: "binary", name: "흑백", chars: "█ " },
  { id: "blocks", name: "블록 음영", chars: "█▓▒░ " },
  { id: "hangul", name: "한글", chars: "鬱靈韓글口三二一·  " },
  { id: "hearts", name: "하트", chars: "❤️🧡💛💚💙🤍 " },
  { id: "dots", name: "점", chars: "⣿⣶⣦⡀ " },
];

export const EMOJI_PALETTES = [
  { id: "mono", name: "모노", chars: ["⬛", "🔲", "◼️", "▪️", "▫️", "⬜"] },
  { id: "warm", name: "노을", chars: ["🟥", "🟧", "🟨", "🟫", "⬜"] },
  { id: "cool", name: "바다", chars: ["🟦", "🟪", "🟩", "🟨", "⬜"] },
  { id: "heart", name: "하트", chars: ["❤️", "🧡", "💛", "💚", "💙", "🤍"] },
  { id: "fruit", name: "과일", chars: ["🍇", "🍓", "🍊", "🍋", "🥝", "⬜"] },
  { id: "moon", name: "달", chars: ["🌑", "🌘", "🌗", "🌖", "🌕"] },
];

// 아트 모드 메타(뷰 셀렉터용).
export const ART_MODES = [
  { id: "braille", name: "도트(브라유)", hint: "한 글자에 2×4 점 — 가장 촘촘" },
  { id: "ascii", name: "문자(ASCII)", hint: "기호 농담으로 그림" },
  { id: "halfblocks", name: "하프블록", hint: "▀▄ 세로 2배 해상도" },
  { id: "blocks", name: "블록 음영", hint: "█▓▒░ 농담" },
  { id: "emoji", name: "이모지", hint: "픽셀당 이모지 1개(작게)" },
];
