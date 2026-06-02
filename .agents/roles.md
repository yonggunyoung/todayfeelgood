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

## 진행 규칙
1. 빌더가 한 단위 완성 → `.agents/handoff/`에 "완료/다음 할 일" 기록.
2. Verify→Review→Audit→Security 순 점검 후 보고서 작성.
3. **Blocker**는 즉시 수정, **Warning**은 백로그.
