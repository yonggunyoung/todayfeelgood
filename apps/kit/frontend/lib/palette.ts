/**
 * 팔레트 조화 생성 — 악센트 색 하나에서 4~5색 조화 팔레트를 만든다.
 * 전부 클라이언트 계산(비AI, 비용 0). HSL 명도/채도/색상환(보색·유사색) 규칙만 사용.
 */

export interface Hsl {
  h: number; // 0~360
  s: number; // 0~100
  l: number; // 0~100
}

/** #rrggbb / #rgb → HSL */
export function hexToHsl(hex: string): Hsl {
  const m = hex.replace("#", "");
  const full =
    m.length === 3
      ? m
          .split("")
          .map((c) => c + c)
          .join("")
      : m;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: s * 100, l: l * 100 };
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

/** HSL → #rrggbb */
export function hslToHex({ h, s, l }: Hsl): string {
  const sn = clamp(s, 0, 100) / 100;
  const ln = clamp(l, 0, 100) / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;
  if (hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = ln - c / 2;
  const to = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

/** 색의 상대 휘도(WCAG 근사) — 0(어두움)~1(밝음). 잉크/배경 자동 선택용. */
export function luminance(hex: string): number {
  const { l } = hexToHsl(hex);
  return l / 100;
}

export interface HarmonyPalette {
  /** 악센트(브랜드 메인). 사용자가 고른 색 */
  accent: string;
  /** 조화색 4~5개 (악센트 포함, 명도/색상 변주) */
  colors: string[];
  /** 글자색(잉크) — 팔레트 위에서 잘 읽히게 자동 선택 */
  ink: string;
  /** 배경색 — 아주 옅은 톤 */
  bg: string;
}

/**
 * 악센트 색 → 조화 팔레트 4~5색 생성.
 * 규칙: 악센트 + 유사색(±30°) 2개 + 보색 포인트 1개 + 명도 변주(어두운/밝은 톤).
 * 명도 대비를 벌려 칩이 서로 구분되게 한다.
 */
export function buildHarmony(accentHexInput: string): HarmonyPalette {
  // 색 입력 살균: #rgb/#rrggbb만 신뢰(피커 외 외부 주입 대비). 그 외 = 기본 테라코타.
  const accentHex = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(
    (accentHexInput ?? "").trim()
  )
    ? accentHexInput.trim()
    : "#c0492b";
  const base = hexToHsl(accentHex);
  const colors: string[] = [];

  // 1) 어두운 톤(딥) — 텍스트/강조에 쓸 진한 변형
  colors.push(hslToHex({ h: base.h, s: clamp(base.s + 6, 0, 92), l: clamp(base.l - 26, 14, 86) }));
  // 2) 악센트 본색
  colors.push(hslToHex({ h: base.h, s: base.s, l: clamp(base.l, 20, 80) }));
  // 3) 유사색(따뜻한 쪽으로 +28°, 살짝 밝게)
  colors.push(hslToHex({ h: base.h + 28, s: clamp(base.s - 6, 0, 90), l: clamp(base.l + 12, 24, 88) }));
  // 4) 보색 포인트(반대쪽 색상, 채도 약간 낮춰 톤 정리)
  colors.push(hslToHex({ h: base.h + 180, s: clamp(base.s - 18, 16, 80), l: clamp(base.l + 4, 28, 78) }));
  // 5) 옅은 크림/파스텔(배경 보조)
  colors.push(hslToHex({ h: base.h - 18, s: clamp(base.s - 30, 8, 60), l: clamp(base.l + 34, 80, 96) }));

  // 잉크: 악센트가 밝으면 진한 딥 컬러, 어두우면 짙은 중성. 가독성 우선.
  const ink =
    luminance(accentHex) > 0.55
      ? hslToHex({ h: base.h, s: clamp(base.s, 10, 50), l: 18 })
      : "#2b2a33";
  // 배경: 아주 옅은 동계 톤(거의 흰색 색지)
  const bg = hslToHex({ h: base.h, s: clamp(base.s - 40, 6, 30), l: 97 });

  return { accent: accentHex, colors, ink, bg };
}

/** 문방구 캔디 토큰 기반 프리셋 악센트(피커 부담 줄이는 빠른 시작) */
export const PRESET_ACCENTS: { id: string; label: string; hex: string }[] = [
  { id: "terra", label: "감빛 테라코타", hex: "#c0492b" },
  { id: "coral", label: "살구 코랄", hex: "#ef7a52" },
  { id: "butter", label: "버터 옐로", hex: "#f5c451" },
  { id: "mint", label: "민트 그린", hex: "#46b39a" },
  { id: "plum", label: "자두", hex: "#b65a6e" },
  { id: "indigo", label: "쪽빛", hex: "#3f6fb5" },
];
