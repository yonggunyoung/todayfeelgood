#!/usr/bin/env node
/**
 * 앱 레지스트리 동기화 — /apps.json 하나를 읽어 파생 산출물을 자동 생성한다.
 *
 *  ① infra/nginx/apps.generated.conf  : 정적앱(type:static) location 블록(서버 블록에서 include).
 *  ② home/lib/appsRegistry.ts         : 홈/도구공방이 카드·검색에 쓰는 타입 데이터.
 *
 * 사용:  node infra/scripts/sync-apps.mjs
 * 새 앱은 apps.json 에 한 줄 추가 후 이 스크립트만 돌리면 라우팅·홈 노출이 끝난다.
 * (Next 앱은 docker-compose 서비스가 별도로 필요 — docs/apps-registry.md 참고.)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const reg = JSON.parse(readFileSync(resolve(root, "apps.json"), "utf8"));
const apps = reg.apps ?? [];

const banner = "# 자동 생성 파일 — 직접 수정 금지. 원본: /apps.json · 생성: infra/scripts/sync-apps.mjs\n";

// ── ① nginx: 정적앱 location ──
const staticApps = apps.filter((a) => a.type === "static");
let conf = banner;
for (const a of staticApps) {
  const p = a.path.replace(/\/+$/, ""); // 끝 슬래시 제거(/gwangclick)
  conf += `
# ${a.id} (${a.nameKo}) — 정적앱(레포 self-host)
location = ${p} { return 308 ${p}/; }
location ${p}/ {
    alias /srv/static-apps/${a.id}/;
    index index.html;
    try_files $uri $uri/ ${p}/index.html;
}
`;
}
writeFileSync(resolve(root, "infra/nginx/apps.generated.conf"), conf);

// ── ② home: 타입 레지스트리 ──
const tsBanner =
  "// 자동 생성 파일 — 직접 수정 금지. 원본: /apps.json · 생성: infra/scripts/sync-apps.mjs\n";
const ts =
  tsBanner +
  `export interface AppEntry {
  id: string;
  path: string;
  type: "next" | "static";
  status: "live" | "soon";
  featured: boolean;
  emoji?: string;
  color?: string;
  nameKo: string;
  nameEn: string;
  descKo: string;
  descEn: string;
  keywords: string[];
  port?: number;
}

export const APPS: AppEntry[] = ${JSON.stringify(apps, null, 2)};
`;
writeFileSync(resolve(root, "home/lib/appsRegistry.ts"), ts);

console.log(
  `synced: ${apps.length}개 앱 (정적 ${staticApps.length}) → apps.generated.conf, home/lib/appsRegistry.ts`
);
