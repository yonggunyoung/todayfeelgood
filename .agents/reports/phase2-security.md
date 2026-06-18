# Phase 2 보안 검수 — 광클대전 (나라대전 + 배지·멘트)

> **결론: PASS — Blocker 0 / Warning 2 / Nit 2.** 신규 사용자생성 데이터(badge·comment·nick·country)는 모든 렌더 경로에서 `esc()` 처리되며, 정제(`sanitizeBadge`/`sanitizeComment`)+국가코드 정규화(`normCountry`/`flagOf`)가 저장·표시 양쪽에 이중으로 걸려 있다. Stored-XSS 실현 경로 없음. fb-config.js 미변경·시크릿 없음. 아래 Warning은 *심층방어 강화 권고*이지 익스플로잇 가능한 결함이 아니다.

검수 대상(staged): `net.js · gc-util.js · index.html · i18n.js · sw.js · FIREBASE.md · tests/util.test.mjs`
테스트: `node --test 'tests/*.test.mjs'` → **26/26 PASS** (재현 확인).
git: `fb-config.js` 스테이지 미포함(untouched), diff 내 시크릿 문자열 0건.

---

## 1. Stored-XSS — 신규 untrusted 렌더 경로 전수추적 (전부 SAFE)

`esc()` 정의(index.html:690)는 `& < > "` 4종을 치환 — 텍스트/속성 컨텍스트 모두 안전.

| # | 렌더 경로 | 출처(untrusted) | esc 위치 | 판정 |
|---|---|---|---|---|
| 1 | 리더보드 닉네임 | Firestore `nick` | `esc(r.nick)` (index.html:727) | ✅ |
| 2 | 리더보드 배지 | Firestore `badge` | `esc(r.badge\|\|'')` (721) → `' '+badge` (727) | ✅ |
| 3 | 리더보드 멘트 | Firestore `comment` | `esc(r.comment\|\|'')` (721) → `'“'+comment+'”'` (730) | ✅ |
| 4 | 리더보드 국기 | Firestore `country` | `GCGeo.flagOf(r.country)` (721) — 정규식 게이트 | ✅ |
| 5 | 국가순위 칩 국가명 | Firestore `countries` **키** | `esc(nm)` (758), `nm`은 코드 폴백 | ✅ |
| 6 | 국가순위 칩 국기/share | Firestore `countries` 키/값 | `flagOf` 게이트 + `c.share`는 숫자 | ✅ |
| 7 | 내나라vs세계 라벨 | `t('myCountry'/'world')` 앱상수 | `esc(...)` (750–751) + `flagOf` | ✅ |
| 8 | 결과 순위권 프리뷰 닉 | `nickOf()` (본인) | `esc(nickOf())` (665) | ✅ |
| 9 | 결과 순위권 프리뷰 배지/멘트 | `F.badge`/`F.comment` (본인) | `esc()` (661) | ✅ |
| 10 | 설정 닉/멘트 input value | `F.nick`/`F.comment` | `esc()` (804,808) — `"` 포함 | ✅ |
| 11 | 설정 배지 칩 data-attr/라벨 | `BADGE_PRESET`/`F.badge` | `esc(b)`/`esc(lbl)` (788–789) | ✅ |

**핵심 안전장치 2건 확인:**
- `flagOf(code)` (geo.js:14–19)는 `^[A-Z]{2}$` 불통과 시 **정적 `🏳️` 반환** → Firestore의 임의 `country`/맵키가 국기 슬롯으로 HTML을 주입할 수 없음. (이 출력은 esc 안 거치지만 codepoint 2개 or 고정 이모지뿐이라 안전.)
- `countryStandings`(gc-util.js:61)는 코드 검증을 안 하지만(테스트 102–108로 의도 명시), 그 코드가 흘러가는 국가명은 `esc(nm)`, 국기는 `flagOf`로 각각 차단됨. → **맵키 주입 시나리오도 렌더에서 방어됨.**

`t()` placeholder 경로: i18n STR에 의도적 `<b>/<br>`가 있으나(i18n.js:170 보안계약 주석), Phase 2 신규 키(`contribRankLine`, `youRanked`, `countryTitle` 등)에 들어가는 vars는 전부 **숫자(contrib/rank)·앱상수(scope)** 뿐. 사용자입력을 vars로 넘기는 신규 호출 0건. ✅

---

## 2. 입력 정제 (저장 캡) — 우회 불가 + 렌더 이중방어 확인

- `sanitizeBadge`/`sanitizeComment` (gc-util.js:43–56): 비문자열→`''`, C0/DEL/C1 제어문자(`\x00-\x1f\x7f-\x9f`)→공백, 코드포인트 단위 캡(`sliceCP`, 서로게이트 페어 보존). 우회 경로 없음 — 모든 저장 경로(`openSettings` set-save index.html:823, `submit` opts net.js:129, 로드시 index.html:227)가 통과.
- **심층방어**: 설령 정제가 우회돼 raw가 Firestore에 들어가도 §1대로 렌더가 전부 esc → Stored-XSS 불성립.
- net.js 폴백 `sanBadge`/`sanComment` (100–107): `GCUtil` 부재 시 자체 제어문자 제거+길이컷. ✅

---

## 3. Firestore 규칙 정확성 (FIREBASE.md `gc_scores`) — 적정, 하위호환 OK

규칙(FIREBASE.md:56–61)은 `country/badge/comment`를 **`'있을 때만'` 검증**(`!('x' in data) || (is string && size()<=N)`):
- 옛 클라이언트(필드 미전송) → 통과 → **하위호환 OK** (실제로 Phase 1 클라는 이 필드 안 보냄).
- 신규 클라는 `country=''`(미감지)로 항상 string 전송 → `''.size()=0<=2` 통과. ✅
- 길이: country≤2, badge≤8(byte), comment≤24(byte). `.size()`는 UTF-8 바이트 — 클라 캡은 코드포인트(badge 2cp, comment 24cp). 멀티바이트 시 클라 코드포인트 캡이 더 빡빡하거나 비슷 → 정상 입력이 규칙에 막히는 일 없음(아래 Warning 2 참조). ✅
- `gc_battles` 규칙(41–43) **변경 없음** — `countries` 맵은 기존 `regions`처럼 `allow write: if request.auth != null` 범위에 포함. **auth 게이트 유지됨.** ✅

---

## 4. country 코드 / placeholder 주입 — 정규화 확인

- 필드패스 키로 쓰이는 `country`는 net.js:124 `submit`에서 **`normCountry(country)` 후 `if(cc)` 가드** → `^[A-Z]{2}$`만 `countries[cc]`/score `country`로 기록(net.js:94–98). 점수문서 `country`도 동일 `cc`. → **정상 클라가 임의 키를 쓰는 경로 없음.** ✅
- `t()` vars에 untrusted 미유입(§1). ✅

---

## 5. 시크릿 / PII

- `fb-config.js` 미변경(스테이지 외). diff 내 `AIza/secret/token` 류 0건. ✅
- badge/comment/nick은 **사용자가 자발 입력하는 표시명**(수집형 PII 아님). 닉은 랭킹에만 노출(설정 안내문 명시). ✅

---

## Warning (심층방어 강화 권고 — 익스플로잇 아님)

- **[Warning] `gc_battles` 맵키 길이/형식 미검증** — `FIREBASE.md:41–43`.
  `countries`/`regions` 맵의 **키(country code)**는 규칙에서 제약하지 않음. 정상 클라는 `normCountry`로 ISO2만 쓰지만, 손수 만든 악성 클라(auth만 통과)가 `countries["<긴/이상한 키>"]`를 써 **문서 비대화(읽기비용·노이즈)**를 유발할 수 있음. *XSS는 §1대로 렌더에서 차단되므로 보안위험 아님*, 비용/어뷰징 관점. 현 무료티어 규모에선 수용 가능 — 후속으로 `gc_battles`에 키 화이트리스트/`request.resource.data.countries.size()` 상한 검토. (FIREBASE.md "더 단단하게"의 App Check가 1차 완화책.)
- **[Warning] badge byte-cap vs codepoint-cap 미세 불일치** — `FIREBASE.md:58–59` vs `gc-util.js:16`.
  규칙은 badge ≤8 **바이트**, 클라는 2 **코드포인트**. 깃발/합자(ZWJ) 이모지(예: 🏳️‍🌈, 👨‍👩‍👧)는 2코드포인트라도 UTF-8로 8바이트를 **초과**할 수 있어, 클라 통과분이 규칙에서 거부 → 그 경우 점수문서 쓰기 전체 실패 가능. *정상 단일 이모지(≤4B)·텍스트는 영향 없음.* 빈도 낮으나, 규칙 상한을 `<=12`~`<=16`바이트로 약간 올리면(여전히 어뷰징 차단) 합자 이모지 정상 입력이 안 막힘. 권고 사항.

## Nit

- **[Nit] `renderCountries` `myCountryVsWorld`에 `MY` 직접 전달** — `index.html:745`. `MY`는 `GCGeo.detectFromBrowser()` 산출(브라우저 신호)이라 안전하지만, 함수 내부에서 `trim().toUpperCase()`만 하고 검증은 안 함. 결과가 esc/flagOf로만 흘러 무해. 일관성 위해 `normCountry(MY)`로 통일하면 의도가 더 명확. (동작 영향 0.)
- **[Nit] net.js `nick.slice(0,16)`는 정제 없음** — `net.js:127`. 닉은 길이컷만(제어문자 제거 X). 단 모든 렌더가 `esc(r.nick)`이라 XSS 무관, 제어문자가 표시에 끼는 시각적 깨짐 가능성만. 배지/멘트처럼 `stripCtrl` 적용하면 일관적(선택).

---

### 안전 확인 요약
Stored-XSS 4종(badge/comment/nick/country) 전 렌더 경로 esc 확인 · 맵키 주입도 렌더 방어 · 정제 우회 불가 + 렌더 이중방어 · country `^[A-Z]{2}$` 정규화 · `gc_battles` auth 게이트 유지 · 규칙 하위호환 · 시크릿/PII 없음. **배포 가능(Blocker 0).** Warning 2건은 비용/엣지 정상입력 관점의 후속 권고.
