# 에이전트 역할 정의

## 빌더 (병렬, 자기 폴더만 수정)
| 에이전트 | 책임 영역 |
|----------|-----------|
| FE-Agent | `apps/*/frontend`, `home/`, `packages/ui` |
| Engine-Agent | `apps/*/engine` (전통/AI 생성 로직) |
| Infra-Agent | `infra/` (nginx 라우팅, 배포 스크립트) |
| Shared-Agent | `packages/*` (공통 UI/SEO/타입 정비) |

## 품질 요원 (개발과 별도)
| 에이전트 | 검사 항목 | 보고 위치 |
|----------|-----------|-----------|
| Verify | 빌드/테스트 통과, e2e(그리기→생성→프리뷰) | `.agents/reports/verify-*.md` |
| Review | 코드 품질, 폴더 경계, 중복, 네이밍 | `.agents/reports/review-*.md` |
| Audit | 유료 API 무단호출·비밀키 노출·무료티어 초과·토스 정책 | `.agents/reports/audit-*.md` |
| Security | 입력검증, 업로드 안전성, 의존성 취약점 | `.agents/reports/security-*.md` |

## 가치 게이트 (코드 짜기 *전* 필수 관문 — 최우선)
| 에이전트 | 검사 항목 | 보고 위치 |
|----------|-----------|-----------|
| 🔪 Skeptic (회의적 실사용자/악마의 변호인) | **"왜 만드나·누가 쓰나·독자적인가·나라면 쓰나·안 만들 이유"**. 실행이 아니라 **제품 가치/방향**을 물어뜯음 | `.agents/reports/skeptic-*.md` |

> ⚠️ 교훈: Verify/Review/Audit/Security·디자이너·개발자·상용화 패널은 전원 **"어떻게 만들었나"**(버그·픽셀·OOM·AI냄새·수익)만 봤고, **"이걸 왜 만드나"**는 누구의 KPI도 아니었다 → 약한 코어(기성폰트 슬라이더 변형)가 여러 라운드 통과 = 시스템 실패. **그래서 Skeptic을 코드 전 게이트로 상설.**

### "제대로" 7관문 (모든 기능이 통과해야 — Skeptic이 판정)
1. **독자성** 후발이 흉내 어렵나 2. **유용성** 결과물을 실제로 쓰나 3. **완주 동기** 끝까지 하나(노동→이탈?) 4. **대체재 우위** 그냥 X 쓰면 되지 않나 5. **이탈 이유 제거** 6. **결제 순간** 돈 낼 지점이 있나 7. **안 만들 이유** 반박 가능한가

## 품질 요원 (실행 품질 — 가치 게이트 통과 *후*)
| 에이전트 | 검사 항목 | 보고 위치 |
|----------|-----------|-----------|
| Verify | 빌드/테스트 통과, e2e | `.agents/reports/verify-*.md` |
| Review | 코드 품질, 폴더 경계, 중복 | `.agents/reports/review-*.md` |
| Audit | 유료 API·비밀키·무료티어·토스 | `.agents/reports/audit-*.md` |
| Security | 입력검증·업로드·의존성 | `.agents/reports/security-*.md` |
| 디자이너/개발자/상용화 패널 | 미감·코드·시장 | `.agents/reports/panel*-*.md` |

## 진행 규칙
0. **Skeptic 가치 게이트 먼저.** 7관문 통과(또는 must 확정) 전엔 큰 빌드 착수 금지.
1. 빌더가 한 단위 완성 → `.agents/handoff/`에 "완료/다음 할 일" 기록.
2. Verify→Review→Audit→Security/패널 점검 후 보고서.
3. **Blocker**는 즉시 수정, **Warning**은 백로그.
