# Phase 2 Review — 광클대전 (나라대전 + 기여도 순위 + 배지·멘트)

**결론: PASS — Blocker 0. 순수 헬퍼 수학·정렬·경계 정확, net.js 하위호환 완전(옛 문서→`{}`/`''`, 5인자 submit 동작), 데모 폴백·KR 동작·i18n 105/105 키 패리티 모두 정상. Nit 3건(ZWJ 캡·dead key·미세 일관성)만 선택 반영.** 테스트 `node --test 'tests/*.test.mjs'` **26/26 PASS**.

검수 범위: staged diff (`gc-util.js`(NEW)·`net.js`·`index.html`·`i18n.js`·`sw.js`·`FIREBASE.md`·`tests/util.test.mjs`(NEW)·`docs/`). READ-ONLY — 소스 미변경.

---

## ✅ 확인된 정상 (요구사항별)

### 1. gc-util.js 순수 헬퍼 정확성
- `countryStandings`: tot 내림차순 정렬·우세진영(`a>=b`→a, 동률 a)·`share=Math.round(우세/합*100)`·합0 제외·`max` 슬라이스(0→[], 음수→무시=전체) 모두 검증. 변조 항목(null/비객체/비숫자/음수) skip, throw 없음. `num()`가 음수·NaN·Infinity→0으로 clamp(불신 #1) — `countryStandings(42|"x"|[1,2,3])` 모두 안전.
- `myCountryVsWorld`: 내 나라 vs 나머지 합산 정확(`world.a/b`는 내 코드 제외 합). 코드 소문자/공백 정규화(`" kr "`→KR). 미상·내데이터0·빈맵·null→`null`(호출부가 섹션 숨김). 내 나라만 있을 때 `world.aShare=50`(중립 폴백, 의도적).
- `sanitizeBadge`/`sanitizeComment`: `codePointAt` 순회로 **서로게이트 페어 미분할** 확인 — `"🔥👑⚡💪"`→`"🔥👑"`(정확히 2cp), 국기 `"🇰🇷"`(지역표시기호 2cp)도 캡에 살아남음. 제어문자(C0/DEL/C1)→공백·연속공백 축약·trim. 비문자/빈/null→`''`. BADGE_PRESET 12종 전부 self-consistent(정제해도 자기자신).

### 2. net.js 하위호환 (시뮬레이션 검증)
- 옛 battle 문서(countries 없음)→`totalsOf`가 `countries:{}` 폴백, `regions` 보존. null doc→`zero()`. `peek`/`watch` 둘 다 `totalsOf` 단일 경유 → 일관.
- 옛 score 문서(country/badge/comment 없음)→`leaderboard` 행이 `country:''`,`badge:''`,`comment:''`. 기존 필드(nick/side/taps/region/me) 불변.
- **5인자 `submit(date,side,taps,region,nick)`**: `opts=opts||{}` 가드 → `opts.badge/comment` undefined→`''`. `country` undefined→`normCountry`='' → countries 쓰기 skip. **옛 호출 정상 동작 확인.**
- `normCountry`: `/^[A-Z]{2}$/`만 통과(변조·소문자 normalize). countries 증가는 regions와 **동일 패턴**(`agg.countries[cc][side2]=inc(taps)`, merge:true) — D4 일치.

### 3. 데모/시뮬 폴백
- `rankBoard`: `if(!netOn()){...return;}`로 `peek`/`renderCountries`/`renderRegion` 호출 전에 조기 반환 → 나라 섹션(`#rb-country`) 빈 상태 유지(graceful).
- `renderCountries`: `if(!tot){box.innerHTML='';return;}` + `countryStandings`=[]/`myCountryVsWorld`=null이면 각 블록 생략. 미감지(`MY=''`)→`MYINFO.code` falsy→국기 생략(Phase 1 폴백 동등).
- 결과 화면: 데모는 `rankState='estimate'` → contribRank 칩은 추정값으로 표시, 배지·멘트 프리뷰 블록(`real && rank<=20`)은 skip.

### 4. i18n 완전성 (프로그램 검증)
- ko 105 · en 105 키 — **고아 키 0(ko-only 0, en-only 0)**. Phase 2 신규 14키 전부 양쪽 존재.
- en 값에 한글 누출 **없음**(유일한 Hangul `langToggle:"한국어"`는 토글 버튼이 *전환 대상 언어*를 표기하는 정상 동작 — ko쪽은 "EN").
- rank-scope 라벨 일관: 레거시 타일 ko `rankNation="전국 순위"` ↔ 신규 ko 칩 `scopeNation="전국"`, en `rankNation="Global rank"` ↔ 신규 en `scopeWorld="global"`. `LANG==='ko'?scopeNation:scopeWorld` 분기가 **언어별로 레거시와 정합**. (gc_scores 랭킹은 country 필터 없는 단일 글로벌 풀이므로 en="global"이 데이터 의미와도 정확.)

### 5. KR 충실도
- `regions`(지역 점령) 경로·`renderRegion` 불변. countries는 가산만 — 옛 KR 사용자 데이터/UX 영향 0.
- ko 동작 Phase 1과 동일: `comma`/`regionName`/`nickOf` 그대로, 신규 칩도 ko 우선.

### 6. 구조/로드 순서/재사용
- 스크립트 동기 로드 순서 정상: `gc-util.js`(17)→`net.js`(20)→`i18n/geo/topics`→inline(189). `GCUtil` 등 전역이 inline 실행 시점에 정의 보장.
- 단일 `peek` 1회로 countries+regions 동시 렌더(D5, 추가 읽기 0). `RANK_BADGE_TOP=20`==`leaderboard(date,20)` limit 일치(보드 진입자에게만 배지 프리뷰 — 정합).
- 순수 로직을 `gc-util.js`로 분리해 net.js·index.html·테스트 공유(D2). net.js의 `sanBadge`/`sanComment`는 `GCUtil` 위임 + 미존재 시 보수 폴백(방어적, 합당).
- 배지/멘트는 모든 렌더 경로에서 `esc()` 적용(보안), 저장 시점에도 `GCUtil.sanitize*` 정제(이중 방어). FIREBASE.md 규칙도 country/badge/comment 길이검증을 "있을 때만"으로 추가(하위호환).

---

## 🟡 Nit (선택 반영 — 모두 무해)

- **[Nit] gc-util.js:23-33 `sliceCP` — ZWJ 시퀀스 grapheme-naive 절단.** `sanitizeBadge("👨‍👩‍👧")`→`"👨‍"`로 끝에 dangling ZWJ(U+200D)가 남음(`.trim()`은 ZWJ 비제거). 요구된 **서로게이트 페어 분할은 없음**(코드포인트 순회 정확) — ZWJ는 비출력 문자라 렌더 깨짐 없고 PRESET은 전부 단일 cp라 영향 0. 사용자가 ZWJ 이모지 붙여넣을 때만 발생. **수정(선택)**: `sliceCP` 결과 끝의 `‍`/VS16(`️`) 잔여를 `.replace(/[‍️]+$/,'')`로 정리.
- **[Nit] i18n.js:73,145 `worldGlobal` dead key.** ko `"전 세계"`/en `"Global"` 양쪽 추가됐으나 index.html에서 **미참조**(실사용은 `world`/`scopeNation`/`scopeWorld`). 패리티는 깨지 않음. **수정(선택)**: 양쪽 키 제거 또는 `regionDefault()`에서 재사용.
- **[Nit] index.html:226 vs net.js:101 — `GCUtil` 참조 가드 비대칭.** 최상위 `F.badge=GCUtil.sanitizeBadge(...)`는 비가드(net.js는 `typeof GCUtil!=='undefined'` 가드). 단 inline 스크립트는 `GCI18n`/`GCGeo`도 동일하게 비가드 호출(232-234)하는 **기존 컨벤션과 일치** → 신규 취약 클래스 아님. gc-util.js 404 시에만 영향(다른 전역과 동일 운명). 그대로 두어도 무방.

---

## 검증 로그
- `node --test 'tests/*.test.mjs'` → **tests 26 / pass 26 / fail 0**.
- 옛 문서 시뮬: `totalsOf(oldBattle)`→countries `{}`·regions 보존 / `totalsOf(null)`→zero / 옛 score row→country·badge·comment `''` 확인.
- 5인자 submit 가드: `sanitizeBadge(undefined)`/`sanitizeComment(undefined)`→`''`, `normCountry(undefined)`→'' 확인.
- i18n: ko 105 = en 105, 고아 0, Phase 2 14키 양쪽 존재, en 한글누출 0(langToggle 제외=정상).
- 엣지: 50/50→a(50%), 2/1→a(67%), max=0→[], 🇰🇷 2cp 보존.
