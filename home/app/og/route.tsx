import { ImageResponse } from "next/og";

/**
 * 기본 OG(공유 썸네일) 이미지 — `/og` 로 서빙(루트 도메인).
 * 카톡·트위터 등에서 링크 공유 시 보이는 1200×630 브랜드 카드.
 *
 * 안전성: 한글 폰트 로딩 없이 기본 폰트로 렌더되는 라틴 텍스트 + 도형만 사용해
 *        어떤 환경에서도 두부(□)·실패 없이 그려지게 한다. (한국어 메시지는
 *        링크의 title/description 메타가 담당)
 */
export const runtime = "nodejs";

const SIZE = { width: 1200, height: 630 } as const;

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #ffd9c2 0%, #ffe9b0 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: 28,
            background: "#ffffff",
            borderRadius: 36,
            padding: "64px 72px",
            boxShadow: "0 24px 60px rgba(120,70,30,0.18)",
            width: 980,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              fontSize: 40,
              fontWeight: 700,
              color: "#ef7a52",
            }}
          >
            <div
              style={{
                display: "flex",
                width: 44,
                height: 44,
                borderRadius: 14,
                background: "#ef7a52",
              }}
            />
            ddukkit
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 150,
              fontWeight: 800,
              letterSpacing: -4,
              color: "#2b2a33",
              lineHeight: 1,
            }}
          >
            Aa Bb Cc
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 44,
              fontWeight: 600,
              color: "#5a5660",
            }}
          >
            Your handwriting becomes a real font
          </div>
        </div>
      </div>
    ),
    SIZE
  );
}
