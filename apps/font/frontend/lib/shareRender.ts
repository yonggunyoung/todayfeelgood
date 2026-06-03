/**
 * 공유 뷰용 캔버스 렌더러 — 이미지 패널의 렌더 로직을 재사용 가능한 순수 함수로 추출.
 *
 * HandwritingImagePanel/HangulImagePanel과 **동일한 레이아웃 규칙**(배경/템플릿 inset/
 * 자동 폰트 축소/줄바꿈/정렬)을 한 곳에 모아, 공유 뷰(`/s`)가 같은 모습으로 그린다.
 * 무거운 라이브러리 없이 Canvas 2D 직접. 색은 호출부에서 sanitizeColor로 살균해 넘긴다.
 */

import {
  MEME_TEMPLATES,
  SIZE_PRESETS,
  type Align,
  type BgKind,
} from "./imageTemplates";

export interface RenderOptions {
  text: string;
  fontFamily: string;
  sizeId: string;
  templateId: string;
  bg: BgKind;
  align: Align;
  /** 살균된 색(sanitizeColor 통과). */
  ink: string;
  bgColor: string;
  accent: string;
}

/** 색지결 — 은은한 노이즈(이미지 패널과 동일, 결정적 의사난수). */
function paintPaper(ctx: CanvasRenderingContext2D, W: number, H: number, base: string) {
  ctx.save();
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "rgba(0,0,0,0.025)";
  const step = Math.max(6, Math.round(Math.min(W, H) / 90));
  for (let y = 0; y < H; y += step) {
    for (let x = 0; x < W; x += step) {
      const n = (Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
      if (n > 0.6) ctx.fillRect(x, y, 1, 1);
    }
  }
  ctx.restore();
}

/**
 * 캔버스에 공유 문구를 렌더한다(이미지 패널과 동일 알고리즘).
 * 캔버스 크기를 프리셋에 맞춰 설정하고 그린다.
 */
export function renderShareCanvas(canvas: HTMLCanvasElement, o: RenderOptions): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const size = SIZE_PRESETS.find((s) => s.id === o.sizeId) ?? SIZE_PRESETS[0]!;
  const template = MEME_TEMPLATES.find((t) => t.id === o.templateId) ?? MEME_TEMPLATES[0]!;

  const W = size.width;
  const H = size.height;
  canvas.width = W;
  canvas.height = H;
  ctx.clearRect(0, 0, W, H);

  if (o.bg === "solid") {
    ctx.fillStyle = o.bgColor;
    ctx.fillRect(0, 0, W, H);
  } else if (o.bg === "paper") {
    paintPaper(ctx, W, H, o.bgColor);
  }

  const inset = template.inset;
  const box = {
    x: W * inset,
    y: H * inset,
    w: W * (1 - inset * 2),
    h: H * (1 - inset * 2),
  };

  template.decorate?.(ctx, { phase: "back", W, H, box, ink: o.ink, accent: o.accent });

  const text = o.text.trim() || "…";
  const lines = text.split("\n");
  ctx.textBaseline = "middle";
  ctx.textAlign = o.align === "left" ? "left" : o.align === "right" ? "right" : "center";
  ctx.fillStyle = o.ink;

  let fontPx = Math.min((box.h / Math.max(1, lines.length)) * 0.78, box.h * 0.9);
  const fitWidth = () => {
    ctx.font = `${fontPx}px "${o.fontFamily}", system-ui, sans-serif`;
    const widest = Math.max(...lines.map((l) => ctx.measureText(l).width), 1);
    if (widest > box.w) fontPx *= box.w / widest;
  };
  fitWidth();
  fitWidth();
  ctx.font = `${fontPx}px "${o.fontFamily}", system-ui, sans-serif`;

  const lineH = fontPx * 1.18;
  const totalH = lineH * lines.length;
  const startY = box.y + box.h / 2 - totalH / 2 + lineH / 2;
  const tx =
    o.align === "left" ? box.x : o.align === "right" ? box.x + box.w : box.x + box.w / 2;
  lines.forEach((line, i) => {
    ctx.fillText(line, tx, startY + i * lineH);
  });

  template.decorate?.(ctx, { phase: "front", W, H, box, ink: o.ink, accent: o.accent });
}
