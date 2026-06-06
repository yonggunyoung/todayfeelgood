// 편지 렌더 공용 모듈 — 라틴/한글 편지 패널이 같은 편지지·크기·글자크기·렌더를 공유한다.
// "스타일 하나 추가"가 한 곳에서 끝나도록(두 패널 동기화 버그 방지).

export type PaperId =
  | "cream"
  | "white"
  | "mint"
  | "pink"
  | "grid"
  | "dot"
  | "kraft"
  | "sky"
  | "lavender"
  | "sepia";
export interface Paper {
  id: PaperId;
  bg: string;
  line: string;
  ruled: "line" | "grid" | "dot" | "none";
}
// 색지/줄/여백 — 라벨은 사전에서. dot=점선 모눈, kraft=빈티지 크라프트지.
export const PAPERS: Paper[] = [
  { id: "cream", bg: "#fdf6e8", line: "#e6d9bd", ruled: "line" },
  { id: "white", bg: "#ffffff", line: "#e6e3ef", ruled: "line" },
  { id: "mint", bg: "#eaf6f0", line: "#cfe6da", ruled: "line" },
  { id: "pink", bg: "#fdeef0", line: "#f1d4da", ruled: "line" },
  { id: "grid", bg: "#fbfbfd", line: "#e4e7ef", ruled: "grid" },
  { id: "dot", bg: "#fcfbf7", line: "#cfc8b4", ruled: "dot" },
  { id: "kraft", bg: "#e7dabd", line: "#c9b88f", ruled: "line" },
  { id: "sky", bg: "#eef5fd", line: "#cfe0f3", ruled: "line" },
  { id: "lavender", bg: "#f4eefb", line: "#ddd1ef", ruled: "line" },
  { id: "sepia", bg: "#f6efe1", line: "#dccbab", ruled: "line" },
];
export const findPaper = (id: PaperId): Paper => PAPERS.find((p) => p.id === id) ?? PAPERS[0]!;

export type SizeId = "a4" | "square" | "card";
export interface PaperSize {
  id: SizeId;
  w: number;
  h: number;
}
export const SIZES: PaperSize[] = [
  { id: "a4", w: 1240, h: 1754 },
  { id: "square", w: 1240, h: 1240 },
  { id: "card", w: 1748, h: 1240 },
];
export const findSize = (id: SizeId): PaperSize => SIZES.find((s) => s.id === id) ?? SIZES[0]!;

export type TextScaleId = "s" | "m" | "l";
export interface TextScale {
  id: TextScaleId;
  mul: number;
}
// 글자 크기(작게/보통/크게) — 본문 폰트 px 배율.
export const TEXT_SCALES: TextScale[] = [
  { id: "s", mul: 0.82 },
  { id: "m", mul: 1 },
  { id: "l", mul: 1.28 },
];
export const findScale = (id: TextScaleId): TextScale =>
  TEXT_SCALES.find((s) => s.id === id) ?? TEXT_SCALES[1]!;

export interface DrawLetterOpts {
  W: number;
  H: number;
  paper: Paper;
  /** 등록된 FontFace family. */
  fontFamily: string;
  /** 글자색(살균 완료). */
  ink: string;
  /** 렌더할 본문(이미 커버 글자만 남기고 \n 유지). */
  text: string;
  /** 글자 크기 배율(TEXT_SCALES.mul). */
  fontScale: number;
  /** 줄바꿈 단위: 라틴=단어, 한글=글자. */
  wrapMode: "word" | "char";
}

/**
 * 편지지(색지+줄/모눈/점) 위에 본문을 자동 줄바꿈해서 그린다. 종이를 넘치면 멈춘다.
 * Canvas + FontFace 만 사용(무거운 라이브러리 없음) — 기존 이미지 파이프라인과 동일.
 */
export function drawLetter(ctx: CanvasRenderingContext2D, o: DrawLetterOpts): void {
  const { W, H, paper, fontFamily, ink, text, fontScale, wrapMode } = o;

  // 1) 색지
  ctx.fillStyle = paper.bg;
  ctx.fillRect(0, 0, W, H);

  // 여백(편지지 마진)
  const margin = Math.round(W * 0.1);
  const box = { x: margin, y: margin, w: W - margin * 2, h: H - margin * 2 };

  // 본문 폰트 크기 — 종이 폭 기준 × 글자크기 배율.
  const fontPx = Math.max(12, Math.round(W * 0.05 * fontScale));
  const lineH = Math.round(fontPx * 1.7);

  // 2) 줄/모눈/점
  ctx.strokeStyle = paper.line;
  ctx.lineWidth = 1.4;
  if (paper.ruled === "line") {
    for (let y = box.y + lineH; y <= box.y + box.h; y += lineH) {
      ctx.beginPath();
      ctx.moveTo(box.x, y);
      ctx.lineTo(box.x + box.w, y);
      ctx.stroke();
    }
  } else if (paper.ruled === "grid") {
    for (let y = box.y; y <= box.y + box.h; y += lineH) {
      ctx.beginPath();
      ctx.moveTo(box.x, y);
      ctx.lineTo(box.x + box.w, y);
      ctx.stroke();
    }
    for (let x = box.x; x <= box.x + box.w; x += lineH) {
      ctx.beginPath();
      ctx.moveTo(x, box.y);
      ctx.lineTo(x, box.y + box.h);
      ctx.stroke();
    }
  } else if (paper.ruled === "dot") {
    const r = Math.max(1.5, fontPx * 0.035);
    ctx.fillStyle = paper.line;
    for (let y = box.y; y <= box.y + box.h; y += lineH) {
      for (let x = box.x; x <= box.x + box.w; x += lineH) {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // 3) 본문 — box 폭에 맞춰 자동 줄바꿈 + 명시적 줄바꿈 존중.
  ctx.font = `${fontPx}px "${fontFamily}", system-ui, sans-serif`;
  ctx.fillStyle = ink;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";

  const wrapWord = (line: string): string[] => {
    if (line === "") return [""];
    const words = line.split(" ");
    const out: string[] = [];
    let cur = "";
    for (const w of words) {
      const test = cur ? `${cur} ${w}` : w;
      if (ctx.measureText(test).width > box.w && cur) {
        out.push(cur);
        cur = w;
      } else {
        cur = test;
      }
    }
    out.push(cur);
    return out;
  };

  const wrapChar = (line: string): string[] => {
    if (line === "") return [""];
    const out: string[] = [];
    let cur = "";
    for (const ch of line) {
      const test = cur + ch;
      if (ctx.measureText(test).width > box.w && cur) {
        out.push(cur);
        cur = ch === " " ? "" : ch; // 줄 시작 공백은 버림
      } else {
        cur = test;
      }
    }
    out.push(cur);
    return out;
  };

  const wrap = wrapMode === "char" ? wrapChar : wrapWord;
  const wrapped: string[] = [];
  for (const raw of text.split("\n")) wrapped.push(...wrap(raw));

  // 첫 줄 베이스라인을 첫 줄선 살짝 위로.
  let y = box.y + lineH * 0.82;
  for (const line of wrapped) {
    if (y > box.y + box.h) break; // 종이 넘치면 멈춤
    ctx.fillText(line, box.x, y);
    y += lineH;
  }
}
