# Phase 4 Review — 실시간 타격 3D 지구본 (gwangclick)

> **결론: PASS — Blocker 0 / Warning 0 / Nit 2.** `gc-globe.js` 순수 로직은 명세대로 정확하고(색=우세진영·로그가중·핫스팟/내나라 포커스·좁으면 줌인/퍼지면 줌아웃·폴백판단), 생명주기/누수 처리(지연로딩 1회·dispose·탭숨김 정지·구독해지·토큰 경쟁방어)가 견고하며, 폴백 3중 경로가 절대 앱을 깨지 않는다. 테스트 **52/52 통과**. i18n ko/en 패리티 OK(en에 생짜 한국어 없음). KR 충실성·Phase 1/2/3 불변·옵트인 추가. 발견은 죽은 i18n 키 1개 + 데이터 틱마다 카메라 재포커스(UX) 2건의 Nit뿐.

대상 커밋 `9f4815f`. 검토 범위: `gc-globe.js`(전체)·`index.html` 지구본 생명주기(`openGlobe`/`loadGlobeLib`/`startGlobe3D`/`startGlobe2D`/`dispose`/`closeGlobe`)·`i18n.js`·`sw.js`·`tests/globe.test.mjs`. **vendored `globe.gl.min.js`(20줄 미니파이 블롭, MIT, LICENSE 동봉) 내부는 미검토**(지시대로 존재만 확인).

---

## 1. `gc-globe.js` 순수 로직 정확성 — ✅ 정확 (경험적 검증 완료)

명세 항목을 모두 코드 읽기 + 런타임 sanity 체크로 확인:

- **country-map → points 매핑** (`countryPoints`, L80–109): `normCode`로 ISO2 정규화, centroid 없는 코드 조용히 생략(L89), 변조 값/0참여 skip(L91–93), `tot` 내림차순 정렬 후 `max`(기본 60) 슬라이스. 정상/소문자/None/변조 모두 graceful, throw 없음. ✓
- **intensity/size 스케일** (`weightOf`, L66–72): `log(1+tot)/log(1+maxTot)`로 소수 거대국 독점 방지 + `[0,1]` clamp. 단일국=1, maxTot≤0=0. ✓
- **leading-side 색** (`intensityColor`, L59–62): `color = leading side` 명세 그대로 — lead 'b'면 B색, 그 외 A색 폴백. hex 변조 시 `safeHex` 안전 기본색(`#36e0c8`/`#7b6ef0`). ✓
- **hottest pick / 내나라 우선** (`pickFocus`, L113–123): myCode 활동 있으면 내나라, 없으면 `tot` 최대(방어적 재탐색까지). 빈 배열/변조 myCode → null/hottest. ✓
- **포커스 고도** (`spreadOf`+`focusAltitude`, L133–164): 참여 가중 RMS 분산(경도 wrap `angDiff` 처리) → spread 0°=`MIN_ALT`(0.7, 줌인) ~ 80°=`MAX_ALT`(2.5, 줌아웃) 선형 + clamp. 좁은 동아시아(at≈0.91) < 전세계(aw=2.50) 확인. 점 0/1개 → `MIN_ALT`. ✓
- **tie/empty/single** 처리: 동률 `a>=b`→'a'(share 50%), 빈/None 입력 → `[]` / `MIN_ALT`, 단일국 weight=1·alt=MIN. ✓
- **2D-fallback 판단** (`shouldFallback`, L171–181): webgl=false | libLoaded=false | reducedMotion=true | mem<2 | cores≤2 → true. 신호 누락/변조 → false(3D 시도, 런타임이 폴백). 계약 명확. ✓

> 의도된 미세 거동(이슈 아님): centroid 표(50여국)에 없는 ISO2는 지구본에서 생략됨 — 평면 나라순위 리스트는 별도로 전량 노출하므로 데이터 손실 아님(주석·테스트로 명시, L18/L98).

## 2. 생명주기 / 누수 — ✅ 견고

- **지연로딩 1회** (`loadGlobeLib`, L997–1009): `window.Globe` 존재 시 즉시 resolve, `_globeLoad` Promise 캐시로 중복 주입 방지(idempotent). onerror 시 캐시 비워 재시도 허용 — 좋은 처리.
- **dispose / GPU 해제** (`disposeGlobe3D`, L1161–1175): `pauseAnimation` → `_destructor()` → `renderer.dispose()` → `forceContextLoss()` → DOM 제거, 각 단계 try/catch. WebGL 컨텍스트 강제 해제까지 처리 — 누수 방지 모범적.
- **탭 숨김 정지**: 3D는 `visibilitychange`로 pause/resume(L1149–1157), 2D는 `loop2D`에서 `document.hidden`이면 draw skip(L1212). rAF는 계속 돌지만 그리지 않음(가벼움).
- **구독/핸들러/타이머 정리** (`closeGlobe`, L1258–1269): 토큰 증가로 진행중 비동기 무효화 → `unwatch()` → `visibilitychange`·`resize` 리스너 제거 → `cancelAnimationFrame` → `disposeGlobe3D` → 2D 캔버스 제거 → 상태 리셋 → 오버레이 제거. 댕글링 없음.
- **재오픈**: `openGlobe`가 맨 앞에서 `closeGlobe()` 호출(L1013) + 새 토큰 발급 → 깨끗한 재진입. ✓
- **경쟁 방어**: 모든 비동기 콜백이 `token===GLB.did` 가드(L1045–1046, L1071–1072) — 빠른 열고닫기에도 stale 콜백 무효.

## 3. 폴백 경로 — ✅ 절대 안 깨짐

- WebGL 미지원/감속모션/저사양 → `openGlobe`에서 `shouldFallback` 사전 분기 → `startGlobe2D`(L1042).
- 라이브러리 로드 실패 → `loadGlobeLib().catch` → `startGlobe2D`(L1046).
- 3D 초기화 중 임의 예외 → `try/catch`에서 `disposeGlobe3D()` 후 `startGlobe2D`(L1110–1113).
- 빈 데이터 → `globeEmpty` 메시지(L1063), 캔버스 2D context조차 없으면 메시지만(L1186).
- 데모(백엔드 미연결) → `globeDemo` 안내(L1037).
- 게임/앱 나머지와 분리된 옵트인 오버레이 뷰 — 실패해도 영향 0. ✓

## 4. i18n 패리티 — ✅

- 신규 globe 키 10종(globeBtn/Title/Intro/Loading/Rotate/RotateOn/Empty/Demo/2dNote/Mine/Taps) ko·en 양쪽 추가(i18n.js L105–113 ko / L198–206 en).
- en 블록 생짜 한국어 스캔 결과 `langToggle: "한국어"`(의도된 토글 라벨)만 검출 — globe en 키는 전부 영어. ✓
- `t()` 사용 일관(플레이스홀더 `{n}` 치환 globeTaps). 회전 버튼 라벨 토글 정합(rotate=true→"멈춤", false→"시작"). ✓

## 5. KR 충실성 + Phase 1/2/3 불변 — ✅

- 게임플레이/타이머/콤보·`fb-config.js`·`net.js` 제출 경로 불변. 데이터는 기존 `peek`/`watch`의 `countries` 재사용 → **Firestore 신규 I/O 0**(D5·비용 0).
- 지구본은 인트로·결과 화면의 추가 버튼(L666/L734)로만 진입하는 옵트인. MY(ISO2 대문자, `detectFromBrowser`)와 `d.code`(countryPoints에서 대문자화) 정합 → 내나라 마커 정상.
- sw.js v6: 가벼운 `gc-globe.js`만 프리캐시, 1.8MB vendor는 fetch 핸들러(cache-first + 런타임 캐싱, sw.js L19–21)가 첫 진입 시 캐시 → 설치 경량·이후 오프라인. 정책 일치.

## 6. 구조 / 죽은 코드

- 순수 로직(gc-globe.js, 테스트됨) vs 렌더/생명주기(index.html) 분리(D2) 깔끔. 헬퍼 export 정합.

---

## 발견 (Nit ×2)

- **[Nit] i18n.js:112(ko) / :205(en) — 죽은 키 `globe2d`.** ko `"2D 모드"` / en `"2D mode"` 추가됐으나 `index.html` 어디서도 미사용(실제 사용은 `globe2dNote`). Phase 3 검수에서 `equipOff`·`worldGlobal` 죽은 키를 제거한 선례와 동일 패턴. **Fix:** 양쪽 `globe2d` 키 1줄씩 삭제.
- **[Nit] index.html:1064 — 데이터 watch 틱마다 `focusGlobe()` 재호출.** `refreshGlobeData`가 live 갱신마다 `focusGlobe()`를 부르면, 매 스냅샷마다 1200ms 카메라 이동(3D)/타깃 재설정(2D)이 트리거돼 핫스팟이 자주 바뀌면 카메라가 흔들릴 수 있음. 동작·안정성 문제는 아니며(throw 없음) 단순 UX. **Fix(선택):** 최초 1회만 포커스하거나(`if(!GLB.focused)`), 포커스 대상 code가 바뀔 때만 이동.

## 확인된 정상 (회귀 아님)

- 색=우세진영, 로그 가중, 동률→a, 단일국 클로즈업, 좁으면 줌인/퍼지면 줌아웃(+clamp), 변조/None throw 금지 — 전부 런타임 검증 통과.
- dispose에서 WebGL 컨텍스트 강제 해제, 토큰 경쟁방어, 구독/리스너/rAF 전량 정리, 재오픈 클린.
- 폴백 3경로(사전판단·로드실패·초기화예외) + 빈데이터/데모 메시지 — 앱 무영향.
- `MY` 대문자 ISO2 보장(geo.js `countryFromLocale`/`countryFromTimezone` 둘 다 toUpperCase) → `d.code===MY` 안전.
- 테스트 `node --test 'tests/*.test.mjs'` → **52/52 pass**.
