import { NextResponse } from "next/server";
import {
  BASIC_JAMO,
  DEFAULT_REFINE,
  MAX_STROKE_POINTS_PER_GLYPH,
  MAX_TOTAL_GLYPHS,
  REFINE_RANGES,
  type DrawnGlyph,
  type FontFormat,
  type GlyphStroke,
  type HandwritingResponse,
  type HangulComposeRequest,
  type RefineParams,
} from "@webapp/core";

// 동적 라우트(매 요청 포워딩) — 정적 최적화 비활성
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// 엔진 응답 대기 타임아웃(ms). 콜드스타트/지연 시 무한 대기 방지.
const ENGINE_TIMEOUT_MS = 25_000;

// 페이로드 상한(바이트). 자모는 24자뿐이라 작지만, 무료 티어 메모리 보호로 명시.
const MAX_BODY_BYTES = 1_500_000; // ~1.5MB

// 합성할 문구 길이 상한(코드포인트). 거대 문구로 인한 엔진 부하/응답 폭증 방지.
const MAX_TEXT_LEN = 200;

// 그릴 수 있는 기본 자모 집합(엔진과 동일 계약). 이 외 char는 드롭.
const JAMO_SET = new Set(BASIC_JAMO);

/**
 * BFF 프록시: 브라우저는 same-origin `/api/hangul-compose`로 POST하고,
 * 이 라우트가 한글 합성 엔진 `/hangul-compose`로 포워딩한다.
 * (CORS 회피 + 엔진 주소 은닉 + 페이로드/타임아웃 가드 + 에러 살균)
 * handwriting BFF와 동일한 방어 패턴을 따른다.
 */
function engineUrl(): string {
  return (
    process.env.ENGINE_URL ||
    process.env.NEXT_PUBLIC_ENGINE_URL ||
    "http://127.0.0.1:8000"
  );
}

function normalizeFormat(f: unknown): FontFormat {
  return f === "ttf" || f === "woff2" || f === "otf" ? f : "woff";
}

// refine 파라미터를 REFINE_RANGES로 강제(엔진과 동일한 안전 범위).
function clampRefine(r: Partial<RefineParams> | undefined): RefineParams {
  const clamp = (v: number, min: number, max: number) =>
    Math.min(max, Math.max(min, Number.isFinite(v) ? v : 0));
  const out = {} as RefineParams;
  (Object.keys(REFINE_RANGES) as Array<keyof RefineParams>).forEach((k) => {
    const range = REFINE_RANGES[k];
    out[k] = clamp(r?.[k] ?? DEFAULT_REFINE[k], range.min, range.max);
  });
  return out;
}

/**
 * 자모 목록 살균(handwriting의 sanitizeGlyphs를 한글 자모용으로 적용):
 * - char는 BASIC_JAMO(기본 자모 24)에 속하는 것만 인정(중복 char는 마지막 것 채택)
 * - 각 점은 유한수 [x,y]만, 0..1로 클램프
 * - 자모당 점 수를 MAX_STROKE_POINTS_PER_GLYPH로 균등 솎기(서버측 2차 방어)
 * - 빈 획/빈 자모는 드롭, 전체 자모 수는 MAX_TOTAL_GLYPHS로 제한
 */
function sanitizeJamo(raw: unknown): DrawnGlyph[] {
  if (!Array.isArray(raw)) return [];
  const byChar = new Map<string, DrawnGlyph>();

  for (const g of raw) {
    if (byChar.size >= MAX_TOTAL_GLYPHS) break;
    if (!g || typeof g !== "object") continue;
    const char = (g as { char?: unknown }).char;
    const strokesRaw = (g as { strokes?: unknown }).strokes;
    if (typeof char !== "string" || !JAMO_SET.has(char)) continue;
    if (!Array.isArray(strokesRaw)) continue;

    // 자모 전체 점 수를 세고, 상한을 넘으면 균등 솎기 비율을 정한다.
    let total = 0;
    const cleanedStrokes: Array<Array<[number, number]>> = [];
    for (const s of strokesRaw) {
      const pts = (s as { points?: unknown })?.points;
      if (!Array.isArray(pts)) continue;
      const clean: Array<[number, number]> = [];
      for (const p of pts) {
        if (!Array.isArray(p) || p.length < 2) continue;
        const x = Number(p[0]);
        const y = Number(p[1]);
        if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
        clean.push([Math.min(1, Math.max(0, x)), Math.min(1, Math.max(0, y))]);
      }
      if (clean.length > 0) {
        cleanedStrokes.push(clean);
        total += clean.length;
      }
    }
    if (cleanedStrokes.length === 0) continue;

    // 상한 초과 시 균등 솎기(각 획에서 비율만큼 남기되 양 끝점은 보존).
    const keepRatio =
      total > MAX_STROKE_POINTS_PER_GLYPH
        ? MAX_STROKE_POINTS_PER_GLYPH / total
        : 1;
    const strokes: GlyphStroke[] = cleanedStrokes.map((clean) => {
      if (keepRatio >= 1 || clean.length <= 2) return { points: clean };
      const target = Math.max(2, Math.floor(clean.length * keepRatio));
      const stepF = clean.length / target;
      const picked: Array<[number, number]> = [];
      for (let i = 0; i < target; i++) picked.push(clean[Math.floor(i * stepF)]!);
      picked[picked.length - 1] = clean[clean.length - 1]!; // 끝점 보존
      return { points: picked };
    });

    // 같은 자모를 두 번 보내면 마지막 것으로 덮어쓴다(중복 방지).
    byChar.set(char, { char, strokes });
  }

  return [...byChar.values()];
}

// 합성 문구 살균: 길이 상한만 적용(엔진이 음절→자모 분해를 담당).
function sanitizeText(t: unknown): string {
  if (typeof t !== "string") return "";
  return [...t].slice(0, MAX_TEXT_LEN).join("");
}

export async function POST(req: Request) {
  // 1) content-length 1차 방어
  const declaredLen = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLen) && declaredLen > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: "그린 자모가 너무 많습니다. 일부를 지우고 다시 시도해 주세요." },
      { status: 413 }
    );
  }

  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return NextResponse.json({ error: "요청을 읽을 수 없습니다." }, { status: 400 });
  }
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: "그린 자모가 너무 많습니다. 일부를 지우고 다시 시도해 주세요." },
      { status: 413 }
    );
  }

  let body: Partial<HangulComposeRequest>;
  try {
    body = JSON.parse(raw) as Partial<HangulComposeRequest>;
  } catch {
    return NextResponse.json({ error: "잘못된 JSON 요청입니다." }, { status: 400 });
  }

  const jamo = sanitizeJamo(body.jamo);
  if (jamo.length === 0) {
    return NextResponse.json(
      { error: "그린 자모가 없습니다. 기본 자모를 한 개 이상 그려 주세요." },
      { status: 400 }
    );
  }

  const text = sanitizeText(body.text);
  if (!text.trim()) {
    return NextResponse.json(
      { error: "합성할 문구가 없습니다. 한글 문구를 입력해 주세요." },
      { status: 400 }
    );
  }

  const payload: HangulComposeRequest = {
    jamo,
    text,
    refine: clampRefine(body.refine),
    format: normalizeFormat(body.format),
    // 안 그린 자모를 내 스타일로 자동 채워 음절을 완성(엔진 병행 작업 — 미지원이면 무시됨)
    autofill: body.autofill === true,
  };

  const target = `${engineUrl().replace(/\/$/, "")}/hangul-compose`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ENGINE_TIMEOUT_MS);

  try {
    const res = await fetch(target, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: controller.signal,
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(
        `[hangul-compose] 엔진 오류 ${res.status}: ${detail.slice(0, 500)}`
      );
      return NextResponse.json(
        { error: "글씨 합성에 실패했습니다. 잠시 후 다시 시도해 주세요." },
        { status: 502 }
      );
    }

    const data = (await res.json()) as HandwritingResponse;
    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    console.error("[hangul-compose] 엔진 연결 실패:", err);
    return NextResponse.json(
      {
        error: aborted
          ? "글씨 합성이 시간 내에 끝나지 않았습니다. 다시 시도해 주세요."
          : "글씨 엔진에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.",
      },
      { status: aborted ? 504 : 503 }
    );
  } finally {
    clearTimeout(timer);
  }
}
