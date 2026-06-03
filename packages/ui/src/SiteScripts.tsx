/**
 * 제3자 스크립트(Google Analytics · Google AdSense) — 환경변수 기반 on/off, 기본 OFF.
 *
 * 토큰(NEXT_PUBLIC_*)이 비어 있으면 아무것도 렌더하지 않는다(= 비활성). 값이 들어오면 자동 활성.
 * 서버 컴포넌트에서 순수 <script> 만 쓰므로 next/script 등 무거운 의존성이 없다.
 * 각 앱 RootShell 의 <body> 안에 한 줄(`<SiteScripts />`)로 끼워 넣어 재사용한다(복붙 금지 규칙).
 *
 * 비용·정책(중요):
 *   - AdSense/Analytics 는 외부 서비스다. **웹 배포에서만** 사용한다.
 *   - 토스 미니앱 빌드에서는 env 를 비워 두면 자동으로 꺼진다(정책상 외부 광고망 직접삽입 금지).
 *   - 값은 모두 운영자가 콘솔에서 발급받은 공개 식별자(G-XXXX, ca-pub-XXXX)라 노출돼도 안전하다.
 */
export function SiteScripts() {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  const adsClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

  // 운영자 발급 식별자만 허용(주입값이라 사실상 신뢰되지만, 형식 가드로 스크립트 오염 방지).
  const safeGa = gaId && /^[A-Za-z0-9-]+$/.test(gaId) ? gaId : undefined;
  const safeAds =
    adsClient && /^ca-pub-\d+$/.test(adsClient) ? adsClient : undefined;

  if (!safeGa && !safeAds) return null;

  return (
    <>
      {safeGa ? (
        <>
          <script
            async
            src={`https://www.googletagmanager.com/gtag/js?id=${safeGa}`}
          />
          <script
            dangerouslySetInnerHTML={{
              __html:
                "window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}" +
                `gtag('js',new Date());gtag('config','${safeGa}');`,
            }}
          />
        </>
      ) : null}

      {safeAds ? (
        <script
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${safeAds}`}
          crossOrigin="anonymous"
        />
      ) : null}
    </>
  );
}

export default SiteScripts;
