# Critique-Agent 보고서 — Round 2 (디자인 적대 검토)

**한 줄 결론:** "소프트 iOS 문방구" 재설계는 블랙리스트 항목을 코드 레벨에서 거의 0으로 청소했고 마스코트·세그먼티드·클레이·블러까지 실제로 깔렸다 — 그러나 **악센트 `#5b6cf0`가 정확히 "제네릭 블루/AI 기본색"으로 읽히는 핵심 리스크가 그대로 남았고, 그 위 흰 텍스트가 WCAG AA에 미달**한다. → **AI 냄새 잔존 판정: 부분 제거(색상 한 축이 발목).**

**Blocker: 3 / Warning: 7**

---

## 종합 판정: AI 냄새 잔존 = **부분(Partial)**

블랙리스트(`idea-design-direction.md` 7장)는 코드로 검증한 결과 **구조·타이포·형태 축은 실질 0**:
- `border-radius: 2px` → 소스에 0건. 전부 `--r-*` 토큰.
- 올캡스+트래킹 라벨(`text-transform:uppercase`) → 0건. groupHead/슬라이더 라벨 모두 일반 케이스.
- 세리프 본문 → 0건. Noto Sans KR + Quicksand로 교체.
- `<br>` 시(詩) 헤드라인 → 제거(`page.tsx:48-50` 단일 줄).
- 01/02/03 균등 스텝 → 단일 howCard로 대체(`page.tsx:85-101`).
- 전면 1px 보더 구획 → 그림자/색지 면 분리로 전환. `1px solid` 0건.
- 보라/네온 그라데이션 → 0건(유일한 `linear-gradient`는 Slider 트랙 채움 = 정당).
- 이모지 기능 불릿 → 0건.
- 평면 무반응 버튼 → `:active scale`, hover depth 전부 적용.

**그런데 단 하나, 가장 마스터가 민감한 "색"이 미해결.** 아래 Blocker 1 참조. 디렉션 문서 스스로 `#5b6cf0`를 "살짝 보라 섞인 블루"라 정당화했지만, 마스터의 시드 관찰("페리윙클/블루-바이올렛, AI 기본색 같다")이 맞다. 구조를 아무리 청소해도 첫인상 색이 "그 보라끼 도는 인디고"면 AI 냄새 인상은 살아남는다. clean 우세 안(B)은 악센트가 화면의 유일한 유채색 포인트라 색 선택의 가중치가 절대적인데, 하필 그 한 점이 클리셰 색이다.

---

## Blocker (출시 전 반드시)

### B1. 악센트 `#5b6cf0` = 제네릭 블루-바이올렛, AI 냄새의 최후 잔존
- **위치:** `apps/font/frontend/app/globals.css:24`, `home/app/globals.css:16`, 그리고 파생 `--accent-press:#4a59d6`, `--accent-weak`, `layout.tsx:39`의 favicon `%235b6cf0`.
- **문제:** 디렉션 문서가 "제네릭 블루 회피"라 적어놓고도 실제 값은 인디고/페리윙클(#5b6cf0)로, Tailwind `indigo-500`(#6366f1)·Stripe·수많은 SaaS 템플릿과 사실상 동일 계열. 마스터가 과거 거부한 바로 그 "보라끼 도는 블루". 구조 청소가 무색해진다.
- **수정안(구체 HEX, 하나 선택):**
  - 따뜻한 코랄/탠저린 계열 — `--accent:#f2613f`(테라코타 코랄, press `#d94e2e`). 문방구·붓 정서와 직결, 캔디-코랄과 톤 충돌하면 캔디는 라벤더/민트 위주로 재배치.
  - 톤다운 청록 — `--accent:#1f9e8f`(딥 틸, press `#178577`). 잉크+청록 = 문방구 만년필 잉크 느낌, 흔치 않음.
  - 한국 단청/오방색 — `--accent:#d6452b`(단청 주칠 적색, press `#b8371f`) 또는 쪽빛 `--accent:#2d5fa0`(제네릭 블루보다 채도 낮고 한국적).
  - **권장: 테라코타 코랄 또는 딥 틸.** 둘 다 "AI 기본 인디고"에서 명확히 이탈하면서 cute(코랄)·clean(틸) 어느 쪽이든 정합.
- 변경 시 favicon HEX, `--accent-weak` rgba 3채널, 마스코트 몸체(자동), 캔디-코랄 충돌 여부를 같이 점검할 것.

### B2. 악센트 위 흰 텍스트 WCAG AA 미달 (대비 4.33:1 < 4.5)
- **위치:** `Button.module.css:36-39`(solid)·`53-57`(clay), `landing.module.css:2-3`(headerCta), `Chip.module.css:27-28`(selected), `Segmented`/preview `.live` 등 흰 글자 on `--accent`.
- **측정:** 흰(#fff) on `#5b6cf0` = **4.33:1** → 일반 텍스트 AA(4.5) 미달. 버튼 라벨이 14px(`--text-sm`)·600이라 "대형 텍스트" 예외(3:1)에도 애매(대형=18.66px bold↑). 즉 핵심 CTA 글자가 규정 미달.
- **수정안:** B1에서 악센트를 더 어두운 색으로 교체하면 자동 해결(틸 #1f9e8f=흰 대비 ~3.1로 더 나쁨 주의 → 틸 택하면 `#15786c`급으로 더 어둡게; 코랄 #d94e2e=흰 대비 ~4.7 OK). **악센트 후보 확정 시 흰 텍스트 4.5:1을 통과하는 명도까지 낮출 것**을 필수 제약으로.

### B3. `--accent` 텍스트 on `--accent-weak` 칩 배경 대비 3.63:1 — 광범위 사용처에서 AA 미달
- **위치:** 슬라이더 값 칩(`Slider.module.css:21-29`), 히어로 eyebrow(`landing.module.css:36-47`), Card tag(`Card.module.css:19-28`), 시드 버튼(`ParameterPanel.module.css:33-34`), preview `.live`(`FontPreview.module.css:32-35`), soft 버튼.
- **측정:** `#5b6cf0` 텍스트 on (accent-weak 0.14 over white ≈ #e8eafc) = **3.63:1** → 작은 텍스트(12~14px) AA 미달. 슬라이더 "값", Card "폰트" 태그 등 정보성 텍스트가 다수.
- **수정안:** 칩 내부 텍스트를 `--accent-press`(더 진한 톤)로 쓰거나, `--accent-weak` 불투명도를 낮춰 배경을 더 밝게 하면서 텍스트는 press 톤으로. B1 색 교체와 함께 재측정 필수.

---

## Warning (개선 권고)

### W1. 홈이 여전히 휑함 — 카드 2개 + 짧은 히어로, 견본·소개·마스코트 활용 부족
- **위치:** `home/app/page.tsx:50-86`, `home.module.css`.
- 히어로(중앙 아닌 좌측 정렬 단일 컬럼) 아래 곧장 2열 카드 그리드 하나로 끝. 그나마 한 카드는 "준비 중" 더미라 실질 콘텐츠 1개. 폰트앱 본질(글자 견본)을 홈에서 한 번도 안 보여줌.
- **수정안:** ① `apps/font`의 `band`(견본 띠) 같은 미니 스페시먼 섹션을 홈에도 1개 추가("이런 걸 만들 수 있어요" + 큰 Aa/가나다). ② 더미 "준비 중" 카드 대신 마스코트 표정 6종을 보여주는 작은 소개 띠 or "획이가 도와줘요" 섹션. ③ 푸터 위 공백을 색지(`--surface-2`) 소개 섹션으로 메워 밀도 보강.

### W2. 홈 히어로 = 중앙(좌측)정렬 단일 컬럼 + 마스코트 = AI 클리셰 변종 위험
- **위치:** `home.module.css:1-21` (`.hero{max-width:44rem}` 좌측 단일 컬럼, 마스코트 위 단독 배치).
- 마스코트가 차별점을 주긴 하나, "아이콘/마스코트 → 큰 제목 → 1줄 리드" 수직 스택은 그 자체로 흔한 랜딩 골격. 폰트앱 랜딩(`page.tsx`)은 2열(텍스트+스페시먼)로 잘 비틀었는데 홈만 밋밋.
- **수정안:** 홈 히어로도 우측에 살아있는 견본 카드(또는 마스코트가 글자를 안은 일러스트 구도)를 넣어 비대칭 2열로. 단일 컬럼 유지하려면 마스코트를 더 크게+말풍선으로 캐릭터성 강화.

### W3. Segmented 인디케이터 위치 계산이 옵션 수에 따라 어긋남
- **위치:** `packages/ui/src/Segmented.tsx:41-47`.
- thumb `width:(100% - 8px)/n`, `transform:translateX(idx*100%)`. translateX 100%는 "thumb 자기 폭"의 100%라 트랙 padding(4px)과 seg 실폭의 차이로, 옵션 3개↑에서 누적 오차가 생긴다(현재는 2개뿐이라 육안상 거의 안 보이지만 잠재 버그). gap:0 전제에만 의존.
- **수정안:** `transform: translateX(calc(${idx} * (100% + 8px / ${options.length})))` 식으로 padding 보정하거나, thumb를 flex item index에 맞춰 `left` 계산. 지금은 2-옵션만 쓰여 회귀는 아님 → Warning.

### W4. 마스코트 표정 path가 작은 좌표에서 깨질 여지 (특히 love 하트눈)
- **위치:** `packages/ui/src/Mascot.tsx:72-75`(하트눈 path), `38-47`(surprised 동공).
- 64 viewBox에 하트 두 개를 2px 단위로 그려 size=22~36(헤더/honesty/eyebrow)에서 하트가 뭉개져 점처럼 보일 수 있음. happy/sleepy는 단순해 안전.
- **수정안:** 작은 사이즈(≤36)에선 happy/still만 쓰도록 가이드(이미 헤더·eyebrow·honesty는 happy라 OK). love/surprised는 88px 견본 빈상태에서만 사용 중이라 실사용은 안전 — 다만 향후 남용 방지 주석 권장. 배치/과함은 적절(기능 불릿엔 미사용, 빈/로딩/완성에만). **마스코트 완성도는 양호.**

### W5. 모바일에서 honesty 라벨이 pill 안 2줄로 깨질 수 있음
- **위치:** `FontStudio.module.css:99-110` `.honesty{border-radius:var(--r-pill)}` + 긴 한국어 2~3줄 문장.
- pill 라운드(999px)는 1줄 짧은 칩 전제인데 내용이 길어 모바일에서 2줄이 되면 양 끝만 둥근 캡슐이 어색해진다.
- **수정안:** `.honesty`를 `--r-lg`로 바꾸고 좌측 마스코트 정렬 `align-items:flex-start`.

### W6. InteractiveSpecimen은 시스템 폰트 skew 흉내 — 첫인상 견본의 진정성 약화
- **위치:** `components/InteractiveSpecimen.tsx:34-37`(transform skewX, fontWeight).
- 히어로 주인공이 "실제 생성 폰트가 아닌 시스템 글꼴 흉내"라 aria-label에 정직히 적어둔 건 좋으나, 슬랜트를 `skewX`로만 줘서 글자가 기계적으로 기운다(진짜 oblique 아님). cute/손맛과는 거리.
- **수정안:** 회귀는 아님. 여유되면 히어로에도 실엔진 1회 호출로 진짜 견본을 보이거나, skew 대신 `font-style:italic` 가능 글꼴 사용.

### W7. 다크모드 토큰 미구현 (디렉션 3-2에 정의됐으나 누락)
- **위치:** `globals.css` 양쪽 — `[data-theme="dark"]`/`prefers-color-scheme` 블록 없음.
- `--material-bg`가 라이트 고정(rgba 246,245,242)이라 OS 다크 사용자에겐 블러 헤더가 흰 띠로 뜬다. iOS 트렌드 충실도에서 감점.
- **수정안:** 디렉션 3-2 다크 토큰을 추가하거나, 명시적으로 "라이트 온리" 결정을 문서화.

---

## 항목별 점검 결과 요약

**1. 잔존 AI/템플릿 냄새:** 구조·타이포·형태 축 블랙리스트 = 코드상 0건 확인(우수). **단 악센트 색(B1)만 클리셰 잔존.** 새 클리셰는 없음 — 카드 반복은 홈 2개뿐(균일 반복이라 보기 어려움), 그림자/모션/마스코트로 평면성 해소됨.

**2. iOS 트렌드 + cute/clean:** 세그먼티드(흰 알약 슬라이드)·소프트섀도(shadow-sm/md/lg)·클레이(thumb·CTA)·블러 머티리얼 헤더·스프링(`--ease-spring`, scale 누름)·연속곡률(r-md~xl)·44px 터치타깃 전부 실재. reduced-motion도 존중. **clean 우세 정서는 확실히 삼. cute는 마스코트로 분리 주입 성공.** 어중간하지 않음. (단 다크 미구현 W7로 iOS 충실도 일부 감점.)

**3. 마스코트 "획이":** 배치 절제(빈/로딩/완성/헤더/honesty만, 기능 불릿 미사용), 표정 path 경량 교체 구조, idle float + reduced-motion 처리 모두 양호. 소형 사이즈 하트눈 가독만 경미(W4). **완성도 양호, 과하지 않음.**

**4. 기능 회귀(코드 확인) — 회귀 없음:**
- 한글 모드 LATIN_ONLY 숨김: `ParameterPanel.tsx:54` `script==="hangul" && latinOnly.has(key)` → null. 정상.
- 프리셋 칩 적용: `FontStudio.tsx:135-137` applyPreset spread, `activePreset` 매칭으로 selected 표시. 정상.
- 괴상함+시드(주사위): `ParameterPanel.tsx:83-107` 시드 버튼 + `randomizeSeed`(`FontStudio.tsx:140-144`). 정상.
- 다운로드(WOFF/TTF): Segmented format → `handleDownload`가 선택 포맷 별도 요청 → blob 저장, 파일명 `hwoek-{script}-{hash}.{ext}`. 정상.
- BFF script/신규 params 전달: `route.ts:88-93` clampParams + normalizeScript/Format 그대로 엔진 포워딩. params 전체(weirdness/seed/letterSpacing 등) clampParams로 통과. 정상.
- basePath 링크: `lib/paths.ts` apiPath가 fetch에 BASE prefix, SiteChrome 홈링크는 의도적으로 `<a href="/">`(basePath 우회) 주석 명시. 정상.

**5. 접근성/반응형:**
- **대비 미달 3건(B2/B3 + ink-faint)** — 가장 큰 약점. `--ink-faint #76737f` on `--surface-2`(#f0eef0) = **4.02:1**로 groupHead·preview tab·note·footer 캡션이 AA 경계 미달. surface(#fff) 위 4.64로 OK지만 surface-2 위가 다수.
- 반응형: 스튜디오 2열→1열(`@900px`), 히어로 2열→1열(`@920px`), 홈 그리드(`@720px`), howCard(`@620px`) 모두 처리. sticky preview도 모바일 static 전환. 양호.
- 포커스: 모든 인터랙티브에 `:focus-visible` 링(accent-weak). 양호.
- 터치: 버튼 44px, seg 36px(권장 44 미달 경미), chip 36px. 칩/세그 높이는 iOS 권장보다 약간 작음.

---

## 필수 수정 TOP 5
1. **B1 — 악센트 `#5b6cf0` 교체** (테라코타 코랄 `#d94e2e`급 or 딥 틸/단청 적색). AI 냄새 최종 제거의 핵심.
2. **B2/B3 — 악센트 대비 AA 통과**: 새 악센트는 흰 텍스트 ≥4.5:1, 칩 내 악센트 텍스트도 ≥4.5:1 되도록 명도 확정.
3. **ink-faint 대비**: `--ink-faint`를 `surface-2` 위에서도 4.5:1 넘게 약간 진하게(예 `#6b6875` 이하).
4. **W1 — 홈 콘텐츠 보강**: 미니 견본 섹션 + 더미 카드 대체로 휑함 해소.
5. **W7 — 다크모드 토큰 추가**(또는 라이트-온리 명시) — 블러 헤더 깨짐 방지 + iOS 정합.
