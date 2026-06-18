# Security 리뷰 — 광클대전 Phase 1 (영어판 + 무료 국가감지)

**결론: PASS — Blocker 0 / Warning 0 / Nit 2. 스테이징 diff에서 XSS·인젝션·시크릿/PII·SW 캐시 신규 취약점 없음.**
모든 비신뢰 데이터(`F.nick`, Firestore `r.nick`)는 `esc()`로 이스케이프되고, lang/geo 입력은 DOM 도달 전 엄격히 화이트리스트 검증됨. `fb-config.js` 미변경, 신규 모듈에 시크릿 없음. (`node --test` 14/14 통과)

범위: `git diff --cached` — `static-apps/gwangclick/{i18n.js, topics.js, index.html, sw.js, tests/*}` + 컨텍스트로 `geo.js`, 전체 `index.html`.

---

## 1. XSS / HTML 인젝션 — 안전 확인

`innerHTML` 싱크 전수(index.html:370,420,548,607,643,665,697,711,720)를 따라 비신뢰 데이터 흐름을 추적.

**비신뢰 입력 = 이스케이프됨 (확인):**
- `F.nick`(사용자 닉네임, localStorage) → innerHTML 도달 지점 전부 `esc()`:
  - 인트로 설정 버튼 `esc(F.nick)` (index.html:395)
  - 설정 input value `esc(F.nick)` (index.html:725)
- Firestore 리더보드 행 `r.nick`(외부/타 사용자 입력) → `esc(r.nick)` (index.html:693)
- 설정 지역 옵션 라벨 `esc(rn)` (index.html:718) — `regionDefault()`도 안전하지만 방어적 이스케이프 유지.
- `esc()` 정의(index.html:661)는 `& < > "` 모두 치환 — 속성/텍스트 컨텍스트 양쪽 충분.

**의도된 HTML(개발자 작성 상수) = 정상:**
- `STR.rewardBtn`/`verdictLose`(`<b>`,`<br>`), `introQ()`의 `<br>`/`<span>`(index.html:212) 등은 신뢰 상수라 raw 삽입이 의도된 동작. 비신뢰 데이터 미포함.
- 떡밥 표시값 `bt.q / bt.tag / me.name / slogan / emoji`(index.html:613,622,353-355,669 등)는 전부 `GCTopics.BATTLES` 하드코딩 상수를 `localize()`한 값 — 사용자/외부 입력 아님.

**`t()` 플레이스홀더 치환(프롬프트 우려 지점) = 안전:**
- `t(key,vars)`(i18n.js:150)는 `{placeholder}`를 `String(vars[k])`로 **이스케이프 없이** 치환.
- 그러나 innerHTML로 가는 모든 `t(...,vars)` 호출의 vars를 전수 확인한 결과, 비신뢰 값(`F.nick`/`r.nick`/`F.region`)이 플레이스홀더로 전달되는 경로 **없음**. 전달되는 값은 ① 숫자(`comma()`/streak/diff/share/mult) ② BATTLES 상수(name/q/title) 뿐.
- 유일하게 `me.name`이 흐르는 `t('shareText',...)`(index.html:651)는 `navigator.share`/`clipboard.writeText`(652-654)에만 쓰이고 **innerHTML로 가지 않음** → HTML 싱크 아님.

**`localize()` 출력 경로:** topics.js `pick()`/`side()`는 비언어 필드(key/emoji/color) 보존, 누락 시 ko 폴백·`''`/`#888888` 기본값 — `undefined` 노출이나 마크업 주입 경로 없음. 변조 입력에도 throw·오염 없음(테스트로 커버).

## 2. lang/geo 입력 인젝션 — 안전 확인

`navigator.language`/`navigator.languages`/타임존은 모두 DOM 도달 전 화이트리스트 통과:
- `pickLang()`(i18n.js:17) → 출력 도메인이 `"ko"|"en"` 둘뿐. `LANG`이 그대로 들어가는 `document.documentElement.lang=LANG`(index.html:232,234)·`comma()` 로케일(index.html:203)·`<html lang>`은 주입 불가.
- `countryFromLocale()`(geo.js:22)는 `[A-Za-z]{2}`만 추출·대문자화. `flagOf()`(geo.js:14)는 `^[A-Z]{2}$` 검증 후 codepoint 산출 → `MYINFO.flag`(index.html:377) 주입 불가. 국가명은 `NAMES` 표 또는 이미 검증된 2글자 코드.
- `F.region`은 innerHTML에 **반사되지 않음**: `regionName(k)`(index.html:245)에서 *조회 키*로만 사용되어 정확히 일치하는 `REGIONS[i].n`(상수) 또는 안전한 `regionDefault()`를 반환. 미일치(악성) 키는 기본값으로 흘러 사라짐. `<option value>`도 `F.region`이 아닌 `REGIONS[i].k` 상수 사용(index.html:718).
- `{placeholder}` 치환 정규식 `/\{(\w+)\}/g`(i18n.js:157)은 단어문자 키만 매칭 — 치환 메커니즘 자체로 마크업 주입 불가(값이 신뢰 한정이라 무관).

## 3. 시크릿 / PII 노출 — 안전 확인

- `fb-config.js` **미변경**(diff 대상 아님). 클라이언트 Firebase config는 공개 가능 값이므로 정책상 OK.
- 신규 모듈(`i18n.js`,`topics.js`) 및 `geo.js`에 api key/secret/token/password/Bearer/AIza/sk- 류 문자열 **없음**(grep 확인).
- 신규 PII 저장·로깅 없음. geo 감지는 외부 API·네트워크 0(브라우저 신호만), 국가코드는 화면 표시·집계용. 닉네임 저장 동작은 기존과 동일(신규 노출 경로 없음).

## 4. 서비스워커 / 캐시 — 안전 확인

- `sw.js`: 버전 `v2 → v3` 정상 범프(sw.js:2), `activate`에서 구버전 캐시 삭제 로직 유지(sw.js:8-12) → 구 셸 잔존 위험 없음.
- 신규 3파일(`i18n.js`,`geo.js`,`topics.js`)을 `ASSETS`에 추가(sw.js:3) — 동일 출처 상대경로만. 캐시 포이즈닝/외부 자원 주입 없음.
- fetch 핸들러는 GET만 캐시(sw.js:15), same-origin 동작 변화 없음. (기존 "cache-first + 응답 무조건 재캐시" 정책은 이번 diff 변경 아님 — 아래 Nit2 참고.)

---

## Nit (비차단 — 견고성 권고, 현재 익스플로잇 경로 없음)

- **Nit1 — `t()` 치환에 이스케이프 없음 (i18n.js:157):** 현재는 vars에 신뢰값(숫자/상수)만 전달되어 안전. 다만 향후 누군가 `t('...', {x: F.nick})`/`{x: r.nick}`처럼 비신뢰 값을 플레이스홀더로 넘기면 즉시 XSS가 된다(innerHTML 경유 시). 방어책: 치환 콜백에서 기본 이스케이프하고, 의도적 HTML 문자열은 별도 처리하거나, "vars는 신뢰값만" 규칙을 주석으로 명시. 우선순위 낮음.
- **Nit2 — SW 캐시-우선 + 무조건 재캐시 (sw.js:17-19, 이번 diff 변경 아님):** 동일 출처 정적 앱이라 위험은 낮으나, 한번 캐시된 셸이 갱신되려면 SW 버전 범프에 의존. 이번엔 v3 범프로 신규 파일 반영됨(정상). 참고용 기록.
