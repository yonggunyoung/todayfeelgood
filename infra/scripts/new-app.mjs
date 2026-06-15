#!/usr/bin/env node
/**
 * 새 정적 미니앱 등록 — 폴더 골격 생성 + apps.json 등록 + 동기화까지 한 번에.
 *
 * 사용:
 *   node infra/scripts/new-app.mjs <id> "<한글이름>" "<English name>" [경로] [이모지]
 * 예:
 *   node infra/scripts/new-app.mjs dingdong "딩동게임" "Ding Dong" /dingdong 🔔
 *
 * 결과: static-apps/<id>/index.html(없으면 골격 생성) + apps.json 항목 추가 +
 *       nginx 라우팅/홈 카드/검색 자동 반영. 이후 배포 버튼만 누르면 ddukkit.com/<경로> 로 뜬다.
 * (이미 만든 정적앱이 있으면 static-apps/<id>/ 에 파일을 넣고 이 스크립트를 돌리면 등록만 된다.)
 */
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const [, , id, nameKo, nameEn, pathArg, emoji] = process.argv;

if (!id || !nameKo || !nameEn) {
  console.error('사용법: node infra/scripts/new-app.mjs <id> "<한글이름>" "<English name>" [경로] [이모지]');
  process.exit(1);
}
if (!/^[a-z][a-z0-9-]*$/.test(id)) {
  console.error("id는 영소문자/숫자/하이픈만(예: gwangclick).");
  process.exit(1);
}

const path = pathArg || `/${id}`;
const dir = resolve(root, "static-apps", id);

// ① 폴더 + 골격 index.html(이미 있으면 건드리지 않음)
if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
const indexPath = resolve(dir, "index.html");
if (!existsSync(indexPath)) {
  writeFileSync(
    indexPath,
    `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>${emoji ? emoji + " " : ""}${nameKo}</title>
  <meta name="description" content="${nameKo}" />
  <meta name="theme-color" content="#0a0b0d" />
</head>
<body>
  <main style="font-family:system-ui;display:grid;place-items:center;min-height:100vh;margin:0">
    <h1>${emoji ? emoji + " " : ""}${nameKo}</h1>
  </main>
</body>
</html>
`
  );
  console.log(`골격 생성: static-apps/${id}/index.html (여기에 앱을 채우세요)`);
} else {
  console.log(`기존 파일 유지: static-apps/${id}/ (등록만 진행)`);
}

// ② apps.json 등록(이미 있으면 스킵)
const regPath = resolve(root, "apps.json");
const reg = JSON.parse(readFileSync(regPath, "utf8"));
if (reg.apps.some((a) => a.id === id)) {
  console.log(`apps.json 에 이미 '${id}' 존재 — 등록 스킵.`);
} else {
  reg.apps.push({
    id,
    path,
    type: "static",
    status: "live",
    featured: false,
    emoji: emoji || "🧩",
    color: "#0a0b0d",
    nameKo,
    nameEn,
    descKo: nameKo,
    descEn: nameEn,
    keywords: [id, nameKo, nameEn],
  });
  writeFileSync(regPath, JSON.stringify(reg, null, 2) + "\n");
  console.log(`apps.json 등록: ${id} → ${path}`);
}

// ③ 동기화(nginx 라우팅 + 홈 레지스트리)
execFileSync(process.execPath, [resolve(root, "infra/scripts/sync-apps.mjs")], {
  stdio: "inherit",
});

console.log(`\n완료. 다음: ① descKo/descEn/keywords 다듬기  ② 커밋·푸시  ③ 배포 버튼 → ddukkit.com${path}`);
