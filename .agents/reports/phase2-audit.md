# Phase 2 감사 보고서 — 세계 광클대전 (나라대전 + 기여도 순위/배지·멘트)

> **결론: PASS — Blocker 0 / Warning 0 / Nit 2.** 비용 0·무료티어(Spark) 안전(탭/프레임당 신규 read·write 0, 단일 쓰기 편승·단일 peek 재사용), 토스 §6 무위반, 경계/CLAUDE.md 준수(금지파일 불변·게임플레이 수치 불변·D4/D5 가산), FIREBASE.md 정확·콘솔 1회 작업으로 명시. 테스트 26/26 PASS.

대상: STAGED diff (`git diff --cached`) — 8개 파일(`static-apps/gwangclick/{net.js,gc-util.js,index.html,i18n.js,sw.js,FIREBASE.md,tests/util.test.mjs}` + `docs/gwangclick-global-plan.md`). READ-ONLY 감사(소스 미변경).

---

## 1) Firestore 무료티어(Spark) 영향 — D5 핵심 ✅ PASS

- **탭/프레임당 신규 쓰기 0.** `submit`은 기존과 동일하게 `setDoc(battleRef, agg, {merge:true})` **1회 쓰기**만 수행. `countries.<ISO2>.<진영>` increment는 별도 호출이 아니라 **같은 `agg` 객체에 `regions`와 나란히 편승**(`net.js:122-125`). 점수문서 쓰기(`scoreRef`)도 기존 1회 그대로(`net.js:126-130`). 탭 루프(`index.html` endBattle 외 호출 없음)에 쓰기 추가 없음 — 라운드 종료 시 1회 패턴 유지.
- **국가 순위 = 신규 구독/쿼리/색인 0.** 나라 순위·"내 나라 vs 세계"는 **rankBoard의 단일 `peek` 결과(`tot.countries`)를 재사용**해 클라에서 집계 → `renderCountries(bt,tot)`와 `renderRegion(bt,tot)`가 **동일한 1회 peek**을 공유(`index.html:337`). `watch`/`peek`는 같은 `gc_battles/{date}` 문서를 읽어 `totalsOf`로 정규화할 뿐(`net.js:80-90, 480-484`), 신규 `onSnapshot`/`query`/`getDocs` 없음. `rankOf`(getCountFromServer 2회)도 **불변**.
- **신규 복합 색인 0.** `countries` 맵을 한 문서에서 읽어 메모리 집계하므로 쿼리 자체가 없음 → FIREBASE.md가 "Phase 2 색인 추가 없음"으로 명시(`FIREBASE.md` 색인 절). 기존 2개 색인 유지.
- **`gc_battles` 문서 크기 증가 — 유계(bounded)·허용.** `countries`는 `{<ISO2>:{a:int,b:int}}`. 키 공간은 ISO 3166-1 alpha-2 = **최대 ~249개로 상한이 명확**(무제한 아님). 최악(약 200~249개국 참여) 추정: 국가당 키(2자)+`{a,b}` 중첩맵 ≈ 약 40~55 B → 249 × ~55 B ≈ **~14 KB**. 기존 `regions`(한국 ~18개) + 고정 필드(a/b/na/nb/updatedAt) 합쳐도 **1 MiB 문서 한도의 ~1.5% 수준**. 결론: 유계·안전. `normCountry`가 `/^[A-Z]{2}$/`만 통과시켜(`net.js:93-97`) 임의 키로 맵이 부풀 여지도 차단 — 키 카디널리티가 ISO2로 잠김.

**판정: 무료티어 영향 신규 0. 문서 크기 유계·허용. D5 honored.**

## 2) 비용 0 / deps ✅ PASS

- **외부 API/CDN/폰트/의존성 추가 0.** 신규 `gc-util.js`는 IIFE UMD 순수 모듈 — `fetch`/`http(s)`/`import`/`require`/`eval`/`new Function` 전무(grep 확인), 입력만으로 결정되는 순수 함수 + throw 금지. **오프라인·노드 단독 테스트 가능**(`tests/util.test.mjs`로 입증).
- diff 내 신규 네트워크 출처 0. grep이 잡은 `gstatic firebasejs`(`net.js:20`)·`pretendard@jsdelivr`(`index.html:26`)는 **모두 Phase 1 이전부터 존재(staged 추가줄 아님 — `+` 라인에 미포함, 확인 완료)**. Phase 2가 도입한 게 아님.
- **payload bloat 없음.** 추가 자산은 로컬 `gc-util.js` 1개(113줄, ~3.7KB). sw.js 캐시 목록에 정상 등재(`sw.js:2` v4). ML/무거운 의존성 0.

## 3) 토스 §6 ✅ PASS

- **AD 어댑터 미변경**(diff에 광고 관련 파일/코드 없음 — Phase 3 영역). 외부 광고망 직삽 0.
- **핵심 플로우 앱 내 완결.** 배지·멘트·나라순위·기여도 순위 전부 인앱 렌더(외부 전송/다운로드 유도 없음). 자사앱 설치 유도 0.
- AI 미사용 기능이므로 "AI 생성" 라벨 비해당.

## 4) 경계 / CLAUDE.md ✅ PASS

- **금지 파일 불변 확인.** staged 파일 목록 = 선언된 8개와 **정확히 일치**. `fb-config.js`·`home/`·`apps.json`·`toss.js`·타 앱·`main` 브랜치 변경 0(`git diff --cached --name-only` 확인). 다른 앱/허브 무손상.
- **게임플레이 수치 불변.** combo/tap/timer/seed/TAP_CAP/duration 등 밸런스 상수 diff 변경 0(grep 확인). 변경은 **표현/데이터 층**(렌더·설정·net 데이터)만 — 경계서 §1 부합. (`RANK_BADGE_TOP=20`/`1500`은 표시·기존 어뷰징 상한이지 물리 밸런스 아님.)
- **D4(가산적·기존 필드 불변).** `gc_battles`에 `countries` 추가만, `a/b/na/nb/regions` 불변. `gc_scores`에 `country/badge/comment` 추가만(없으면 ''로 폴백). `totalsOf`가 옛 문서(`countries` 없음)를 `{}`로 안전 폴백(`net.js:480-484`) → 하위호환·불신 #1 충족.
- **D5** 충족(§1 참조). **D2(모듈 분리)로 `gc-util.js` 정당화** — net.js(Firebase 래퍼=브라우저 전용, node 테스트 곤란)에서 검증 대상 순수 로직만 분리, net.js·index.html 공유. 파일 헤더에 이유 명시(`gc-util.js:1-5`). 합리적.
- **하위호환 호출.** `submit`이 6·7번째 인자(country, opts)를 옵셔널화(`opts=opts||{}`, `normCountry`가 미상→'') → 옛 5인자 호출도 동작(`net.js:112-115`).

## 5) FIREBASE.md 정확성 & 프로세스 ✅ PASS

- **규칙 변경 정확.** `gc_scores`에 country(≤2)/badge(≤8)/comment(≤24) **"있을 때만"(`!('x' in data) || ...`) 검증** → 옛 클라(미전송)는 통과, 신규는 서버측 캡 강제(클라 정제 우회 차단). `gc_battles` 규칙은 **"변경 불필요"가 사실** — 기존 `allow write: if request.auth != null`이 필드 제한 없이 `countries` 맵을 이미 포함(FIREBASE.md 4번 규칙 블록서 직접 확인).
- **콘솔 1회 작업으로 명시.** "**콘솔에서 1회 적용** … 다시 게시하세요"로 **사용자 console action** 임을 분명히 기술. **에이전트가 적용했다는 주장 없음**(미적용·사용자 몫으로 위임). 색인도 "추가 없음"으로 정확.
- **badge 상한 근거 주석화.** 규칙 `.size()`=UTF-8 바이트 → 이모지 2개 여유(클라 캡 2 코드포인트)라는 단위 차이를 명시(`FIREBASE.md` 규칙 하단) — 서버≥클라 보수적 정합, 합리적.

## 6) 5원칙 ✅ PASS

- **#4 가역적·가산.** 갈아엎기 0, 기존 위에 얹음(필드/맵 추가, 옛 데이터·옛 호출 보존). 탈출구는 D4(국가 전용 컬렉션 분리)로 문서화.
- **#3 스코프 수렴.** 변경 반경이 선언 8파일로 수렴, 경계 갱신(net.js/스키마 가산 허용)도 문서에 외화.
- **#5 완료 정의.** 동작(렌더/데이터) + 테스트(`tests/util.test.mjs` 12 신규, 경계 4종: 정상/매핑/None/변조) + 문서 현행화(plan/FIREBASE.md/net.js·gc-util 주석) 동반. **실측 `node --test 'tests/*.test.mjs'` = 26/26 PASS**(문서 주장과 일치).

---

## 발견 항목 (Severity)

- **Nit** `net.js:102,106` — `sanBadge`/`sanComment`의 GCUtil 부재 시 폴백 캡이 **바이트 기준 `.slice(0,4)`/`.slice(0,24)`** 로, GCUtil 코드포인트 캡(2/24)과 상한 단위가 다름. 보안상 더 보수적이지도 않고(이모지 4 UTF-16 단위면 1~2 코드포인트) 실해는 없음 — index.html이 gc-util.js를 net.js보다 **먼저 로드**(`index.html:6`)하므로 정상 경로에선 GCUtil이 항상 존재. 방어적 폴백의 단위만 주석으로 맞춰두면 더 명확. (차단 아님)
- **Nit** `index.html` (renderCountries 등) — 나라 순위·badge/comment 렌더가 `GCGeo`(flagOf/countryInfo)·`GCUtil` 전역에 의존. 본 diff 범위 밖이나 두 모듈 모두 sw.js 캐시·로드 순서상 보장됨(Phase 1 검수 PASS). 회귀 아님 — 기록만.

## 명시적 컴플라이언스 확인

- 신규 per-tap/per-frame Firestore read·write: **0** ✅
- 신규 구독/쿼리/복합 색인: **0**(단일 peek/watch 문서 재사용) ✅
- `gc_battles` 문서 크기: **유계(ISO2 ≤~249, 최악 ~14KB ≪ 1 MiB)** ✅
- 외부 API/CDN/폰트/의존성 추가: **0**; `gc-util.js` 순수·오프라인 ✅
- 토스 §6(광고 어댑터 불변·인앱 완결·설치유도/외부광고 0): ✅
- 금지 파일(fb-config.js/home/apps.json/toss.js/타앱/main) 변경: **0** ✅
- 게임플레이 밸런스 수치 변경: **0** ✅
- D4(가산·기존필드 불변)/D5(집계 1회)/D2(모듈 정당): ✅
- FIREBASE.md: 규칙·색인 정확 + **사용자 콘솔 1회** 명시(에이전트 미적용) ✅
- 5원칙(#3 수렴·#4 가역·#5 동작+테스트+문서): ✅; 테스트 26/26 PASS ✅
