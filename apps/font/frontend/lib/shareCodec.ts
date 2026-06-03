/**
 * 공유 상태 인코딩/디코딩 — "저장소 0, URL에 상태를 담아 공유".
 *
 * 목표: 사용자가 만든 손글씨 문구를 **서버 저장 없이** 링크 하나로 공유한다.
 * 공유 대상 = { script, text, refine, style(배경/색/템플릿/크기/정렬), glyphs(그 문구에 필요한 획만) }.
 *
 * 파이프라인(encode):
 *   1) 좌표 양자화(0..1 → 0..255 정수) + 획 내 델타 인코딩(연속점 차분 → 작은 수)
 *   2) 콤팩트 JSON(짧은 키) 직렬화
 *   3) deflate(`CompressionStream` — 브라우저/Next 런타임 공통 가용)
 *   4) base64url
 * decode는 역순. 실패 시 throw(호출부에서 graceful 처리).
 *
 * URL 길이 가드: 인코딩 결과가 너무 크면(SHARE_MAX_CODE_LEN 초과) encodeShare가 null을 반환 →
 * 공유 버튼이 "문구/글자 수를 줄이세요"로 정직하게 안내한다.
 */

import {
  BASIC_JAMO,
  DEFAULT_REFINE,
  REFINE_RANGES,
  type DrawnGlyph,
  type FontScript,
  type GlyphStroke,
  type RefineParams,
} from "@webapp/core";

/** 공유 가능한 이미지 스타일(이미지 패널 옵션과 동일 축). 색은 디코드 후 sanitizeColor로 재살균. */
export interface ShareStyle {
  /** 배경 종류: transparent | solid | paper */
  bg: string;
  /** 짤/스티커 템플릿 id */
  template: string;
  /** 크기 프리셋 id */
  size: string;
  /** 정렬: left | center | right */
  align: string;
  /** 글자색(#hex 등) */
  ink: string;
  /** 배경색(#hex 등) */
  bgColor: string;
  /** 장식색(#hex 등) */
  accent: string;
}

/** 공유 페이로드(디코드 결과). */
export interface SharePayload {
  script: FontScript;
  text: string;
  refine: RefineParams;
  style: ShareStyle;
  /** 문구에 필요한 글자/자모의 획만. (latin=소문자, hangul=기본 자모) */
  glyphs: DrawnGlyph[];
}

/** 인코딩 결과 URL 코드 길이 상한(문자). 6KB 가드. 보통 단어/짧은 문구는 통과. */
export const SHARE_MAX_CODE_LEN = 6000;

/** 텍스트 코드포인트 상한(BFF의 MAX_TEXT_LEN과 정합). */
const MAX_TEXT_LEN = 200;

/** 좌표 양자화 해상도. 0..1 → 0..QSTEP 정수. */
const QSTEP = 255;

const ALLOWED_BG = new Set(["transparent", "solid", "paper"]);
const ALLOWED_ALIGN = new Set(["left", "center", "right"]);
const JAMO_SET = new Set(BASIC_JAMO);

/* ── base64url ───────────────────────────────────────────────── */

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  const b64 = btoa(bin);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(code: string): Uint8Array {
  const b64 = code.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  const bin = atob(b64 + pad);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/* ── deflate / inflate (CompressionStream) ──────────────────── */

/** 입력 바이트를 보장된 ArrayBuffer 백킹의 Uint8Array로 복사(타입 호환 + SharedArrayBuffer 회피). */
function toBytes(input: Uint8Array): Uint8Array<ArrayBuffer> {
  const ab = new ArrayBuffer(input.length);
  const copy = new Uint8Array(ab);
  copy.set(input);
  return copy;
}

async function deflate(input: Uint8Array): Promise<Uint8Array> {
  const cs = new CompressionStream("deflate-raw");
  const writer = cs.writable.getWriter();
  void writer.write(toBytes(input));
  void writer.close();
  const buf = await new Response(cs.readable).arrayBuffer();
  return new Uint8Array(buf);
}

async function inflate(input: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream("deflate-raw");
  const writer = ds.writable.getWriter();
  void writer.write(toBytes(input));
  void writer.close();
  const buf = await new Response(ds.readable).arrayBuffer();
  return new Uint8Array(buf);
}

/* ── 좌표 양자화 + 델타 인코딩 ──────────────────────────────── */

/** 한 획 → 양자화된 평탄 배열 [x0,y0, dx1,dy1, dx2,dy2, …] (첫 점=절대, 이후=델타). */
function encodeStroke(s: GlyphStroke): number[] {
  const q = (v: number) => Math.max(0, Math.min(QSTEP, Math.round(v * QSTEP)));
  const out: number[] = [];
  let px = 0;
  let py = 0;
  s.points.forEach((p, i) => {
    const x = q(p[0]);
    const y = q(p[1]);
    if (i === 0) {
      out.push(x, y);
    } else {
      out.push(x - px, y - py);
    }
    px = x;
    py = y;
  });
  return out;
}

/** 평탄 배열 → 획. 양자화 역변환(0..QSTEP → 0..1). */
function decodeStroke(flat: number[]): GlyphStroke {
  const points: Array<[number, number]> = [];
  let px = 0;
  let py = 0;
  for (let i = 0; i + 1 < flat.length; i += 2) {
    if (i === 0) {
      px = flat[i]!;
      py = flat[i + 1]!;
    } else {
      px += flat[i]!;
      py += flat[i + 1]!;
    }
    points.push([
      Math.max(0, Math.min(1, px / QSTEP)),
      Math.max(0, Math.min(1, py / QSTEP)),
    ]);
  }
  return { points };
}

/* ── refine 양자화(범위 내 정수) ────────────────────────────── */

const REFINE_KEYS = Object.keys(REFINE_RANGES) as Array<keyof RefineParams>;

function encodeRefine(r: RefineParams): number[] {
  // 각 값을 step 단위 정수로(범위 의존 가변 길이 회피 위해 그냥 100배 반올림 후 정수).
  return REFINE_KEYS.map((k) => Math.round((r[k] ?? DEFAULT_REFINE[k]) * 100));
}

function decodeRefine(arr: unknown): RefineParams {
  const out = {} as RefineParams;
  const a = Array.isArray(arr) ? arr : [];
  REFINE_KEYS.forEach((k, i) => {
    const range = REFINE_RANGES[k];
    const raw = Number(a[i]);
    const v = Number.isFinite(raw) ? raw / 100 : DEFAULT_REFINE[k];
    out[k] = Math.max(range.min, Math.min(range.max, v));
  });
  return out;
}

/* ── 콤팩트 JSON 형태(짧은 키) ──────────────────────────────── */

interface CompactPayload {
  v: 1;
  /** 0=latin, 1=hangul */
  s: 0 | 1;
  t: string;
  /** refine 정수 배열 */
  r: number[];
  /** style: [bg, template, size, align, ink, bgColor, accent] */
  y: [string, string, string, string, string, string, string];
  /** glyphs: [char, [stroke평탄배열, …]] */
  g: Array<[string, number[][]]>;
}

/* ── public API ─────────────────────────────────────────────── */

/**
 * 공유 페이로드를 base64url 코드로 인코딩.
 * 결과가 SHARE_MAX_CODE_LEN을 넘으면 null(호출부에서 "줄이세요" 안내).
 */
export async function encodeShare(payload: SharePayload): Promise<string | null> {
  const compact: CompactPayload = {
    v: 1,
    s: payload.script === "hangul" ? 1 : 0,
    t: [...payload.text].slice(0, MAX_TEXT_LEN).join(""),
    r: encodeRefine(payload.refine),
    y: [
      payload.style.bg,
      payload.style.template,
      payload.style.size,
      payload.style.align,
      payload.style.ink,
      payload.style.bgColor,
      payload.style.accent,
    ],
    g: payload.glyphs.map((gl) => [
      gl.char,
      gl.strokes.map((st) => encodeStroke(st)),
    ]),
  };

  const json = JSON.stringify(compact);
  const bytes = new TextEncoder().encode(json);
  const compressed = await deflate(bytes);
  const code = bytesToBase64Url(compressed);
  if (code.length > SHARE_MAX_CODE_LEN) return null;
  return code;
}

/**
 * base64url 코드를 공유 페이로드로 디코딩. 실패 시 throw.
 * 디코드 후에도 값은 보수적으로 클램프/필터(역시 신뢰 못 할 입력).
 */
export async function decodeShare(code: string): Promise<SharePayload> {
  if (!code || typeof code !== "string") throw new Error("빈 코드");
  const bytes = base64UrlToBytes(code);
  const inflated = await inflate(bytes);
  const json = new TextDecoder().decode(inflated);
  const compact = JSON.parse(json) as Partial<CompactPayload>;
  if (!compact || compact.v !== 1) throw new Error("지원하지 않는 코드 버전");

  const script: FontScript = compact.s === 1 ? "hangul" : "latin";
  const text =
    typeof compact.t === "string" ? [...compact.t].slice(0, MAX_TEXT_LEN).join("") : "";

  const y = Array.isArray(compact.y) ? compact.y : [];
  const pick = (i: number, fb: string) =>
    typeof y[i] === "string" ? (y[i] as string) : fb;
  const style: ShareStyle = {
    bg: ALLOWED_BG.has(pick(0, "")) ? (y[0] as string) : "transparent",
    template: pick(1, "plain"),
    size: pick(2, "square"),
    align: ALLOWED_ALIGN.has(pick(3, "")) ? (y[3] as string) : "center",
    // 색은 여기서 형식만 두고, 렌더 시 sanitizeColor로 한 번 더 살균한다.
    ink: pick(4, "#2b2a33"),
    bgColor: pick(5, "#fef3e2"),
    accent: pick(6, "#ffd66b"),
  };

  const charOk =
    script === "hangul"
      ? (ch: string) => JAMO_SET.has(ch)
      : (ch: string) => ch.length === 1 && /[a-z]/.test(ch);

  const rawGlyphs = Array.isArray(compact.g) ? compact.g : [];
  const glyphs: DrawnGlyph[] = [];
  for (const entry of rawGlyphs) {
    if (!Array.isArray(entry) || entry.length < 2) continue;
    const char = entry[0];
    const strokesRaw = entry[1];
    if (typeof char !== "string") continue;
    const ch = script === "hangul" ? char : char.toLowerCase();
    if (!charOk(ch)) continue;
    if (!Array.isArray(strokesRaw)) continue;
    const strokes: GlyphStroke[] = [];
    for (const flat of strokesRaw) {
      if (!Array.isArray(flat)) continue;
      const nums = flat.map((n) => Number(n)).filter((n) => Number.isFinite(n));
      const st = decodeStroke(nums);
      if (st.points.length > 0) strokes.push(st);
    }
    if (strokes.length > 0) glyphs.push({ char: ch, strokes });
  }

  return {
    script,
    text,
    refine: decodeRefine(compact.r),
    style,
    glyphs,
  };
}
