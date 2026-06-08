/**
 * 한 줄 꾸미기 — 우리만의 차별 기능. (idea-textmoji 명제: "방금 만든 나만의 조합")
 *
 * 경쟁사는 별·하트·괄호·카오모지를 *부품*으로 주고 사용자가 직접 조립하게 한다.
 * 우리는 입력한 글자(이름·한줄소개·닉네임, 한글 OK)를 받아 *바로 붙여넣을 완성된 꾸밈 한 줄*을
 * 여러 벌 만들어 준다. 톤별 테마(큐티/감성/Y2K/고딕/미니멀) + 카오모지 자동 삽입 +
 * 라틴/숫자 인싸폰트 변환. 전부 클라 조립(서버 0).
 */
import { FONTS } from "./fonts";

export interface DecorTheme {
  id: string;
  label: string;
  emoji: string;
  frames: [string, string][]; // 좌우 프레임
  templates: string[]; // {t} 슬롯 템플릿
  fontIds: string[]; // 곁들일 인싸폰트(라틴만 효과)
  kaomoji: string[]; // 어미에 붙일 카오모지
}

export const THEMES: DecorTheme[] = [
  {
    id: "cute",
    label: "큐티",
    emoji: "꒰♡꒱",
    frames: [["꒰", "꒱"], ["꒰ঌ", "໒꒱"], ["♡", "♡"], ["ʚ", "ɞ"], ["❀", "❀"], ["•°", "°•"]],
    templates: ["❥ {t}", "♡ {t} ♡", "˗ˏˋ {t} ´ˎ˗", "‧₊˚ {t} ˚₊‧", "꒰♡꒱ {t}"],
    fontIds: ["script", "double"],
    kaomoji: ["ʕ•ᴥ•ʔ", "(◕ᴗ◕✿)", "(˶ᵔ ᵕ ᵔ˶)", "꒰ᐢ. .ᐢ꒱", "(づ｡◕‿◕｡)づ", "(=^･ω･^=)"],
  },
  {
    id: "emotional",
    label: "감성",
    emoji: "˚༘",
    frames: [["˚ ༘", "༘ ˚"], ["⊹˚₊‧", "‧₊˚⊹"], ["◜", "◞"], ["·.¸¸.·", "·.¸¸.·"], ["⟡", "⟡"]],
    templates: [
      "‧₊˚ {t} ˚₊‧",
      "˚ ༘ ⋆｡˚ {t} ˚｡⋆ ༘ ˚",
      "❝ {t} ❞",
      "⊹ ࣪ ˖ {t} ˖ ࣪ ⊹",
      "╰┈➤ {t}",
    ],
    fontIds: ["script", "italic"],
    kaomoji: ["( ´ ▽ ` )", "(˘︶˘)", "( ◜‿◝ )♡", "(*ᵕ̈ )", "( ˘ ³˘)♡"],
  },
  {
    id: "y2k",
    label: "Y2K",
    emoji: "☆彡",
    frames: [["☆彡", "彡☆"], ["★", "★"], ["✩", "✩"], ["⋆｡°✩", "✩°｡⋆"], ["°•○●", "●○•°"], ["✦", "✦"]],
    templates: ["⋆｡°✩ {t} ✩°｡⋆", "★彡 {t} 彡★", "✧ {t} ✧", "☆ {t} ☆", "➶ {t} ➷"],
    fontIds: ["bold", "double", "fullwidth"],
    kaomoji: ["⋆⭒˚｡⋆", "(•̀ᴗ•́)و", "٩(◕‿◕)۶", "ヽ(⌐■_■)ノ", "(★ω★)"],
  },
  {
    id: "gothic",
    label: "고딕",
    emoji: "✝",
    frames: [["⟬", "⟭"], ["⊰", "⊱"], ["✝", "✝"], ["≪", "≫"], ["⟢", "⟣"], ["⌜", "⌟"]],
    templates: ["☩ {t} ☩", "✝ {t} ✝", "⟢ {t} ⟣", "≪ {t} ≫", "⟶ {t} ⟵"],
    fontIds: ["fraktur", "double", "bold"],
    kaomoji: ["( ͡° ͜ʖ ͡°)", "(╬ Ò﹏Ó)", "ヽ(`Д´)ﾉ", "(҂⌣̀_⌣́)", "凸(￣ヘ￣)"],
  },
  {
    id: "minimal",
    label: "미니멀",
    emoji: "⟡",
    frames: [["⟡", "⟡"], ["·", "·"], ["—", "—"], ["|", "|"], ["⊹", "⊹"], ["◌", "◌"]],
    templates: ["{t}", "· {t} ·", "— {t} —", "⟡ {t} ⟡", "› {t} ‹"],
    fontIds: ["fullwidth", "mono"],
    kaomoji: [], // 미니멀은 카오모지 없이 담백하게
  },
];

export const THEME_BY_ID: Record<string, DecorTheme> = Object.fromEntries(
  THEMES.map((t) => [t.id, t])
);

/** seed만큼 배열을 회전(결정적 다양화 — '더 보기'로 새 조합) */
function rotate<T>(arr: T[], n: number): T[] {
  if (!arr.length) return arr;
  const k = ((n % arr.length) + arr.length) % arr.length;
  return arr.slice(k).concat(arr.slice(0, k));
}

export interface DecorateOptions {
  theme?: string;
  seed?: number;
  withKaomoji?: boolean;
}

/**
 * 입력 텍스트를 완성된 꾸밈 한 줄 여러 벌로. 테마 톤·카오모지·인싸폰트를 합쳐서 낸다.
 * seed로 매번 다른 조합. 라틴/숫자가 있으면 인싸폰트 변형도 추가.
 */
export function decorate(text: string, opts: DecorateOptions = {}): string[] {
  const t = text.trim();
  if (!t) return [];
  const theme = THEME_BY_ID[opts.theme ?? "cute"] ?? THEMES[0]!;
  const seed = opts.seed ?? 0;

  const out: string[] = [];
  const push = (s: string) => {
    const v = s.replace(/\s+/g, " ").trim();
    if (v && v !== t && !out.includes(v)) out.push(v);
  };

  const frames = rotate(theme.frames, seed);
  const temps = rotate(theme.templates, seed);
  const kaos = rotate(theme.kaomoji, seed);

  // 1) 프레임으로 감싸기
  for (let i = 0; i < 6 && i < frames.length; i++) {
    const [l, r] = frames[i]!;
    push(`${l} ${t} ${r}`);
  }
  // 2) 템플릿
  for (let i = 0; i < 6 && i < temps.length; i++) {
    push(temps[i]!.replace(/\{t\}/g, t));
  }
  // 3) 카오모지 자동 삽입(어미·양옆)
  if (opts.withKaomoji && kaos.length) {
    push(`${t} ${kaos[0]}`);
    if (kaos[1]) push(`${kaos[1]} ${t} ${kaos[1]}`);
    const [l, r] = frames[1 % frames.length]!;
    if (kaos[2]) push(`${l} ${t} ${kaos[2]} ${r}`);
  }
  // 4) 인싸폰트 + 프레임(라틴/숫자 있을 때만 효과)
  for (let i = 0; i < theme.fontIds.length; i++) {
    const f = FONTS.find((x) => x.id === theme.fontIds[(i + seed) % theme.fontIds.length]);
    if (!f) continue;
    const styled = f.transform(t);
    if (styled === t) continue; // 한글 등 변화 없으면 스킵(중복 방지)
    const [l, r] = frames[(i + 2) % frames.length]!;
    push(`${l} ${styled} ${r}`);
  }

  return out;
}
