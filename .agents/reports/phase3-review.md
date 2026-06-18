# Phase 3 Review — 광클대전 꾸미기 수익화 (commit `3b41587`)

**결론: PASS — Blocker 0. `gc-cosmetics.js` 순수 로직·공정성(게임 수치 불변)·잠긴 항목 차단·i18n 양어 패리티 모두 정확. 테스트 39/39 통과. 지적은 죽은 i18n 키 `equipOff` 1건(Nit)뿐.**

리뷰어: Review (correctness/structure) · READ-ONLY · 범위: `gc-cosmetics.js` 전체 + Phase 3 diff(index.html/i18n.js/sw.js/FIREBASE.md/plan)

---

## 검증 요약 (전부 확인됨)

| # | 평가 항목 | 결과 |
|---|----------|------|
| 1 | `gc-cosmetics.js` 순수 로직 정확성 | ✅ 정확 |
| 2 | 공정성(코스메틱=표현만, 점수 수학 불변) | ✅ 확인 |
| 3 | 잠긴 항목 안전(변조 localStorage 차단) | ✅ 확인 |
| 4 | i18n 완전성(양어 패리티, en에 한글 0) | ✅ 확인 |
| 5 | Phase 1/2 무손상(i18n·나라대전·badge·KR) | ✅ 확인 |
| 6 | 구조/죽은코드/재사용 | ⚠️ Nit 1 (`equipOff`) |

테스트: `node --test 'tests/*.test.mjs'` → **39 pass / 0 fail** (기존 26 + cosmetics 13). 경계 4종(정상/매핑/None/변조) 함수별 적용 확인.

---

## 1. 순수 로직 정확성 (✅)

직접 실행 프로브 + 코드 정독으로 전 항목 확인:

- **카탈로그 무결성**: 10항목, id 전부 고유(`BY_ID` 빌드), kind∈{tapFx,nameColor,badge}, unlock∈{free,ad,invite}, 양어 라벨·payload 타입 정상. `defaultIdFor("tapFx")="fx_default"`, `defaultIdFor("nameColor")="nm_default"` 존재. (badge엔 free 기본 없음 — **의도된 설계**, §3 참조).
- **`normState`** (gc-cosmetics.js:73–95): free 무조건 포함 → rawU에서 **알려진 id만·중복제거** → equipped은 `pickEquipped`로 *(알려진+해당kind+해금)* 만 유지, 아니면 free 폴백. 잠긴/미상/kind불일치 장착을 모두 free로 접음. ✅
- **`isUnlocked`** (98–103): 미상 id 항상 false, free 항상 true, normState 경유로 변조 F 방어. ✅
- **`unlock`** (109–115): 멱등(이미 있으면 그대로), 미상 id 무시, free 보존. ✅
- **`equip`** (120–130): kind∉{tapFx,nameColor} 거부(badge 거부 포함), 미상/kind불일치/미해금 거부, 입력 맵 `clone`으로 불변성 유지. ✅
- **`refCode`/`parseRef` 라운드트립**(170–189): `parseRef("?ref="+refCode(s))===refCode(s)` 확인. URL 중간 추출·소문자→대문자·`decodeURIComponent` try/catch·비영숫자 제거(주입 방어 `<script>alert(1)` → `SCRIPTALERT1`)·12자 캡. garbage(`undefined`/`{}`/숫자) → `""` 또는 안전 코드. ✅
- **카탈로그 상수만 반환**: `equippedNameColor`→`"#ffd76a"`, `equippedFxColors`→`["#ffd76a","#ffb33a","#ffffff"]`, `badgeOf`→`"💎"`. 추가로 **반환 배열은 `.slice()` 복사** — `equippedFxColors` 결과를 변조해도 `CATALOG`의 원본 colors 불변 확인(카탈로그 오염 방지). ✅

## 2. 공정성 — 게임 수치 byte-identical (✅)

`onTap` diff(index.html:482–490)는 **fx 인자만** 교체. 게임 수학 라인은 전부 불변:
- `B.streak`/`comboMult`/`B.tapsF`/`B.presses`/`B.push`/`B.mean`/`milestone` 모두 diff 미변경.
- 유일 변경: `fxSpark`/`fxRing`에 넘기는 **색 배열**을 `GCCos.equippedFxColors(F, <기존 하드코딩 팔레트>)`로 교체 + style==='star'면 장식용 `fxEmoji('✨')` 추가. fallback 팔레트는 기존과 동일.
- `frame()`(502–533)·`comboMult`(203)·`contrib=Math.floor(B.tapsF)`(593) **diff에 등장조차 안 함** → 미변경. 경계 #3(물리 불변) 준수. ✅

## 3. 잠긴 항목 안전 — 변조 localStorage 차단 (✅)

- **로드 정규화**(index.html:233): `var F=load()` 직후 IIFE가 `F.unlocked/F.cosmetics`를 `GCCos.normState`로 재조립하고 `F.badgeId`를 `isUnlocked` 통과 시에만 유지 — 손편집된 잠긴 id는 로드 즉시 소독.
- **읽기 시점 방어**: 모든 라이브 리더(`equippedFxColors/Style`, `equippedNameColor`, `badgeOf`, `isUnlocked`)가 내부에서 `normState`/`isUnlocked` 재호출 → persist가 raw 저장이어도 사용 시점에 재차 거부.
- **배지 제출 게이트**: `effectiveBadge()`(266) = `GCCos.badgeOf(F,F.badgeId) || F.badge`. 잠긴/변조 `F.badgeId`는 `badgeOf`가 `""` 반환 → 무료 `F.badge`로 폴백(이건 다시 `sanitizeBadge` 통과). **잠긴 프리미엄 배지는 절대 제출 불가**.
- **장착 경로 무우회**: 해금=`cosDoUnlock`→`GCCos.unlock`, 장착=`cosToggleEquip`→tapFx/nameColor는 `GCCos.equip`, badge는 `GCCos.isUnlocked` 가드(`else if(GCCos.isUnlocked(F,id)){F.badgeId=id}`). `F.unlocked`/`F.cosmetics`/`F.badgeId`에 리듀서 우회 직접쓰기 없음. ✅

테스트 `normState — None/변조`(test:67–86), `equip — …badge 거부`(117–138), `equippedFxColors — 잠긴 항목 절대 적용 안 됨`(140–154)이 동일 경로 커버.

## 4. i18n 완전성 (✅)

- Phase 3 추가 키 **22개**(`lockerBtn…badgeCleared`)가 **ko·en 양쪽 모두** 존재(키별 grep=2). (프롬프트 "23키"는 값 문자열 `"✅ Equipped"`의 `Equipped:` 토큰이 1개 더 잡힌 것 — 실제 기능 키는 22, **패리티 완전**.)
- **en 값에 raw 한글 0건**(python Hangul 스캔, 주석 제외 13개 추가행 검사). 모든 en 문자열 영문화.
- `{name}`/`{code}`/`{b}`/`{n}` 보간 토큰 ko↔en 일치. `langToggle`(ko="EN", en="한국어") 무변경.

## 5. Phase 1/2 무손상 (✅)

- i18n 기존 키·`langToggle`·toggle 로직 미변경. 나라대전 집계(`GCNet.submit`)는 payload `{badge,comment}` 형태 유지 — `badge`만 `effectiveBadge()`로 교체(기존 제출 경로·필드 재사용, 신규 Firestore 필드/규칙 0, FIREBASE.md로 명시). badge 제출은 여전히 `sanitizeBadge`(≤16) 경유. KR 닉/배지/멘트 충실도 유지.
- `myNameColorStyle()`는 **본인 행에만**(결과카드 687, 리더보드 `r.me` 가드 750) 적용 + **Firestore 미제출**(로컬 전용) — 타 사용자 미노출. sw.js v4→v5 + `gc-cosmetics.js` 캐시 추가(정상).

## 6. 구조/재사용 (✅, Nit 1)

- UMD 래퍼로 브라우저(`window.GCCos`)/Node(test) 양립, throw 금지 순수 설계 — gc-util.js와 동일 패턴(D2 일관). `.ad-ov` 모달·`.chip-soft`/`.btn` 스타일 재사용. 사용자영향 값 전부 `esc()`.
- **badge에 free 기본 부재 + `defaultIdFor("badge")===""`**: index.html에서 badge는 `equip()`/`defaultIdFor()`를 **거치지 않고** `F.badgeId` 경로만 사용(cosToggleEquip badge 분기) → `""` 폴백이 실제로 도달하지 않음. **버그 아님, 의도된 설계**. (방어적으로 무해.)

---

## Findings

### Nit — 죽은 i18n 키 `equipOff` (`i18n.js:95`(ko), `:180`(en))
추가됐으나 코드 어디서도 `t('equipOff')` 미참조(해제 UI는 `equipped` 토글 + `unequippedToast`/`badgeCleared` 사용). 기능 영향 없음.
**Fix**: ko/en 양쪽 `equipOff` 키 삭제(또는 해제 버튼 라벨로 실제 사용). CLAUDE.md §8-1 "죽은 키 제거"(Phase 2에서 `worldGlobal` 제거한 선례)와 일관성 차원의 정리.

### 확인된 정상 (지적 아님)
- `parseRef("?ref=")` → `"REF"`(빈 ref값일 때 입력 전체를 코드로 간주): 테스트가 명시(197–198), **해금 판정에 ref 미사용**이라 무해 — 설계대로.
- persist()가 raw 저장(재검증 안 함): 로드·읽기 시점 normState 재검증으로 방어. 의도된 "불신 #1" 다층 방어, 누수 아님.

---

## 권고
- **머지 가능.** Nit(`equipOff`)는 후속 정리로 충분. 차단 사유 없음.
