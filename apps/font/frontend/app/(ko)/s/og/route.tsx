import { ImageResponse } from "next/og";
import {
  type HandwritingRequest,
  type HangulComposeRequest,
  type HandwritingResponse,
} from "@webapp/core";
import { sanitizeColor } from "@webapp/ui";
import { decodeShare } from "../../../../lib/shareCodec";

/**
 * 동적 OG 이미지 (Route Handler).
 *
 * 왜 route.tsx인가: Next 14의 파일 컨벤션 `opengraph-image`는 `?d=` 쿼리를 핸들러에
 * 전달하지 않는다(params만 전달). 그래서 쿼리를 읽을 수 있는 일반 라우트 핸들러로
 * OG를 만들고, 페이지 `generateMetadata`가 og:image를 이 라우트(+?d=)로 가리킨다.
 *
 * 흐름: ?d= 디코드 → 엔진 BFF(same-origin)로 TTF 폰트 → ImageResponse fonts로 등록 →
 *      그 손글씨로 문구 렌더. 실패/누락 시 기본 OG로 폴백. 캐시 헤더 부여.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SIZE = { width: 1200, height: 630 } as const;
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const clean = b64.includes(",") ? b64.split(",")[1]! : b64;
  const bin = Buffer.from(clean, "base64");
  return bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength);
}

/** 기본 OG(폴백) — 폰트 임베드 없이 시스템 폰트. */
function fallback(): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#fef3e2",
          color: "#2b2a33",
          fontWeight: 700,
        }}
      >
        <div style={{ fontSize: 80, display: "flex" }}>획 폰트공방</div>
        <div style={{ fontSize: 36, marginTop: 16, color: "#8a7f72", display: "flex" }}>
          손글씨로 만든 문구
        </div>
      </div>
    ),
    { ...SIZE },
  );
}

export async function GET(req: Request): Promise<Response> {
  const code = new URL(req.url).searchParams.get("d") ?? "";
  if (!code) return fallback();

  try {
    const decoded = await decodeShare(code);
    if (decoded.glyphs.length === 0 || !decoded.text.trim()) return fallback();

    // same-origin BFF 호출(요청 URL의 origin 재사용).
    const origin = new URL(req.url).origin;
    const endpoint =
      decoded.script === "hangul" ? "/api/hangul-compose" : "/api/handwriting";
    // OG 래스터라이즈용 TTF 요청(Satori는 ttf/otf/woff 지원, woff2 미지원).
    const body =
      decoded.script === "hangul"
        ? ({
            jamo: decoded.glyphs,
            text: decoded.text,
            refine: decoded.refine,
            format: "ttf",
          } satisfies HangulComposeRequest)
        : ({
            glyphs: decoded.glyphs,
            refine: decoded.refine,
            format: "ttf",
          } satisfies HandwritingRequest);

    const res = await fetch(`${origin}${BASE}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "force-cache",
    });
    if (!res.ok) return fallback();
    const data = (await res.json()) as HandwritingResponse;
    const fontData = base64ToArrayBuffer(data.fontBase64);

    const ink = sanitizeColor(decoded.style.ink, "#2b2a33");
    const bgColor =
      decoded.style.bg === "transparent"
        ? "#ffffff"
        : sanitizeColor(decoded.style.bgColor, "#fef3e2");
    const text = decoded.text.slice(0, 60);

    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: bgColor,
            padding: 80,
          }}
        >
          <div
            style={{
              fontFamily: "Shared",
              fontSize: 140,
              color: ink,
              textAlign: "center",
              lineHeight: 1.15,
              maxWidth: 1040,
              display: "flex",
            }}
          >
            {text}
          </div>
          <div
            style={{
              marginTop: 40,
              fontSize: 28,
              color: "#8a7f72",
              display: "flex",
            }}
          >
            내 손글씨로 만든 이미지 · 획 폰트공방
          </div>
        </div>
      ),
      {
        ...SIZE,
        fonts: [{ name: "Shared", data: fontData, style: "normal", weight: 400 }],
        headers: {
          "Cache-Control": "public, max-age=86400, s-maxage=86400, immutable",
        },
      },
    );
  } catch {
    return fallback();
  }
}
