/**
 * 절차적 스티커 렌더 엔진(비AI, 브라우저 Canvas 전용).
 *
 * 입력 1장(사용자가 그린 캐릭터, 투명 배경) → 출력 N개.
 * ★ 가이드형 표정: "상단 중앙 고정"이 아니라, 사용자가 지정한 눈·입 위치(FaceAnchor)에
 *   표정을 앵커링하고, 원래 그린 눈·입 자리는 본체색으로 덮어 깔끔히 교체한다.
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

/** 얼굴 앵커 — 잘라낸 본체(content box) 기준 정규화 좌표(0~1). 눈 2개 + 입. */
export interface FaceAnchor {
  eyeL: { x: number; y: number };
  eyeR: { x: number; y: number };
  mouth: { x: number; y: number };
}

/** 마커 미지정 시 기본값(중앙 상단 얼굴 가정). */
export const DEFAULT_ANCHOR: FaceAnchor = {
  eyeL: { x: 0.37, y: 0.4 },
  eyeR: { x: 0.63, y: 0.4 },
  mouth: { x: 0.5, y: 0.62 },
};

/**
 * 그린 그림에서 눈·입 위치를 휴리스틱으로 추정한다(비AI).
 * 잉크(불투명·어두운 픽셀)의 무게중심을 영역별로 구한다:
 *   왼눈=상단 좌측, 오른눈=상단 우측, 입=하단 중앙.
 * "정상 배치(눈 위·입 아래)"를 가정 — 어긋나면 마커를 끌어 보정하면 된다.
 * 픽셀이 너무 적은 영역은 DEFAULT_ANCHOR로 대체(빈손 방지).
 */
export function detectFaceAnchor(crop: HTMLCanvasElement): FaceAnchor {
  const w = crop.width;
  const h = crop.height;
  const ctx = crop.getContext("2d");
  if (!ctx || w < 4 || h < 4) return DEFAULT_ANCHOR;
  const data = ctx.getImageData(0, 0, w, h).data;
  const isInk = (i: number) => {
    const a = data[i + 3]!;
    if (a < 60) return false;
    const lum = (data[i]! + data[i + 1]! + data[i + 2]!) / 3;
    return lum < 150; // 어두운 선
  };
  const centroid = (x0: number, x1: number, y0: number, y1: number) => {
    const X0 = Math.max(0, Math.floor(x0 * w));
    const X1 = Math.min(w, Math.ceil(x1 * w));
    const Y0 = Math.max(0, Math.floor(y0 * h));
    const Y1 = Math.min(h, Math.ceil(y1 * h));
    let sx = 0;
    let sy = 0;
    let n = 0;
    for (let y = Y0; y < Y1; y++) {
      for (let x = X0; x < X1; x++) {
        if (isInk((y * w + x) * 4)) {
          sx += x;
          sy += y;
          n++;
        }
      }
    }
    if (n < 8) return null;
    return { x: sx / n / w, y: sy / n / h };
  };
  return {
    eyeL: centroid(0.1, 0.5, 0.2, 0.56) ?? DEFAULT_ANCHOR.eyeL,
    eyeR: centroid(0.5, 0.9, 0.2, 0.56) ?? DEFAULT_ANCHOR.eyeR,
    mouth: centroid(0.25, 0.75, 0.58, 0.86) ?? DEFAULT_ANCHOR.mouth,
  };
}

/** 그린 이미지의 실제 내용 바운딩박스(투명/흰 배경 제거)로 잘라 캔버스를 만든다. box(원본 좌표)도 함께 반환. */
export function cropToContent(
  src: HTMLCanvasElement,
  treatWhiteAsBg = true
): { canvas: HTMLCanvasElement; isEmpty: boolean; box: { x: number; y: number; w: number; h: number } } {
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
    return { canvas: out, isEmpty: true, box: { x: 0, y: 0, w: 1, h: 1 } };
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
  return { canvas: out, isEmpty: false, box: { x: minX, y: minY, w: cw, h: ch } };
}

/** 본체에 색조를 입힌다(원본 알파 유지). */
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

/** 알파 외곽선(스티커화). */
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
      olctx.drawImage(content, Math.cos(ang) * outlineWidth, Math.sin(ang) * outlineWidth);
    }
    olctx.globalCompositeOperation = "source-in";
    olctx.fillStyle = outlineColor;
    olctx.fillRect(0, 0, ol.width, ol.height);
    ctx.drawImage(ol, 0, 0);
  }
  ctx.drawImage(content, 0, 0);
}

/** 원래 그린 눈·입 자리를 본체색 부드러운 패치로 덮어 표정 교체용 빈 면을 만든다. */
function coverFeature(ctx: CanvasRenderingContext2D, x: number, y: number, rad: number, color: string) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
  g.addColorStop(0, color);
  g.addColorStop(0.7, color);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.save();
  // 본체가 그려진 영역에만(투명 밖으로 안 번지게) atop
  ctx.globalCompositeOperation = "source-atop";
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, rad, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ───────── 표정 파츠 — 명시적 좌표(cx,cy)에 그린다 ─────────

function drawEyes(
  ctx: CanvasRenderingContext2D,
  style: EyeStyle,
  lcx: number,
  lcy: number,
  rcx: number,
  rcy: number,
  r: number
) {
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;
  ctx.lineWidth = Math.max(2, r * 0.42);
  ctx.lineCap = "round";

  const dot = (cx: number, cy: number) => {
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(cx + r * 0.3, cy - r * 0.3, r * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
  const arcUp = (cx: number, cy: number) => {
    ctx.beginPath();
    ctx.moveTo(cx - r, cy + r * 0.4);
    ctx.quadraticCurveTo(cx, cy - r, cx + r, cy + r * 0.4);
    ctx.stroke();
  };
  const arcDown = (cx: number, cy: number) => {
    ctx.beginPath();
    ctx.moveTo(cx - r, cy - r * 0.2);
    ctx.quadraticCurveTo(cx, cy + r, cx + r, cy - r * 0.2);
    ctx.stroke();
  };
  const heart = (cx: number, cy: number) => {
    ctx.save();
    ctx.fillStyle = "#ef5b73";
    ctx.beginPath();
    const s = r * 1.1;
    ctx.moveTo(cx, cy + s * 0.7);
    ctx.bezierCurveTo(cx + s, cy - s * 0.2, cx + s * 0.4, cy - s, cx, cy - s * 0.35);
    ctx.bezierCurveTo(cx - s * 0.4, cy - s, cx - s, cy - s * 0.2, cx, cy + s * 0.7);
    ctx.fill();
    ctx.restore();
  };
  const star = (cx: number, cy: number) => {
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
      const py = cy + Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  switch (style) {
    case "open":
      dot(lcx, lcy);
      dot(rcx, rcy);
      break;
    case "wink":
      dot(lcx, lcy);
      arcUp(rcx, rcy);
      break;
    case "happy":
      arcUp(lcx, lcy);
      arcUp(rcx, rcy);
      break;
    case "heart":
      heart(lcx, lcy);
      heart(rcx, rcy);
      break;
    case "star":
      star(lcx, lcy);
      star(rcx, rcy);
      break;
    case "sad":
      arcDown(lcx, lcy);
      arcDown(rcx, rcy);
      break;
    case "angry":
      dot(lcx, lcy);
      dot(rcx, rcy);
      ctx.beginPath();
      ctx.moveTo(lcx - r, lcy - r * 1.6);
      ctx.lineTo(lcx + r, lcy - r * 0.8);
      ctx.moveTo(rcx + r, rcy - r * 1.6);
      ctx.lineTo(rcx - r, rcy - r * 0.8);
      ctx.stroke();
      break;
    case "surprised":
      ctx.beginPath();
      ctx.arc(lcx, lcy, r * 1.4, 0, Math.PI * 2);
      ctx.moveTo(rcx + r * 1.4, rcy);
      ctx.arc(rcx, rcy, r * 1.4, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case "sleepy":
      ctx.beginPath();
      ctx.moveTo(lcx - r, lcy);
      ctx.quadraticCurveTo(lcx, lcy + r * 0.8, lcx + r, lcy);
      ctx.moveTo(rcx - r, rcy);
      ctx.quadraticCurveTo(rcx, rcy + r * 0.8, rcx + r, rcy);
      ctx.stroke();
      break;
    case "dizzy":
      ctx.font = `${Math.round(r * 2.4)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("×", lcx, lcy);
      ctx.fillText("×", rcx, rcy);
      break;
  }
  ctx.restore();
}

function drawMouth(
  ctx: CanvasRenderingContext2D,
  style: MouthStyle,
  cx: number,
  my: number,
  w: number
) {
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;
  ctx.lineWidth = Math.max(2, w * 0.14);
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
  base: HTMLCanvasElement;
  emotion: EmotionPreset;
  palette: ColorPalette;
  template: MemeTemplate;
  size: number;
  seed: number;
  tintStrength: number;
  outlineScale: number;
  caption?: string;
  /** 눈·입 위치(본체 정규화 0~1). 없으면 DEFAULT_ANCHOR. */
  anchor?: FaceAnchor;
  /** 원래 그린 눈·입을 덮어 교체할지. 기본 true. */
  coverOriginal?: boolean;
}

/** 한 변주 타일을 렌더해 PNG dataURL을 돌려준다(투명 배경). */
export function renderTile(opts: RenderOptions): string {
  const { base, emotion, palette, template, size, seed } = opts;
  const anchor = opts.anchor ?? DEFAULT_ANCHOR;
  const cover = opts.coverOriginal ?? true;
  const rng = makeRng(seed);
  const tile = document.createElement("canvas");
  tile.width = size;
  tile.height = size;
  const ctx = tile.getContext("2d")!;

  if (template.showBgChip) {
    const m = size * 0.06;
    roundRect(ctx, m, m, size - m * 2, size - m * 2, size * 0.22);
    ctx.fillStyle = palette.bg;
    ctx.fill();
  }

  const hasCaption = template.caption;
  const capH = hasCaption ? size * 0.2 : 0;
  const charTop = template.captionPos === "top" ? capH : 0;
  const charArea = size - capH;

  const bw = base.width;
  const bh = base.height;
  const scale = (charArea * 0.78) / Math.max(bw, bh);
  const dw = bw * scale;
  const dh = bh * scale;
  const dx = (size - dw) / 2 + (rng() - 0.5) * size * 0.02;
  const dy = charTop + (charArea - dh) / 2;

  const content = document.createElement("canvas");
  content.width = size;
  content.height = size;
  const cctx = content.getContext("2d")!;

  // 색조 본체
  tintBody(content, base, dx, dy, dw, dh, palette.body, opts.tintStrength);

  // 앵커(정규화) → 타일 픽셀 좌표
  const lcx = dx + anchor.eyeL.x * dw;
  const lcy = dy + anchor.eyeL.y * dh;
  const rcx = dx + anchor.eyeR.x * dw;
  const rcy = dy + anchor.eyeR.y * dh;
  const mcx = dx + anchor.mouth.x * dw;
  const mcy = dy + anchor.mouth.y * dh;
  const eyeDist = Math.hypot(rcx - lcx, rcy - lcy) || dw * 0.26;
  const eyeR = Math.max(3, eyeDist * 0.17);
  const mouthW = Math.max(6, eyeDist * 0.5);

  // 원래 그린 눈·입 자리 덮기(교체)
  if (cover) {
    coverFeature(cctx, lcx, lcy, eyeR * 2.0, palette.body);
    coverFeature(cctx, rcx, rcy, eyeR * 2.0, palette.body);
    coverFeature(cctx, mcx, mcy, mouthW * 0.9, palette.body);
  }

  // 데코용 얼굴 박스(앵커 바운딩 + 여유)
  const topEye = Math.min(lcy, rcy);
  const fx = Math.min(lcx, rcx) - eyeDist * 0.55;
  const fy = topEye - eyeDist * 0.7;
  const fw = eyeDist * 2.1;
  const fh = mcy - topEye + eyeDist * 1.2;
  drawDeco(cctx, emotion.deco, fx, fy, fw, fh, rng);

  // 표정(지정 위치에)
  drawEyes(cctx, emotion.eyes, lcx, lcy, rcx, rcy, eyeR);
  drawMouth(cctx, emotion.mouth, mcx, mcy, mouthW);

  const ow = (template.outlineWidth * size) / 360 * opts.outlineScale;
  drawWithOutline(tile, content, ow, palette.outline);

  if (hasCaption) {
    const text = (opts.caption ?? emotion.caption ?? "").trim();
    if (text) {
      drawCaption(ctx, text, size, capH, template, palette);
    }
  }

  return tile.toDataURL("image/png");
}

// ───────── 레이어 합성 표정(부위별 그리기 기반) ─────────
// 사용자가 윤곽/눈/입을 단계별로 그린 레이어(같은 캔버스 좌표)를 받아,
// 표정마다 눈·입 레이어를 실제로 변형(이동·확대·회전·뒤집기)해 합성한다.

export interface ExprTransform {
  sx: number;
  sy: number;
  rot: number;
  dx: number; // srcSize 대비 비율
  dy: number;
}
export interface EmotionLayerStyle {
  eyes: ExprTransform;
  mouth: ExprTransform;
}
const T = (sx = 1, sy = 1, rot = 0, dx = 0, dy = 0): ExprTransform => ({ sx, sy, rot, dx, dy });

/** 표정 id → 눈·입 변형. 장식 없이 "그린 획 자체"를 과감하게 변형(어이없을 만큼). */
export const EMOTION_LAYER: Record<string, EmotionLayerStyle> = {
  joy: { eyes: T(1, 0.45), mouth: T(1.5, 1.75, 0, 0, 0.02) },
  love: { eyes: T(1.3, 1.3), mouth: T(1.35, 1.2) },
  wink: { eyes: T(1, 0.4, -0.13), mouth: T(1.2, 1.05) },
  sad: { eyes: T(1, 1.05, 0, 0, 0.04), mouth: T(1.15, -1.25, 0, 0, 0.06) },
  angry: { eyes: T(1.18, 0.55, 0, 0, -0.015), mouth: T(0.78, 0.65) },
  surprise: { eyes: T(1.75, 1.75, 0, 0, -0.02), mouth: T(1.55, 1.9) },
  star: { eyes: T(1.4, 1.4), mouth: T(1.35, 1.3) },
  sleepy: { eyes: T(1, 0.08, 0, 0, 0.02), mouth: T(0.65, 0.65) },
  ok: { eyes: T(1, 0.65), mouth: T(1.25, 1.25) },
  fighting: { eyes: T(1.1, 1), mouth: T(1.5, 1.65) },
  kiss: { eyes: T(1, 0.5), mouth: T(0.45, 0.7, 0, 0, 0.01) },
  blank: { eyes: T(1.25, 0.85), mouth: T(0.8, 0.35) },
};

/** 투명 레이어의 내용 바운딩박스(알파 기준). 변형 기준점·데코 배치에 사용. */
export function contentBox(
  c: HTMLCanvasElement
): { x: number; y: number; w: number; h: number } | null {
  const w = c.width;
  const h = c.height;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  const d = ctx.getImageData(0, 0, w, h).data;
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (d[(y * w + x) * 4 + 3]! > 24) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < minX) return null;
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

function drawLayerT(
  ctx: CanvasRenderingContext2D,
  layer: HTMLCanvasElement,
  box: { x: number; y: number; w: number; h: number } | null,
  t: ExprTransform,
  srcSize: number
) {
  if (!box) {
    ctx.drawImage(layer, 0, 0);
    return;
  }
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  ctx.save();
  ctx.translate(cx + t.dx * srcSize, cy + t.dy * srcSize);
  ctx.rotate(t.rot);
  ctx.scale(t.sx, t.sy);
  ctx.translate(-cx, -cy);
  ctx.drawImage(layer, 0, 0);
  ctx.restore();
}

export interface CharLayers {
  base: HTMLCanvasElement;
  eyes: HTMLCanvasElement;
  mouth: HTMLCanvasElement;
}

/** 윤곽+표정 변형된 눈·입을 합쳐 캐릭터 캔버스(srcSize, 투명)를 만든다. */
export function composeCharacter(layers: CharLayers, ls: EmotionLayerStyle, srcSize: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = srcSize;
  c.height = srcSize;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(layers.base, 0, 0);
  drawLayerT(ctx, layers.eyes, contentBox(layers.eyes), ls.eyes, srcSize);
  drawLayerT(ctx, layers.mouth, contentBox(layers.mouth), ls.mouth, srcSize);
  return c;
}

export interface RenderLayersOptions {
  layers: CharLayers;
  srcSize: number;
  emotion: EmotionPreset;
  palette: ColorPalette;
  template: MemeTemplate;
  size: number;
  seed: number;
  tintStrength: number;
  outlineScale: number;
  caption?: string;
}

/** 레이어 기반 한 타일 렌더. 표정마다 눈·입을 변형해 합성 → 색조·외곽선·데코·캡션. */
export function renderTileFromLayers(opts: RenderLayersOptions): string {
  const { layers, srcSize, emotion, palette, template, size } = opts;
  const ls = EMOTION_LAYER[emotion.id] ?? { eyes: T(), mouth: T() };
  const char = composeCharacter(layers, ls, srcSize);
  const cbox = contentBox(char) ?? { x: 0, y: 0, w: srcSize, h: srcSize };

  const tile = document.createElement("canvas");
  tile.width = size;
  tile.height = size;
  const ctx = tile.getContext("2d")!;

  if (template.showBgChip) {
    const m = size * 0.06;
    roundRect(ctx, m, m, size - m * 2, size - m * 2, size * 0.22);
    ctx.fillStyle = palette.bg;
    ctx.fill();
  }

  const hasCaption = template.caption;
  const capH = hasCaption ? size * 0.2 : 0;
  const charTop = template.captionPos === "top" ? capH : 0;
  const charArea = size - capH;

  // 캐릭터 내용 박스를 정사각 영역 중앙에 배치
  const cw = cbox.w;
  const ch = cbox.h;
  const scale = (charArea * 0.78) / Math.max(cw, ch);
  const dw = cw * scale;
  const dh = ch * scale;
  const dx = (size - dw) / 2;
  const dy = charTop + (charArea - dh) / 2;

  const content = document.createElement("canvas");
  content.width = size;
  content.height = size;
  const cctx = content.getContext("2d")!;

  // 색조 입힌 캐릭터(내용 박스만 잘라 배치)
  const tinted = document.createElement("canvas");
  tinted.width = dw;
  tinted.height = dh;
  const tctx = tinted.getContext("2d")!;
  tctx.drawImage(char, cbox.x, cbox.y, cw, ch, 0, 0, dw, dh);
  if (opts.tintStrength > 0) {
    tctx.globalCompositeOperation = "source-atop";
    tctx.globalAlpha = opts.tintStrength;
    tctx.fillStyle = palette.body;
    tctx.fillRect(0, 0, dw, dh);
    tctx.globalAlpha = 1;
    tctx.globalCompositeOperation = "source-over";
  }
  cctx.drawImage(tinted, dx, dy);

  const ow = (template.outlineWidth * size) / 360 * opts.outlineScale;
  drawWithOutline(tile, content, ow, palette.outline);

  if (hasCaption) {
    const text = (opts.caption ?? "").trim();
    if (text) drawCaption(ctx, text, size, capH, template, palette);
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
  while (ctx.measureText(text).width > size * 0.92 && fontSize > 10) {
    fontSize -= 2;
    ctx.font = `700 ${fontSize}px "Noto Sans KR", sans-serif`;
  }
  if (template.captionBold) {
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
