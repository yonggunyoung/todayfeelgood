/**
 * 즐겨찾기 = 사용자 큐레이션. localStorage, 서버·로그인 0. (idea-textmoji 우선순위 3)
 * 키는 텍스트 자체(유일). 안전등급은 표시 시 estimateTier로 재산정하므로 저장 불요.
 */
const KEY = "textmoji.favs.v1";

export function loadFavorites(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function saveFavorites(list: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list.slice(0, 500)));
  } catch {
    // 용량 초과 등 — 조용히 무시(즐겨찾기는 부가 기능)
  }
}

export function toggleFavorite(list: string[], text: string): string[] {
  return list.includes(text) ? list.filter((t) => t !== text) : [text, ...list];
}
