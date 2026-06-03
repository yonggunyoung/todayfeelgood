/**
 * 한글 음절 → 기본 자모 분해 — 프론트 전용(core/engine 미수정).
 *
 * "필요 자모 안내"용: 입력 문구의 음절을 분해해 **기본 자모 24자(BASIC_JAMO)** 단위로
 * 어떤 자모가 필요한지 계산한다. 쌍자음/겹받침/겹모음은 기본 자모의 조합으로 근사한다
 * (예: ㄲ→ㄱ, ㅘ→ㅗ+ㅏ, ㄳ→ㄱ+ㅅ). 정직성: "조합 티가 있을 수 있어요"와 같은 맥락.
 *
 * 엔진이 실제 합성을 담당하지만, 프론트는 "적은 입력 유도"를 위해 안내만 한다.
 */

const SBASE = 0xac00;
const LCOUNT = 19;
const VCOUNT = 21;
const TCOUNT = 28;
const SCOUNT = LCOUNT * VCOUNT * TCOUNT;

// 초성 19 — 인덱스 순서(유니코드 표준). 쌍자음은 기본 자음으로 근사.
const LEAD: string[] = [
  "ㄱ", "ㄱ", "ㄴ", "ㄷ", "ㄷ", "ㄹ", "ㅁ", "ㅂ", "ㅂ", "ㅅ",
  "ㅅ", "ㅇ", "ㅈ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
];

// 중성 21 — 겹모음은 기본 모음의 조합으로 분해.
const VOWEL: string[][] = [
  ["ㅏ"], ["ㅏ"] /*ㅐ≈ㅏ+ㅣ*/, ["ㅑ"], ["ㅑ"] /*ㅒ*/, ["ㅓ"], ["ㅓ"] /*ㅔ*/,
  ["ㅕ"], ["ㅕ"] /*ㅖ*/, ["ㅗ"], ["ㅗ", "ㅏ"] /*ㅘ*/, ["ㅗ", "ㅏ"] /*ㅙ*/,
  ["ㅗ", "ㅣ"] /*ㅚ*/, ["ㅛ"], ["ㅜ"], ["ㅜ", "ㅓ"] /*ㅝ*/, ["ㅜ", "ㅓ"] /*ㅞ*/,
  ["ㅜ", "ㅣ"] /*ㅟ*/, ["ㅠ"], ["ㅡ"], ["ㅡ", "ㅣ"] /*ㅢ*/, ["ㅣ"],
];

// ㅐ/ㅔ/ㅒ/ㅖ는 단모음이지만 기본 모음 10에 없어 ㅣ를 더해 근사.
const VOWEL_NEEDS_I = new Set([1, 3, 5, 7]); // ㅐ ㅒ ㅔ ㅖ

// 종성 28(0=받침없음) — 겹받침은 기본 자음 둘로 분해.
const TAIL: string[][] = [
  [], ["ㄱ"], ["ㄱ"] /*ㄲ*/, ["ㄱ", "ㅅ"] /*ㄳ*/, ["ㄴ"], ["ㄴ", "ㅈ"] /*ㄵ*/,
  ["ㄴ", "ㅎ"] /*ㄶ*/, ["ㄷ"], ["ㄹ"], ["ㄹ", "ㄱ"] /*ㄺ*/, ["ㄹ", "ㅁ"] /*ㄻ*/,
  ["ㄹ", "ㅂ"] /*ㄼ*/, ["ㄹ", "ㅅ"] /*ㄽ*/, ["ㄹ", "ㅌ"] /*ㄾ*/, ["ㄹ", "ㅍ"] /*ㄿ*/,
  ["ㄹ", "ㅎ"] /*ㅀ*/, ["ㅁ"], ["ㅂ"], ["ㅂ", "ㅅ"] /*ㅄ*/, ["ㅅ"],
  ["ㅅ"] /*ㅆ*/, ["ㅇ"], ["ㅈ"], ["ㅊ"], ["ㅋ"], ["ㅌ"], ["ㅍ"], ["ㅎ"],
];

// 단독 자모(완성형이 아닌 호환 자모) → 기본 자모 근사.
const COMPAT_JAMO: Record<string, string[]> = {
  "ㄲ": ["ㄱ"], "ㄸ": ["ㄷ"], "ㅃ": ["ㅂ"], "ㅆ": ["ㅅ"], "ㅉ": ["ㅈ"],
  "ㅐ": ["ㅏ", "ㅣ"], "ㅒ": ["ㅑ", "ㅣ"], "ㅔ": ["ㅓ", "ㅣ"], "ㅖ": ["ㅕ", "ㅣ"],
  "ㅘ": ["ㅗ", "ㅏ"], "ㅙ": ["ㅗ", "ㅏ", "ㅣ"], "ㅚ": ["ㅗ", "ㅣ"],
  "ㅝ": ["ㅜ", "ㅓ"], "ㅞ": ["ㅜ", "ㅓ", "ㅣ"], "ㅟ": ["ㅜ", "ㅣ"], "ㅢ": ["ㅡ", "ㅣ"],
};

/** 한 문자(음절 또는 단독 자모)를 기본 자모(BASIC_JAMO) 배열로 분해. 한글이 아니면 빈 배열. */
export function decomposeChar(ch: string): string[] {
  const code = ch.codePointAt(0);
  if (code === undefined) return [];

  // 완성형 음절(가–힣)
  if (code >= SBASE && code < SBASE + SCOUNT) {
    const s = code - SBASE;
    const l = Math.floor(s / (VCOUNT * TCOUNT));
    const v = Math.floor((s % (VCOUNT * TCOUNT)) / TCOUNT);
    const t = s % TCOUNT;
    const out: string[] = [];
    out.push(LEAD[l]!);
    out.push(...VOWEL[v]!);
    if (VOWEL_NEEDS_I.has(v)) out.push("ㅣ");
    if (t > 0) out.push(...TAIL[t]!);
    return out;
  }

  // 단독 호환 자모(ㄱ, ㅏ, ㄲ, ㅘ …)
  if (COMPAT_JAMO[ch]) return COMPAT_JAMO[ch]!;
  // 기본 자모 그대로면 자기 자신
  if (/[ㄱ-ㅣ]/.test(ch)) return [ch];
  return [];
}

/** 한 문자가 한글(음절 또는 자모)인지. */
export function isHangulChar(ch: string): boolean {
  const code = ch.codePointAt(0);
  if (code === undefined) return false;
  return (
    (code >= SBASE && code < SBASE + SCOUNT) || // 가–힣
    (code >= 0x3131 && code <= 0x3163) // 호환 자모
  );
}

/** 기본 자모 읽는 이름(접근성 라벨용). 예: "ㄱ"→"기역", "ㅏ"→"아". */
export const JAMO_NAMES: Record<string, string> = {
  "ㄱ": "기역", "ㄴ": "니은", "ㄷ": "디귿", "ㄹ": "리을", "ㅁ": "미음",
  "ㅂ": "비읍", "ㅅ": "시옷", "ㅇ": "이응", "ㅈ": "지읒", "ㅊ": "치읓",
  "ㅋ": "키읔", "ㅌ": "티읕", "ㅍ": "피읖", "ㅎ": "히읗",
  "ㅏ": "아", "ㅑ": "야", "ㅓ": "어", "ㅕ": "여", "ㅗ": "오",
  "ㅛ": "요", "ㅜ": "우", "ㅠ": "유", "ㅡ": "으", "ㅣ": "이",
};

/** 문구 전체에 필요한 기본 자모 집합(순서 유지, 중복 제거). */
export function requiredJamo(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const ch of text) {
    for (const j of decomposeChar(ch)) {
      if (!seen.has(j)) {
        seen.add(j);
        out.push(j);
      }
    }
  }
  return out;
}
