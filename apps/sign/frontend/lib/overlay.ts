/**
 * 서명다움 오버레이 — 엔진 밖 절차적 SVG 합성.
 *
 * 정직성: 이것은 폰트 글리프의 "진짜 한붓 리거처"가 아니라,
 * 글자 위/아래/앞뒤에 수학적으로 생성한 베지어 곡선을 얹은 **근사 장식**이다.
 * (idea-sign.md §1(B), §2: 연결선/플러리시/밑줄은 [REAL·근사])
 *
 * 좌표계: 호출부가 넘기는 box(글자 영역: x0..x1, baselineY) 안에서 path 문자열을 만든다.
 */
import { mulberry32 } from "./rng";
import type { SignParams } from "./signParams";

export interface OverlayBox {
  x0: number; // 글자 영역 좌측
  x1: number; // 글자 영역 우측
  baselineY: number; // 글자 베이스라인 Y
  capY: number; // 글자 상단(대략 cap line) Y
  stroke: number; // 기본 획 굵기(px)
}

/** waviness 곡선 한 획(밑줄). taper로 양 끝을 가늘게 보이도록 굵기를 조절한 다중 패스 대신 단일 곡선. */
function wavyUnderline(box: OverlayBox, waviness: number, seed: number): string {
  const rnd = mulberry32(seed);
  const y = box.baselineY + box.stroke * 1.6;
  const w = box.x1 - box.x0;
  const segs = 6;
  const amp = waviness * box.stroke * 2.2;
  let d = `M ${fmt(box.x0)} ${fmt(y)}`;
  for (let i = 1; i <= segs; i++) {
    const t = i / segs;
    const x = box.x0 + w * t;
    const cx = box.x0 + w * (t - 0.5 / segs);
    const jitter = (rnd() - 0.5) * amp;
    const cy = y + Math.sin(t * Math.PI * 2.2) * amp + jitter;
    d += ` Q ${fmt(cx)} ${fmt(cy)} ${fmt(x)} ${fmt(y + (rnd() - 0.5) * amp * 0.5)}`;
  }
  return d;
}

/** 앞/뒤 플러리시(장식 획) — 루프/꼬리 곡선. 앵커=글자 모서리. */
function flourishPath(
  box: OverlayBox,
  side: "lead" | "trail",
  intensity: number,
  loops: number,
  seed: number
): string {
  const rnd = mulberry32(seed + (side === "lead" ? 101 : 202));
  const h = box.baselineY - box.capY;
  const reach = (box.x1 - box.x0) * 0.18 * (0.5 + intensity);
  const anchorX = side === "lead" ? box.x0 : box.x1;
  const dir = side === "lead" ? -1 : 1;
  const startY = side === "lead" ? box.capY + h * 0.1 : box.baselineY - h * 0.1;

  let x = anchorX;
  let y = startY;
  let d = `M ${fmt(x)} ${fmt(y)}`;
  const segs = 2 + loops * 2;
  for (let i = 0; i < segs; i++) {
    const t = (i + 1) / segs;
    const swirl = Math.sin(t * Math.PI * (1 + loops)) * h * 0.5 * (0.6 + intensity);
    const nx = anchorX + dir * reach * t + (rnd() - 0.5) * box.stroke;
    const ny = startY - swirl + (rnd() - 0.5) * box.stroke;
    const cx = (x + nx) / 2 + dir * reach * 0.3;
    const cy = (y + ny) / 2 - h * 0.3 * intensity;
    d += ` Q ${fmt(cx)} ${fmt(cy)} ${fmt(nx)} ${fmt(ny)}`;
    x = nx;
    y = ny;
  }
  return d;
}

/** 베이스라인 연결선(글자 잇기 근사) — 글자 하단을 따라 흐르는 가는 곡선. */
function connectorPath(box: OverlayBox, connect: number, seed: number): string {
  const rnd = mulberry32(seed + 303);
  const y = box.baselineY + box.stroke * 0.4;
  const w = box.x1 - box.x0;
  const segs = 5;
  const amp = box.stroke * 1.2 * connect;
  let d = `M ${fmt(box.x0)} ${fmt(y)}`;
  for (let i = 1; i <= segs; i++) {
    const t = i / segs;
    const x = box.x0 + w * t;
    const cx = box.x0 + w * (t - 0.5 / segs);
    const cy = y - Math.abs(Math.sin(t * Math.PI * 3)) * amp - rnd() * amp * 0.3;
    d += ` Q ${fmt(cx)} ${fmt(cy)} ${fmt(x)} ${fmt(y)}`;
  }
  return d;
}

function fmt(n: number): string {
  return (Math.round(n * 100) / 100).toString();
}

export interface OverlayPath {
  d: string;
  width: number; // strokeWidth
}

/**
 * 파라미터+box로 오버레이 path들을 만든다. seed(=body.seed)로 결정적.
 * 반환 path는 stroke 전용(fill none)으로 그린다.
 */
export function buildOverlay(p: SignParams, box: OverlayBox): OverlayPath[] {
  const out: OverlayPath[] = [];
  const seed = p.body.seed;

  if (p.connect > 0.05) {
    out.push({ d: connectorPath(box, p.connect, seed), width: box.stroke * 0.7 });
  }

  if (p.underline.enabled) {
    out.push({ d: wavyUnderline(box, p.underline.waviness, seed), width: box.stroke });
    if (p.underline.strokes >= 2) {
      out.push({
        d: wavyUnderline(box, p.underline.waviness * 0.7, seed + 50),
        width: box.stroke * 0.7,
      });
    }
  }

  if (p.flourish.enabled && p.flourish.intensity > 0.05) {
    const positions: ("lead" | "trail")[] =
      p.flourish.position === "both"
        ? ["lead", "trail"]
        : [p.flourish.position];
    for (const side of positions) {
      out.push({
        d: flourishPath(box, side, p.flourish.intensity, p.flourish.loops, seed),
        width: box.stroke * 0.9,
      });
    }
  }

  return out;
}
