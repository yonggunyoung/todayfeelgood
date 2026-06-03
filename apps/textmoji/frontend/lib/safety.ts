/**
 * 호환성 안전등급(정직성 코어) — 가치 게이트의 G1/G5를 떠받치는 부분.
 *
 * 이건 우리의 진짜 차별이자 "가장 거짓말하기 쉬운" 부분이다(idea-textmoji §3.4).
 * 거짓 안심 절대 금지: 등급은 어디까지나 **추정치**이며, 상대 기기/앱/폰트에 따라
 * □(두부)로 깨질 수 있다는 사실을 UI에 명시한다.
 *
 * 측정 방식: 순수 휴리스틱(유니코드 블록·버전·결합문자·ZWJ). 외부 호출 0, 서버 0.
 *  - 🟢 safe : ASCII + 광범위 지원 BMP(어디서나 거의 100%)
 *  - 🟡 ok   : 흔한 확장(IPA·키릴·가나·괄호 변형 등) — 최신 기기 OK, 구형·일부 앱 위험
 *  - 🔴 fancy: 결합문자·ZWJ·희귀/상위 블록·이모지 혼합 — 깨질 확률 높음
 */

export type SafetyTier = "safe" | "ok" | "fancy";

/** 등급 표시 메타(배지·툴팁) */
export const TIER_META: Record<
  SafetyTier,
  { dot: string; label: string; short: string; rank: number }
> = {
  safe: { dot: "🟢", label: "안전", short: "어디서나 잘 보여요", rank: 0 },
  ok: { dot: "🟡", label: "보통", short: "구형 기기에선 깨질 수 있어요", rank: 1 },
  fancy: { dot: "🔴", label: "화려", short: "상대 기기에선 □로 깨질 수 있어요", rank: 2 },
};

/** 두 등급 중 더 위험한(랭크 높은) 쪽 */
export function worseTier(a: SafetyTier, b: SafetyTier): SafetyTier {
  return TIER_META[a].rank >= TIER_META[b].rank ? a : b;
}

/** 결합문자(combining marks): 앞 글자에 덧붙어 자주 깨지거나 글자가 망가진다 */
function isCombining(cp: number): boolean {
  return (
    (cp >= 0x0300 && cp <= 0x036f) || // Combining Diacritical Marks
    (cp >= 0x1ab0 && cp <= 0x1aff) || // Combining Diacritical Marks Extended
    (cp >= 0x1dc0 && cp <= 0x1dff) || // Combining Diacritical Marks Supplement
    (cp >= 0x20d0 && cp <= 0x20ff) || // Combining Diacritical Marks for Symbols
    (cp >= 0xfe20 && cp <= 0xfe2f) // Combining Half Marks
  );
}

/** 🟢 어디서나 안전한 코드포인트(ASCII + 아주 흔한 BMP 기호) */
function isSafeCp(cp: number): boolean {
  if (cp >= 0x20 && cp <= 0x7e) return true; // 기본 ASCII (괄호·_^<>:;3 등)
  // 흔히 깔끔하게 렌더되는 일반 구두점/기호
  return (
    cp === 0x00a0 || // nbsp
    cp === 0x2018 || cp === 0x2019 || // ‘ ’
    cp === 0x201c || cp === 0x201d || // “ ”
    cp === 0x2026 || // …
    cp === 0x2013 || cp === 0x2014 || // – —
    cp === 0x2665 || // ♥
    cp === 0x2606 || cp === 0x2605 || // ☆ ★
    cp === 0x266a || cp === 0x266b // ♪ ♫
  );
}

/** 🟡 흔한 확장 블록(최신 기기는 OK, 일부 구형/앱 위험) */
function isOkCp(cp: number): boolean {
  return (
    (cp >= 0x00a1 && cp <= 0x024f) || // Latin-1 Supplement + Latin Extended-A/B
    (cp >= 0x0250 && cp <= 0x02af) || // IPA Extensions
    (cp >= 0x02b0 && cp <= 0x02ff) || // Spacing Modifier Letters (ʕ ʔ 곰 괄호, ˎ ˏ)
    (cp >= 0x1d00 && cp <= 0x1d7f) || // Phonetic Extensions (ᴥ 동물 입 등 카오모지 단골)
    (cp >= 0x1d80 && cp <= 0x1dbf) || // Phonetic Extensions Supplement
    (cp >= 0x0391 && cp <= 0x03c9) || // Greek (ω ε Δ)
    (cp >= 0x0400 && cp <= 0x04ff) || // Cyrillic
    (cp >= 0x2000 && cp <= 0x206f) || // General Punctuation
    (cp >= 0x2190 && cp <= 0x21ff) || // Arrows
    (cp >= 0x2200 && cp <= 0x22ff) || // Mathematical Operators
    (cp >= 0x2300 && cp <= 0x23ff) || // Misc Technical (⌐ 등)
    (cp >= 0x25a0 && cp <= 0x25ff) || // Geometric Shapes (◕ ▽ □ ●)
    (cp >= 0x2600 && cp <= 0x26ff) || // Misc Symbols (별·하트 일부)
    (cp >= 0x3000 && cp <= 0x303f) || // CJK Symbols & Punctuation (（）〔〕｡)
    (cp >= 0x3040 && cp <= 0x30ff) || // Hiragana/Katakana (ノ つ づ ヽ ω)
    (cp >= 0xff00 && cp <= 0xffef) // Halfwidth/Fullwidth (＾ ￣ 등)
  );
}

/**
 * 한 문자열의 안전등급을 추정한다(절대 단언 아님 — UI에 "추정치" 명시).
 * 규칙: 결합문자/ZWJ/이모지/상위 평면(astral)/희귀 블록이 하나라도 있으면 fancy.
 *       그 외에 ok 블록이 섞이면 ok. 전부 safe면 safe.
 */
export function estimateTier(text: string): SafetyTier {
  let tier: SafetyTier = "safe";
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    if (cp === undefined) continue;
    // ZWJ / variation selector / 상위 평면(이모지·희귀) → 즉시 fancy
    if (cp === 0x200d || (cp >= 0xfe00 && cp <= 0xfe0f) || cp > 0xffff) {
      return "fancy";
    }
    if (isCombining(cp)) return "fancy";
    if (isSafeCp(cp)) continue;
    if (isOkCp(cp)) {
      tier = worseTier(tier, "ok");
      continue;
    }
    // 분류되지 않은(희귀) BMP 코드포인트 → 보수적으로 fancy
    tier = worseTier(tier, "fancy");
  }
  return tier;
}

/**
 * 조합 무결성 검사(생성물 하드 필터용).
 * 괄호 균형이 깨지거나 결합문자가 단독 선두에 오면(렌더 깨짐) false.
 */
export function isWellFormed(text: string): boolean {
  if (!text.trim()) return false;
  const pairs: Record<string, string> = { "(": ")", "（": "）", "〔": "〕", "[": "]", "{": "}" };
  const closers = new Set(Object.values(pairs));
  let depth = 0;
  let first = true;
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    if (cp !== undefined && first && isCombining(cp)) return false; // 선두 결합문자 = 깨짐
    first = false;
    if (pairs[ch]) depth++;
    else if (closers.has(ch)) {
      depth--;
      if (depth < 0) return false; // 닫는 괄호가 먼저
    }
  }
  return depth === 0;
}
