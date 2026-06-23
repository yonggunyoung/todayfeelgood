import { defineConfig } from '@apps-in-toss/web-framework/config';

// 냉비서 — 앱인토스 WebView 미니앱 설정.
// 공식 예제(toss/apps-in-toss-examples → weekly-todo-jquery, 비React WebView 패턴)를 기준으로 작성.
// 단, 번들러는 예제의 webpack 대신 Vite 사용(냉비서가 순수 ES 모듈이라 더 단순함).
export default defineConfig({
  // TODO(verify): 콘솔 등록 appName과 일치시킬 것. (Apps-in-Toss 콘솔에서 앱 등록 시 정한 식별자)
  appName: 'naengbiseo',

  web: {
    host: 'localhost',
    port: 8080,
    commands: {
      // 냉비서는 빌드 무방식 바닐라 PWA → Vite로 번들. (예제는 webpack serve / webpack)
      dev: 'vite',
      build: 'vite build',
    },
  },

  // 현재 미니앱이 요구하는 토스 권한 없음. appLogin은 별도 권한 선언이 불필요(로그인 호출 시 동의 플로우).
  // TODO(verify): 카메라(영수증 스캔) 등 네이티브 권한이 필요하면 여기에 추가. 콘솔/문서 기준으로 확정.
  permissions: [],

  outdir: 'dist',

  brand: {
    displayName: '냉비서',
    // TODO(verify): 토스는 보통 PNG 아이콘을 요구함. 냉비서 PNG를 호스팅하고 그 URL로 교체할 것.
    //   (assets.html로 600x600 PNG를 생성해 호스팅 가능. 아래는 임시 SVG URL.)
    icon: 'https://yonggunyoung.github.io/todayfeelgood/icon.svg',
    primaryColor: '#0fa45a',
    bridgeColorMode: 'inverted',
  },

  // 네비게이션 바 테마: 냉비서 상단은 라이트(크림 #f5f3ec)이므로 기본(라이트) 사용 — 별도 지정 안 함.
  //   참고: SDK 2.8.0+ 비게임 앱은 navigationBar 테마 지정 가능.
  //   theme: 'dark' / transparentBackground: true 옵션도 존재하지만, 냉비서는 라이트 유지.
  // TODO(verify): SDK 버전에 따른 navigationBar 옵션 키 이름/위치는 최신 문서로 확인.

  webViewProps: { type: 'partner' },
});
