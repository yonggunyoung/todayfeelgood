/**
 * 키트 미리보기 시트 렌더러 — 폰트 견본 + 팔레트 띠 + 로고(브랜드명)를 한 장 PNG로 합성.
 * 폰트앱 FontPreview의 Canvas→PNG 경로를 키트용으로 일반화했다(브라우저 Canvas, 비AI, 서버 0).
 */

import type { FontScript } from "@webapp/core";
import type { HarmonyPalette } from "./palette";

/** base64(woff 등) → ArrayBuffer (FontFace 등록용) */
function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const clean = b64.includes(",") ? b64.split(",")[1]! : b64;
  const bin = atob(clean);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

export interface SheetOptions {
  brand: string;
  description?: string;
  palette: HarmonyPalette;
  script: FontScript;
  /** 엔진이 준 폰트(base64). 없으면 시스템 폰트로 폴백. */
  fontBase64?: string | null;
  fontFamily: string;
  /** 무료=워터마크 포함, 유료=제거 */
  watermark: boolean;
  /** 고해상(2x) 여부 */
  highRes: boolean;
}

/**
 * 시트를 Canvas에 그리고 PNG dataURL을 돌려준다.
 * 폰트를 FontFace로 등록한 뒤 그 폰트로 브랜드명·견본을 렌더한다.
 */
export async function renderKitSheet(opts: SheetOptions): Promise<string> {
  const scale = opts.highRes ? 2 : 1;
  const W = 1200 * scale;
  const H = 750 * scale;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const pal = opts.palette;
  const hangul = opts.script === "hangul";

  // 배경(옅은 브랜드 톤)
  ctx.fillStyle = pal.bg;
  ctx.fillRect(0, 0, W, H);

  // 폰트 등록(있으면)
  let fam = "system-ui, sans-serif";
  if (opts.fontBase64) {
    try {
      const family = `KitSheetFont-${Math.random().toString(36).slice(2)}`;
      const face = new FontFace(family, base64ToArrayBuffer(opts.fontBase64));
      const loaded = await face.load();
      (document.fonts as FontFaceSet).add(loaded);
      fam = `"${family}", system-ui, sans-serif`;
    } catch {
      /* 폴백 폰트로 진행 */
    }
  }

  const pad = 64 * scale;
  ctx.textBaseline = "alphabetic";

  // ── 브랜드명 로고(폰트로 렌더) ──
  ctx.fillStyle = pal.colors[0] ?? pal.ink;
  const logoSize = (opts.brand.length > 12 ? 92 : 132) * scale;
  ctx.font = `700 ${logoSize}px ${fam}`;
  ctx.fillText(opts.brand, pad, pad + logoSize * 0.85);

  // 설명(있으면)
  let y = pad + logoSize * 0.85 + 40 * scale;
  if (opts.description) {
    ctx.fillStyle = pal.ink;
    ctx.font = `500 ${30 * scale}px ${fam}`;
    ctx.fillText(opts.description.slice(0, 48), pad, y);
    y += 36 * scale;
  }

  // ── 팔레트 띠 ──
  y += 24 * scale;
  const swatchH = 90 * scale;
  const gap = 12 * scale;
  const cols = pal.colors.length;
  const swatchW = (W - pad * 2 - gap * (cols - 1)) / cols;
  pal.colors.forEach((c, i) => {
    const x = pad + i * (swatchW + gap);
    roundRect(ctx, x, y, swatchW, swatchH, 16 * scale);
    ctx.fillStyle = c;
    ctx.fill();
    // 칩 hex 라벨
    ctx.fillStyle = pal.ink;
    ctx.font = `500 ${20 * scale}px system-ui, sans-serif`;
    ctx.fillText(c.toUpperCase(), x + 6 * scale, y + swatchH + 26 * scale);
  });
  y += swatchH + 50 * scale;

  // ── 알파벳/숫자 견본(폰트로) ──
  ctx.fillStyle = pal.ink;
  ctx.font = `600 ${64 * scale}px ${fam}`;
  ctx.fillText(hangul ? "가나다라마" : "Aa Bb Cc", pad, y + 56 * scale);
  y += 92 * scale;
  ctx.font = `500 ${40 * scale}px ${fam}`;
  ctx.fillText(
    hangul ? "다람쥐 헌 쳇바퀴에 타고파" : "Hamburgefonstiv",
    pad,
    y + 38 * scale
  );
  y += 64 * scale;
  ctx.font = `400 ${34 * scale}px ${fam}`;
  ctx.fillText(
    hangul ? "0 1 2 3 4 5 6 7 8 9 . , ! ?" : "0123456789 . , ! ?",
    pad,
    y + 30 * scale
  );

  // ── 워터마크(무료) ──
  if (opts.watermark) {
    ctx.save();
    ctx.fillStyle = pal.ink;
    ctx.globalAlpha = 0.42;
    ctx.font = `600 ${22 * scale}px system-ui, sans-serif`;
    ctx.textAlign = "right";
    ctx.fillText("획 키트공방 · 미리보기", W - pad, H - pad * 0.5);
    ctx.restore();
  }

  return canvas.toDataURL("image/png");
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
