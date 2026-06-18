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
  - 사용자 확인 대기(설계 선택): 초대 공유 **취소/실패 시에도 해금**(저마찰 성장 전략) — 유지 vs 성공시만 해금.
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
