import { defineConfig } from 'vite';

// 냉비서 미니앱 Vite 설정 — 단순 유지.
// granite dev/build가 이 설정으로 Vite를 구동한다(package.json web.commands).
export default defineConfig({
  // 프로젝트 루트(= toss-miniapp/). index.html, /src, /vendor가 여기 있다.
  root: '.',
  // 상대 경로 빌드 — 토스 WebView가 어떤 base에서 서빙하든 자산이 깨지지 않게.
  base: './',
  server: {
    host: 'localhost',
    port: 8080,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
