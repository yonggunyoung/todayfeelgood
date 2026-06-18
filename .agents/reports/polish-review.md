# Review — 광클대전 디자인+성능 폴리시 (commit `04f867c`)

> **결론: 합격(APPROVE).** CSS 스태킹·성능 캐시·게임 수치 불변·i18n 패리티 모두 정상. Blocker 0 / Warning 1 / Nit 3. 테스트 56/56 통과.

검수 범위: `git diff HEAD~1 HEAD` (index.html, i18n.js, docs). READ-ONLY — 소스 미수정.

---

## 0. 테스트
- `node --test 'tests/*.test.mjs'` (cwd=`static-apps/gwangclick`) → **56 pass / 0 fail.** (지시서의 `tests/*.test.mjs`는 레포 루트가 아니라 `static-apps/gwangclick/tests/`에 존재 — 경로만 유의, 결과는 기대치 56/56 일치.)

## 1. CSS 정합성 / 레이아웃 (이상 없음)
z-index 스택(아래→위)을 전수 확인:

| 레이어 | z-index | pointer-events | 비고 |
|---|---|---|---|
| `body::after` 아케이드 그리드 | **-1** | none | 콘텐츠 뒤. 인터랙션 차단 없음 ✓ |
| body 배경 그라데이션 | 0(배경) | — | corner glow 2점, `background-attachment:fixed` ✓ |
| `#app` 콘텐츠/`.tap`(z1)/뱃지(z2) | 1~2 | auto | TAP 버튼 클릭 가능 ✓ |
| `#fb-fx`(z3)·`.fb-pops`(z4) | 3~4 | none | 데코, 차단 없음 ✓ |
| `body::before` 필름노이즈 | **60** | none | overlay·opacity .055. 차단 없음 ✓ |
| `#fb-sky` 축포 | 62 | none | 노이즈 위, 토스트/모달 아래 ✓ |
| `#toast` | 70 | none | 노이즈/축포 위 ✓ |
| `.ad-ov` 모달(랭킹·설정·꾸미기·**globe**) | 90 | auto | 최상위. 노이즈(60)에 안 가려짐 ✓ |

- 데코 레이어(`::before`/`::after`, fb-fx, fb-pops, sky) 전부 `pointer-events:none` — TAP 버튼·globe 캔버스·모달 클릭을 막지 않음. **검수 항목 통과.**
- globe 캔버스는 `#gl-stage`(모달 z90 내부, `overflow:hidden`)에 append → 노이즈(60)보다 위, 클립 없음 ✓.
- 청키 3D 버튼: `.go button`/`.btn-primary` `:active`가 `translateY` + box-shadow 축소로 눌림 표현, `.tap:active .orb{scale(.9)}` 연출만 — 레이아웃 리플로우 없음(transform/shadow 한정) ✓.
- 워드마크 `.hdr .brand::after` 언더라인은 `position:absolute` + 부모 `position:relative` 안에서 `bottom:-3px` — 부모 박스 밖으로 3px 나가지만 헤더 패딩 내라 클리핑/겹침 없음.

## 2. 성능 수정 로직 (이상 없음)
- `emojiSprite(emoji,size,dpr)`: key=`emoji@bucket(4px)xdpr`, 오프스크린 1회 렌더 후 재사용. **null도 캐시**(`if(hit!==undefined)`)로 미지원/실패 재시도 방지 ✓.
- `drawEmojiSprite` 폴백: 스프라이트 없으면 `false` 반환 → 호출부가 기존 `fillText` 폴백. `skyLoop`·`fxStep` **양쪽 모두** 적용 ✓.
- DPR 캡 1.5: `fxInit`·`skyInit.size` 둘 다 `Math.min(1.5,…)` (이전 2 → 1.5) ✓.
- `deviceTier()`: cores/mem/coarse-pointer/width 휴리스틱, `clamp(s,0,1)`. `clamp`는 index.html:253에 전역 정의 → 사용처(라인 ~370)보다 먼저 선언, 스코프 OK ✓.
- `scaledCount(45,110)`: `prefersReducedMotion()`이면 **0 → `if(n<=0)return`**로 축포 완전 생략 ✓.
- 루프 teardown: `skyLoop` 말미 `if(SKY.list.length)…requestAnimationFrame; else{SKY.on=false;ctx.clearRect}` — 입자 소진 시 rAF 중단, dangling rAF/누수 없음 ✓. `skyConfetti`도 `if(!SKY.on){SKY.on=true;…}`로 이중 루프 방지(기존 로직 유지).

## 3. 게임플레이 = 시각 전용 (확인)
- diff에서 `onTap`/`comboMult`/`DURATION`/`tapsF`/`dailyBias`/`frame` 로직 변경 **0건**. `onTap` 매칭은 주석 1줄뿐.
- 축포는 spawn **COUNT만** 변경(고정 110 → `scaledCount(45,110)`). 입자 물리(vx/vy/g/dec/size/rot)·게임 수치 불변 ✓.

## 4. i18n 패리티 (이상 없음)
스크립트 전수 검증(STR export 사용):
- ko 136 / en 136 키, **ko-only/en-only 없음**.
- placeholder(`{…}`) 불일치 **0**. HTML 태그(`<b>`/`<br>`) 불일치 **0**.
- `verdictLose` `<br>`, `rewardBtn` `<b>` ko/en 일치 ✓. `shareText` `\n`·`{name}{q}{title}{contrib}{x2}{rank}` 6토큰 양측 보존 ✓.
- `streakDays`는 테스트 고정값 `"{n}일 연속 참전"` 그대로(톤은 `streakDaysOn`으로 분리) → i18n.test.mjs:25-28 통과 ✓.

## 5. KR 충실도 + 전 페이즈 (확인)
- ko 10대/밈 톤(졌잘싸·뻥튀기·1빠 깃발·광클 출근)·en 미러 적용, 키 구조 불변.
- 토글/나라대전(scopeNation·countryTitle…)/꾸미기(lockerIntro…)/globe(globeBtn·globeTitle… 미변경) 문자열·배선 그대로. 지연로딩·2D 폴백 로직 무변경 ✓.

---

## 지적사항
- **[Warning] i18n 키 패리티 자동 테스트 부재** — `tests/i18n.test.mjs`. 현재 패리티는 수동/스크립트로만 확인됨. 카피 리워딩이 잦은 자산이므로 `Object.keys(STR.ko)` vs `STR.en` + placeholder 동등성 테스트 1개 추가 권장(가역적·저비용, CLAUDE.md §8-5 "완료=테스트"). *수정안: i18n.test.mjs에 키집합·`{…}`토큰 동등 assert 추가.*
- **[Nit] `body::before` 노이즈 z60 < `#fb-sky` z62** — index.html:65,174. 축포가 필름노이즈 위에 그려져 노이즈 질감이 축포엔 안 입혀짐. 의도된 것으로 보이며 기능 영향 없음(시각 취향).
- **[Nit] `--display`에 `'Pretendard Variable'` 우선** — index.html:43. 외부 폰트 0(CDN 미주입) 정책상 로컬 미설치 기기는 system-ui로 폴백되므로 무해. 정책 위반 아님(번들 아님). 참고용.
- **[Nit] `.hdr .brand` 폰트 12px→16px·skew** — index.html:79. 헤더 우측 `.live`와의 baseline 정렬은 `align-items:center`로 흡수되나, 매우 좁은 화면에서 워드마크가 약간 더 차지. 레이아웃 깨짐 아님.

검수 기준 5종 + 테스트 모두 통과. 머지 가능.
