/**
 * 한 줄 꾸미기 — 우리만의 차별 기능. (idea-textmoji 명제: "방금 만든 나만의 조합")
 *
 * 경쟁사는 별·하트·괄호·카오모지를 *부품*으로 주고 사용자가 직접 조립하게 한다.
 * 우리는 입력한 글자(이름·한줄소개·닉네임, 한글 OK)를 받아 *바로 붙여넣을 완성된 꾸밈 한 줄*을
 * 여러 벌 만들어 준다. 라틴/숫자는 인싸폰트 변환까지 얹는다. 전부 클라 조립(서버 0).
 */
import { FONTS } from "./fonts";

/** 좌우 대칭 꾸밈 프레임 [왼쪽, 오른쪽] */
const FRAMES: [string, string][] = [
  ["｡ﾟ•┈", "┈•ﾟ｡"],
  ["꒰", "꒱"],
  ["˗ˏˋ", "´ˎ˗"],
  ["⟡", "⟡"],
  ["✧･ﾟ:", ":ﾟ･✧"],
  ["•°", "°•"],
  ["♡", "♡"],
  ["⊹˚₊‧", "‧₊˚⊹"],
  ["✦", "✦"],
  ["❀", "❀"],
  ["·.¸¸.·", "·.¸¸.·"],
  ["⌜", "⌟"],
  ["「", "」"],
  ["『", "』"],
  ["【", "】"],
  ["≪", "≫"],
  ["⊰", "⊱"],
  ["ʚ", "ɞ"],
  ["☆彡", "彡☆"],
  ["°•○●", "●○•°"],
  ["꒰ঌ", "໒꒱"],
  ["⟬", "⟭"],
];

/** {t} 슬롯 템플릿(비대칭·특수 배치) */
const TEMPLATES: string[] = [
  "❝ {t} ❞",
  "‧₊˚ {t} ˚₊‧",
  "╰┈➤ {t}",
  "✧ {t} ✧",
  "⟢ {t} ⟣",
  "·｡ﾟ {t} ﾟ｡·",
  "☾ {t} ☽",
  "❍ {t} ❍",
  "➶ {t} ➷",
  "❥ {t}",
  "✎ {t}",
  "⋆｡°✩ {t} ✩°｡⋆",
  "★彡 {t} 彡★",
  "⟶ {t} ⟵",
  "˚ ༘ ⋆｡˚ {t} ˚｡⋆ ༘ ˚",
  "♡ ⃗ {t} ⃗ ♡",
];

/** seed만큼 배열을 회전(결정적 다양화 — '더 보기'로 새 조합) */
function rotate<T>(arr: T[], n: number): T[] {
  const k = ((n % arr.length) + arr.length) % arr.length;
  return arr.slice(k).concat(arr.slice(0, k));
}

/**
 * 입력 텍스트를 완성된 꾸밈 한 줄 여러 벌로. seed로 매번 다른 조합을 낸다.
 * 라틴/숫자가 포함되면 인싸폰트(필기·고딕·겹·넓게)를 얹은 변형도 추가.
 */
export function decorate(text: string, seed = 0): string[] {
  const t = text.trim();
  if (!t) return [];
  const out: string[] = [];
  const push = (s: string) => {
    const v = s.trim();
    if (v && v !== t && !out.includes(v)) out.push(v);
  };

  const frames = rotate(FRAMES, seed);
  const temps = rotate(TEMPLATES, seed);

  for (let i = 0; i < 7 && i < frames.length; i++) {
    const [l, r] = frames[i]!;
    push(`${l} ${t} ${r}`);
  }
  for (let i = 0; i < 7 && i < temps.length; i++) {
    push(temps[i]!.replace(/\{t\}/g, t));
  }

  // 폰트 + 프레임(라틴/숫자 있을 때만 효과)
  const fontIds = ["script", "fraktur", "double", "fullwidth", "bold"];
  for (let i = 0; i < fontIds.length; i++) {
    const f = FONTS.find((x) => x.id === fontIds[(i + seed) % fontIds.length]);
    if (!f) continue;
    const styled = f.transform(t);
    if (styled === t) continue; // 한글 등 변화 없으면 스킵(중복 방지)
    const [l, r] = frames[(i + 2) % frames.length]!;
    push(`${l} ${styled} ${r}`);
  }

  return out;
}
