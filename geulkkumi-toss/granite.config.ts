import { defineConfig } from '@apps-in-toss/web-framework/config';

// 글꾸미 — 앱인토스 WebView 미니앱 설정.
// 냉비서(../toss-miniapp)와 동일한 패턴. 다만 글꾸미는 로그인·서버·결제가 전혀 없어(100% 로컬 처리)
// 권한 선언도, 서버 토큰 교환도 필요 없다 — 심사에서 가장 단순한 형태.
export default defineConfig({
  // TODO(verify): 앱인토스 콘솔에 등록한 앱 식별자와 정확히 일치시킬 것.
  appName: 'geulkkumi',

  web: {
    host: 'localhost',
    // 냉비서 미니앱(8080)과 동시에 띄울 수 있도록 8081 사용.
    port: 8081,
    commands: {
      // 글꾸미는 빌드 무방식 순수 ES 모듈 → Vite로 번들.
      dev: 'vite',
      build: 'vite build',
    },
  },

  // 글꾸미가 쓰는 네이티브 권한 없음.
  //  - 사진아트: <input type="file">(사용자가 직접 고름) + 캔버스 → 권한 선언 불필요.
  //  - 그리기: 캔버스 포인터 이벤트만 사용.
  //  - 저장/복사: 클립보드 + a[download] (브라우저 표준).
  permissions: [],

  outdir: 'dist',

  brand: {
    displayName: '글꾸미',
    // 토스는 PNG 아이콘을 요구 → 이번 라운드에서 만든 512 PNG 사용.
    // TODO(verify): ddukkit 배포(Deploy 버튼) 이후 이 URL이 200인지 확인. 콘솔에서 직접 업로드를
    //   요구하면 geulkkumi/icon-512.png 파일을 그대로 올리면 된다.
    icon: 'https://ddukkit.com/geulkkumi/icon-512.png',
    primaryColor: '#ff5fa2',
    bridgeColorMode: 'inverted',
  },

  // 네비게이션 바: 글꾸미 상단은 라이트(파스텔 #fff5fb) → 기본(라이트) 유지.
  // TODO(verify): SDK 버전별 navigationBar 옵션 키 이름은 최신 문서로 확인.

  webViewProps: { type: 'partner' },
});
