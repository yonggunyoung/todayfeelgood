/**
 * 인싸폰트 변환기 — 입력 글자(영문·숫자)를 유니코드 변형 글꼴 수십 종으로 바꾼다.
 *
 * 차별점: 경쟁사는 "정해진 글자 목록"을 보여 줄 뿐이지만, 우리는 *내가 친 글자*를
 * 즉시 𝓯𝓪𝓷𝓬𝔂·𝔤𝔬𝔱𝔥𝔦𝔠·Ⓒⓘⓡⓒⓛⓔ 등으로 무한 변환한다(인스타 닉네임·프로필 직격).
 * 전부 클라에서 문자열 매핑. 서버 0·비용 0·외부 호출 0.
 *
 * 정직성: 라틴 알파벳·숫자만 변환되며 한글/특수문자는 그대로 통과한다(UI에 명시).
 */

export interface FontStyle {
  id: string;
  label: string;
  transform: (s: string) => string;
}

/** 코드포인트 오프셋 기반 매핑(연속 블록용). holes로 블록 중간의 예외 문자를 보정. */
function offset(opts: {
  upper?: number;
  lower?: number;
  digit?: number;
  holes?: Record<string, string>;
}): (s: string) => string {
  return (input: string) =>
    Array.from(input)
      .map((ch) => {
        if (opts.holes && opts.holes[ch]) return opts.holes[ch];
        const cp = ch.codePointAt(0)!;
        if (opts.upper != null && ch >= "A" && ch <= "Z")
          return String.fromCodePoint(opts.upper + (cp - 65));
        if (opts.lower != null && ch >= "a" && ch <= "z")
          return String.fromCodePoint(opts.lower + (cp - 97));
        if (opts.digit != null && ch >= "0" && ch <= "9")
          return String.fromCodePoint(opts.digit + (cp - 48));
        return ch;
      })
      .join("");
}

/** 문자 단위 치환 테이블 기반 매핑(불연속 글꼴용). 소문자 테이블을 대문자에도 적용. */
function table(
  lowerTable: string,
  digitTable?: string,
  extra?: Record<string, string>
): (s: string) => string {
  return (input: string) =>
    Array.from(input)
      .map((ch) => {
        const low = ch.toLowerCase();
        if (extra && extra[ch]) return extra[ch];
        if (low >= "a" && low <= "z") {
          const g = lowerTable[low.charCodeAt(0) - 97];
          return g ?? ch;
        }
        if (digitTable && ch >= "0" && ch <= "9") {
          const g = digitTable[ch.charCodeAt(0) - 48];
          return g ?? ch;
        }
        return ch;
      })
      .join("");
}

/** 결합문자 삽입(취소선·밑줄). */
function combine(mark: string): (s: string) => string {
  return (input: string) =>
    Array.from(input)
      .map((ch) => (ch === " " ? ch : ch + mark))
      .join("");
}

// 원문자(①②/Ⓐⓐ)는 숫자 규칙이 특수해 별도 처리
function circled(input: string): string {
  return Array.from(input)
    .map((ch) => {
      const cp = ch.codePointAt(0)!;
      if (ch >= "A" && ch <= "Z") return String.fromCodePoint(0x24b6 + (cp - 65));
      if (ch >= "a" && ch <= "z") return String.fromCodePoint(0x24d0 + (cp - 97));
      if (ch === "0") return "⓪";
      if (ch >= "1" && ch <= "9") return String.fromCodePoint(0x2460 + (cp - 49));
      return ch;
    })
    .join("");
}

// 뒤집기(거꾸로) — 매핑 후 문자열 역순
const FLIP_MAP: Record<string, string> = {
  a: "ɐ", b: "q", c: "ɔ", d: "p", e: "ǝ", f: "ɟ", g: "ƃ", h: "ɥ", i: "ı",
  j: "ɾ", k: "ʞ", l: "l", m: "ɯ", n: "u", o: "o", p: "d", q: "b", r: "ɹ",
  s: "s", t: "ʇ", u: "n", v: "ʌ", w: "ʍ", x: "x", y: "ʎ", z: "z",
  "0": "0", "1": "Ɩ", "2": "ᄅ", "3": "Ɛ", "4": "ㄣ", "5": "ϛ", "6": "9",
  "7": "ㄥ", "8": "8", "9": "6", ".": "˙", ",": "'", "'": ",", '"': "„",
  "!": "¡", "?": "¿", "(": ")", ")": "(", "[": "]", "]": "[", "{": "}",
  "}": "{", "<": ">", ">": "<", "&": "⅋", "_": "‾",
};
function flip(input: string): string {
  return Array.from(input.toLowerCase())
    .map((ch) => FLIP_MAP[ch] ?? ch)
    .reverse()
    .join("");
}

export const FONTS: FontStyle[] = [
  { id: "bold", label: "굵게", transform: offset({ upper: 0x1d400, lower: 0x1d41a, digit: 0x1d7ce }) },
  { id: "italic", label: "기울임", transform: offset({ upper: 0x1d434, lower: 0x1d44e, holes: { h: "ℎ" } }) },
  { id: "bolditalic", label: "굵은기울임", transform: offset({ upper: 0x1d468, lower: 0x1d482 }) },
  { id: "script", label: "필기체", transform: offset({ upper: 0x1d4d0, lower: 0x1d4ea }) },
  { id: "fraktur", label: "고딕(흑체)", transform: offset({ upper: 0x1d56c, lower: 0x1d586 }) },
  {
    id: "double",
    label: "겹문자",
    transform: offset({
      upper: 0x1d538,
      lower: 0x1d552,
      digit: 0x1d7d8,
      holes: { C: "ℂ", H: "ℍ", N: "ℕ", P: "ℙ", Q: "ℚ", R: "ℝ", Z: "ℤ" },
    }),
  },
  { id: "sans", label: "산세리프", transform: offset({ upper: 0x1d5a0, lower: 0x1d5ba, digit: 0x1d7e2 }) },
  { id: "sansbold", label: "산세굵게", transform: offset({ upper: 0x1d5d4, lower: 0x1d5ee, digit: 0x1d7ec }) },
  { id: "mono", label: "타자기", transform: offset({ upper: 0x1d670, lower: 0x1d68a, digit: 0x1d7f6 }) },
  { id: "fullwidth", label: "넓게", transform: offset({ upper: 0xff21, lower: 0xff41, digit: 0xff10 }) },
  { id: "circle", label: "원문자", transform: circled },
  {
    id: "smallcaps",
    label: "작은대문자",
    transform: table("ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘꞯʀꜱᴛᴜᴠᴡxʏᴢ"),
  },
  {
    id: "super",
    label: "위첨자",
    transform: table("ᵃᵇᶜᵈᵉᶠᵍʰⁱʲᵏˡᵐⁿᵒᵖqʳˢᵗᵘᵛʷˣʸᶻ", "⁰¹²³⁴⁵⁶⁷⁸⁹"),
  },
  { id: "strike", label: "취소선", transform: combine("̶") },
  { id: "under", label: "밑줄", transform: combine("̲") },
  { id: "flip", label: "거꾸로", transform: flip },
  {
    id: "space",
    label: "띄어쓰기",
    transform: (s) => Array.from(s.replace(/\s+/g, " ")).join(" ").trim(),
  },
];
