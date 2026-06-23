/* 글꾸미 키보드 — 엔진/데이터 동기화: 메인 앱(../geulkkumi/js)의 순수 모듈을
 * app/src/main/assets/web/{engine,data} 로 복사. 엔진 수정 후 다시 실행. */
import { readdirSync, copyFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const srcRoot = join(root, "..", "geulkkumi", "js");
const webRoot = join(root, "app", "src", "main", "assets", "web");

for (const sub of ["engine", "data"]) {
  const from = join(srcRoot, sub), to = join(webRoot, sub);
  mkdirSync(to, { recursive: true });
  let n = 0;
  for (const f of readdirSync(from)) if (f.endsWith(".js")) { copyFileSync(join(from, f), join(to, f)); n++; }
  console.log(`synced ${sub}: ${n} files`);
}
