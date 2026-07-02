// vendor.mjs — 루트 냉비서 앱의 정적 자산을 toss-miniapp/vendor/ 로 복사한다.
// 이렇게 하면 Vite가 vendor/ 를 통해 기존 js/css/icon을 서빙·번들할 수 있다.
// (루트 앱은 절대 수정하지 않는다 — 읽어서 복사만 한다.)
//
// 실행: `yarn vendor` (dev/build 전에 자동 실행됨).
import { cp, rm, mkdir, access } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
// scripts/ 의 부모가 toss-miniapp/, 그 부모가 루트 앱.
const miniappDir = resolve(__dirname, '..');
const rootDir = resolve(miniappDir, '..');
const vendorDir = resolve(miniappDir, 'vendor');

// [원본(루트), 대상(vendor)] 쌍. 디렉터리는 재귀 복사.
const COPIES = [
  [resolve(rootDir, 'css'), resolve(vendorDir, 'css')],
  [resolve(rootDir, 'js'), resolve(vendorDir, 'js')],
  [resolve(rootDir, 'icon.svg'), resolve(vendorDir, 'icon.svg')],
  // ⚡광클대전 — 단일 파일 단독 앱을 게임 시트 iframe으로 임베드 (games.js gameGwangclick)
  [resolve(rootDir, 'gwangclick', 'offline.html'), resolve(vendorDir, 'gwangclick', 'offline.html')],
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
  await mkdir(vendorDir, { recursive: true });

  for (const [src, dest] of COPIES) {
    if (!(await exists(src))) {
      console.error(`[vendor] 원본을 찾을 수 없음: ${src} — 루트 냉비서 앱 구조를 확인하세요.`);
      process.exitCode = 1;
      continue;
    }
    await mkdir(dirname(dest), { recursive: true }); // 단일 파일 대상의 상위 폴더 보장
    await cp(src, dest, { recursive: true });
    console.log(`[vendor] 복사: ${src} -> ${dest}`);
  }
  console.log('[vendor] 완료.');
}

main().catch((err) => {
  console.error('[vendor] 실패:', err);
  process.exit(1);
});
