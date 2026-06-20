# 광클대전 → 세계 광클대전 확장 설계서

> CLAUDE.md §8 5원칙 적용. 이 문서는 **결정(#2)과 경계(#3)를 코드보다 먼저 외화**한 것.
> 대상: `static-apps/gwangclick/` (ddukkit.com). github.io(main) 동기화는 별도 단계(가역성 #4).

## 0. 한 줄 목표
"전국 떡밥 광클" → **"전 세계 국가대항 광클"** (영어판 · 나라대전 · 기여도 순위/배지 · 꾸미기 수익화 · 3D 지구본 타격).

## 1. 경계 — 건드리지 않는 것 (#3, 스코프 수렴)
- ❌ 냉비서 · 폰트/이모티콘 앱 · 허브(`home/`) · nginx 라우팅 · `apps.json` (광클 카드 외).
- ❌ 광클 **게임플레이 밸런스 수치**(콤보·타격·타이머·시드) — 글로벌화는 *표현/데이터* 층만, 물리는 불변.
- ❌ `fb-config.js` 값 · Firebase 프로젝트 설정(콘솔 작업은 사용자 몫).
- ❌ `main` 브랜치(github.io) 직접 수정 — 여기(great-darwin)서 만들고 검증 후 동기화.
- ❌ 기존 한국어 사용자 경험 — **무번역/미감지 시 100% KR로 폴백**(불신 #1).

## 2. 결정 로그 (#2 — 이유 + 비용 + 탈출구)
- **D1 비용 0 · 비AI geo.** 국가/지역 감지는 무료만: `Intl` 타임존 + `navigator.language`. (ddukkit은 후속으로 Cloudflare `CF-IPCountry` 옵션.)
  - 이유: CLAUDE.md 비용 철칙. 비용: 정확도 ~국가 단위(도시 X). 탈출구: 정확도 필요 시 유료 IP API를 `env on/off`+비용주석으로.
- **D2 단일 정적 앱 유지 + 모듈 분리.** `i18n.js`·`geo.js`·`topics.js`로 쪼갬(현 net.js/toss.js와 동급).
  - 이유: 가역성·테스트 용이. 비용: 파일 수↑. 탈출구: 과대해지면 번들 1개로.
- **D3 가산적 i18n.** `LANG` 1개 + `t(key)` + `STR={ko,en}`. 토픽은 `{ko,en}` 양어. 키 없으면 ko 폴백.
  - 이유: 가역성·불신. 경계테스트 4종(정상/매핑/None/변조).
- **D4 Firestore 하위호환 확장.** 기존 `gc_battles{a,b,na,nb,regions}` 불변. **국가는 `regions`와 같은 맵 패턴으로 `countries` 필드 추가**.
  - 이유: 무료티어·기존 데이터 보존. 비용: 문서 크기↑(맵). 탈출구: 국가 전용 컬렉션 분리.
- **D5 나라대전 = 집계 기반.** 탭마다 쓰기 ❌ → 결과 제출 시 1회 원자 증가(기존 submit 패턴). 국가 랭킹은 집계 문서 구독.
  - 이유: Spark 무료한도(쓰기 2만/일) 보호. 탈출구: 유료 Blaze 전환은 사용자 결정.
- **D6 수익화 = 기존 광고 어댑터 위에.** 꾸미기(배지·이름색·탭이펙트) 해금: ① 보상형 광고 시청 ② 초대(레퍼럴). 외부 광고망 직삽 ❌(토스 정책 §6).
  - 이유: 토스 호환·가역성. 탈출구: 인앱결제는 토스 SDK로 갈아끼움(추상화 유지).
- **D7 3D 지구본 = 모바일 안전 우선.** `globe.gl` **지연로딩**(첫 페인트 비차단), 저폴리 + 텍스처 1장, 모바일은 DPR 캡·자동회전 FPS 제한, WebGL 미지원/저사양은 **2D 캔버스 폴백**. 데이터는 국가 집계 구독(탭마다 ❌).
  - 이유: "풀 3D지만 모바일에 안 버겁게"(사용자 결정). 비용: +수백KB(지연). 탈출구: 폴백 경로 상시 유지.

### 2.1 떡밥 투표소(UGC) 결정 로그 — Phase 5 (사용자 결정 라운드)
> 사용자가 그린 큰 그림: "플레이어가 질문지(떡밥)를 생성 → 추첨식으로 화면에 랜덤 노출 → 좋아요 투표 → 임계 도달 시 대전 등판." 추첨(노출 공정성)+투표(거르기)를 **합친다**.
- **D8 검열 = 자동필터 + 사후신고**(사용자 결정). 제출 시 한/영 **금칙어 필터** 통과하면 즉시 투표소 노출 → `reports` 임계 시 **읽기 시점 자동숨김**(status 서버변경 ❌, 비용0) → owner 사후 검토.
  - 이유: 속도·활성 우선(토스 §6는 신고/숨김·owner 검토로 방어). 비용: 부적절 떡밥의 짧은 노출 창. 탈출구: 리스크↑ 시 D8을 owner 사전승인으로 전환(코드상 `MODERATION='pre'` 토글 자리만 둠).
- **D9 스팸 억제 + 수익화 = "떡밥 투척권"**(사용자 결정). 제출은 **투척권 1장 소모**. 투척권은 **포인트로 구입**. → 무분별 지원 방지 + 수익 경로.
  - 이유: 사용자 결정(지원 폭주 방지 + 수익). 비용: 경제 밸런싱 필요. 탈출구: 투척권 가격/일일캡은 상수로 빼 owner가 튜닝.
- **D10 포인트 = 기존 코스메틱 경제 위에(D6 연장).** 적립: 📺 보상형 광고 시청 · 📣 초대(레퍼럴). **실결제는 토스 인앱결제로 추상화·기본 OFF**(CLAUDE.md 비용철칙·§6). 포인트/투척권은 **로컬 보관**(`F.points`/`F.tickets`)으로 백엔드 비용 0.
  - 이유: 비용0·토스호환·가역성. 비용: 로컬 통화는 스토리지 초기화로 리셋 가능(코스메틱과 동일 수용). 탈출구: 실화폐 도입 시 잔액을 서버 권위로 승격(토스 결제 검증).
- **D11 승격 = owner 큐레이션**(사용자 결정). `좋아요 ≥ 임계` 떡밥은 "🔥 등판 대기"로 표시만. **실제 일일대전 등판은 owner가 골라 다듬어 `topics.js`에 커밋**(=공식 떡밥 소스 유지). 자동 등판 ❌.
  - 이유: 품질·안전(토스)·비용0(클라우드 함수 없음)·가역(채택이 커밋으로 보존). 비용: owner 손 1회. 탈출구: 운영 안정 후 자동 등판(별도 커뮤니티 풀)로 확장 가능.
- **D12 경계 보존(#3).** `gc_battles`/`gc_scores`/게임 수치·`battleOfDay`는 **불변**. UGC는 **신규 컬렉션 `gc_proposals`**(가산)로 격리. 투표소는 **별도 탭** — 공식 일일대전 경험 무변경.
  - 스키마: `gc_proposals/{id} = { q, aName, bName, likes:int, reports:int, by:uid, ts }`. 좋아요/신고 = `increment(+1)`·**기기당 1회**(로컬 셋). 목록은 **쿼리 1회 → 클라 셔플(추첨)**, 후보당 구독 ❌(비용).
  - ⚠ owner 콘솔: `gc_proposals` 보안규칙 신설(생성 필드검증 + likes/reports 통제 증가) — FIREBASE.md에 추가 후 **콘솔 게시 1회**.

## 3. 단계 (각 단계 독립 출시 · #5 완료=동작+테스트+문서+검증)
- **Phase 1 — 글로벌 기반**: `i18n.js`(ko/en 자동), `geo.js`(무료 국가감지·국기), 양어 `topics.js`(해외 주제 포함), UI 영문화. KR 폴백 보존.
- **Phase 2 — 나라대전 + 기여도 순위**: `countries` 집계, 경기종료 후 기여도 랭킹, 순위권 **미리 써둔 배지·멘트** 노출.
- **Phase 3 — 꾸미기 수익화**: 코스메틱 + 광고/초대 해금(기존 AD 훅).
- **Phase 4 — 3D 지구본**: 실시간 타격 지구본 + 좁은 지역 자동확대(2D 폴백 포함).

## 4. 테스트 전략 (#1)
- 순수 함수는 `tests/*.test.mjs`(냉비서 패턴). 각 함수 **경계 4종**: 정상 / 매핑(별칭·대소문자) / None(빈·null) / 변조(이상 입력).
- 대상: `pickLang`, `t`, `detectCountry`(타임존→국가 매핑), `topicOfDay`(양어), `clampScore` 등.

## 5. 진행 상태
- [x] 설계서 + 결정 로그 (이 문서)
- [x] Phase 1 구현 (영어판 + 무료 국가감지) — **완료·감사 PASS·배포대기**
  - `topics.js`(양어 12종: 기존 8 + 해외 4 / `localize` ko폴백) · `i18n.js` STR 전면 확장(ko+en) · `geo.js` 활용.
  - index.html 배선: `LANG`/`MY`/`MYINFO`/`t()`, 모든 크롬 `t()`化, KR/EN 토글 + 국기(감지시만) 헤더, `<html lang>` 동적, `comma`/`mdLabel` 언어인식, ko 조사(withEuro) 유지.
  - sw.js v3. 테스트 `node --test` 14/14. **검수·감사 3종 PASS(Blocker 0)** — 보고서 `.agents/reports/phase1-*.md`.
  - 검수 반영: 미감지 시 국기 생략(KR 폴백 동등), `t()` 보안계약 주석.
  - 후속(Phase 2): 한국 지역명 18종·`<title>`/메타 다국어 영어화.
- [x] Phase 2 — 나라대전 + 기여도 순위/배지·멘트 — **완료·감사 3종 PASS(Blocker 0)·푸시**
  - **경계 갱신**: Phase 2부터 `net.js`(데이터층)·Firestore 스키마 **확장 허용**(하위호환·가산만, D4/D5). `gc_battles.countries` 맵 추가, 점수문서에 배지·멘트.
  - ⚠ 사용자 콘솔 작업 동반 가능: Firestore 규칙·색인(FIREBASE.md). main(github.io) 동기화는 별도.
  - 신규 `gc-util.js`(순수 헬퍼: `countryStandings`/`myCountryVsWorld`/`sanitizeBadge`/`sanitizeComment`) — net.js·index.html 공유, D2 모듈분리 연장.
  - `net.js`(가산·하위호환): `submit(…,country,opts{badge,comment})` → `countries.<ISO2>` increment(=regions 동일 패턴) + 점수문서에 country/badge/comment(정제). `peek`/`watch`에 `countries`(옛 문서 → {}), `leaderboard` 행에 country/badge/comment(옛 문서 → '').
  - index.html: 설정에 배지 칩+멘트 입력, 결과 제출 시 `MY`+배지/멘트 동봉, 랭킹보드에 **🌍 나라 순위 + 내 나라 vs 세계**(단일 peek 재사용), 리더보드 배지/멘트(esc), 결과 화면 **기여도 순위 강조 + 순위권 진입 멘트**.
  - i18n: 나라대전/설정 배지·멘트 ko+en 키 추가. sw.js v4(+gc-util.js).
  - **FIREBASE.md**: `gc_scores` 규칙에 country/badge/comment 길이검증(있을 때만·하위호환) 추가 → **콘솔 재게시 1회**. `gc_battles` 규칙·색인은 **변경 불필요**.
  - 테스트 `node --test 'tests/*.test.mjs'` 26/26(기존 14 + util 12, 경계 4종).
  - **검수·감사 PASS** — 보고서 `.agents/reports/phase2-*.md`. 반영: badge 규칙캡 8→16(합자/국기 점수쓰기 실패 방지), `sanitizeBadge` 끝 ZWJ 제거, 죽은 키 `worldGlobal` 제거, FIREBASE.md 승인도메인 오타(dduckkit→ddukkit) 수정.
  - 수용(후속): `gc_battles` 맵키 검증 없음(regions와 동일 모델·~14KB 바운드 → App Check가 완화책).
  - 후속(Phase 1 잔여): 한국 지역명 18종·`<title>`/메타 다국어 영어화.
- [x] Phase 3 — 꾸미기 수익화(코스메틱 + 광고/초대 해금) — **완료·감사 3종 PASS(Blocker 0)·푸시**
  - 신규 `gc-cosmetics.js`(순수 UMD, D2): 카탈로그(탭이펙트·이름색·프리미엄배지 10종) + 해금/장착 리듀서(`normState`/`isUnlocked`/`unlock`/`equip`) + 레퍼럴(`refCode`/`parseRef`). 표현만 — **게임 수치 불변(경계 #3)**.
  - 해금 모델(D6): **로컬** `F.unlocked=[ids]`·`F.cosmetics={tapFx,nameColor}`·`F.badgeId`. 📺=기존 `adRewarded` 재사용(수익) / 📣=초대링크(`?ref=`) 공유→로컬 해금(성장, 백엔드 0). 잠긴 항목은 normState가 기본으로 폴백 → 절대 적용/장착 안 됨.
  - **Firestore 신규 제출 없음**: 이름색은 로컬 전용(본인만 — 결과/리더보드 '(나)' 행 틴트). 프리미엄 배지는 **기존 배지 제출 경로 그대로 재사용**(화이트리스트 `GCCos.badgeOf` 통과 → `sanitizeBadge`로 2 코드포인트 ≤ 규칙 16). **규칙·색인 변경 불필요**(FIREBASE.md 주석만 보강).
  - index.html 배선: 인트로·결과에 `🎨 꾸미기` 진입, `.ad-ov` 모달 Locker(잠김/해금·장착 토글·해금 버튼), `onTap` fxSpark 색/스타일 교체(파티클만), `effectiveBadge()`(프리미엄 우선), `myNameColorStyle()`(내 닉만). i18n ko+en 23키 추가. sw.js v5(+gc-cosmetics.js).
  - 토스 §6 준수: 외부 광고망/배너/전면 직삽 ❌(옵트인 보상형 `adRewarded`만). 코스메틱은 광고/초대로만 해금(실결제 ❌). 결제 경로 도입 시 토스 SDK로 추상화 유지.
  - 테스트 `node --test 'tests/*.test.mjs'` 39/39(기존 26 + cosmetics 13, 경계 4종: 미상 id·이중해금·변조 F·잠긴 장착 차단).
  - **검수·감사 PASS** — 보고서 `.agents/reports/phase3-*.md`. 반영: `myNameColorStyle` hex 가드(미래 회귀 방어), 죽은 키 `equipOff` 제거.
  - 결정 확정: 초대 = **저마찰 유지**(공유 취소/실패시에도 해금) — 사용자 결정(폴리시 라운드).
- [x] Phase 4 — 실시간 타격 3D 지구본 — **완료·감사 3종 PASS(Blocker 0)·푸시**
  - 신규 `gc-globe.js`(순수 UMD, D2): 국가 집계 → 지구본 점 매핑·강도/색·핫스팟 포커스·고도·폴백판단. 신규 `tests/globe.test.mjs`.
  - `vendor/globe.gl.min.js`(≈1.8MB, MIT) **로컬 동봉** — 런타임 CDN 0(npm으로 받아 vendor화, 오프라인 유지). `vendor/LICENSE` 포함.
  - 지연로딩(D7): 지구본 뷰 진입 시에만 `./vendor/globe.gl.min.js` 주입. sw v6 ASSETS엔 **가벼운 gc-globe.js만** 프리캐시(1.8MB vendor는 첫 진입시 캐시 → 설치 경량·이후 오프라인).
  - 데이터: 기존 `peek`/`watch`의 `countries` 재사용 → **신규 쓰기·스키마·색인 0**(읽기는 기존 집계문서 1개 재구독, 탭당 ❌). 점 크기=참여수, 색=우세 진영, 핫스팟/내 나라 자동 포커스·줌.
  - 모바일 안전: DPR 캡·FPS 제한·탭 숨김시 정지·뷰 종료시 dispose(GPU 메모리 해제). **2D 폴백**(WebGL 미지원/저사양/로드실패/reduced-motion).
  - 게임플레이·fb-config·net.js·main 불변. node_modules 미커밋. 테스트 `node --test 'tests/*.test.mjs'` **52/52**.
  - ⚠ 빌더 응답이 API오류로 중간 종료됐으나 **오케스트레이터가 무결성 전수 검증**(구문·52/52·index.html 비잘림·vendor 유효·잔여물 0·프리캐시 정책) 완료.
  - **검수·감사 PASS** — 보고서 `.agents/reports/phase4-*.md`. 반영: 죽은 키 `globe2d` 제거, watch 틱마다 카메라 흔들림 → 핫스팟 바뀔 때만 포커스(`GLB.lastFocus`), 지구본 라벨 `lt.emoji` esc(방어강화).
  - 운영 메모: `vendor/globe.gl.min.js`(globe.gl 2.46.1)는 자동 업데이트 없음 — 보안 패치 시 npm 재다운로드 후 수동 교체 + `vendor/LICENSE` 버전 갱신 필요.
- [x] 국가 커버리지 보강 — **국가 소외 제거(어떤 국가도 코드 노출/지구본 누락 0)**
  - `geo.js NAMES` 23→197국(ISO 3166-1 전수: UN 회원국+흔한 영토, ko+en, 기존 23국 표기 보존), `gc-globe.js CENTROIDS` 52→197(NAMES와 1:1 동기·정밀도 2~3자리), `geo.js TZ` 보조 매핑 확장. 순수 데이터(deps·네트워크 0). `countryInfo` 미상 폴백·`centroidOf` graceful skip 불변(경계 #1).
  - 테스트 `node --test 'tests/*.test.mjs'` 52→56(대표 45국 spread가 ko+en 실명+centroid 해석 확인 + NAMES↔CENTROIDS 동기 + TZ 확장, 경계 4종 유지).
- [x] 축하 이펙트 perf(폰 60fps) — **완료·감사 3종 PASS(0B)·푸시**
  - 근본 원인: `skyConfetti`가 110입자 + `skyLoop`/`fxStep`이 매 프레임 이모지마다 `fillText`(글리프 래스터화, DPR2에서 과부하).
  - 해결(연출만·게임 수치 불변): ① 이모지 글리프를 (글리프×크기버킷×dpr) 오프스크린 캔버스에 **1회 래스터화 후 `drawImage`**(`emojiSprite`/`drawEmojiSprite`, 실패 시 fillText 폴백). ② 입자 수 **기기 스케일**(`deviceTier`/`scaledCount` — 데스크탑 ~110, 모바일 ~45). ③ sky/fx 캔버스 **DPR ~1.5 캡**. ④ `prefers-reduced-motion`이면 축포 0(접근성). 루프는 리스트 비면 기존대로 정지(누수 없음).
  - 경계(#3): `onTap`/`frame`/`comboMult`/`DURATION`/`tapsF`/`dailyBias` 등 게임 로직 0줄 변경. index.html FX층만.
- [x] 10대/AI티 디자인 리프레시 — **완료·감사 3종 PASS(0B)·푸시**
  - "AI 생성티"(풀페이지 단색 그라데이션·균일 라운드·여백만 넉넉) → **손맛/아케이드/Y2K 네온** 무드로. 진영색(데이터)·레이아웃·게임플레이 불변.
  - 정체성: `⚡ 광클대전` 워드마크 = skew + 굵게 + 네온 언더라인 스티커 락업. 떡밥 질문의 `?`만 네온 액센트.
  - 배경: 단색 그라데이션 → 코너 네온 글로우 2점 + 옅은 아케이드 그리드(z<0, 모션 0) + 필름 노이즈. 타이포: 질문/판정 디스플레이 더 크게·미세 그림자(위계 강화).
  - 깊이/택타일: 라디우스 다양화(`--r-xs`~`--r-lg`), 팀카드/결과카드 레이어 섀도, 참전·CTA 버튼 3D 눌림(translateY+섀도 변화), TAP 오브 누름 수축(연출만).
  - 카피(i18n VALUES만, 키/플레이스홀더 불변·ko/en 패리티 136/136): ko 자연스러운 10대/밈 톤(졸잘싸·뻥튀기·1빠 등 과하지 않게), en 미러링. 단, `streakDays`는 테스트 고정값이라 원문 유지(톤은 `streakDaysOn`에).
- [x] 폴리시 검수·감사 반영 — **Review 합격·Security/Audit PASS(0B), 대비 회귀 0**
  - 보고서 `.agents/reports/polish-*.md`. 반영: i18n 키/플레이스홀더 **패리티 자동 테스트** 추가(57/57), `--ink-3` 대비 상향(#646a74→#828a96·소형텍스트 AA), 전역 `@media (prefers-reduced-motion)` 블록(모션 최소화).
  - 결정 확정: **초대 = 저마찰 유지**(공유 취소/실패시에도 해금) — 사용자 결정.
  - [해결] **Pretendard 폰트 로컬 동봉**(사용자 결정): jsdelivr CDN 링크 제거 → `vendor/pretendard/`(dynamic-subset CSS + 92청크, OFL-1.1)로 self-host. 런타임 외부 URL **0**(완전 오프라인·비용0), 쓰는 글자 청크만 로드(경량). sw v7에 CSS만 프리캐시(청크는 첫 사용시 캐시). 룩 유지.
- [x] 소재(떡밥) 다양화 — **음식 쏠림 해소 · 국내/해외 동시 공감 · 재미형(안 자극적)**
  - 배경(마스터 지시): 기존 12종 중 8종이 음식 → "맨날 같은 거". 주제 다양 + 열받지만 안 자극적(정치/종교/젠더/지역비하 금지) + 국내·해외 균형 + 해외發도 국내에 딱 맞는 동급 진영(공감 안 되면 안 함).
  - `topics.js` BATTLES 12 → **24종**(+12): 폰(갤럭시/아이폰)·돈(플렉스/짠테크)·답장(칼답/잠수)·생활리듬(아침형/저녁형)·여행(계획J/즉흥P)·치약짜기·샤워(아침/저녁)·수면양말·자막/더빙·자리(창가/통로)·약속시간(일찍/딱맞춰)·라면면발(꼬들/퍼진). 각 진영 ko+en 슬로건·도발 4종, 의역(직역X).
  - 안전: `battleOfDay`는 `n % length`라 개수 무관 동작(게임 수치·index 가정 불변, 경계 #3). sw v7→**v8**(새 topics.js 전파). 테스트 `node --test 'tests/*.test.mjs'` **57/57**(무결성 테스트가 신규 24종 구조·id유일성·ko/en 패리티 자동 검증).
- [x] 지구본 실시간 팝콘 — **델타 구동(비용0) + 로컬 탭 팝콘** (사용자 결정: "델타+로컬 팝콘")
  - 배경: 지구본은 이미 `watch` 구독이나 집계가 라운드 종료시만 갱신(D5 탭마다 쓰기❌)이라 "지금 탭하는 중"이 즉각 안 보이고 링이 *항상 도는 장식*이라 죽어 보임. → **진짜 매-탭 글로벌 스트림은 쓰기 폭증(무료티어 즉사)** 이라 배제(env 토글 탈출구만 문서화).
  - 해결(추가 비용 0): ① **델타 팝콘** — `gc-globe.js popEvents(prev,curr)`가 직전 스냅샷 대비 **증가한 나라만** 골라 그 증가량(sqrt·perCap 캡)만큼 🍿를 그 나라 좌표에 튀김. 누가 지구 반대편에서 라운드 끝내는 순간 그 나라에 팝콘 펑(기존 watch 재사용, 신규 I/O 0). ② **로컬 탭 팝콘** — `fxPopcorn`이 내가 탭한 자리에 즉발 🍿(완전 로컬·0지연).
  - 렌더: 3D는 `getCoords·camera` 내적으로 **뒷면 컬링** + `getScreenCoords`로 화면투영, 2D 폴백은 정사영(앞면만). `gl-pop` 오버레이에 CSS 애니 🍿 → 자동 제거. **동시 상한 28**·**감속모션 시 생략**(접근성)·첫 로드는 베이스라인만(전세계 폭죽 방지).
  - 경계(#3): `gc_battles`/`gc_scores`/게임 수치/`battleOfDay`/onTap 로직 불변 — **연출(FX/오버레이)층만**. sw v8→**v9**. 테스트 `node --test 'tests/*.test.mjs'` 57→**62**(popCount·popEvents 경계 4종: 증가국만/우세진영색/감소·리셋 무시/변조 throw 금지). i18n globeIntro ko+en 패리티 유지.
- [x] 지구본 로비 상시 노출 + 디테일 (사용자 결정: "로비(인트로)에 항상")
  - `openGlobe`를 `bootGlobe`(폴백판단→3D/2D)로 리팩터(모달/인라인 공용). 신규 `openGlobeInline`이 인트로 안의 `#gl-stage`에 모달 없이 마운트 → 로비에 지구본 상시. 결과/랭킹의 모달 확대는 유지(가역성).
  - 생명주기: `cleanup()`에 `closeGlobe()` 추가 → 화면 전환(대전 시작 등)마다 지구본 정지(배터리·누수·D7). 인트로 진입마다 재마운트. `prevC`/`inline` 상태 정리.
  - 디테일(경량·D7 유지): 로비 스테이지 CSS **별빛 배경**(::before, 0비용)+행성감 섀도, 3D **대기광 강화**(atmosphere 0.22·#5aa0ff)+바다빛 발광 머티리얼, **핫스팟 라벨**(상위 4국 국기+우세%, labelsData). 외부 텍스처 0 유지.
  - 경계(#3): 게임 수치/`battleOfDay`/onTap 불변 — 표현·생명주기층만. sw v9→**v10**. 테스트 62/62 유지(렌더는 브라우저 전용·순수로직 불변). i18n 신규 키 0(globeTitle/Intro 재사용, 패리티 유지).
  - 후속(이번 묶음 잔여): **떡밥 투표소(UGC)** 구현 진행.
- [x] 지구본 = 모든 장면 실시간 + 대륙/바다/위치 (사용자 추가 요구: "모든 장면에서 실시간·팝콘", "대륙·바다·정확한 위치")
  - **D13 영속 단일 인스턴스.** 화면마다 부수지 않고 단일 지구본을 만들어 각 화면의 `#gl-slot`으로 '이동'(로비/배틀(미니 코너)/결과/랭킹 전부). 슬롯 없으면 `gl-park`로 보관+렌더 정지(절전). `cleanup()`에서 더는 closeGlobe 안 함 → 데이터 구독·🍿팝콘이 **모든 장면에서 끊김 없이** 유지. 모달(openGlobe) 제거(중복 #gl-stage 방지·전 화면 상시라 불필요).
    - 이유: 사용자 요구. 비용: 영속 GPU(슬롯 없을 때 pause). 탈출구: 슬롯 미배치 시 자동 park+pause. 배틀은 `pointer-events:none` 미니라 탭게임 무방해.
  - **D14 대륙/바다/국경 = 로컬 GeoJSON.** `vendor/world-110m.geo.json`(npm world-atlas→topojson-client 변환, 177국, 좌표 2자리, **161KB**) 폴리곤으로 육지/국경 렌더, 바다=구 머티리얼. 외부 텍스처 0 유지. 점은 centroid라 올바른 대륙 위 → '어디쯤' 정확. 라벨 상위 4→**6**국(국기+우세%). 2D 폴백은 D7 위해 격자 유지(대륙은 3D 전용).
  - **D15 전체 실시간.** `GLOBE_MAX_PTS` 60→**250**(거의 전 국가 점). 성능: `pointsMerge(true)`로 1지오메트리 병합. 링 6→8.
  - 경계(#3): 게임 수치/onTap 불변. sw v11→**v12**. 테스트 **69/69** 유지. geojson은 sw 프리캐시 제외(globe.gl처럼 최초 사용 시 런타임 캐시). i18n 신규 키 0.
- [x] 지구본 비주얼·성능 추가 튜닝 (사용자 피드백): 점 더 가늘게(선처럼)·태양 제거·육지색 또렷(덜 어둡게)·구름 불투명도↑(보이게). **배틀 미니=lite 모드**(대륙/링/라벨 생략 → 탭게임 끊김 방지, `applyGlobeDetail`/`GLB.lite`). sw v12→v15.
- [x] 게임 모델 검토 + 밸런스(사용자 결정). 현행=**단일 공유 실시간 줄다리기**(`gc_battles/{날짜}` 1문서 전세계 increment)+개인점수 — 장르 정답이라 유지.
  - **D16 재참전=최고점수.** 계속 시도 가능하되 **오늘 최고점만 적용**: 집단 집계엔 최고 대비 **증가분(delta)만** `increment`, 참가자수 na/nb는 **첫 참전만 +1**(`endBattle`의 dayBest 단일슬롯 + `net.js submit` opts.aggDelta/first, 하위호환). → 그라인딩이 세계 승패를 좌우하던 형평성 문제 해소.
  - **D17 2배 부풀리기 제거.** 결과화면 광고 2배 버튼/로직 제거(서버 미반영 '가짜 순위'였음) → 정직성↑. (광고 touchpoint는 추후 '광고→투표소 포인트' 정직 보상으로 재도입 가능 — 보류.)
  - **D18 샤딩=나중에.** 단일 핫문서 쓰기 경합은 동시접속 폭증 시 위험 → 그때 샤딩 카운터 도입(FIREBASE.md 기재). 지금 규모엔 불필요.
  - 경계(#3): 콤보·타이머·타격물리 불변. sw→**v16**. 테스트 69/69.
- [x] 모바일 UX·성능 픽스(사용자 피드백: iPhone/Galaxy서 게임 중 화면 확대/축소/흔들림 + 지구본 '절단기 불꽃' 성능저하 + 멘트 유치).
  - **확대/축소 차단(D19).** iOS는 `user-scalable=no` 무시 → JS로 `gesturestart/change/end` preventDefault + **멀티터치 touchmove** preventDefault + 300ms 더블탭 차단. CSS: `body{touch-action:manipulation}`·`html{-webkit-text-size-adjust:100%}`·`html,body{overscroll-behavior:none}`·`.stage{touch-action:none}`.
  - **흔들림 차단.** 배틀 중 `body.playing{position:fixed;overflow:hidden}`로 스크롤/주소창 토글 잠금(GO서 add·cleanup/endBattle서 remove). juice `shake()` 진폭 6px→2px.
  - **지구본 팝콘 끄기(성능).** 배틀 미니(lite)에서 `popcornAt`/`startPulse` 전면 정지 → '절단기 불꽃' 잔상·탭 끊김 제거.
  - **멘트 톤(위트↑).** 승패 멘트(KO/EN)·등급(TITLES KO) 유치함↓ 위트↑로 교체. 게임 수치 불변.
  - 경계(#3): onTap/콤보/타이머/타격물리·집계 로직 불변. sw v16→**v17**. 테스트 69/69.
- [x] 떡밥 투표소(UGC) — **완료**(설계+코어+배선). 테스트 62→**69**.
  - 코어(D2 모듈분리·순수·throw금지): 입력정규화·금칙어 1차거름(`containsBanned`)·검증(`validateProposal` empty/tooLong/sameSides/banned)·읽기시점 상태(`statusOf`/`likesToGo` — likes≥50 live·reports≥5 hidden, D8/D11)·추첨(`shuffle`/`pickFeed` 숨김제외+셔플, 마태효과 차단)·기기당1회 멱등(`hasVoted`/`addVoted`)·로컬 경제(`buyTicket`/`spendTicket`/`grantFreeOnce`/`addPoints` — D9/D10). 상수 `DEFAULTS`(투척권100·일일캡3·광고30·초대50·무료1·임계50/5) owner 튜닝.
  - ⚠ 금칙어는 1차 거름일 뿐 — 진짜 안전망은 신고+owner(D8). 경계 4종 테스트 7개(정상/매핑/None/변조).
  - ② UI(`index.html`): 로비 🗳️ 버튼 + `openProposals()` 모달(지갑·광고/초대/구매 충전·제출폼 3칸·추첨피드·👍/🚩). F 경제상태(points/tickets/propFree/voted/propDay/propCount) `GCProp.normEcon` 재조립(불신 #1)+무료 투척권 1회. ③ `net.js` `submitProposal`/`listProposals`/`voteProposal`(신규 컬렉션 `gc_proposals` 격리·D12). ④ FIREBASE.md 규칙(필드검증+likes/reports=0 강제+카운터 +1만+delete금지, 복합색인 0). ⑤ i18n ko/en 96키 0누락. ⑥ sw v10→**v11**.
  - 도배 백스톱: **일일 제출 한도**(포인트 파밍해도 하루 N개 상한). 좋아요/신고는 로컬 멱등+신고임계 자동숨김+owner 검토(D8). 제출 실패 시 투척권 환불(가역성 #4). 게임 수치 불변(경계 #3).
- [x] ads.txt: home `/ads.txt`에 owner pub **기본값(`ca-pub-9828999554814217`)** 박음 — env 누락에도 정확한 줄 서빙(env 있으면 override). 광고 스크립트(SiteScripts)는 토스 정책상 env 게이트 유지(기본 OFF). **재배포하면** `https://ddukkit.com/ads.txt`에 `google.com, pub-9828999554814217, DIRECT, f08c47fec0942fa0` 노출.
  - 다음: **토스(main/github.io) 동기화** — great-darwin의 최종 광클을 main에 반영(라이브·제출본, 신중).
