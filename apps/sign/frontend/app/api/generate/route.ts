import { NextResponse } from "next/server";
import {
  clampParams,
  type FontScript,
  type GenerateRequest,
  type GenerateResponse,
} from "@webapp/core";

// 동적 라우트(매 요청 포워딩) — 정적 최적화 비활성
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// 엔진 응답 대기 타임아웃(ms). 콜드스타트/지연 시 무한 대기 방지.
const ENGINE_TIMEOUT_MS = 20_000;
// 요청 바디 상한(서명은 텍스트+파라미터뿐이라 작다).
const MAX_BODY_BYTES = 64_000;

/**
 * BFF 프록시(폰트앱 패턴 동일): 브라우저는 same-origin `/sign/api/generate`로 POST하고,
 * 이 라우트가 폰트 엔진 `/generate`로 포워딩한다. (CORS 회피 + 엔진 주소 은닉)
 * 서명 본체 글자는 폰트 엔진을 그대로 재사용한다 — 새 엔진을 만들지 않는다.
 * 엔진 호스트/내부 에러 메시지는 클라이언트로 새지 않도록 살균한다.
 */
function engineUrl(): string {
  return (
    process.env.ENGINE_URL ||
    process.env.NEXT_PUBLIC_ENGINE_URL ||
    "http://127.0.0.1:8000"
  );
}

function normalizeScript(s: unknown): FontScript {
  return s === "hangul" ? "hangul" : "latin";
}

export async function POST(req: Request) {
  const declaredLen = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLen) && declaredLen > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: "요청이 너무 큽니다." },
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
    return NextResponse.json({ error: "요청이 너무 큽니다." }, { status: 413 });
  }

  let body: Partial<GenerateRequest>;
  try {
    body = JSON.parse(raw) as Partial<GenerateRequest>;
  } catch {
    return NextResponse.json({ error: "잘못된 JSON 요청입니다." }, { status: 400 });
  }

  // 서명 본체는 항상 WOFF 폰트로 받아 프론트가 @font-face로 렌더한다.
  // imagePng는 사용하지 않으므로 전달하지 않는다(페이로드 최소화).
  const payload: GenerateRequest = {
    params: clampParams(body.params ?? {}),
    script: normalizeScript(body.script),
    format: "woff",
  };

  const target = `${engineUrl().replace(/\/$/, "")}/generate`;
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
      console.error(`[sign/generate] 엔진 오류 ${res.status}: ${detail.slice(0, 500)}`);
      return NextResponse.json(
        { error: "서명 글자 생성에 실패했습니다. 잠시 후 다시 시도해 주세요." },
        { status: 502 }
      );
    }

    const data = (await res.json()) as GenerateResponse;
    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    console.error("[sign/generate] 엔진 연결 실패:", err);
    return NextResponse.json(
      {
        error: aborted
          ? "생성이 시간 내에 끝나지 않았습니다. 다시 시도해 주세요."
          : "엔진에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.",
      },
      { status: aborted ? 504 : 503 }
    );
  } finally {
    clearTimeout(timer);
  }
}
