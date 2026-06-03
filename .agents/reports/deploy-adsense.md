# 배포 점검 + 애드센스 법적 페이지 — 보고서

**한 줄 결론:** 애드센스용 개인정보처리방침·이용약관(한/영 4페이지)을 홈 앱에 추가하고
(빌드·SEO 검증 통과), 오라클 배포 자산의 도메인 불일치 3건을 ddukkit.com 기준으로 정합.
Cloudflare rate limit 가이드 추가.

## ① 애드센스 법적 페이지 (완료)
- 라우트: `/privacy`·`/terms`(ko), `/en/privacy`·`/en/terms`(en) — 기존 route group 패턴 그대로.
- 구현: `home/components/LegalView.tsx`(+`legal.module.css`)가 사전(`legal.{privacy,terms}`)을
  받아 렌더. ko/en 페이지가 공유. 카피는 `home/lib/dictionaries/{ko,en}.ts`에 추가
  (`en: typeof ko` 타입 제약으로 키 누락 시 빌드 에러 — 양 언어 동기 보장).
- 내용: 수집 최소화 + Google AdSense(DART 쿠키·옵트아웃) + Google Analytics(옵트아웃) 고지,
  이용자 결과물 권리(전적 이용자 소유), 면책/준거법. 문의처 = yonggunyoung@gmail.com.
- 연결: 홈 푸터에 두 링크, `sitemap.ts`에 4 URL + hreflang alternates, 각 페이지 canonical/
  og:locale/`<html lang>` 정상. 언어 토글로 ko↔en 상호 이동.
- 검증: `pnpm --filter ./home build` EXIT 0(11 라우트 정적 prerender), `lint` 0 warning.
  빌드 HTML에서 `/privacy`=`<html lang=ko-KR>`+canonical, `/en/privacy`=`en-US`,
  hreflang(ko-KR·en-US·x-default) 출력 확인.

## ② 오라클 배포 점검 (불일치 3건 수정)
1. **nginx server_name 불일치(중요)** — 도커가 마운트하는 `webapp.compose.conf`는
   `server_name _; # TODO` 로 남아 있었고(프로세스용 `webapp.conf`만 ddukkit.com 반영됨).
   compose 가 권장 경로이므로 `ddukkit.com www.ddukkit.com` 로 정합.
2. **bootstrap.sh의 ALLOWED_ORIGINS에서 www 누락** — `ALLOWED_ORIGINS=$SITE`(apex만)로
   덮어써 `.env.example`/nginx `server_name`의 www와 어긋났다. `apex,www` 둘 다 넣도록 수정.
3. **healthcheck.sh가 허브 미점검** — 엔진(:8000)·폰트 프론트(:3001) 직접만 확인 → 도커
   배포에선 둘 다 비공개라 항상 실패처럼 보였다. `HUB_URL`(nginx:80) 경유로
   홈·`/font`·`/privacy`·`/terms` 점검을 추가(직접 점검 실패는 경고로 강등).
- 그 외 자산(`docker-compose.yml`/`Dockerfile.next`/`deploy.yml` 가드/스왑·빌드분리)은 정상.

## ③ Cloudflare rate limit (선택 — 포함)
- `docs/cloudflare-rate-limit.md`: 무료플랜 규칙 1개로 실제 BFF API
  (`/font/api/*`·`/kit/api/*`·`/sign/api/*` — 레포 라우트 확인)만 분당 20회/IP 제한.
  정적/`_next`는 제외. 동작 확인·주의(프록시 ON 필요·공유 IP)까지.

## Warning / 남은 일 (마스터 몫)
- **AdSense 게재 코드 미삽입**: 본 작업은 *정책 페이지*까지. 실제 광고 슬롯/`ads.txt`/
  `<script>` 삽입은 승인 후 별도. (CLAUDE.md: 외부 광고망 직접삽입은 토스 미니앱에서 금지 —
  웹 배포 한정으로만 적용할 것.)
- **연락처 이메일 노출**: 법적 페이지에 개인 Gmail이 평문 노출된다(마스터 선택). 스팸이
  부담되면 도메인 메일로 교체 가능(문자열 2곳).
- **deploy.yml**: ORACLE_* 시크릿 미설정 시 스킵(가드 정상) — 실제 자동배포는 시크릿 입력 후.

## 검증
- home 빌드/린트 EXIT 0. shell `bash -n` (bootstrap/healthcheck) OK.
- 수정 범위: `home/*`(FE), `infra/nginx`·`infra/scripts`(Infra), `docs/*`. 엔진/core 미수정.
