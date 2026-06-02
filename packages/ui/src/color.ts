/**
 * 색상 입력 살균(보안 유틸) — 사용자/외부 색상 문자열을 안전한 CSS 색으로 강제.
 *
 * 왜: 색 문자열이 SVG 속성(`fill="${c}"`, `stroke="${c}"`)이나 Canvas `fillStyle`에
 * raw 보간될 때, 검증 없는 값은 SVG 속성 탈출(`"#000"/><script>` 류) 또는 깨진 렌더를
 * 일으킬 수 있다. 컬러 피커 확장(자유 입력) 대비해 입력단에서 화이트리스트로 살균한다.
 *
 * 허용: #rgb / #rgba / #rrggbb / #rrggbbaa, rgb()/rgba()/hsl()/hsla(),
 *       그리고 흔한 CSS 색 키워드(소문자). 그 외 = fallback.
 * 순수 함수(React 의존 없음).
 */

const HEX = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
// 숫자/퍼센트/콤마/공백/소수점/슬래시만 허용해 함수형 색을 안전하게 통과(괄호 밖 문자 차단)
const FUNC = /^(?:rgb|rgba|hsl|hsla)\(\s*[0-9.,%\s/]+\)$/i;

/** 안전한 색 키워드(SVG/Canvas 양쪽에서 무해). 필요 시 확장. */
const KEYWORDS = new Set([
  "transparent",
  "none",
  "currentcolor",
  "black",
  "white",
  "red",
  "green",
  "blue",
  "yellow",
  "orange",
  "purple",
  "pink",
  "brown",
  "gray",
  "grey",
  "cyan",
  "magenta",
  "teal",
  "navy",
  "maroon",
  "olive",
  "lime",
  "aqua",
  "silver",
  "gold",
  "coral",
  "salmon",
  "ivory",
  "beige",
]);

/**
 * 색 문자열을 살균한다. 허용 형식이면 그대로(정규화: 트림), 아니면 fallback.
 * @param input 사용자/외부 색 문자열
 * @param fallback 비허용 시 대체색(기본 잉크 #2b2a33)
 */
export function sanitizeColor(input: unknown, fallback = "#2b2a33"): string {
  if (typeof input !== "string") return fallback;
  const v = input.trim();
  if (!v) return fallback;
  if (HEX.test(v)) return v;
  if (FUNC.test(v)) return v;
  if (KEYWORDS.has(v.toLowerCase())) return v.toLowerCase();
  return fallback;
}

export default sanitizeColor;
