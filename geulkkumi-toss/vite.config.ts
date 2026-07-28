import { defineConfig } from 'vite';

// 글꾸미 미니앱 Vite 설정 — 단순 유지.
// granite dev/build 가 이 설정으로 Vite를 구동한다(granite.config.ts 의 web.commands).
export default defineConfig({
  // 프로젝트 루트(= geulkkumi-toss/). index.html, /src, /vendor, /public 이 여기 있다.
  root: '.',
  // 상대 경로 빌드 — 토스 WebView가 어떤 base에서 서빙하든 자산이 깨지지 않게.
  base: './',
  server: {
    host: 'localhost',
    // 냉비서 미니앱(8080)과 동시 구동 가능하도록 8081.
    port: 8081,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
