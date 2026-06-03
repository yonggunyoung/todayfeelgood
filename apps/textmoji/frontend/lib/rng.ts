/**
 * 시드 기반 결정적 난수(mulberry32) — 재현성 + 의외성의 핵심.
 * 같은 시드 → 같은 조합 세트. 🎲 더 만들기 버튼이 시드를 바꿔 "방금 만든 나만의 조합"을 무한히 발견하게 한다.
 * apps/sticker/frontend/lib/rng.ts 와 동일 사상(서버 0, 클라 자급). packages 쓰기 금지라 textmoji가 자체 보유.
 */
export function makeRng(seed: number) {
  let a = seed >>> 0;
  return function next(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 문자열 → 32bit 시드 해시 */
export function hashSeed(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** 배열에서 시드로 하나 고르기(빈 배열 안전) */
export function pick<T>(rng: () => number, arr: readonly T[]): T | undefined {
  if (arr.length === 0) return undefined;
  return arr[Math.floor(rng() * arr.length) % arr.length];
}
