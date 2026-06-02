# Phase 2 — 디자인 방향서 (아트 디렉터)

> 마스터 피드백: 현재 종이/먹 에디토리얼 톤이 "생성형 AI 특유의 냄새"가 난다. 이를 확실히 제거하고, iOS 트렌드 × (cute/clean) × 독창적 조합으로 간다.
> 본 문서는 빌더가 `globals.css` 토큰과 `packages/ui` 컴포넌트를 바로 재작성할 수 있는 수준의 사양을 담는다. (코드 미수정 — 사양만 정의)

---

## 1. 진단 — "AI / 클로드 코드 디자인 냄새" 구체 근거

먼저 명확히 할 것: **현재 빌드는 흔한 "보라 그라데이션 다크모드 AI 템플릿"은 아니다.** 오히려 그 정반대(종이/먹 라이트, 단일 붉은 악센트)로, 의도적으로 클리셰를 피하려 한 흔적이 보인다. 그럼에도 마스터가 "AI 냄새"를 느끼는 이유는 **다른 종류의 템플릿화** 때문이다. 근거를 코드로 짚는다.

### 1-1. "에디토리얼 / 디자인 어워드 템플릿" 냄새 (현 빌드의 진짜 문제)
이건 2023~2025년 LLM이 "고급스럽게 만들어줘"라고 하면 자주 뱉는 두 번째 클리셰 군(群)이다.

- **세리프 본문 + 초대형 헤드라인 + 줄바꿈 시(詩)처럼 끊기**
  - `page.tsx:44-50` — `한 획에서 / 한 벌의 글자가 / 태어납니다` 의 강제 `<br>` 3연. `headline { font-size: clamp(2.6rem, 6vw, 4.6rem) }` (`landing.module.css:42`). 이 "거대 세리프 + 인위적 행갈이" 조합은 AI가 만든 포트폴리오/랜딩의 전형.
- **올-캡스 트래킹 키커 라벨 남발**
  - `landing.module.css:35-37` `.kicker { letter-spacing:0.18em; text-transform:uppercase }`, `FontStudio.module.css:14`, `SiteChrome.module.css:48`, `FontPreview.module.css:11-15`, `Slider.module.css:16`. 거의 모든 섹션 헤더가 `letter-spacing: 0.1~0.18em; text-transform: uppercase; color: faint`. **단일 패턴의 기계적 반복** = 템플릿 시그널.
- **얇은 1px 괘선/보더로 모든 것을 구획**
  - `--rule:#d8d0c0` 1px 보더가 header(`SiteChrome:2`), footer, band(`landing:104-105`), card(`Card:4`), preview(`FontPreview:2`), blockHead(`FontStudio:62`), formatBtn(`FontStudio:73`)에 전부. `.ruled` 격자 배경(`globals.css:83-89`)까지. **"선으로 나누면 정돈돼 보인다"는 AI식 안전 선택.**
- **번호 매긴 3단 스텝 ("01 / 02 / 03")**
  - `page.tsx:96-120` + `.stepNo{color:accent}`(`landing:180`). "작업 순서를 01·02·03 카드로" 는 AI 랜딩의 골격 그 자체. 비대칭이라곤 하나 `repeat(3,1fr)`(`landing:164`)로 결국 균등 3분할.
- **"비대칭 2단 그리드 + sticky 프리뷰"**
  - `FontStudio:30-35` `minmax(0,22rem) minmax(0,1fr)` + `.preview{position:sticky}`. 주석에 "똑같은 1fr 1fr 지양"(`FontStudio:29`)이라 적어둔 것 자체가, 역설적으로 **AI가 클리셰를 피하려다 또 다른 클리셰(좁은 사이드바+넓은 캔버스+sticky)에 안착**한 증거.
- **과잉 설명형·문어체 마이크로카피**
  - "한 벌의 글자가 태어납니다", "오롯이 기하의 힘으로"(`page.tsx:111`), "이 자리에서 끝, 어디로도 보내지 않습니다"(`page.tsx:119`). 감성을 쥐어짠 카피 = LLM 특유의 "있어 보이려는" 톤.

### 1-2. 구조적 단조로움 (형태 어휘 빈약)
- **라운드가 거의 0** — `border-radius: 2px`가 버튼/입력/카드 전반(`Button:6`, `landing:6/68`, `FontStudio:77`, `DrawingCanvas:13`). 2px는 "각지지도 둥글지도 않은" 무성격 값. 귀여움·iOS 감성과 정반대.
- **그림자 시스템 부재** — 전체에서 `box-shadow`는 슬라이더 thumb 링(`Slider:50,66`) 한 곳뿐. 깊이(depth)가 전혀 없어 평면적이고, 그래서 "면을 선으로만 나눈" 단조로움이 두드러진다.
- **모션 거의 없음** — transition은 `color/background 0.15s`(`Button:9`) 와 specimen의 font-weight 정도. 인터랙션의 생기(스프링·바운스) 전무.
- **마스코트·일러스트·아이콘 0** — 순수 텍스트+선. 친근함의 앵커가 없다. (홈 `.mark`/header `.mark`의 "획" 글자 도장이 유일한 그래픽 요소.)

### 1-3. 결론
현재 톤은 "보라 AI"는 피했지만 **"세리프 에디토리얼 AI" + "선으로만 정돈한 무(無)뎁스 미니멀"** 이라는, 역시 LLM이 자주 가는 두 안전지대에 빠져 있다. → **방향 전환 필요. iOS의 물성(material)·둥근 형태·깊이·스프링 모션 + 한국 문방구/소프트토이 감성**으로 새 언어를 세운다.

---

## 2. 새 디자인 언어 — iOS 트렌드 × cute/clean × 독창적 조합

### 2-1. 컨셉 한 줄
**"문방구의 말랑한 도구들 (Soft Stationery Toolkit)."**
iOS의 깔끔한 물성과 넉넉한 여백을 골격으로 삼되, 표면은 **지우개·찰흙·젤리 같은 말랑한 소프트-토이 질감**으로 덮는다. 폰트앱이므로 **글자 자체가 캐릭터가 되는** 손맛을 핵심 차별점으로 둔다.

### 2-2. iOS / Apple HIG에서 차용
- **연속 곡률(continuous corner)** 의 부드러운 라운드 사각형 (단순 원형 모서리보다 더 둥글고 유기적).
- **큰 라운드 버튼 / 세그먼티드 컨트롤 / 그룹드 인셋 리스트** — 현재 `formatRow`(`FontStudio:185-200`)는 iOS Segmented Control로, `toolBlock`들은 그룹드 카드로 자연 매핑.
- **Material / Vibrancy(반투명 블러)** — 상단 내비·하단 탭바·시트에 `backdrop-filter: blur` 적용.
- **넉넉한 여백 + 큰 터치 타깃**(최소 44pt 높이).
- **스프링 모션** — 버튼 누름 시 살짝 눌리고(scale 0.96) 튕겨 돌아오기, 시트 슬라이드업.
- **라지 타이틀 → 스크롤 시 인라인 타이틀** 패턴.

### 2-3. 귀여움(cute) 레이어
- **클레이모피즘 / 소프트-UI 그림자**: 안쪽-밝은 / 바깥-부드러운 이중 섀도로 "눌러보고 싶은 젤리" 질감.
- **둥근 형태 우선**: 모든 모서리 16~28px. 아이콘·마스코트도 통통한 라운드.
- **친근한 마이크로카피(반말 톤은 아니되 다정하게)**: "한번 그려볼까요?", "오, 멋진데요!", "글씨가 깨어났어요 ✏️"(이모지는 **마스코트/리워드 순간에만**, 기능 불릿엔 금지 — 3-9 참조).
- **마스코트 "획이(Hoek-i)"**: 붓끝/획에서 태어난 캐릭터 (6장 참조). 빈 상태·로딩·완성 축하에 등장.
- **절제된 캔디 파스텔 악센트**: 메인은 부드러운 잉크-블루 또는 따뜻한 코랄, 보조로 민트·버터·라벤더를 **소량 포인트**로만 (보라 그라데이션 금지).

### 2-4. 독창적 조합 (단순 iOS 클론 회피)
- **한지/문방구 감성의 흔적 유지·재해석**: 종이 텍스처를 버리지 않되, "한지 위 먹"이 아니라 **"파스텔 색지(色紙)·스티커·마스킹테이프"** 의 문방구 세계로 전환. → iOS 물성 + 한국 문방구 = 다른 데 없는 조합.
- **"글자 = 살아있는 생물"**: 슬라이더를 움직이면 글자가 스프링으로 꿈틀. 마스코트가 글자를 안고 있는 형태. 폰트앱의 본질(글씨에 표정 주기)과 cute가 정확히 맞물린다.
- **Soft-UI를 라이트 우세로**: 클레이모피즘은 보통 무채색/저채도 단색에 갇히는데, 우리는 **밝은 색지 위 떠 있는 통통한 컨트롤**로 가서 흔한 "회색 뉴모피즘"과 차별화.

---

## 3. 디자인 토큰 (빌드 가능 수준)

> `globals.css :root`에 그대로 옮길 수 있는 초안. 폰트앱(`apps/font/frontend/app/globals.css`)과 홈(`home/app/globals.css`)은 **동일 키**를 유지해야 `@webapp/ui`가 공유된다(현 구조 유지). 추천안은 **B(clean 우세) 기반 + cute 악센트**(5장 결론).

### 3-1. 컬러 — 라이트 (기본)
```css
:root {
  /* 표면(surface) — 색지 느낌의 밝은 중성. 순백 지양(딱딱함 회피) */
  --bg:            #f6f5f2; /* 페이지 바탕(아주 옅은 웜그레이=색지) */
  --surface:       #ffffff; /* 카드/시트 표면 */
  --surface-2:     #f0eef0; /* 가라앉은 면(트랙/인셋 그룹 배경) */
  --surface-sunken:#eceaef; /* 클레이 inset 바닥 */

  /* 잉크(텍스트) — 완전 검정 금지(부드럽게) */
  --ink:        #2b2a33; /* 본문/제목 */
  --ink-soft:   #5b5966; /* 보조 본문 */
  --ink-faint:  #8a8794; /* 캡션 (AA: surface 대비 4.5:1 확인 필요) */

  /* 악센트 — 잉크-블루베리(메인). 제네릭 블루(#0a84ff 류) 회피, 살짝 보라 섞인 차분한 블루 */
  --accent:        #5b6cf0; /* 메인 인터랙티브 */
  --accent-press:  #4a59d6; /* 눌림 */
  --accent-weak:   rgba(91, 108, 240, 0.14); /* 포커스 링/연한 배경 */
  --accent-ink:    #ffffff; /* 악센트 위 글자 */

  /* 보조 포인트(소량만! 마스코트·뱃지·리워드용) */
  --candy-coral:   #ff7a85;
  --candy-mint:    #57d6b0;
  --candy-butter:  #ffd36e;
  --candy-lavender:#c9b6ff;

  /* 시맨틱 */
  --success: #2fb886;
  --warning: #f0a93a;
  --danger:  #f0556b;
  --info:    var(--accent);

  /* 라인(최소화 — 선 대신 면/그림자로 구획) */
  --hairline: rgba(43, 42, 51, 0.08);
}
```

### 3-2. 컬러 — 다크 (선택. `@media (prefers-color-scheme: dark)` 또는 `[data-theme="dark"]`)
> 다크는 **유리/슬레이트** 톤. "보라 네온 다크 AI"가 아니라 **차분한 블루-슬레이트 + 같은 악센트**.
```css
[data-theme="dark"] {
  --bg:            #16161c;
  --surface:       #20212b;
  --surface-2:     #282a36;
  --surface-sunken:#191a22;
  --ink:        #f2f1f6;
  --ink-soft:   #b9b7c6;
  --ink-faint:  #807e8e;
  --accent:        #8b97ff;
  --accent-press:  #a3acff;
  --accent-weak:   rgba(139, 151, 255, 0.20);
  --accent-ink:    #16161c;
  --hairline: rgba(255, 255, 255, 0.08);
}
```

### 3-3. 라운드(radius scale) — 연속곡률 지향, 후하게
```css
--r-xs: 8px;    /* 칩/작은 태그 */
--r-sm: 12px;   /* 인풋/슬라이더 트랙 */
--r-md: 18px;   /* 버튼/세그먼티드 */
--r-lg: 24px;   /* 카드/그룹드 리스트 */
--r-xl: 32px;   /* 시트/큰 패널 */
--r-pill: 999px;/* 알약 버튼·탭 */
```
(현 `2px` 전면 폐기.)

### 3-4. 그림자 / 블러 시스템 (depth — 신규 핵심)
```css
/* 떠 있는 카드: 부드럽고 넓게 퍼지는 단일 그림자 */
--shadow-sm: 0 1px 2px rgba(43,42,51,.04), 0 4px 12px rgba(43,42,51,.06);
--shadow-md: 0 2px 6px rgba(43,42,51,.05), 0 12px 28px rgba(43,42,51,.10);
--shadow-lg: 0 8px 24px rgba(43,42,51,.08), 0 24px 60px rgba(43,42,51,.14);

/* 클레이/소프트 토이: 바깥 그림자 + 안쪽 하이라이트(통통함) */
--clay: 0 10px 24px rgba(43,42,51,.10),
        inset 0 2px 4px rgba(255,255,255,.9),
        inset 0 -3px 6px rgba(43,42,51,.06);
/* 눌림(인셋) — 트랙/입력 바닥 */
--inset: inset 0 2px 5px rgba(43,42,51,.10);

/* 머티리얼(반투명 블러) — 내비/탭바/시트 */
--blur: saturate(180%) blur(20px);
--material-bg: rgba(246,245,242,.72); /* 라이트 */
```

### 3-5. 타이포 (next/font/google 가능 범위)
세리프 본문 폐기. **한글 본문/제목 = Pretendard 계열 또는 Noto Sans KR**, 둥근 인상 강화를 위해 디스플레이/마스코트 캡션에 라운드 산세리프 보조.
- 본문/UI(한글+라틴): **Noto Sans KR** (next/font/google 제공) 또는 자체호스팅 **Pretendard**(가능하면 1순위 — iOS SF 느낌의 한글). next/font/google만 쓴다면 Noto Sans KR.
- 디스플레이/귀여운 강조(라틴 숫자·로고·마스코트 말풍선): **Quicksand** 또는 **Baloo 2** (둥근 산세리프, google fonts) — 큰 제목·뱃지에만.
- 폰트 견본(specimen) 영역은 **사용자 생성 폰트**를 보여주는 곳이므로 시스템 폰트 의존 최소.

위계 스케일(rem, 1rem=16px):
```css
--text-caption: .78rem;  --lh-caption: 1.4;
--text-sm:      .88rem;  --lh-sm: 1.5;
--text-body:    1rem;    --lh-body: 1.6;
--text-lg:      1.18rem; --lh-lg: 1.5;
--text-title3:  1.4rem;  --lh-title: 1.25; /* 카드 제목 */
--text-title2:  1.9rem;
--text-title1:  2.5rem;
--text-large:   clamp(2.4rem, 5vw, 3.6rem); /* iOS 라지타이틀 */
/* 자간: 큰 제목만 -0.02em, 본문 0. 올-캡스 트래킹 라벨 전면 폐지 */
--weight-reg: 400; --weight-med: 500; --weight-semi: 600; --weight-bold: 700;
```

### 3-6. 간격 스케일 (4px 베이스)
```css
--sp-1: 4px;  --sp-2: 8px;  --sp-3: 12px; --sp-4: 16px;
--sp-5: 20px; --sp-6: 24px; --sp-8: 32px; --sp-10: 40px;
--sp-12: 48px; --sp-16: 64px; --sp-20: 80px;
--touch-min: 44px; /* iOS 최소 터치 타깃 */
--maxw: 1100px;
```

### 3-7. 모션 (이징 / 스프링 / 지속)
```css
--ease-out:    cubic-bezier(0.22, 1, 0.36, 1);   /* 일반 진입 */
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);/* 바운스(귀여움) */
--ease-in-out: cubic-bezier(0.45, 0, 0.2, 1);
--dur-fast: 140ms;  --dur-base: 240ms;  --dur-slow: 420ms;
/* 누름: transform: scale(.96) dur-fast; 복귀: ease-spring */
/* 글자 specimen: 파라미터 변경 시 ease-spring 으로 통통하게 */
/* reduced-motion 존중: @media (prefers-reduced-motion) 시 transform 제거 */
```

### 3-8. 컴포넌트 스펙

**Button** (`packages/ui/src/Button`)
- 높이 `--touch-min`, `border-radius: var(--r-md)`(또는 pill), `padding: 0 var(--sp-6)`, `font-weight: 600`.
- `solid`: `background: var(--accent); color: var(--accent-ink); box-shadow: var(--shadow-sm)`. hover시 살짝 밝게, `:active { transform: scale(.96) }` + `--ease-spring`.
- `soft`(신규, 귀여움 기본): `background: var(--accent-weak); color: var(--accent)`.
- `clay`(강조 CTA): `box-shadow: var(--clay)` 통통한 입체.
- `ghost`: 투명, hover시 `--surface-2` 배경.
- 현 `2px`·`--ink` 잉크 채움 → 폐기.

**Segmented Control** (현 `formatRow`/`formatBtn` 대체)
- 컨테이너: `background: var(--surface-2); border-radius: var(--r-pill); padding: var(--sp-1)`.
- 선택된 항목: 흰 알약 `background: var(--surface); box-shadow: var(--shadow-sm); border-radius: var(--r-pill)` 가 슬라이드 이동(`--ease-out`).
- 텍스트만 올-캡스 폐지, `font-weight: 600`.

**Slider** (`packages/ui/src/Slider`)
- 트랙: 높이 6px, `border-radius: var(--r-pill)`, `background: var(--surface-2)`, `box-shadow: var(--inset)`.
- 채워진 구간(progress): `--accent` (커스텀 배경 그라데이션으로 thumb 좌측 채움).
- thumb: 28px 원, `background: var(--surface)`, `box-shadow: var(--clay)`(통통), `:active { transform: scale(1.12) }`.
- 라벨: 올-캡스 트래킹 폐지 → 일반 케이스 `--text-sm --weight-med`. 값은 알약 칩(`--accent-weak` 배경).

**Card** (`packages/ui/src/Card`)
- `background: var(--surface); border-radius: var(--r-lg); box-shadow: var(--shadow-md); border: none`(1px 보더 폐지). padding `var(--sp-6)`.
- 태그: 1px 보더/올캡스 → 알약 칩(`--accent-weak`).
- hover(클릭형 카드): `transform: translateY(-2px); box-shadow: var(--shadow-lg)` + `--ease-out`.

**Sheet / Modal** (신규 — iOS 바텀시트)
- 하단에서 슬라이드업, `border-radius: var(--r-xl) var(--r-xl) 0 0`, 상단 grabber 바(48×5px, `--surface-2`), `background: var(--material-bg); backdrop-filter: var(--blur)`. 진입 `--ease-out`.

**Tab Bar** (신규 — 하단 고정, 모바일)
- `position: fixed; bottom; background: var(--material-bg); backdrop-filter: var(--blur); border-radius: var(--r-xl)`(플로팅 알약형). 아이콘+라벨, 선택시 `--accent`.

**Grouped List** (스튜디오 도구 패널)
- 인셋 그룹: `background: var(--surface); border-radius: var(--r-lg); box-shadow: var(--shadow-sm)`, 내부 행은 `--hairline` 1px로만 구분(유일하게 허용되는 hairline 용도).

### 3-9. (참고) 카피 톤 가이드
- 다정·간결·구체. 문어체/시적 행갈이 금지.
- 예: 헤드라인 "내 글씨로 폰트 만들기" / 서브 "그리고, 슬라이더로 다듬고, 바로 받아요." / CTA "만들러 가기".
- 이모지: 기능 불릿에 금지. 마스코트 말풍선·완성 축하·빈 상태 등 **감정 순간에만** 1개 이하.

---

## 4. 레이아웃 / 네비 패턴 (화면별)

### 4-1. 홈 (`home/`)
- 상단 **라지 타이틀** "획" + 마스코트, 스크롤 시 블러 내비바로 축소.
- 앱 목록을 **그룹드 카드**(현 `Card` 그리드 유지하되 신규 Card 스펙). `mark` 도장 → 마스코트/둥근 앱 아이콘.
- 카피 단순화, 올캡스 태그 → 알약 칩.

### 4-2. 폰트 랜딩 (`apps/font/frontend/app/page.tsx`)
- 히어로: 좌측 라지타이틀+CTA, 우측 `InteractiveSpecimen`을 **떠 있는 카드(클레이)** 안에 담고 마스코트가 곁들임. 강제 `<br>` 3연 제거.
- "01/02/03 스텝 띠" → **수평 스크롤 카드** 또는 1개의 인터랙티브 데모로 축소(템플릿 골격 탈피).
- band의 1px 보더 구획 → 색지 배경 섹션(`--surface-2`)으로 면 분리.

### 4-3. 스튜디오 (`FontStudio.tsx`)
- 데스크톱: 좌측 **그룹드 카드 패널**(스케치 / 세 축 / 받아가기) + 우측 큰 견본 카드. sticky 유지하되 카드는 떠 있는(shadow) 형태.
- 모바일: 견본을 위, 컨트롤은 **하단 시트**(끌어올리기) 또는 **하단 탭바**(스케치/조절/내보내기 전환). iOS식.
- `받아 가기`의 woff/ttf 선택 → **세그먼티드 컨트롤**. 다운로드 = 큰 클레이 CTA.
- 빈/로딩/완성 상태에 마스코트 등장(견본 비었을 때 "여기 글씨가 나타나요").

---

## 5. 변형 2안 + 추천

### 안 A — Cute 우세 ("말랑 문방구")
- 컬러: 코랄/버터/민트 파스텔을 표면에도 활용, 마스코트 큼직, 클레이 그림자 강함.
- 형태: 라운드 24~32px, 알약 버튼, 바운스 모션 후함.
- 카피: 친근·이모지 살짝.
- 장점: 차별성·기억성 최고, "AI 냄새"와 가장 멀다, 글자=캐릭터 컨셉과 강결합.
- 단점: 폰트=전문 도구라는 신뢰감과 충돌 위험, 파스텔 과하면 유치/저채도 뉴모피즘 함정.

### 안 B — Clean 우세 ("소프트 iOS 문방구") **★ 추천**
- 컬러: 밝은 색지 바탕 + 단일 잉크-블루 악센트, 캔디 파스텔은 **마스코트·뱃지·리워드에만** 소량.
- 형태: iOS 머티리얼(블러 내비/탭바), 라운드 18~24px, 부드러운 단일 그림자 중심(클레이는 CTA·슬라이더 thumb 등 포인트에만).
- 모션: 절제된 스프링.
- 카피: 다정하지만 단정.
- 장점: 깔끔·전문 신뢰 + 귀여움을 마스코트로 흡수 → **clean과 cute를 분리 운용**해 둘 다 취함. iOS 트렌드 정합. 확장(다른 앱)에도 안전.
- 단점: A보다 첫인상의 "와!"는 덜할 수 있음 → 마스코트와 마이크로 인터랙션으로 보완.

**추천: 안 B.** 토큰은 B 기준(3장)으로 잡되, **마스코트와 캔디 악센트로 cute를 주입**한다. 즉 *구조·표면은 clean iOS, 정서·캐릭터는 cute*. 사용자가 cute를 더 원하면 캔디 변수 노출 비중만 올리면 A로 슬라이드 가능(토큰 호환 설계).

---

## 6. 마스코트 제안 — "획이 (Hoek-i)"

- **유래/형태**: 한 번의 붓 **획**에서 태어난 생물. **통통한 물방울/잉크방울 몸체**(아래가 둥글고 위가 살짝 뾰족 = 붓끝)에 작은 점눈 두 개. 머리 위에 짧은 "획" 한 가닥(머리카락/안테나)이 펜촉처럼 솟음.
- **컬러**: 몸 `--accent`(잉크-블루), 볼터치 `--candy-coral`, 하이라이트 흰점. 다크모드 자동 대응.
- **표정 변주(재사용 — 이후 "이모지/캐릭터화" 기능과 공유)**: 기본(웃음)·놀람(견본 갱신)·집중(그리는 중, 혀 빼꼼)·잠(빈 상태)·하트눈(완성 축하)·졸졸 땀(에러). 같은 몸체에 **눈·입 SVG path만 교체**하는 구조 → 코드/SVG 경량.
- **경량 구현 방식**:
  - 단일 `<svg viewBox>` 컴포넌트, 몸체는 1개 path + `fill: var(--accent)`, 눈/입은 표정별 path 그룹을 prop으로 토글.
  - 모션: idle 시 `transform: translateY` 살짝 둥실(`--dur-slow` 무한 ease-in-out), 등장 시 `--ease-spring` 팝.
  - 정적 fallback도 동일 SVG라 SSR 안전, 메모리/번들 부담 없음(이미지 에셋 불필요 → 비용 0 철칙 부합).
- **활용처**: 홈 히어로, 스튜디오 빈/로딩/완성 상태, 다운로드 성공 토스트, 404. **기능 불릿 장식엔 쓰지 않음**(남발 금지).

---

## 7. AI 냄새 블랙리스트 — 재발 방지 체크

작업/리뷰 시 아래에 하나라도 해당하면 **반려**.

- [ ] 보라·인디고·바이올렛 **그라데이션**(특히 다크모드 네온). → 금지.
- [ ] 가운데 정렬 히어로 + **그라데이션 블롭/오로라** 배경. → 금지.
- [ ] **이모지 불릿로 기능 나열**("✨ 강력한 기능", "🚀 빠른"). → 금지(이모지는 마스코트/감정 순간만).
- [ ] **올-캡스 + 트래킹(letter-spacing) 라벨**의 기계적 반복. → 폐지.
- [ ] 거대 **세리프 헤드라인 + 인위적 `<br>` 행갈이**(시 흉내). → 금지.
- [ ] 동일 라운드(`2px`나 동일값) + 동일 1px 보더 카드/구획의 무한 반복. → 면/그림자/색지로 구획.
- [ ] 제네릭 블루(#0a84ff, #2563eb 류) 그대로. → `--accent` 잉크-블루베리 사용.
- [ ] "01 / 02 / 03 균등 3단 스텝 카드" 골격. → 데모/스크롤 카드로 대체.
- [ ] 과한 보더/구분선으로만 깊이 흉내. → depth는 그림자·블러로.
- [ ] 문어체·과잉 감성 카피("태어납니다", "오롯이 ~의 힘으로"). → 다정·간결·구체.
- [ ] 클릭하면 아무 반응 없는 평면 버튼. → 스프링 누름·hover 깊이 필수.

---

## 요약 (마스터 보고용)

- **추천안: B(clean 우세) — "소프트 iOS 문방구."** 구조·표면은 깔끔한 iOS(머티리얼 블러 내비/탭바, 연속곡률 라운드, 부드러운 단일 그림자, 스프링 모션), **귀여움은 마스코트 "획이"와 캔디 파스텔 악센트로 분리 주입.** 사용자가 더 cute를 원하면 캔디 변수 비중만 올려 A안으로 슬라이드 가능(토큰 호환).
- **핵심 토큰**: 바탕 `--bg #f6f5f2`(색지) / 표면 `--surface #fff` / 잉크 `--ink #2b2a33`(완전검정 금지) / **악센트 `--accent #5b6cf0`(잉크-블루베리, 제네릭 블루 회피)** / 캔디(coral·mint·butter·lavender, 소량) / 라운드 8~32px(`2px` 전면폐기) / 그림자 `--shadow-md`·`--clay`(통통)·`--inset` / 블러 머티리얼 / 모션 `--ease-spring`(바운스)·dur 140·240·420ms / 타이포 Noto Sans KR(또는 Pretendard) 본문, Quicksand/Baloo 디스플레이 — **세리프·올캡스 트래킹·2px 폐기**.
- **차별 포인트**: ① iOS의 clean + 한국 문방구(색지·스티커) 감성 융합 = 단순 iOS 클론 아님. ② 폰트앱 본질과 맞물린 **"글자=살아있는 생물"** + 붓획 마스코트 "획이"(빈/로딩/완성/에러 표정, 이후 캐릭터화 기능과 SVG 재사용). ③ clean(신뢰)·cute(애착)을 충돌 없이 분리 운용.
- **현 빌드 진단 핵심**: "보라 AI"는 피했으나 **"세리프 에디토리얼 AI + 선으로만 정돈한 무뎁스 미니멀"** 이라는 또 다른 LLM 안전지대에 빠짐(올캡스 라벨 반복, `<br>` 시 헤드라인, 01/02/03 스텝, 전면 1px 보더·`2px` 라운드, 그림자/모션/마스코트 부재). 7장 블랙리스트로 재발 차단.
- **산출물**: `docs/phase2/idea-design-direction.md` (본 파일). 빌더는 폰트앱·홈 `globals.css`의 `:root` 토큰을 3장으로 교체 후, `packages/ui`의 Button/Slider/Card를 3-8 스펙으로 재작성하면 됨(두 globals.css 키 동기화 필수).
