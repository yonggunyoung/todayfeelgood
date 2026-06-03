# 검색 등록·애드센스 골격 + 배포 따라하기 — 보고서

**한 줄 결론:** 검색 소유확인·AdSense·GA4 를 **env on/off(기본 OFF)** 골격으로 깔고, 그 과정에서
`NEXT_PUBLIC_*`가 빌드에 안 들어가던 잠재 버그(프로덕션 canonical=localhost)를 빌드 인자로 정정.
전 워크스페이스 `pnpm -r build`/`lint` green.

## 만든 것
1. **검색엔진 소유확인** — `packages/seo`에 `siteVerification()`(env→`Metadata.verification`).
   home `rootMetadata`가 싣는다. Google/네이버/Bing 토큰. *Google은 DNS TXT 권장(코드 불필요)*.
2. **광고·분석 스크립트** — `packages/ui`에 `SiteScripts`(순수 `<script>`, env 없으면 null).
   GA4(gtag) + AdSense 로더. **home + 6앱 RootShell/layout 전부에 1줄로 주입**(사이트 전역).
   값 형식 가드(`G-…`, `ca-pub-숫자`)로 스크립트 오염 방지.
3. **ads.txt** — `home/app/ads.txt/route.ts`. `NEXT_PUBLIC_ADSENSE_CLIENT`가 있으면
   `google.com, pub-…, DIRECT, f08c47fec0942fa0` 자동, 없으면 안내 주석.
4. **빌드 인자 정합(중요 수정)** — `NEXT_PUBLIC_*`는 next build 때 정적 산출물에 구워진다.
   기존엔 `environment:`(런타임)로만 줘서 도커 빌드 시 canonical/OG가 localhost로 굳었음.
   `Dockerfile.next` build 스테이지에 ARG/ENV 추가 + `docker-compose.yml`에 YAML 앵커
   `x-next-public-args`로 6개 앱 `build.args` 일괄 주입. → 도커 빌드도 도메인값으로 구워짐.
5. **.env.example** — 검증/광고/분석 변수 + 비용·정책·재빌드 주석(기본 비움).
6. **문서** — `docs/deploy-walkthrough.md`(Cloudflare·오라클 콘솔→배포→검색등록→애드센스→GA 순서),
   deploy.md/deploy-checklist.md에 연결.
7. **연락처** — 법적 페이지 연락처를 `contact@ddukkit.com`으로 교체(Cloudflare Email Routing→Gmail).

## 검증
- 환경변수 주입 빌드: home HTML에 google/naver 메타·gtag·adsbygoogle 스크립트·canonical=
  `https://ddukkit.com`·`/ads.txt`=`google.com, pub-…, DIRECT, f08c47…` 확인.
- 기본(OFF) 빌드: 스크립트/검증메타 0개, ads.txt=안내주석 확인.
- `docker compose config` 앵커 병합 OK(6앱 build.args에 NEXT_PUBLIC_* 6종 전개 확인).
- `pnpm -r build` 7프로젝트 green, `pnpm -r lint` EXIT 0.

## 정책/비용
- AdSense/GA는 외부 서비스지만 **기본 OFF**(env 비움). 토스 미니앱 빌드에선 비워 자동 비활성
  (CLAUDE.md §6 외부 광고망 금지 — 웹 한정). 유료 API 호출 없음.

## 남은 일 (마스터)
- 토큰 발급(Search Console DNS TXT·네이버·애드센스 pub·GA4 ID) → `.env` 입력 → `--build` 재배포.
- Cloudflare Email Routing(contact@ddukkit.com) 1회 설정해야 연락처 메일 수신됨.
- 개별 광고 단위(슬롯) 배치는 승인 후 별도(원하면 코드로 지원).

## 범위
- 수정: packages/seo·ui, home, apps/*/frontend(layout/RootShell 1줄), infra(Dockerfile/compose),
  docs, .env.example. 엔진·core 미수정.
