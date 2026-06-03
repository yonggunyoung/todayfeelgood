/**
 * 이미지 내보내기 데이터 — 프론트 전용(core/engine 미수정).
 *
 * 회의적 검증관 must #3: "결과물이 폰트 파일뿐이면 카톡/인스타에 못 써서 무용.
 * 내 글씨로 쓴 이미지/짤/스티커를 바로 내보내야 한다."
 * → 손글씨 폰트를 Canvas에 렌더해 PNG로 뽑는다. 폰트는 엔진, 결과물 = 바로 쓰는 이미지.
 *
 * 트렌드/밈은 빨리 바뀌므로 **이 배열에 한 줄 추가**만으로 늘릴 수 있게 둔다.
 * (무거운 라이브러리 금지 — 렌더는 Canvas 2D 직접. 색은 sanitizeColor로 살균.)
 */

/** 캔버스 크기 프리셋 — 플랫폼별 권장 해상도. */
export interface SizePreset {
  id: string;
  label: string;
  /** 짧은 설명(접근성/툴팁) */
  hint: string;
  width: number;
  height: number;
}

export const SIZE_PRESETS: SizePreset[] = [
  { id: "square", label: "정사각 1080", hint: "인스타 피드·프로필", width: 1080, height: 1080 },
  { id: "story", label: "스토리 1080×1920", hint: "인스타/카톡 스토리 세로", width: 1080, height: 1920 },
  { id: "sticker", label: "스티커 512", hint: "카톡/디스코드 스티커(투명 권장)", width: 512, height: 512 },
  { id: "banner", label: "가로 배너 1200×630", hint: "썸네일·OG 가로", width: 1200, height: 630 },
];

/** 배경 종류. transparent=투명(스티커), solid=단색, paper=은은한 색지결. */
export type BgKind = "transparent" | "solid" | "paper";

export interface BgOption {
  id: BgKind;
  label: string;
  hint: string;
}

export const BG_OPTIONS: BgOption[] = [
  { id: "transparent", label: "투명", hint: "어디든 얹는 스티커용(PNG 알파)" },
  { id: "solid", label: "단색", hint: "배경색을 채워 카드처럼" },
  { id: "paper", label: "색지결", hint: "은은한 종이 질감(이미지 전용 효과)" },
];

/** 정렬. */
export type Align = "left" | "center" | "right";

/**
 * 짤/스티커 템플릿 — 손글씨가 "주인공"이고 장식은 거든다.
 * draw 함수는 캔버스 컨텍스트와 안전한 색/박스를 받아 데코를 그린다(글자 렌더 전·후 훅).
 * 데이터 배열이라 새 템플릿은 객체 하나 추가로 끝.
 */
export interface MemeTemplate {
  id: string;
  label: string;
  hint: string;
  /** 글자 영역을 캔버스 안에서 얼마나 안쪽으로 둘지(0~0.45, 여백 비율) */
  inset: number;
  /**
   * 장식 그리기. phase="back"은 글자 뒤, phase="front"는 글자 위.
   * ink=살균된 글자색, accent=살균된 보조색. box=글자가 놓일 영역(px).
   */
  decorate?: (
    ctx: CanvasRenderingContext2D,
    opts: {
      phase: "back" | "front";
      W: number;
      H: number;
      box: { x: number; y: number; w: number; h: number };
      ink: string;
      accent: string;
    },
  ) => void;
}

/** 둥근 사각형 경로(브라우저 roundRect 미지원 폴백 포함). */
function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export const MEME_TEMPLATES: MemeTemplate[] = [
  {
    id: "plain",
    label: "그냥 글씨",
    hint: "장식 없이 손글씨만 — 깔끔하게",
    inset: 0.12,
  },
  {
    id: "bubble",
    label: "말풍선",
    hint: "둥근 말풍선에 손글씨 — 밈 캡션 느낌",
    inset: 0.16,
    decorate: (ctx, { phase, box, accent }) => {
      if (phase !== "back") return;
      const pad = Math.min(box.w, box.h) * 0.18;
      const x = box.x - pad;
      const y = box.y - pad;
      const w = box.w + pad * 2;
      const h = box.h + pad * 2;
      const r = Math.min(w, h) * 0.22;
      ctx.save();
      ctx.fillStyle = accent;
      roundRectPath(ctx, x, y, w, h, r);
      ctx.fill();
      // 꼬리
      const tailW = w * 0.12;
      ctx.beginPath();
      ctx.moveTo(x + w * 0.28, y + h);
      ctx.lineTo(x + w * 0.28 + tailW, y + h);
      ctx.lineTo(x + w * 0.2, y + h + tailW * 1.3);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    },
  },
  {
    id: "frame",
    label: "테두리 카드",
    hint: "두꺼운 손그림 테두리 — 엽서/명함 톤",
    inset: 0.18,
    decorate: (ctx, { phase, W, H, ink }) => {
      if (phase !== "front") return;
      const m = Math.min(W, H) * 0.05;
      const lw = Math.max(4, Math.min(W, H) * 0.012);
      ctx.save();
      ctx.strokeStyle = ink;
      ctx.lineWidth = lw;
      ctx.lineJoin = "round";
      roundRectPath(ctx, m, m, W - m * 2, H - m * 2, Math.min(W, H) * 0.06);
      ctx.stroke();
      ctx.restore();
    },
  },
  {
    id: "underline",
    label: "밑줄 강조",
    hint: "손그림 밑줄로 한 줄 강조",
    inset: 0.14,
    decorate: (ctx, { phase, box, accent }) => {
      if (phase !== "back") return;
      const y = box.y + box.h * 0.82;
      const lw = Math.max(6, box.h * 0.1);
      ctx.save();
      ctx.strokeStyle = accent;
      ctx.lineWidth = lw;
      ctx.lineCap = "round";
      ctx.beginPath();
      // 살짝 기울고 끝이 위로 튀는 손그림 밑줄
      ctx.moveTo(box.x, y);
      ctx.quadraticCurveTo(
        box.x + box.w * 0.5,
        y + lw * 0.9,
        box.x + box.w,
        y - lw * 0.4,
      );
      ctx.stroke();
      ctx.restore();
    },
  },
];
