// vendor.mjs — 글꾸미 앱(../geulkkumi)의 정적 자산을 geulkkumi-toss/vendor/ 로 복사한다.
// Vite가 vendor/ 를 통해 기존 js/css/아이콘을 서빙·번들한다.
// (글꾸미 원본은 절대 수정하지 않는다 — 읽어서 복사만 한다. 단일 소스 유지.)
//
// 실행: `yarn vendor` (dev/build 전에 자동 실행됨).
import { cp, rm, mkdir, access } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
// scripts/ 의 부모가 geulkkumi-toss/, 그 부모가 레포 루트 → 형제 폴더 geulkkumi/.
const miniappDir = resolve(__dirname, '..');
const appDir = resolve(miniappDir, '..', 'geulkkumi');
const vendorDir = resolve(miniappDir, 'vendor');
const publicDir = resolve(miniappDir, 'public');

// [원본, 대상] 쌍. 디렉터리는 재귀 복사.
// ※ sw.js / manifest.webmanifest 는 의도적으로 제외 — 토스 WebView에서는 PWA 셸이 불필요.
// ※ 이미지가 public/ 으로 가는 이유: views/saved.js 가 `./mascot.svg` 를 '페이지 기준 상대경로'로
//    참조한다. Vite는 public/ 을 사이트 루트로 서빙하므로 여기 둬야 원본 수정 없이 해석된다.
const COPIES = [
  [resolve(appDir, 'css'), resolve(vendorDir, 'css')],
  [resolve(appDir, 'js'), resolve(vendorDir, 'js')],
  [resolve(appDir, 'mascot.svg'), resolve(publicDir, 'mascot.svg')], // 보관함 빈 상태 일러스트
  [resolve(appDir, 'icon.svg'), resolve(publicDir, 'icon.svg')],
];

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  // 매번 깨끗하게 다시 복사 (오래된 파일 잔존 방지).
  await rm(vendorDir, { recursive: true, force: true });
  await rm(publicDir, { recursive: true, force: true });
  await mkdir(vendorDir, { recursive: true });
  await mkdir(publicDir, { recursive: true });

  for (const [src, dest] of COPIES) {
    if (!(await exists(src))) {
      console.error(`[vendor] 원본을 찾을 수 없음: ${src} — geulkkumi/ 구조를 확인하세요.`);
      process.exitCode = 1;
      continue;
    }
    await cp(src, dest, { recursive: true });
    console.log(`[vendor] 복사: ${src} -> ${dest}`);
  }
  console.log('[vendor] 완료.');
}

main().catch((err) => {
  console.error('[vendor] 실패:', err);
  process.exit(1);
});
