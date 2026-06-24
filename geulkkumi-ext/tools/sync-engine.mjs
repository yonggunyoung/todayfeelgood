/* 글꾸미 확장 — 엔진/데이터 동기화: 메인 앱(../geulkkumi/js)의 순수 모듈을 확장 안으로 복사.
 * 엔진을 고친 뒤 `npm run sync` (또는 node tools/sync-engine.mjs)로 갱신. 단일 소스 유지. */
import { readdirSync, copyFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const extRoot = join(here, "..");
const srcRoot = join(extRoot, "..", "geulkkumi", "js");

for (const sub of ["engine", "data"]) {
  const from = join(srcRoot, sub), to = join(extRoot, sub);
  mkdirSync(to, { recursive: true });
  let n = 0;
  for (const f of readdirSync(from)) if (f.endsWith(".js")) { copyFileSync(join(from, f), join(to, f)); n++; }
  console.log(`synced ${sub}: ${n} files`);
}
