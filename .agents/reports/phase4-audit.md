# Phase 4 Audit — 광클대전 실시간 타격 3D 지구본 (commit `9f4815f`)

> **결론: PASS (Blocker 0 / Warning 0 / Nit 2).** 비용 0·런타임 외부요청 0(vendor 동일출처)·1.8MB는 지연로딩+프리캐시 제외+첫사용 캐시·종료 시 GPU dispose·Firestore 신규 스키마/색인/쓰기 0·토스 §6 무위반·경계 전부 보존·MIT 라이선스 정확·테스트 52/52. 배포 가능.

감사 대상: `git diff HEAD~1 HEAD` (8 files, +810/-7). `vendor/globe.gl.min.js`(1.8MB)는 라인리뷰 제외, 영향/정책만 평가.
권위 문서: `CLAUDE.md` §2(비용·리소스·"무거운 의존성 도입 전 메모리 영향 검토")·§6(토스)·§8(5원칙); `docs/gwangclick-global-plan.md` D5/D7 + §1 경계.

---

## 1. 비용 0 / 리소스 (D7 핵심) — ✅ 준수

**런타임 CDN/외부요청 0 (vendor 동일출처).** ✅
- 이 diff가 새로 추가한 외부 URL **없음**. 앱 내 외부 URL 2건은 **모두 기존**(이번 커밋 미수정):
  - `index.html:31` jsdelivr Pretendard 폰트 CSS — diff상 context 라인(`+` 없음, 변경 없음).
  - `net.js:20` gstatic Firebase SDK — `net.js` 이번 커밋에서 미변경.
- 라이브러리는 `GLOBE_SRC='./vendor/globe.gl.min.js'`(`index.html:973`) = **동일출처**.
- 3D 텍스처도 외부요청 0: `.globeImageUrl(null)`(`index.html:1010`)로 외부 텍스처 미사용(솔리드 구 + three 머티리얼 단색). `vendor/LICENSE:10-15`에 UMD 번들이 three/three-globe 등 의존성을 **self-contained 포함(추가 외부요청 0)**으로 명시 — vendor 헤더(`// Version 2.46.1 globe.gl … self).Globe`)가 단일 UMD임을 확인.

**1.8MB 페이로드 처리.** ✅ 세 조건 모두 충족:
- (a) **지연로딩 — 크리티컬 패스 아님.** `index.html`은 가벼운 `gc-globe.js`만 정적 `<script>`로 로드(`index.html:27`, 좌표표+순수계산). 무거운 `globe.gl.min.js`는 `loadGlobeLib()`가 **지구본 뷰 진입 시 1회** `<script>` 주입(`index.html:980-993`), `openGlobe()`에서만 호출(`index.html:1031-1032`). 첫 페인트 비차단.
- (b) **base precache 제외 — 설치 경량.** `sw.js`의 `ASSETS`에 `gc-globe.js`만 추가, `globe.gl.min.js`는 **의도적으로 미포함**(`sw.js:2-6`, 주석으로 사유 명시). PWA install이 1.8MB로 부풀지 않음.
- (c) **첫 사용 시 캐시 → 오프라인.** 기존 `sw.js` fetch 핸들러(cache-first, 본 diff 미변경 — `sw.js`는 ASSETS/버전 줄만 수정)가 최초 진입 시 vendor 응답을 캐시 → 이후 오프라인 동작. `vendor/LICENSE:16-17`·`sw.js:2-3`에 전략 일치 기재.
- 캐시 버전 `v5→v6` 범프(`sw.js:3`)로 신규 에셋 반영(기존 캐시 정리 onactivate 핸들러 가정 — 기존 로직).

**"메모리 영향 검토" / GPU 해제.** ✅
- 종료 시 dispose: `disposeGlobe3D()`(`index.html:1085-1099`)가 `pauseAnimation()` → `_destructor()` → `renderer.dispose()` → `forceContextLoss()` → DOM 제거. `closeGlobe()`(`index.html:1163-1176`)가 dispose 호출 + unwatch 해지 + visibilitychange/resize 핸들러 제거 + rAF 취소 + 2D 캔버스 제거. **WebGL 컨텍스트/리스너/타이머 누수 방지 전수 처리.**
- 탭 숨김 시 정지: `bindGlobeLifecycle()`(`index.html:1069-1080`)가 `visibilitychange`로 3D `pauseAnimation`/`resumeAnimation`. 2D는 `loop2D`가 `document.hidden`시 미드로우(`index.html:1135`).
- 모바일 캡: DPR 캡 1.5(`setPixelRatio(GCGlobe.cappedDpr(...))` `index.html:1029`), 점/링 상한 60(`GLOBE_MAX_PTS`), 저폴리 `pointResolution(6)`, 2D FPS 24 제한(`GLOBE_FPS_2D` `index.html:1133`), 링은 상위 6개만(`index.html:1054`).
- **결론:** 무거운 라이브러리가 전체 사용자/첫 페인트에 로드되지 않음. 플래그 없음.

## 2. Firestore (D5) — ✅ 준수 (신규 스키마/색인/쓰기 0; Nit 1)

- **신규 쓰기/컬렉션/색인 0.** 지구본은 데이터를 쓰지 않음. `net.js`(미변경)의 `submit`만 쓰기 경로이고 본 diff는 호출 안 함. `gc_battles`/`gc_scores` 스키마·규칙·색인 변경 없음(FIREBASE.md 미변경).
- **기존 집계 재사용.** `refreshGlobeData()`(`index.html:1004`)는 `peek`/`watch`가 준 `tot.countries`(Phase 2에서 추가된 `gc_battles.<date>.countries` 맵)를 `GCGlobe.countryPoints`로 변환만. 추가 읽기 필드 0.
- **Nit (N1):** 커밋 메시지/문서의 "Firestore 신규 I/O 0"은 약간 부정확. `watchGlobe()`(`index.html:998-1002`)가 `GCNet.watch(date,…)`로 **자체 onSnapshot 1개를 추가**로 연다 — rankBoard와 별개 화면이라 별도 구독(코드 주석이 자가공시 `index.html:995-997`). 단, 이는 **이미 존재하는 단일 집계 문서**(`battleRef`=`gc_battles/<date>`, `net.js:60,85`)에 대한 클라이언트 리스너 1개일 뿐 — 신규 컬렉션/색인/탭당 쓰기 없음, D5/D7의 "집계 문서 1개 구독·탭마다 ❌" 범위 내. 비용 영향: 지구본 열려있는 동안 listener 1개(문서 변경 시 read 과금, Spark 무료한도 내). `peek`도 1회 추가 read. **정확히는 "신규 쓰기·스키마·색인 0; 읽기는 기존 집계 문서 재구독"**으로 표현 권장. 정책 위반 아님.

## 3. 토스 §6 — ✅ 준수

- 지구본은 **앱 내 완결 피처 뷰**(오버레이 모달, `.ad-ov` 패턴 재사용). 외부로 보내는 다운로드/이동 없음.
- **광고/결제 변경 0.** AD 어댑터·인앱결제·로그인 추상화 미수정. 외부 광고망 직삽 없음.
- **외부 네트워크 0**(§1 확인) — 자사앱 설치유도/외부 송출 없음.
- AI 미사용(전통 렌더·집계) → "AI 생성" 라벨 대상 아님(해당 없음).

## 4. 경계 / CLAUDE.md — ✅ 준수

- **금지 파일 불변(확인):** `git diff --name-only`에 `fb-config.js`·`net.js`·`toss.js`·`apps.json`·`home/` **전부 없음**. 변경은 `gwangclick/`(index.html, gc-globe.js, i18n.js, sw.js, tests/, vendor/) + `docs/` 한정. 타 앱(font·냉비서 등) 무변경. `main` 브랜치 미수정(great-darwin 작업).
- **게임플레이 수치 불변:** 콤보·타격·타이머·시드 로직 미변경. 지구본은 표현/데이터 뷰만(코드 주석 #3 경계 명시 `index.html:952`). 게임 함수 호출은 읽기 전용(`battleOfDay`/`todayStr` 등).
- **node_modules 미커밋:** `git ls-files | grep node_modules` 결과 0건. 루트 `.gitignore`에 `node_modules/` 존재. vendor는 단일 파일만 복사(LICENSE에 출처 명시).
- **D2(모듈 분리):** `gc-globe.js` 순수 UMD로 분리(렌더는 index.html, 순수계산은 테스트 가능 모듈). 기존 net/toss/util/cosmetics와 동급.
- **D7:** 지연로딩·DPR캡·FPS제한·저폴리·2D 폴백(WebGL미지원/저사양/감속모션/로드실패 4경로 `index.html:1024-1027,1031-1032,1149-1156`) 전부 구현.

## 5. License — ✅ 정확·충분

- `vendor/LICENSE` 존재, **버전 정확**: globe.gl **2.46.1**(LICENSE:9) = vendor 파일 헤더 `// Version 2.46.1`. 일치.
- MIT 전문 포함(LICENSE:19-39), 저작권자 표기(three.js authors, Vasco Asturiano).
- 번들 포함 의존성 모두 MIT로 열거: three 0.184.0, three-globe 2.45.2, three-render-objects, kapsule, accessor-fn, @tweenjs/tween.js(LICENSE:11-13). MIT는 저작권+허가문 동봉으로 attribution 충족 — **적절**.
- (정보) 버전 정확성은 LICENSE 기재 기준 신뢰. 1.8MB 바이너리 무결성/번들 내용물 일치는 라인리뷰 대상 외(과업 지시).

## 6. 5원칙 — ✅ 준수

- **#3 스코프 수렴:** 변경 반경 = gwangclick + docs. 경계 문서(D5/D7) 사전 외화, 코드 주석에 경계 재기재.
- **#4 가산적/가역적:** 기존 코드 갈아엎음 없음 — 신규 파일(gc-globe.js, vendor/, tests/) + index.html에 뷰 추가 + 버튼 2개 배선. 지구본 실패해도 앱 나머지 무영향(옵트인 뷰). 되돌리면 버튼/뷰만 사라짐.
- **#5 완료 정의(동작+테스트+문서+검증):** 테스트 `node --test 'tests/*.test.mjs'` **52/52 pass**(직접 실행 확인, 기존 39 + globe 13, 경계 4종). 문서(plan §5 Phase 4 체크 + 결정/경계) 현행화. 순수 로직 단위테스트 동반(CLAUDE.md §4 "핵심 로직 단위테스트").
- **#1 불신:** `normCode`/`safeHex`/`num`/`weightOf` clamp·폴백, 비동기 경쟁 토큰(`GLB.did`)으로 진행중 콜백 무효화, throw 금지(graceful skip). 좌표표 없는 코드는 "조용히 생략".

---

## Findings (severity-tagged)

| # | Sev | file:line | 내용 |
|---|-----|-----------|------|
| N1 | Nit | `index.html:998-1002` (`watchGlobe`) | 지구본이 자체 `onSnapshot` 1개를 추가로 연다(기존 집계 문서 `gc_battles/<date>` 재구독). 신규 스키마/색인/쓰기 0이라 정책 위반은 아니나, 문서/커밋의 "Firestore 신규 I/O 0" 문구는 "신규 쓰기·스키마·색인 0; 읽기는 기존 집계 문서 재구독(listener 1)"로 표현이 더 정확. 비용은 Spark 무료한도 내(지구본 open 중 listener 1 + peek 1회). |
| N2 | Nit | `vendor/globe.gl.min.js` | 1.8MB(gzip ≈480KB) 바이너리 vendor — 정책상 적법(동일출처·지연·프리캐시 제외). 향후 globe.gl 보안 패치 시 **수동 재vendor + LICENSE 버전 갱신** 필요(자동 업데이트 경로 없음 = 지연로딩 트레이드오프). 운영 메모로 추적 권장. |

**Blocker 0 · Warning 0 · Nit 2.** 두 Nit 모두 정책/비용 위반 아님(표현 정확성·운영 메모). **배포 차단 사유 없음.**

— Audit (비용/정책/토스/경계/성능/라이선스), READ-ONLY. 2026-06-18.
