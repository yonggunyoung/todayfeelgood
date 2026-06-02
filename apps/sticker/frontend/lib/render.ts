/**
 * 절차적 스티커 렌더 엔진(비AI, 브라우저 Canvas 전용).
 *
 * 입력 1장(사용자가 그린 캐릭터, 투명 배경) → 출력 N개.
 * 변주 축: 표정(눈/입/데코) × 색 팔레트 × 밈 템플릿(외곽선/배경칩/캡션) × 시드 흔들기.
 * 모든 합성은 캔버스에서 동기적으로 일어나며 서버·외부 호출이 전혀 없다.
 */
import type {
  ColorPalette,
  DecoStyle,
  EmotionPreset,
  EyeStyle,
  MemeTemplate,
  MouthStyle,
} from "./presets";
import { makeRng } from "./rng";

const INK = "#2b2a33";

/** 그린 이미지의 실제 내용 바운딩박스(투명/흰 배경 제거)로 잘라 정사각 중앙배치한 캔버스를 만든다. */
export function cropToContent(
  src: HTMLCanvasElement,
  treatWhiteAsBg = true
): { canvas: HTMLCanvasElement; isEmpty: boolean } {
  const w = src.width;
  const h = src.height;
  const ctx = src.getContext("2d")!;
  const data = ctx.getImageData(0, 0, w, h).data;
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const a = data[i + 3]!;
      const r = data[i]!;
      const g = data[i + 1]!;
      const b = data[i + 2]!;
      // 내용 판정: 불투명하고, (흰배경 모드면) 거의 흰색이 아닌 픽셀
      const isWhite = treatWhiteAsBg && r > 244 && g > 244 && b > 244;
      if (a > 24 && !isWhite) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  const out = document.createElement("canvas");
  if (maxX < minX || maxY < minY) {
    out.width = 1;
    out.height = 1;
    return { canvas: out, isEmpty: true };
  }
  const pad = 8;
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(w - 1, maxX + pad);
  maxY = Math.min(h - 1, maxY + pad);
  const cw = maxX - minX + 1;
  const ch = maxY - minY + 1;
  out.width = cw;
  out.height = ch;
  const octx = out.getContext("2d")!;
  octx.drawImage(src, minX, minY, cw, ch, 0, 0, cw, ch);

  // 흰 배경을 투명으로(스티커는 투명 PNG가 핵심)
  if (treatWhiteAsBg) {
    const od = octx.getImageData(0, 0, cw, ch);
    const p = od.data;
    for (let i = 0; i < p.length; i += 4) {
      if (p[i]! > 244 && p[i + 1]! > 244 && p[i + 2]! > 244) {
        p[i + 3] = 0;
      }
    }
    octx.putImageData(od, 0, 0);
  }
  return { canvas: out, isEmpty: false };
}

/** 본체에 색조를 입힌다(원본 알파 유지). source-atop으로 그린 선/면 위에 컬러 오버레이. */
function tintBody(
  tile: HTMLCanvasElement,
  bodyCanvas: HTMLCanvasElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  color: string,
  strength: number
) {
  const ctx = tile.getContext("2d")!;
  // 임시 캔버스에 본체를 그리고 그 위에 색을 atop
  const tmp = document.createElement("canvas");
  tmp.width = dw;
  tmp.height = dh;
  const tctx = tmp.getContext("2d")!;
  tctx.drawImage(bodyCanvas, 0, 0, bodyCanvas.width, bodyCanvas.height, 0, 0, dw, dh);
  if (strength > 0) {
    tctx.globalCompositeOperation = "source-atop";
    tctx.globalAlpha = strength;
    tctx.fillStyle = color;
    tctx.fillRect(0, 0, dw, dh);
    tctx.globalAlpha = 1;
    tctx.globalCompositeOperation = "source-over";
  }
  ctx.drawImage(tmp, dx, dy);
}

/** 알파 외곽선(스티커화) — 본체 알파를 사방으로 번져 외곽 색을 깐 뒤 본체를 다시 올린다. */
function drawWithOutline(
  tile: HTMLCanvasElement,
  content: HTMLCanvasElement,
  outlineWidth: number,
  outlineColor: string
) {
  const ctx = tile.getContext("2d")!;
  if (outlineWidth > 0) {
    const ol = document.createElement("canvas");
    ol.width = tile.width;
    ol.height = tile.height;
    const olctx = ol.getContext("2d")!;
    const steps = 16;
    for (let s = 0; s < steps; s++) {
      const ang = (s / steps) * Math.PI * 2;
      olctx.drawImage(
        content,
        Math.cos(ang) * outlineWidth,
        Math.sin(ang) * outlineWidth
      );
    }
    // 번진 알파를 외곽 색으로 칠함
    olctx.globalCompositeOperation = "source-in";
    olctx.fillStyle = outlineColor;
    olctx.fillRect(0, 0, ol.width, ol.height);
    ctx.drawImage(ol, 0, 0);
  }
  ctx.drawImage(content, 0, 0);
}

// ───────── 표정 파츠(절차적 SVG path → Canvas) ─────────
// 좌표계: 얼굴 영역 박스 {fx, fy, fw, fh} 안에서 그린다.

function drawEyes(
  ctx: CanvasRenderingContext2D,
  style: EyeStyle,
  fx: number,
  fy: number,
  fw: number,
  fh: number
) {
  const lx = fx + fw * 0.32;
  const rx = fx + fw * 0.68;
  const ey = fy + fh * 0.42;
  const r = fw * 0.09;
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;
  ctx.lineWidth = Math.max(2, fw * 0.035);
  ctx.lineCap = "round";

  const dot = (cx: number) => {
    ctx.beginPath();
    ctx.arc(cx, ey, r, 0, Math.PI * 2);
    ctx.fill();
    // 하이라이트
    ctx.save();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(cx + r * 0.3, ey - r * 0.3, r * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
  const arcUp = (cx: number) => {
    ctx.beginPath();
    ctx.moveTo(cx - r, ey + r * 0.4);
    ctx.quadraticCurveTo(cx, ey - r, cx + r, ey + r * 0.4);
    ctx.stroke();
  };
  const arcDown = (cx: number) => {
    ctx.beginPath();
    ctx.moveTo(cx - r, ey - r * 0.2);
    ctx.quadraticCurveTo(cx, ey + r, cx + r, ey - r * 0.2);
    ctx.stroke();
  };
  const heart = (cx: number) => {
    ctx.save();
    ctx.fillStyle = "#ef5b73";
    ctx.beginPath();
    const s = r * 1.1;
    ctx.moveTo(cx, ey + s * 0.7);
    ctx.bezierCurveTo(cx + s, ey - s * 0.2, cx + s * 0.4, ey - s, cx, ey - s * 0.35);
    ctx.bezierCurveTo(cx - s * 0.4, ey - s, cx - s, ey - s * 0.2, cx, ey + s * 0.7);
    ctx.fill();
    ctx.restore();
  };
  const star = (cx: number) => {
    ctx.save();
    ctx.fillStyle = "#f5c451";
    const spikes = 5;
    const outer = r * 1.2;
    const inner = r * 0.5;
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const rad = i % 2 === 0 ? outer : inner;
      const a = (Math.PI / spikes) * i - Math.PI / 2;
      const px = cx + Math.cos(a) * rad;
      const py = ey + Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  switch (style) {
    case "open":
      dot(lx);
      dot(rx);
      break;
    case "wink":
      dot(lx);
      arcUp(rx);
      break;
    case "happy":
      arcUp(lx);
      arcUp(rx);
      break;
    case "heart":
      heart(lx);
      heart(rx);
      break;
    case "star":
      star(lx);
      star(rx);
      break;
    case "sad":
      arcDown(lx);
      arcDown(rx);
      break;
    case "angry":
      // 치켜뜬 눈 + 눈썹
      dot(lx);
      dot(rx);
      ctx.beginPath();
      ctx.moveTo(lx - r, ey - r * 1.6);
      ctx.lineTo(lx + r, ey - r * 0.8);
      ctx.moveTo(rx + r, ey - r * 1.6);
      ctx.lineTo(rx - r, ey - r * 0.8);
      ctx.stroke();
      break;
    case "surprised":
      ctx.beginPath();
      ctx.arc(lx, ey, r * 1.4, 0, Math.PI * 2);
      ctx.arc(rx, ey, r * 1.4, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case "sleepy":
      ctx.beginPath();
      ctx.moveTo(lx - r, ey);
      ctx.quadraticCurveTo(lx, ey + r * 0.8, lx + r, ey);
      ctx.moveTo(rx - r, ey);
      ctx.quadraticCurveTo(rx, ey + r * 0.8, rx + r, ey);
      ctx.stroke();
      break;
    case "dizzy":
      ctx.font = `${Math.round(r * 2.4)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("×", lx, ey);
      ctx.fillText("×", rx, ey);
      break;
  }
  ctx.restore();
}

function drawMouth(
  ctx: CanvasRenderingContext2D,
  style: MouthStyle,
  fx: number,
  fy: number,
  fw: number,
  fh: number
) {
  const cx = fx + fw * 0.5;
  const my = fy + fh * 0.72;
  const w = fw * 0.26;
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;
  ctx.lineWidth = Math.max(2, fw * 0.035);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  switch (style) {
    case "smile":
      ctx.beginPath();
      ctx.moveTo(cx - w, my);
      ctx.quadraticCurveTo(cx, my + w * 0.9, cx + w, my);
      ctx.stroke();
      break;
    case "grin":
      ctx.beginPath();
      ctx.moveTo(cx - w, my);
      ctx.quadraticCurveTo(cx, my + w * 1.2, cx + w, my);
      ctx.quadraticCurveTo(cx, my + w * 0.2, cx - w, my);
      ctx.closePath();
      ctx.fillStyle = "#9a3b34";
      ctx.fill();
      ctx.stroke();
      break;
    case "open":
      ctx.beginPath();
      ctx.ellipse(cx, my + w * 0.2, w * 0.6, w * 0.8, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#9a3b34";
      ctx.fill();
      break;
    case "frown":
      ctx.beginPath();
      ctx.moveTo(cx - w, my + w * 0.5);
      ctx.quadraticCurveTo(cx, my - w * 0.4, cx + w, my + w * 0.5);
      ctx.stroke();
      break;
    case "cat":
      ctx.beginPath();
      ctx.moveTo(cx - w, my);
      ctx.quadraticCurveTo(cx - w * 0.5, my + w * 0.7, cx, my);
      ctx.quadraticCurveTo(cx + w * 0.5, my + w * 0.7, cx + w, my);
      ctx.stroke();
      break;
    case "tongue":
      ctx.beginPath();
      ctx.moveTo(cx - w, my);
      ctx.quadraticCurveTo(cx, my + w * 0.8, cx + w, my);
      ctx.stroke();
      ctx.beginPath();
      ctx.fillStyle = "#ef7a90";
      ctx.ellipse(cx, my + w * 0.5, w * 0.4, w * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "flat":
      ctx.beginPath();
      ctx.moveTo(cx - w * 0.7, my);
      ctx.lineTo(cx + w * 0.7, my);
      ctx.stroke();
      break;
    case "kiss":
      ctx.beginPath();
      ctx.fillStyle = "#ef5b73";
      ctx.ellipse(cx, my, w * 0.4, w * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
  }
  ctx.restore();
}

function drawDeco(
  ctx: CanvasRenderingContext2D,
  deco: DecoStyle[],
  fx: number,
  fy: number,
  fw: number,
  fh: number,
  rng: () => number
) {
  const cx = fx + fw * 0.5;
  for (const d of deco) {
    ctx.save();
    switch (d) {
      case "blush":
        ctx.fillStyle = "rgba(239,122,82,0.45)";
        ctx.beginPath();
        ctx.ellipse(fx + fw * 0.18, fy + fh * 0.58, fw * 0.1, fh * 0.06, 0, 0, Math.PI * 2);
        ctx.ellipse(fx + fw * 0.82, fy + fh * 0.58, fw * 0.1, fh * 0.06, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      case "sparkle":
        ctx.fillStyle = "#f5c451";
        for (let i = 0; i < 3; i++) {
          const px = fx + fw * (0.1 + rng() * 0.85);
          const py = fy + fh * (rng() * 0.4);
          const s = fw * (0.04 + rng() * 0.04);
          sparkle(ctx, px, py, s);
        }
        break;
      case "tear":
        ctx.fillStyle = "#6fb6e8";
        ctx.beginPath();
        ctx.moveTo(fx + fw * 0.7, fy + fh * 0.5);
        ctx.quadraticCurveTo(fx + fw * 0.78, fy + fh * 0.66, fx + fw * 0.7, fy + fh * 0.72);
        ctx.quadraticCurveTo(fx + fw * 0.62, fy + fh * 0.66, fx + fw * 0.7, fy + fh * 0.5);
        ctx.fill();
        break;
      case "anger":
        ctx.strokeStyle = "#d23b4e";
        ctx.lineWidth = Math.max(2, fw * 0.03);
        ctx.lineCap = "round";
        {
          const ax = fx + fw * 0.82;
          const ay = fy + fh * 0.18;
          const s = fw * 0.07;
          ctx.beginPath();
          ctx.moveTo(ax - s, ay);
          ctx.lineTo(ax + s, ay);
          ctx.moveTo(ax, ay - s);
          ctx.lineTo(ax, ay + s);
          ctx.moveTo(ax - s * 0.7, ay - s * 0.7);
          ctx.lineTo(ax + s * 0.7, ay + s * 0.7);
          ctx.stroke();
        }
        break;
      case "hearts":
        ctx.fillStyle = "#ef5b73";
        for (let i = 0; i < 2; i++) {
          const px = fx + fw * (i === 0 ? 0.08 : 0.9);
          const py = fy + fh * (0.1 + rng() * 0.2);
          heartShape(ctx, px, py, fw * 0.06);
        }
        break;
      case "sweat":
        ctx.fillStyle = "rgba(95,202,176,0.85)";
        ctx.beginPath();
        ctx.moveTo(fx + fw * 0.86, fy + fh * 0.3);
        ctx.quadraticCurveTo(fx + fw * 0.94, fy + fh * 0.44, fx + fw * 0.86, fy + fh * 0.5);
        ctx.quadraticCurveTo(fx + fw * 0.78, fy + fh * 0.44, fx + fw * 0.86, fy + fh * 0.3);
        ctx.fill();
        break;
      case "note":
        ctx.fillStyle = "#46b39a";
        ctx.font = `${Math.round(fw * 0.14)}px sans-serif`;
        ctx.fillText("♪", cx + fw * 0.3, fy + fh * 0.1);
        break;
    }
    ctx.restore();
  }
}

function sparkle(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.beginPath();
  ctx.moveTo(x, y - s);
  ctx.quadraticCurveTo(x, y, x + s, y);
  ctx.quadraticCurveTo(x, y, x, y + s);
  ctx.quadraticCurveTo(x, y, x - s, y);
  ctx.quadraticCurveTo(x, y, x, y - s);
  ctx.fill();
}

function heartShape(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.7);
  ctx.bezierCurveTo(x + s, y - s * 0.2, x + s * 0.4, y - s, x, y - s * 0.35);
  ctx.bezierCurveTo(x - s * 0.4, y - s, x - s, y - s * 0.2, x, y + s * 0.7);
  ctx.fill();
}

// ───────── 한 타일 렌더 ─────────

export interface RenderOptions {
  base: HTMLCanvasElement; // cropToContent 결과(투명, 정사각 아님)
  emotion: EmotionPreset;
  palette: ColorPalette;
  template: MemeTemplate;
  size: number; // 출력 정사각 px
  seed: number;
  tintStrength: number; // 0~1 색조 강도
  outlineScale: number; // 외곽선 두께 배율(슬라이더)
  caption?: string; // 사용자 입력 캡션(없으면 emotion.caption)
}

/** 한 변주 타일을 렌더해 PNG dataURL을 돌려준다(투명 배경). */
export function renderTile(opts: RenderOptions): string {
  const { base, emotion, palette, template, size, seed } = opts;
  const rng = makeRng(seed);
  const tile = document.createElement("canvas");
  tile.width = size;
  tile.height = size;
  const ctx = tile.getContext("2d")!;

  // 배경 칩(둥근 파스텔) — 템플릿이 요구할 때만
  if (template.showBgChip) {
    const m = size * 0.06;
    roundRect(ctx, m, m, size - m * 2, size - m * 2, size * 0.22);
    ctx.fillStyle = palette.bg;
    ctx.fill();
  }

  // 캡션 영역만큼 캐릭터 영역을 줄인다
  const hasCaption = template.caption;
  const capH = hasCaption ? size * 0.2 : 0;
  const charTop = template.captionPos === "top" ? capH : 0;
  const charArea = size - capH;

  // 본체(그린 그림)를 색조 입혀 영역 중앙에 배치
  const bw = base.width;
  const bh = base.height;
  const scale = (charArea * 0.78) / Math.max(bw, bh);
  const dw = bw * scale;
  const dh = bh * scale;
  const dx = (size - dw) / 2 + (rng() - 0.5) * size * 0.02;
  const dy = charTop + (charArea - dh) / 2;

  // 본체 + 표정 + 데코를 한 임시 캔버스에 모아 외곽선을 함께 두른다
  const content = document.createElement("canvas");
  content.width = size;
  content.height = size;
  const cctx = content.getContext("2d")!;

  // 색조 본체
  tintBody(content, base, dx, dy, dw, dh, palette.body, opts.tintStrength);

  // 얼굴 영역(앵커): 본체 상단 영역 중앙. (자동 앵커 규칙)
  const fx = dx + dw * 0.18;
  const fy = dy + dh * 0.1;
  const fw = dw * 0.64;
  const fh = dh * 0.6;
  drawDeco(cctx, emotion.deco, fx, fy, fw, fh, rng);
  drawEyes(cctx, emotion.eyes, fx, fy, fw, fh);
  drawMouth(cctx, emotion.mouth, fx, fy, fw, fh);

  // 외곽선 두께(템플릿 × 슬라이더 × 출력 크기 비례)
  const ow = (template.outlineWidth * size) / 360 * opts.outlineScale;
  drawWithOutline(tile, content, ow, palette.outline);

  // 캡션
  if (hasCaption) {
    const text = (opts.caption ?? emotion.caption ?? "").trim();
    if (text) {
      drawCaption(ctx, text, size, capH, template, palette);
    }
  }

  return tile.toDataURL("image/png");
}

function drawCaption(
  ctx: CanvasRenderingContext2D,
  text: string,
  size: number,
  capH: number,
  template: MemeTemplate,
  palette: ColorPalette
) {
  const y = template.captionPos === "top" ? capH * 0.5 : size - capH * 0.5;
  let fontSize = Math.round(capH * 0.62);
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `700 ${fontSize}px "Noto Sans KR", sans-serif`;
  // 길면 폰트 줄이기
  while (ctx.measureText(text).width > size * 0.92 && fontSize > 10) {
    fontSize -= 2;
    ctx.font = `700 ${fontSize}px "Noto Sans KR", sans-serif`;
  }
  if (template.captionBold) {
    // 굵은 밈 외곽선(흰 테두리 + 검정 본문)
    ctx.lineJoin = "round";
    ctx.lineWidth = fontSize * 0.32;
    ctx.strokeStyle = "#ffffff";
    ctx.strokeText(text, size / 2, y);
    ctx.fillStyle = INK;
    ctx.fillText(text, size / 2, y);
  } else {
    ctx.fillStyle = palette.body;
    ctx.fillText(text, size / 2, y);
  }
  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
