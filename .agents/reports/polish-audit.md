# Audit — 광클대전 디자인+성능 폴리시 (commit `04f867c`)

**결론: PASS — 비용0/오프라인·토스§6·경계·5원칙 모두 준수, 신규 대비 회귀 0 (어두워진 bg로 모든 텍스트 대비 미세 향상). Blocker 0 / Warning 1 / Nit 3 (Warning·Nit 모두 폴리시가 만든 게 아닌 기존조건).**

대상: `index.html`, `i18n.js`, `docs/gwangclick-global-plan.md` (3파일만 변경 확인). 테스트 56/56 pass. READ-ONLY 감사 — 소스 미수정.

---

## 1. 접근성 / 대비 (핵심)

WCAG 대비비 실측 (relative luminance, AA 본문 4.5:1 / 큰글씨 3:1):

| 표면 / 텍스트 | 색 | 배경 | 비율 | 판정 |
|---|---|---|---|---|
| 본문 ink | #f4f5f8 | bg #08090c | **18.26** | AAA |
| 팀카드 본문 | #f4f5f8 | bg-3 #1b1f27 | **15.15** | AAA |
| 키커 칩 텍스트 (ink-2) | #9da3ad | bg | **7.85** | AA+ |
| 팀 부제 .sl (ink-2) | #9da3ad | bg-3 | **6.51** | AA+ |
| 떡밥 `?` 네온 .qa (큰글씨) | #ff2d9b | bg | **5.78** | AA (본문기준도 통과) |
| 네온2 시안 텍스트 | #36e3ff | bg | 12.88 | AAA |
| 결과 newbest | #ffd76a | bg-2 | 13.32 | AAA |
| 보상버튼 텍스트 | #1c1206 | #ff9a3d | 8.73 | AAA |
| 참전/CTA 버튼 텍스트 | `ink()` 적응형 | 진영색 | 본문 §아래 | PASS |

**대비 회귀 0 (확인).** 폴리시는 `--bg` #0a0b0d→#08090c(더 어둡게), `--ink` #f2f3f6→#f4f5f8(더 밝게)만 바꿈 → 모든 텍스트 대비가 **동일하거나 미세 상승**(예 ink-3 3.61→3.66, ink-2 7.76→7.85). 신규 네온 `?`(5.78)·네온 언더라인·코너 글로우·그리드·노이즈는 전부 통과 또는 순수 장식.

**버튼 텍스트 = 색만으로 결정 안 함.** `.go`/`.btn-primary` 텍스트색은 인라인 `ink(teamColor)`(휘도>0.58이면 #08110d, 아니면 #fff)로 진영색마다 적응 선택 → 임의 진영색에서도 대비 확보(흰색 고정이 아니라 회귀 없음). `ink()`는 폴리시 미변경 로직.

**탭 타깃.** 참전 `.go button` padding 17px(라인122, 기존 16px↑)·`.btn` 15px·TAP 오브/스테이지 대형 → 모두 ≥44px 확보(오히려 증가).

**모션·reduced-motion.** 핵심 요구 충족: `skyConfetti`가 `scaledCount()` 경유, `prefersReducedMotion()`→0 즉시 return(라인367/448) = **축포 0**. DPR 1.5캡·입자 기기스케일도 부하 절감.

**색만으로 의미 전달 없음 (확인).** 승/패/무 판정은 텍스트+이모지(`verdictWin/Lose/Tie`), LIVE는 텍스트, 콤보칩은 라벨, 랭크는 숫자. 진영 구분도 이름+이모지 병기.

## 2. 비용 0 / 오프라인

- **폴리시 커밋이 추가한 네트워크 리소스 0 (확인).** 신규 배경=CSS `radial-gradient`+`linear-gradient` 그리드+인라인 `data:` SVG 노이즈, 글로우/그림자=CSS, 폰트=시스템 스택 `var(--display)`. 외부 폰트/CDN/이미지/`@import`/fetch 추가 없음.
- 성능부도 외부 에셋 0 — 이모지 스프라이트는 런타임 오프스크린 `<canvas>` 프리렌더(라인378~), 글리프는 `serif` 시스템 폰트.
- 페이로드: CSS/주석 +159줄·인라인 SVG 노이즈(소). 번들 증가 없음(스크립트 src 불변).

## 3. 토스 §6 (10대/밈 카피)

리워딩된 ko/en 카피 정책 위반 0 (확인):
- 자사앱 설치 유도·외부 다운로드 유도 없음 — 공유는 기존 인앱 링크복사/스샷(`shareCopied`·`shareScreenshot`)로 톤만 변경.
- 실제 현금/수익 주장 없음 — "광고 보고 기여 2배 뻥튀기"는 게임 내 코스메틱/연출 보상(밸런스 불변 명시 유지).
- 비속어/성인·연령부적합 표현 없음 — "졌잘싸·뻥튀기·1빠 깃발·손가락 갈아 넣어라·도망가지 말고" 등은 10대 밈 톤 내 과하지 않은 수위. "영혼까지 끌어모아/손가락에 불남"도 비유적.
- ko↔en 패리티 유지(키·플레이스홀더 불변, `streakDays` 테스트 고정값 보존·톤은 `streakDaysOn`에 반영).

## 4. 경계 / CLAUDE.md

- **3파일만 변경 확인** (`git diff --name-only`): index.html·i18n.js·docs. `topics.js`/`geo.js`/`gc-globe.js`/게임수치 미변경.
- 게임플레이 수학 불변 — `onTap`/`frame`/`comboMult`/`DURATION`/`dailyBias` 0줄. 변경은 FX층·CSS·i18n VALUE뿐.
- **진영색(데이터) 보존** — `--team-a/-b/--me/--foe`(라인38) 그대로, 진영색은 인라인 런타임 리스킨 유지. 신규 `--neon*`은 진영색과 분리된 '브랜드 크롬'.
- 가역성/가산성(#4) — 기존 토큰 위에 추가(`--r-xs`,`--r-pill`,`--neon*`), 그림자·트랜지션 얹기, 스프라이트는 `fillText` 폴백 보존. 갈아엎기 없음.

## 5. 5원칙

- §5(완료 정의): docs 체크리스트 3항목 갱신(perf·디자인·카피), 테스트 56/56 현행. ✅
- §1(불신): reduced-motion·canvas 미지원·`emojiSprite` 실패 시 폴백 모두 graceful. ✅

---

## Findings

- **Warning [index.html:30-31]** — Pretendard 폰트가 `cdn.jsdelivr.net` 외부 스타일시트로 로드됨(§2 오프라인·비용0 정신과 상충). **단, 이 폴리시 커밋이 만든 게 아니라 HEAD~1에 이미 존재**(폴리시는 시스템폰트 폴백 스택을 `--display`로 둠). 폴리시가 워드마크/디스플레이 타이포를 키워 폰트 의존을 더 두드러지게 함. 권고: 폰트를 `vendor/`로 로컬 동봉(globe.gl 선례)하거나 시스템 스택만으로 운영.
- **Nit [index.html:75,134,142,190]** — `--ink-3`(#646a74) 사용 소형 보조텍스트(.hint 12.5px, .chip/.lbl/.rq 10px)는 대비 3.0~3.66으로 AA 4.5:1 미달. **폴리시 미변경(오히려 3.61→3.66 향상)·회귀 아님.** 추후 ink-3를 ~#7a818c로 올리면 AA 충족(데이터/진영색 무관).
- **Nit [index.html 전역]** — CSS `@media (prefers-reduced-motion: reduce)` 블록 부재 → 신규 미세 트랜지션(버튼 눌림 translateY·오브 scale .9)·기존 liveBlink/auraPulse가 CSS단에서 미차단(JS 축포만 0). 핵심 요구(confetti=0)는 충족. 권고: 전역 reduced-motion 블록으로 애니메이션 최소화.
- **Nit [docs/gwangclick-global-plan.md:14]** — 체크리스트에 "미커밋(검수대기)" 표기가 커밋 후에도 남음. 사실 무해, 다음 편집 시 정리 권고.
