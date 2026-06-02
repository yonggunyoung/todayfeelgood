/**
 * 서명 합성 + 내보내기.
 *
 * 본체(A): 엔진이 준 변형 WOFF를 @font-face로 박아 이름을 <text>로 렌더.
 * 오버레이(B): overlay.ts가 만든 절차적 SVG path를 위/아래/앞뒤에 합성.
 * 출력: 자기완결 SVG 문자열(폰트 base64 내장) / 그 SVG를 canvas로 래스터한 투명 PNG.
 *
 * 정직성: 글자는 "공개 가변폰트 변형", 장식은 "절차적 합성"이며 실제 자필이 아님.
 */
import { buildOverlay, type OverlayBox } from "./overlay";
import { BG_FILL, type SignParams } from "./signParams";

export interface SignViewBox {
  width: number;
  height: number;
}

/** 캔버스 기준 좌표(viewBox 1000 x 360). */
const VB: SignViewBox = { width: 1000, height: 360 };
const PAD_X = 90;
const BASELINE_Y = 210;
const CAP_Y = 70;
const FONT_PX = 150;

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) =>
    c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === "&" ? "&amp;" : c === "'" ? "&apos;" : "&quot;"
  );
}

/**
 * 자기완결 SVG 문자열을 만든다.
 * - fontBase64: 엔진이 준 WOFF base64(접두사 없는 순수 base64).
 * - watermark: true면 우하단에 서비스명 워터마크(무료 PNG용).
 */
export function buildSignSvg(
  p: SignParams,
  fontBase64: string,
  fontFamily: string,
  opts: { watermark?: boolean } = {}
): string {
  const text = (p.text || "이름").trim();
  const ink = p.inkColor || "#2b2a33";
  const bg = BG_FILL[p.bgMode];

  // 글자 폭은 정확히 알 수 없으므로(서버 측 측정 없음) 글자수 기반 근사로 box를 잡는다.
  // 오버레이 앵커가 글자 영역과 대략 맞으면 충분(근사 장식이므로).
  const approxCharW = FONT_PX * (p.script === "hangul" ? 0.95 : 0.52);
  const textW = Math.min(VB.width - PAD_X * 2, Math.max(approxCharW, text.length * approxCharW));
  const x0 = (VB.width - textW) / 2;
  const x1 = x0 + textW;
  const cx = VB.width / 2;

  const box: OverlayBox = {
    x0,
    x1,
    baselineY: BASELINE_Y,
    capY: CAP_Y,
    stroke: Math.max(3, FONT_PX * 0.045),
  };
  const overlay = buildOverlay(p, box);

  const fontFaceCss = fontBase64
    ? `@font-face{font-family:'${fontFamily}';src:url(data:font/woff;base64,${fontBase64}) format('woff');font-display:block;}`
    : "";

  const overlayPaths = overlay
    .map(
      (o) =>
        `<path d="${o.d}" fill="none" stroke="${ink}" stroke-width="${o.width.toFixed(
          2
        )}" stroke-linecap="round" stroke-linejoin="round"/>`
    )
    .join("");

  const bgRect =
    bg === "none" ? "" : `<rect width="${VB.width}" height="${VB.height}" fill="${bg}"/>`;

  const wm = opts.watermark
    ? `<text x="${VB.width - 16}" y="${VB.height - 14}" text-anchor="end" font-family="sans-serif" font-size="22" fill="${ink}" opacity="0.35">획 싸인공방</text>`
    : "";

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${VB.width}" height="${VB.height}" viewBox="0 0 ${VB.width} ${VB.height}">`,
    `<style>${fontFaceCss}</style>`,
    bgRect,
    overlayPaths,
    `<text x="${cx}" y="${BASELINE_Y}" text-anchor="middle" font-family="'${fontFamily}', cursive, sans-serif" font-size="${FONT_PX}" fill="${ink}" letter-spacing="${(
      p.body.letterSpacing * FONT_PX
    ).toFixed(1)}">${escapeXml(text)}</text>`,
    wm,
    `</svg>`,
  ].join("");
}

/** SVG 문자열 → data URL */
export function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * SVG를 canvas로 래스터해 투명 PNG dataURL을 만든다(scale 배).
 * 자기완결 SVG(폰트 base64 내장)이므로 외부 폰트 로드 없이 그려진다.
 * FontFace 로딩이 끝난 뒤 호출해야 글자가 정확히 렌더된다.
 */
export async function svgToPng(svg: string, scale = 2): Promise<string> {
  const url = svgDataUrl(svg);
  const img = new Image();
  img.decoding = "sync";
  const loaded = new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("이미지 렌더 실패"));
  });
  img.src = url;
  await loaded;

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(VB.width * scale);
  canvas.height = Math.round(VB.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("캔버스 컨텍스트를 만들 수 없습니다.");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/png");
}

export { VB as SIGN_VIEWBOX };
