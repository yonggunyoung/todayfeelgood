/**
 * 키트 ZIP에 담는 텍스트 파일 빌더(palette.css / font-face.css / README.txt / LICENSE.txt).
 * 전부 문자열 템플릿(비AI, 비용 0). 정직성·폰트 라이선스 고지를 README/LICENSE에 반드시 담는다.
 */

import { FONT_FORMATS, type FontFormat } from "@webapp/core";
import type { HarmonyPalette } from "./palette";

/** 브랜드명을 안전한 파일/패밀리 식별자로 정리(영숫자·하이픈) */
export function slugify(name: string): string {
  const s = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/gi, "-")
    .replace(/^-+|-+$/g, "");
  return s || "brand";
}

/** CSS 식별자로 안전한 폰트 패밀리명 */
export function fontFamilyName(brand: string): string {
  const base = brand.trim().replace(/["'\\]/g, "");
  return base || "MyBrand";
}

/** palette.css — :root CSS 변수로 팔레트 노출 */
export function buildPaletteCss(palette: HarmonyPalette, brand: string): string {
  const vars = palette.colors
    .map((c, i) => `  --brand-${i + 1}: ${c};`)
    .join("\n");
  return `/* ${brand} — 브랜드 팔레트 (획 키트공방에서 생성) */
:root {
  --brand-accent: ${palette.accent};
${vars}
  --brand-ink: ${palette.ink};
  --brand-bg: ${palette.bg};
}

/* 예시: 버튼/배경에 바로 사용
.button { background: var(--brand-accent); color: #fff; }
body { background: var(--brand-bg); color: var(--brand-ink); }
*/
`;
}

/** font-face.css — @font-face 스니펫 + 사용 예시 */
export function buildFontFaceCss(
  family: string,
  fileBase: string,
  formats: FontFormat[]
): string {
  // src 우선순위: woff2 > woff > ttf > otf
  const order: FontFormat[] = ["woff2", "woff", "ttf", "otf"];
  const fmtName: Record<FontFormat, string> = {
    woff2: "woff2",
    woff: "woff",
    ttf: "truetype",
    otf: "opentype",
  };
  const present = order.filter((f) => formats.includes(f));
  const srcLines = present
    .map(
      (f) =>
        `       url("./${fileBase}.${FONT_FORMATS[f].ext}") format("${fmtName[f]}")`
    )
    .join(",\n");
  return `/* ${family} — @font-face (획 키트공방에서 생성) */
@font-face {
  font-family: "${family}";
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src:
${srcLines};
}

/* 예시
.logo { font-family: "${family}", system-ui, sans-serif; }
*/
`;
}

interface ReadmeOpts {
  brand: string;
  description?: string;
  script: "latin" | "hangul";
  formats: FontFormat[];
  commercial: boolean;
}

/** README.txt — 키트 구성·사용법·정직성 라벨 */
export function buildReadme(o: ReadmeOpts): string {
  const fmtList = o.formats.map((f) => FONT_FORMATS[f].ext.toUpperCase()).join(", ");
  return `${o.brand} — 브랜드 키트
${o.description ? o.description + "\n" : ""}
획(Hwoek) 키트공방에서 만든 한 벌 키트예요.

[ 구성 ]
- font/        폰트 파일 (${fmtList})
- font-face.css  웹에서 폰트를 불러오는 @font-face 스니펫
- palette.css    브랜드 색 팔레트 (CSS 변수)
- preview.png    키트 미리보기 시트 (로고 + 팔레트 + 글자 견본)
- LICENSE.txt    라이선스·출처 고지
- README.txt     이 파일

[ 쓰는 법 ]
1) 웹사이트: <head>에 font-face.css, palette.css를 불러오세요.
2) 디자인 툴: font/ 안의 폰트 파일을 설치해 쓰세요.
3) 색: palette.css의 --brand-* 변수를 그대로 가져다 쓰세요.

[ 정직성 — 꼭 읽어 주세요 ]
- 이 키트의 글씨체는 "공개 가변폰트를 변형(굵기/기울기/곡률 등)"해 만든 결과예요.
  실제 손글씨 캡처나 AI 생성이 아닙니다.
- 미리보기 시트(preview.png)는 이미지 전용 효과가 들어갈 수 있어요(폰트 파일에는 미반영).
- 원본 공개 폰트의 라이선스 고지는 LICENSE.txt를 확인하세요.

[ 사용 범위 ]
${
  o.commercial
    ? "- 상업 사용 가능 키트입니다. 단, 베이스 공개 폰트의 라이선스(LICENSE.txt)를 함께 준수하세요."
    : "- 개인·비상업 용도 키트입니다. 상업 사용은 상업용 키트로 다시 받아 주세요."
}

만든 키트는 모두 당신의 것이에요. — 획 키트공방
`;
}

interface LicenseOpts {
  brand: string;
  commercial: boolean;
}

/**
 * LICENSE.txt — 베이스 공개 폰트(OFL) 고지 + 키트 사용 범위.
 * 베이스 폰트: 라틴=Recursive, 한글=Pretendard/Noto 계열 (모두 SIL OFL 공개 폰트).
 * 재배포 시 OFL 고지를 동봉하는 것이 정직성·라이선스 준수의 핵심.
 */
export function buildLicense(o: LicenseOpts): string {
  return `${o.brand} 브랜드 키트 — 라이선스 및 출처 고지

[ 글씨체(폰트)의 출처 ]
이 키트의 폰트는 SIL Open Font License(OFL)로 배포되는 공개 가변폰트를
획 키트공방의 변형 엔진으로 가공(굵기·기울기·곡률·자간 등 파라미터 변형)해
생성한 결과물입니다. 실제 자필 캡처나 AI 생성이 아닙니다.

- 베이스 폰트(라틴): Recursive (SIL OFL 1.1)
- 베이스 폰트(한글): Pretendard / Noto Sans KR 계열 (SIL OFL 1.1)

원본 폰트 및 OFL 전문은 각 폰트의 공식 배포처에서 확인할 수 있습니다.
SIL Open Font License 1.1 전문: https://openfontlicense.org

[ OFL 핵심 준수사항 ]
- OFL 폰트의 변형/재배포는 허용되나, 원본 OFL 고지를 함께 배포해야 합니다(본 파일).
- 폰트 자체를 단독으로 유료 판매할 수 없습니다(OFL). 본 키트는 "변형 결과물 + 부가 자산"의
  사용권을 제공하는 것이며, 베이스 폰트의 OFL은 그대로 유지됩니다.

[ 키트 사용 범위 ]
${
  o.commercial
    ? "상업 사용 가능. 로고/색/시트/스니펫을 상업 프로젝트에 사용할 수 있습니다."
    : "개인·비상업 사용. 상업적 사용을 원하면 상업용 키트를 발급받으세요."
}

[ 정직성 라벨 ]
generatedBy: baseFontVariation (공개 가변폰트 변형 · 비AI)

— 획(Hwoek) 키트공방
`;
}
