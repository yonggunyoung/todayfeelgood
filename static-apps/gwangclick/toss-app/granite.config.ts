// ⚡ 광클대전 — 앱인토스 web-framework 설정 (weekly-todo-jquery 예제 구조 기반)
// 콘솔/문서: developers-apps-in-toss.toss.im — 키 이름은 설치한 패키지 버전 기준으로 최종 확인.
import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  appName: 'gwangclick',
  brand: {
    displayName: '광클대전',
    // 콘솔에 업로드하는 아이콘과 별개로 brand.icon은 공개 URL 권장(배포된 우리 아이콘).
    icon: 'https://ddukkit.com/gwangclick/icon-512.png',
    primaryColor: '#12b39a',
    bridgeColorMode: 'inverted',
  },
  permissions: [],            // 광클대전은 카메라·위치 등 권한 불필요
  outdir: 'dist',
  web: {
    host: 'localhost',
    port: 8080,
    commands: {
      dev: 'webpack serve --mode development',
      build: 'webpack --mode production',
    },
  },
  // webViewProps: { type: 'partner' },  // 예제 참고 — 콘솔/SDK 버전에 맞춰 필요 시 사용
});
