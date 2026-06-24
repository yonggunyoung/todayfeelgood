# 디자인 핸드오프 스펙 — "오늘 기분"

> 목적: 디자인 시안을 **rework 0으로 코드에 그대로 받아끼우기.**
> 아래 **토큰명·클래스명·id·자산 이름**을 그대로 산출하면, `js/*` 로직(추천·저장·가드)은 손대지 않고 슬롯인된다.
> 핵심 원칙: **"고정 계약"(§7) 유지 = 로직 수정 0.**

---

## 0. 먼저 고를 옵션 (Claude Design 입력)
하나씩 정하면 나머지 스펙은 동일하게 적용:
- **아트디렉션:** ⓐ 기분 우표 컬렉션(따뜻·추천) / ⓑ 다크 쎈치 "새벽감성" / ⓒ 미니멀 토스감성
- **메인 컬러:** 코랄 `#FF6F50`(기본) / 버터 `#FFC95C` / 세이지 `#9CC3A6`
- **마스코트 디테일:** 미니멀(점 눈) / **중간(추천)** / 디테일(그림자·하이라이트)
- **모드:** 라이트 / 라이트+다크 토글

---

## 1. 디자인 토큰 (이 변수명 그대로 → `css/styles.css :root` 값만 교체)
| 토큰 | 용도 | 현재값(임시) |
|---|---|---|
| `--bg` | 배경 | `#F6EFE3` |
| `--surface` | 카드 면 | `#FFFDF8` |
| `--ink` | 본문 글자 | `#2A2520` |
| `--muted` | 보조 글자 | `#A89E92` |
| `--accent` | 포인트(버튼·강조) | `#FF6F50` |
| `--accent-ink` | 포인트 위 글자 | `#FFFFFF` |
| `--line` | 테두리 | `#EADFCF` |
| `--radius` | 카드 라운드 | `16px` |
| `--shadow` | 카드 그림자 | `0 8px 30px rgba(42,37,32,.07)` |

**기분 5색 토큰 (신규 — 각 base/ink 2톤):**
| 기분 id | 라벨 | `--mood-{id}` | `--mood-{id}-ink` |
|---|---|---|---|
| happy | 행복 | `#FFC95C` | 진한 톤 |
| flutter | 설렘 | `#FF9A8B` | 진한 톤 |
| calm | 평온 | `#9CC3A6` | 진한 톤 |
| blue | 우울 | `#8AA0C9` | 진한 톤 |
| angry | 화남 | `#E2725B` | 진한 톤 |

**타이포 토큰:**
- `--font-display`: **Jua**(둥근 귀여움, CDN) — 큰 제목·기분 이름·숫자
- `--font-body`: **Pretendard**(CDN) — 본문·UI
- 스케일: 타이틀 33/Jua · 기분이름 40/Jua · 섹션 19~23 · 본문 14~15 · 캡션 12~13

**모션 토큰:** 스프링 `cubic-bezier(.34,1.56,.64,1)` · 탭 squish 120ms · 도장찍기 220ms · `prefers-reduced-motion` 존중

---

## 2. 마스코트 "기분이" (캐릭터 자산)
- **형식:** 인라인 SVG, `viewBox="0 0 100 100"`, 색은 변수/`currentColor`로 교체 가능
- **필수 표정 5종** (눈/입/볼터치로 구분): `happy`(웃는 눈+큰 미소) · `flutter`(반짝 눈+벌린 입) · `calm`(감은 눈+잔잔) · `blue`(처진 눈+눈물 한 방울) · `angry`(눈썹+납작 입)
- **추가 포즈(선택):** `neutral`(홈 대기), 손 드는 포즈(공유카드용)
- **사용 사이즈:** 홈 대기 116 · 결과/공유 120 · 스탬프 버튼 34 · 컬렉션 28 · 팔레트 80
- **네이밍:** `mascot-{mood}.svg` 또는 `data-mood="{id}"`로 색 주입
- **색:** 기분별 base/light/dark 3톤 (몸=light, 외곽선·발=dark, 볼=코랄)

---

## 3. 아이콘 세트 (라인 1.5px·둥근 끝·`viewBox 0 0 24 24`·`currentColor`)
`sun`(맑음) · `cloud`(흐림) · `rain`(비) · `flame`(streak) · `play` · `pause` · `share` · `music-note` · `chevron` · `check` · `settings`(증분 대비)
> ⚠️ 이모지를 아이콘으로 쓰지 말 것 — 전부 SVG.

---

## 4. 버튼 & 상태 (전부 명세)
| 컴포넌트 | 클래스 | 크기 | 상태 |
|---|---|---|---|
| 기분 스탬프 ×5 | `.mood` (선택 시 `.is-on`) | 58×74, 터치≥44 | default / pressed(squish) / **is-on(기분색 채움)** |
| 기본 버튼 | `.btn` | h54, radius12 | default / pressed / disabled |
| 고스트 버튼 | `.btn.btn--ghost` | h54 | default / pressed |
| 공유 버튼 | `.btn`(공유 아이콘+텍스트) | 풀폭 | default / pressed |
| 재생 pill | (노래카드 내) | 34 원형, 코랄 | default / playing(pause) |
| 설치 버튼 | `#installBtn` | h54 ghost | hidden ↔ shown |

---

## 5. 컴포넌트 (화면별 · 증분1 + 공유카드)
**홈 (`<main class="app">`)**
- 상태바: 날짜(`#dateline`) + streak(flame+숫자, 0이면 숨김)
- 타이틀 2줄 `.app__title`(Jua)
- 마스코트 대기(neutral)
- 기분 피커 `#moodPicker` → `.mood` ×5 (스탬프, 우표 점선)
- 전국 게이지 카드 `.card`: 라벨 + sun + **5색 세그 게이지(합=100)** + 참여수

**결과 (`#result`, 탭 후 표시)**
- 헤더: "오늘의 나" + 날짜
- 마스코트(기분 표정 + 기분색 halo 원)
- 기분 이름 `.result__mood`(대형·`--mood-{id}` 색) + 한 줄 카피
- 노래 카드 `.song`: 앨범 72×72(그라데이션+note) · `.result__label`("오늘의 노래") · `<strong>`제목 · `<span>`아티스트 · 재생 pill
- 전국 게이지 미니 + "어제 대비 ↑"
- 공유 버튼

**공유 카드 9:16 (캡처용)**
- 캔버스 **1080×1920**, safe-area 60px
- 날짜(상단·Jua·자간 넓게) + 마스코트 + 기분 이름 + 노래 한 줄(note+제목+아티스트) + "대한민국 NN% 행복"(sun) + 워터마크 "오늘기분 · todayfeelgood"
- 레이어 분리(배경/카드/마스코트/텍스트)로 export 용이

**(증분2 미리) 컬렉션:** 한 달 기분 스탬프 그리드 — 빈 칸 "아직 안 찍음"

---

## 6. 동적 데이터 규칙 (디자인이 반드시 고려)
- **기분색은 런타임 5종 중 결정** → mood-tinted 요소는 전부 변수로(하드코딩 ❌)
- **곡명/아티스트 길이 가변** → 1줄 말줄임(…) 또는 2줄 클램프 규칙 제시
- **전국 % 0~100**, 게이지 5세그 합=100
- **streak**: 0 숨김 / 1+ 표시
- **빈 상태**: ⓐ오늘 미기록(피커만) ⓑ추천 None → "오늘은 음악 없이 쉬어가요" 폴백 디자인

---

## 7. ★고정 계약 (이것만 지키면 로직 수정 0)
디자인이 마크업을 새로 짜도, **아래 id·class·구조를 유지**하면 `js/app.js`가 그대로 동작:
- **id:** `dateline` · `moodPicker` · `result` · `installBtn` · `swState`
- **class:** `app` · `card` · `mood`(선택 `is-on`) · `btn`(`btn--ghost`) · `result__mood` · `result__label` · `song`(자식 `strong`/`span`/`em`)
- **기분 버튼:** 5개, 순서 `happy,flutter,calm,blue,angry`, 각 색은 `--mood-{id}`
- **토큰:** §1 변수명 그대로
> 새 컴포넌트(컬렉션 등)는 자유. 위 계약 요소만 보존.

---

## 8. 산출물 체크리스트 (Claude Design → 이대로 받으면 끼우기 완료)
- [ ] §1 토큰 값표 (라이트[+다크])
- [ ] 마스코트 5표정 SVG (+neutral)
- [ ] 아이콘 세트 SVG (§3)
- [ ] 각 화면 HTML+CSS (§7 계약 준수) — 단일 `preview.html`(전 화면 + 토큰시트) 권장
- [ ] 공유 카드 9:16 레이아웃
- [ ] 형식: 빌드 0 · 폰트 CDN(Jua·Pretendard) · SVG 인라인 가능 · 색은 변수/currentColor
