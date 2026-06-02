import { NextResponse } from "next/server";
import {
  clampParams,
  type GenerateRequest,
  type GenerateResponse,
} from "@webapp/core";

// 동적 라우트(매 요청 포워딩) — 정적 최적화 비활성
export const dynamic = "force-dynamic";

/**
 * BFF 프록시: 브라우저는 same-origin `/api/generate`로 POST하고,
 * 이 라우트가 폰트 엔진으로 포워딩한다. (CORS 회피 + 엔진 주소 은닉)
 * 서버측에서는 ENGINE_URL을 우선 사용하고, 없으면 NEXT_PUBLIC_ENGINE_URL,
 * 그것도 없으면 기본값을 쓴다.
 */
function engineUrl(): string {
  return (
    process.env.ENGINE_URL ||
    process.env.NEXT_PUBLIC_ENGINE_URL ||
    "http://127.0.0.1:8000"
  );
}

export async function POST(req: Request) {
  let body: Partial<GenerateRequest>;
  try {
    body = (await req.json()) as Partial<GenerateRequest>;
  } catch {
    return NextResponse.json(
      { error: "잘못된 JSON 요청입니다." },
      { status: 400 }
    );
  }

  // 방어적으로 파라미터를 허용 범위로 강제
  const payload: GenerateRequest = {
    params: clampParams(body.params ?? {}),
    imagePng: body.imagePng ?? null,
  };

  const target = `${engineUrl().replace(/\/$/, "")}/generate`;

  try {
    const res = await fetch(target, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      // 엔진 응답을 캐시하지 않음
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        { error: `엔진 오류 (${res.status})`, detail: text.slice(0, 500) },
        { status: 502 }
      );
    }

    const data = (await res.json()) as GenerateResponse;
    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    // 엔진 미기동/네트워크 장애
    return NextResponse.json(
      {
        error: "폰트 엔진에 연결할 수 없습니다.",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 503 }
    );
  }
}
