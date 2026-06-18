# Phase 3 보안 검수 — 광클대전 꾸미기 수익화 (commit `3b41587`)

**결론: PASS — Blocker 0 / Warning 0 / Nit 1. 플래그된 이름색 주입 경로는 안전(SAFE)으로 확정.** `equippedNameColor()`는 카탈로그 상수 hex(`#ffd76a`/`#12b39a`)나 `""`만 반환하며, 변조된 `F.cosmetics.nameColor`의 원시값은 `style="..."` 속성에 절대 도달하지 못한다. 모든 사용자 영향 DOM 삽입에 `esc()` 적용, 장착·해금은 화이트리스트, Firestore 신규 제출 없음, 비밀값·신규 네트워크 없음.

---

## 우선순위 1 — 이름색을 통한 CSS/속성 주입 (검수자 플래그) → **SAFE (확정)**

`index.html:262` `myNameColorStyle()`는 `' style="color:'+c+'"'`를 `esc()` 없이 조립하지만, `c = GCCos.equippedNameColor(F)`의 출력은 **카탈로그에 의해 완전히 제약**된다. 데이터 흐름 추적:

1. `equippedNameColor(F)` (gc-cosmetics.js:145-148) = `itemById( normState(F).equipped.nameColor )` 의 `.color`.
2. `normState().equipped.nameColor` = `pickEquipped(rawC.nameColor, "nameColor", set)` (gc-cosmetics.js:91-95). 이 함수는 **(알려진 id + kind 일치 + 해금됨)인 경우에만 그 id를, 아니면 `defaultIdFor("nameColor")`** 를 반환 → 두 경우 모두 **카탈로그 상수 id**. 변조된 임의 문자열은 `itemById`에서 걸러져 절대 통과 못 함.
3. 이어 `itemById(...).color`를 `typeof it.color === "string"`일 때만 반환, 아니면 `""`. → 출력은 **`""` 또는 카탈로그 항목의 `color` 리터럴**뿐.
4. 카탈로그의 `nameColor.color` 전수: `nm_default=null`, `nm_gold="#ffd76a"`, `nm_mint="#12b39a"` (모두 안전한 hex; `null`은 `""`로 귀결).

**원시 `F` 값은 결코 속성에 도달하지 않는다.** 변조 PoC로 확인(실행): `F.cosmetics.nameColor`에 `"#fff\" onload=alert(1) x=\""`, `"red;}body{display:none"`, `"#000\"><img src=x onerror=alert(1)>"`, `"</style><script>…"`, `"javascript:alert(1)"` 주입 시 `equippedNameColor()` 반환은 **전부 `""`**. 정상 장착(`nm_gold` 해금+장착) 시에만 `"#ffd76a"`.

따라서 Locker 미리보기(gc-cosmetics.js → index.html:864)가 `esc(it.color)`를 쓰는 것과 `myNameColorStyle`이 `esc` 없이 카탈로그 상수를 쓰는 것의 **차이는 위험이 아니다**: 미리보기의 `it.color`는 동일 카탈로그 상수이므로 `esc()`는 사실상 no-op(방어적 잉여)이고, `myNameColorStyle`의 `c`도 동일 출처라 주입 불가.

- **Nit — `index.html:262`**: 정확성엔 문제없으나, "신뢰는 하되 검증한다(불신 #1)" 일관성과 미래 카탈로그 편집 시 회귀 방지를 위해 `'color:'+esc(c)` 또는 hex 정규식 화이트리스트(`/^#[0-9a-f]{3,8}$/i`) 가드를 권장. **현재 입력 집합에선 동작 동일** → Blocker 아님. (concrete fix: `return c?' style="color:'+esc(c)+'"':'';`)

---

## 우선순위 2 — 변조된 F 상태(잠긴 코스메틱 적용 / 마크업 주입) → **SAFE**

- **잠긴 항목 적용 차단**: `normState`/`pickEquipped`/`equip`/`isUnlocked` 모두 `isKnownId` + 해금셋 검증 후에만 통과, 아니면 free 기본 폴백. `index.html:236`에서 부팅 시 `F`를 `normState`로 **항상 재조립**하고 `F.badgeId`도 `isUnlocked` 통과 못 하면 `''`로 강등. 테스트로 4종 경계(미상 id·이중해금·변조 F·잠긴 장착) 커버.
- **Locker 렌더 esc 전수 확인** (index.html:856-867):
  - `it.id` → `esc(it.id)` (data-id, 868·870·872행 류) ✅
  - `it.color` → `esc(it.color)` (tapFx 점 background:`esc(c)`, nameColor 미리보기 `esc(it.color)`) ✅
  - `it.badge` → `esc(it.badge||'')` ✅
  - `cosLabel(it)` → `esc(cosLabel(it))` ✅ (라벨은 카탈로그 상수이나 esc 적용)
  - 단, 이들 값은 전부 **개발자 카탈로그 상수**(사용자 입력 아님). 사용자 영향 값은 `F`의 *선택*(어떤 카탈로그 id를 골랐나)뿐이며, 그 선택은 화이트리스트를 거친다.
- **장착 토글**(`cosToggleEquip`, index.html:931-): tapFx/nameColor는 `GCCos.equip`(미해금/미상/kind불일치 자동 무시), badge는 `GCCos.isUnlocked` 확인 후에만 `F.badgeId=id`. 잠긴/위조 id는 무시.

---

## 우선순위 3 — 프리미엄 배지 → Firestore → **SAFE**

- 제출 경로는 **기존 `badge` 필드 그대로 재사용**. `endBattle`(index.html:607)이 `effectiveBadge()`를 넘김 → `effectiveBadge()`=`GCCos.badgeOf(F,F.badgeId) || F.badge` (index.html:271).
- `badgeOf`(gc-cosmetics.js:160-165)는 **(카탈로그 badge 항목 + 해금됨)일 때만 그 항목의 이모지**, 아니면 `""`. 자유입력 불가. PoC 확인: 잠긴 `bd_diamond`→`""`, 위조 id `"</b><script>"`→`""`, 해금 `bd_diamond`→`"💎"`.
- 그 후에도 `net.js:129` `sanBadge(opts.badge)` → `GCUtil.sanitizeBadge`(제어문자 제거·코드포인트 캡·ZWJ strip)를 **여전히 통과**. 렌더는 `esc(effectiveBadge())`(결과 index.html:687) 및 리더보드 `esc`된 badge(749행). 
- **규칙 `badge.size() <= 16` 충족**: 카탈로그 배지 3종 전수 측정 — `🌟`(cp1/utf16=2), `💎`(cp1/utf16=2), `☄️`(cp2/utf16=2). 모두 한참 여유. 신규 필드/규칙/색인 없음(FIREBASE.md 주석만 보강).

---

## 우선순위 4 — 레퍼럴 `?ref=` → **SAFE**

- `parseRef`(gc-cosmetics.js:181-189): 문자열 가드 → 쿼리 추출 → `decodeURIComponent`(try/catch) → **`[^A-Za-z0-9]` 전부 제거** → 대문자 → 12자 캡. PoC: `?ref=<script>`→`"SCRIPT"`, `?ref=ab cd`→`"AB"`. 마크업 주입 불가.
- **서버 신뢰 없음**: `index.html:235`는 들어온 ref를 `F.refFrom`에 **저장만** 하고 `persist()`. 코드 전체에서 `refFrom`은 다시 읽히지 않음(해금 판정·제출·Firestore 어디에도 미사용). 초대 해금(`cosTryUnlock`→`cosInviteShare`)은 **사용자 자신의 공유 행동**으로만 발생하며 incoming ref와 무관. → 백엔드 해금 부여 경로 없음(비용 0·악용 불가).
- 공유 링크 생성 시 `encodeURIComponent(code)`로 코드 삽입(index.html:923-) — code는 영숫자 6자라 인코딩도 무해.

---

## 우선순위 5 — 비밀값 / PII / 네트워크 → **SAFE**

- `fb-config.js` **diff에 없음**(미변경). 비밀값/키/`.env` 신규 없음.
- `gc-cosmetics.js`에 `fetch`/XHR/WebSocket/sendBeacon **없음**(순수 함수 모듈).
- index.html 신규 네트워크 표면은 `navigator.share`/`navigator.clipboard.writeText`뿐(초대 링크 공유) — 서버 송신 아님, ref는 사용자가 직접 공유. 외부 광고망 직삽 없음(토스 §6 준수: 옵트인 `adRewarded`만).
- `sw.js` v4→v5, ASSETS에 `gc-cosmetics.js` 추가(정상 캐시 버전업).

---

## 확인된 안전 경로 요약 (명시)
- ✅ 이름색 인라인 스타일: 카탈로그 상수 hex만 출력, 변조 F 원시값 도달 불가.
- ✅ 모든 Locker/리더보드 사용자영향 DOM 삽입에 `esc()`.
- ✅ 장착/해금: `isKnownId`+해금셋 화이트리스트, 잠긴/위조 항목 무시.
- ✅ 프리미엄 배지: `badgeOf` 화이트리스트 → 기존 `sanitizeBadge` → 규칙16 충족, 신규 필드/규칙 0.
- ✅ `?ref=`: 영숫자만 정규화, 표시/저장 전용, 서버 해금 부여 없음.
- ✅ 비밀값/신규 네트워크/외부 광고망 없음.

## 권고 (비차단)
1. **Nit** `index.html:262` `myNameColorStyle()` — 방어적으로 `esc(c)` 또는 hex 화이트리스트 가드 추가(회귀 예방용; 현 동작은 안전).
