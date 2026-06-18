# Security Review — 광클대전 디자인/perf 폴리시 (commit `04f867c`)

**결론: PASS — 보안 회귀 없음. Blocker 0 / Warning 0 / Nit 1.** 변경은 CSS + i18n 문자열 *값* + 캔버스 스프라이트 캐시뿐이며, 새 신뢰불가 데이터 경로·네트워크·시크릿·eval·클릭재킹 표면이 추가되지 않음.

대상: `static-apps/gwangclick/{index.html, i18n.js}`, `docs/gwangclick-global-plan.md`.
검증: `node --test 'tests/*.test.mjs'` → **56/56 pass**.

---

## 1. innerHTML 싱크 + i18n HTML 문자열 (회귀 없음)
- 변경된 키(`tapHint`/`verdictLose`/`rewardBtn`/`lockerIntro`/`boardEmpty` 등)는 모두 **개발자 상수**이며 `app.innerHTML`로 렌더됨(`index.html:521,740,757,1003` 등). 값에 사용자 데이터가 끼어드는 자리표시자 없음.
  - `verdict.t`(`index.html:740`)·`rewardBtn`(`index.html:757`)은 placeholder 없는 순수 상수 → raw 렌더 안전.
  - `boardEmpty`는 `box.textContent`로 렌더(`index.html:848`) → 애초에 escape됨.
- **새 문자열이 도입한 마크업은 의도된 `<b>`/`<br>`뿐.** `i18n.js` 전체에서 그 외 태그 0건(`grep` 확인). `<img onerror=…>`류·이벤트 핸들러·`<svg>` 등 신규 주입 없음.
- 사용자 입력 경로(닉네임/코멘트/배지: `index.html:789-794`)는 기존대로 `esc(...)`로 감싸짐 — **이번 커밋이 건드리지 않음**(diff 외). 신뢰불가 데이터가 새 i18n 문자열 옆에서 unescaped로 합류하는 신규 경로 없음.

## 2. 스프라이트 캐시 / FX (신뢰불가 경로 없음)
- `emojiSprite`/`drawEmojiSprite`(`index.html:378-405`)는 **개발자 상수 이모지**만 오프스크린 캔버스에 `fillText`로 굽고 `drawImage`로 재사용. 입력은 코드 내 상수 emoji 배열 + 숫자(size/dpr/rot)뿐 → canvas→DOM 역류 없음, 외부 입력 0.
- `eval`/`new Function`/문자열 코드 실행 **없음**(diff grep 확인). `deviceTier`는 `navigator.*` 읽기 + `clamp(0,1)`만 수행(계약적 clamp 준수).

## 3. 신규 네트워크/시크릿 없음
- diff에 `fetch`/외부 URL/CDN/`<script src>`/`integrity`/googleapis/fontsource **0건**.
- 폰트: 시스템/`Pretendard`(로컬·CSS 변수화)만 사용 — 외부 폰트 로드 추가 없음.
- 노이즈 텍스처는 인라인 `data:image/svg+xml`(`index.html:248`) — 로컬 데이터 URI, 네트워크/사용자입력 무관.
- `fb-config.js`는 코드에서 미수정(문자열 안내문에서 *언급*만). 시크릿 노출 없음.

## 4. 장식 레이어 / 클릭재킹
- `body::after`(아케이드 그리드 `index.html:241`): `pointer-events:none; z-index:-1` — 콘텐츠 뒤, 비인터랙티브.
- `body::before`(필름 노이즈 `index.html:247`): `pointer-events:none; z-index:60` — 위에 있으나 입력 캡처 불가.
- `#fb-sky`(축포 `index.html:174`): `pointer-events:none; z-index:62`(기존, 불변) — 입력 가로채기 없음.
- 신규 입체 버튼/카드 그림자는 시각효과(box-shadow/transform)뿐, 투명 오버레이로 클릭을 흡수하는 레이어 없음.

---

## Nit
- **Nit `index.html:248`** — 필름 노이즈 SVG `data:` URI는 안전하나, 인라인 `data:` 자산이 늘면 향후 CSP `style-src`/`img-src` 도입 시 `data:` 허용이 필요해짐(현재 CSP 미설정이라 무영향). 정보성.

## 경계 확인 (작업 5원칙 #1·#3)
- 게임 로직(`onTap`/`comboMult`/`DURATION`/`dailyBias`)·escape 헬퍼(`esc`)·`fb-config.js`는 diff에 없음 → 변경 반경이 FX층 + 스타일 + i18n 값으로 수렴 확인.
- 신뢰불가 입력의 4종 경계(정상/매핑/None/변조) 테스트는 기존 스위트에 유지되어 56/56 통과.
