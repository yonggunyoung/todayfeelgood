# Phase 4 보안 검수 — 광클대전 3D 지구본 (globe.gl 지연로딩 + 2D 폴백)

> **결론: PASS — Blocker 0 / Warning 0 / Nit 2. 지구본 라벨 XSS 안전(데이터 파생값 `flag`·국가명은 `esc()`, 좌표·코드·수치는 regex/숫자 게이트). 지연주입 src는 고정 로컬 경로, eval/원격 URL 0. vendor는 동일출처·옵트인 지연로딩되는 수용된 vendored MIT 의존성(LICENSE 동봉). 신규 secret/network/fetch 0, fb-config·net.js 불변. 변조 데이터로 마크업 주입·크래시 불가.**

대상 커밋: `9f4815f` (`git diff HEAD~1 HEAD`)
검토 파일: `gc-globe.js`(신규), `index.html`(지구본 섹션), `i18n.js`, `sw.js`, `vendor/globe.gl.min.js`, `vendor/LICENSE`
참조: `CLAUDE.md`, `docs/gwangclick-global-plan.md`
독립 sanity: `node --test 'tests/*.test.mjs'` → **52/52 pass**
범위: READ-ONLY(소스 미수정, 본 보고서만 작성).

---

## 1. XSS — 지구본 라벨/툴팁 (최우선) — ✅ SAFE

globe.gl로 HTML이 들어가는 sink는 **단 하나**: `pointLabel(d => globePointLabel(d))`
(`index.html:1090` 부근 설정, `globePointLabel` 본체 `index.html:1141~1147`).
오버레이 셸 `ov.innerHTML`(`index.html:105`)은 두 번째 sink지만 `t(...)` 상수 UI 문자열 + 정적 마크업만 사용(데이터 파생값 0).

`globePointLabel`이 만드는 innerHTML 문자열의 **모든 보간값 추적**:

| 값 | 출처 | 신뢰성 | 처리 | 판정 |
|---|---|---|---|---|
| `info.flag` | `GCGeo.flagOf(d.code)` (`geo.js:14`) | 데이터 파생(`d.code`) → 단, `^[A-Z]{2}$` 재검증 후 regional-indicator 코드포인트만, 아니면 `🏳️` | **`esc()`** | ✅ |
| `nm` (`info.nameKo/nameEn`) | `GCGeo.countryInfo` `NAMES` 상수, 미상 시 검증된 2글자 코드 (`geo.js:58-75`) | 상수/검증코드 | **`esc()`** | ✅ |
| `d.code` | `GCGlobe.normCode` → `^[A-Z]{2}$`만 (`gc-globe.js:40-44`) | 게이트됨(마크업 불가) | 분기조건으로만 사용 | ✅ |
| `lt.emoji` | `topics.js` 배틀 상수의 `emoji`(`🌿`·`🚫` 등, `topics.js:181`) — **Firestore 아님** | 앱 상수 | raw(미`esc`) | ✅ Nit |
| `d.share` | `countryPoints`의 `Math.round(...)` (`gc-globe.js:95`) | 항상 숫자 | — | ✅ |
| `t('globeMine')` | i18n 상수 (`i18n.js`) | 상수 | `esc()` | ✅ |
| `t('globeTaps',{n:comma(d.tot)})` | 템플릿 `"{n} taps"`/`"참여 {n}"`(상수, HTML 없음) + `comma(숫자)`=`toLocaleString` (`index.html:210`) | 상수+숫자 | — | ✅ |

**핵심 판정:** 라벨에서 *진짜 데이터 파생* 값(`flag`, 국가명)은 모두 `esc()` 처리됨.
국가명은 본질적으로 `geo.js` **상수 테이블(`NAMES`)** 에서 오고, 미상 코드는 `normCode`로 `[A-Z]{2}`만 통과하므로
공격자가 임의 문자열을 라벨에 주입할 경로가 없다. **닉네임·배지·멘트 등 사용자 자유입력은 지구본 라벨에 일절 들어가지 않는다**(라벨은 국가 집계만 표시).
`t()`의 `{placeholder}` 치환(`i18n.js:220-222`)은 `vars` 값을 그대로 `String()`하지만, 여기 전달되는 `n`은 숫자(`comma`)뿐이라 안전 — 단 `t()`는 STR에 의도적 HTML(`<b>`/`<br>`)을 담는 계약(`i18n.js:212-213`)이므로 호출부 책임. 본 호출부는 계약을 지킨다.

### Nit (XSS 영역, 차단 아님)
- **[Nit] `index.html:1145` — `lt.emoji` raw 렌더(미`esc`).**
  출처는 `topics.js` 하드코딩 배틀 상수(비언어 데이터)로 신뢰값이며, **이미 동일 패턴이 기존 코드 전반에서 raw로 렌더됨**(예: `index.html:790`·`811` 나라/지역 칩, `:414`·`:415`·`:461` 게임 버튼). 즉 신규 취약점 아님 — 기존 관례와 일관. 향후 일관성/심층방어로 `esc(lt.emoji)` 통일 가능(현 상태 안전).
- **[Nit] `index.html:1145` — `d.share`·`d.tot` raw 보간.** `countryPoints`가 `Math.round`/`num()`으로 항상 유한 숫자를 보장하므로 안전. 방어 코드로 충분, 조치 불요.

---

## 2. 지연로딩 주입(lazy-load injection) — ✅ SAFE

`loadGlobeLib()`(`index.html` 88-91행 부근)이 `<script>`를 삽입:
- `s.src = GLOBE_SRC`, `GLOBE_SRC = './vendor/globe.gl.min.js'`(`index.html`, 상수) — **고정 로컬 상대경로**. 사용자/URL/쿼리스트링 입력이 src에 닿는 경로 0.
- `eval` / `new Function` / `document.write` / `importScripts` / 원격 URL **없음**(전 신규 라인 grep 확인).
- `onerror` 시 `_globeLoad=null`로 캐시만 비워 재시도 허용(주입 경로 변화 없음).
- 로드 성공 판정은 `typeof window.Globe==='function'`로 엄격.
**판정: 안전.** 진입(뷰 오픈) 시에만 1회 주입(idempotent 캐시 `_globeLoad`).

---

## 3. Vendored 라이브러리 공급망 — ✅ 수용된 vendored 의존성

`vendor/globe.gl.min.js` = globe.gl 2.46.1 (three 0.184.0 등 번들 포함) MIT, ≈1.8MB. 라인 단위 감사 불가 → **수용된 vendored 의존성**으로 보고. 점검 결과:
- (a) **LICENSE/출처 동봉** ✅ `vendor/LICENSE`에 버전·MIT·upstream URL·포함 의존성(three/three-globe 등 모두 MIT)·출처(`npm install` → `node_modules/.../globe.gl.min.js`) 명시.
- (b) **동일출처 로드** ✅ 런타임 CDN 0. 번들은 self-contained UMD(`window.Globe`)이며, 내부 http(s) 문자열은 주석/문서/셰이더 크레딧뿐 — **런타임 원격 fetch·importScripts 없음**. 통합부는 `globeImageUrl(null)`로 외부 텍스처도 0(`index.html` 3D 설정).
- (c) **지구본 뷰에 한정 + 옵트인 지연로딩** ✅ 모든 사용자에게 자동로드 **아님**. 버튼(`openGlobe`)으로 뷰 진입 시에만 주입. `sw.js v6` ASSETS는 가벼운 `gc-globe.js`만 프리캐시하고 1.8MB vendor는 의도적으로 제외(`sw.js` diff 확인) → 설치 경량, 첫 사용 후에만 캐시. 실패/저사양/WebGL미지원/reduced-motion이면 외부코드 없는 2D 캔버스 폴백.
**판정: 정책 부합(D7·CLAUDE.md 비용/오프라인 철칙). 차단 아님.**

---

## 4. 신규 secret / network — ✅ SAFE
- `fb-config.js` **이 커밋에서 미변경**(name-only diff 확인). 신규 키/엔드포인트 0.
- `gc-globe.js`에 `fetch`/`XMLHttpRequest`/`eval`/원격 URL **0**(grep 확인). 순수 함수(throw 금지)만.
- 지구본은 기존 `GCNet.peek/watch(today)`의 `countries` 집계만 재사용 → **신규 Firestore I/O 0**(`index.html` `watchGlobe`). 새 외부 엔드포인트·소켓 0.
**판정: 안전.**

---

## 5. 변조(tampered) 데이터 내성 — ✅ SAFE
`countryPoints`(`gc-globe.js:80-109`)가 입력 `countries`를 전수 방어:
- `countries`가 객체 아니면 `[]` 반환.
- 각 키 `normCode`(`[A-Z]{2}` 외 skip), 각 값 `typeof==='object'` 검사, `num()`로 `a/b` 강제 수치화, `tot<=0` skip.
- centroid 표에 없는 코드는 **조용히 생략**(throw·크래시 없음).
- 색은 `safeHex`로 검증 후 폴백, 가중치 `weightOf`는 0~1 clamp.
- `peek/watch`도 옛 문서엔 `countries:{}` 폴백(`net.js:66`).
→ 악성/기형 `countries`·이상 코드로 **마크업 주입 불가**(코드 regex 게이트, 라벨 데이터는 `esc`) · **크래시 불가**(전 함수 throw 금지, 테스트 변조 4종 포함). **판정: 안전.**

---

## 안전 경로 요약(확인)
1. 지구본 라벨 XSS: 데이터 파생값 `esc()` 처리, 사용자 자유입력 미노출, 국가명=상수 — **안전**.
2. 지연주입 src=고정 로컬, eval/원격 0 — **안전**.
3. vendor: LICENSE 동봉·동일출처·뷰 한정 옵트인 지연로딩 — **수용**.
4. fb-config·net.js 불변, 신규 fetch/secret/endpoint 0 — **안전**.
5. 변조 데이터 내성(게이트+graceful) — **안전**.

## 조치 권고
- 차단/경고 없음. (선택) 심층방어로 `index.html:1145`의 `lt.emoji`를 `esc(lt.emoji)`로 감싸 기존 칩들과 함께 일괄 통일 — 현재도 안전하므로 후속 클린업으로 충분.
