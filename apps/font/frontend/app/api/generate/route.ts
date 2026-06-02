import { NextResponse } from "next/server";
import {
  clampParams,
  MAX_IMAGE_PNG_BYTES,
  type FontFormat,
  type GenerateRequest,
  type GenerateResponse,
} from "@webapp/core";

// 동적 라우트(매 요청 포워딩) — 정적 최적화 비활성
export const dynamic = "force-dynamic";
// 라우트 바디 크기 의식: 큰 페이로드는 아래에서 명시적으로 거절한다.
export const maxDuration = 30;

// 엔진 응답 대기 타임아웃(ms). 콜드스타트/미러 지연 시 무한 대기 방지.
const ENGINE_TIMEOUT_MS = 20_000;

/**
 * BFF 프록시: 브라우저는 same-origin `/api/generate`로 POST하고,
 * 이 라우트가 폰트 엔진으로 포워딩한다. (CORS 회피 + 엔진 주소 은닉)
 * 엔진 호스트/내부 에러 메시지는 클라이언트로 새지 않도록 살균한다.
 */
function engineUrl(): string {
  return (
    process.env.ENGINE_URL ||
    process.env.NEXT_PUBLIC_ENGINE_URL ||
    "http://127.0.0.1:8000"
  );
}

function normalizeFormat(f: unknown): FontFormat {
  return f === "ttf" ? "ttf" : "woff";
}

export async function POST(req: Request) {
  // 1) 바디 크기 1차 방어: content-length가 상한을 넘으면 즉시 413.
  //    (imagePng를 포함해도 2MB를 넘기지 않도록. 헤더가 없으면 본문 길이로 재확인.)
  const declaredLen = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLen) && declaredLen > MAX_IMAGE_PNG_BYTES + 64_000) {
    return NextResponse.json(
      { error: "요청이 너무 큽니다. 이미지 크기를 줄여 주세요." },
      { status: 413 }
    );
  }

  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return NextResponse.json({ error: "요청을 읽을 수 없습니다." }, { status: 400 });
  }

  if (raw.length > MAX_IMAGE_PNG_BYTES + 64_000) {
    return NextResponse.json(
      { error: "요청이 너무 큽니다. 이미지 크기를 줄여 주세요." },
      { status: 413 }
    );
  }

  let body: Partial<GenerateRequest>;
  try {
    body = JSON.parse(raw) as Partial<GenerateRequest>;
  } catch {
    return NextResponse.json({ error: "잘못된 JSON 요청입니다." }, { status: 400 });
  }

  // 2) imagePng 검증: data:image/png 스킴 + 크기 상한. 위반/미사용이면 드롭.
  let imagePng: string | null = null;
  if (typeof body.imagePng === "string" && body.imagePng.length > 0) {
    if (body.imagePng.length > MAX_IMAGE_PNG_BYTES) {
      return NextResponse.json(
        { error: "이미지가 너무 큽니다. (최대 2MB)" },
        { status: 413 }
      );
    }
    if (body.imagePng.startsWith("data:image/png;base64,")) {
      imagePng = body.imagePng;
    }
    // 스킴이 다르면 조용히 드롭(엔진에 신뢰되지 않은 입력 미전달)
  }

  // 방어적으로 파라미터를 허용 범위로 강제
  const payload: GenerateRequest = {
    params: clampParams(body.params ?? {}),
    format: normalizeFormat(body.format),
    imagePng,
  };

  const target = `${engineUrl().replace(/\/$/, "")}/generate`;

  // 3) 타임아웃/취소
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
      // 엔진 원문/스택은 로그로만, 클라이언트엔 일반 메시지
      const detail = await res.text().catch(() => "");
      console.error(`[generate] 엔진 오류 ${res.status}: ${detail.slice(0, 500)}`);
      return NextResponse.json(
        { error: "폰트 생성에 실패했습니다. 잠시 후 다시 시도해 주세요." },
        { status: 502 }
      );
    }

    const data = (await res.json()) as GenerateResponse;
    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    // 내부 호스트/포트가 메시지에 섞일 수 있으므로 서버 로그로만 남긴다.
    console.error("[generate] 엔진 연결 실패:", err);
    return NextResponse.json(
      {
        error: aborted
          ? "폰트 생성이 시간 내에 끝나지 않았습니다. 다시 시도해 주세요."
          : "폰트 엔진에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.",
      },
      { status: aborted ? 504 : 503 }
    );
  } finally {
    clearTimeout(timer);
  }
}
