# Audit 보고서 — Phase 1 (비용/정책/보안 표면)

**한 줄 결론:** 비용 0 원칙 준수, 비밀키 노출·외부 유료 API 호출 없음. **Blocker 없음.**

## 점검 결과
| 항목 | 결과 |
|------|------|
| 하드코딩 비밀키(`sk-...` 등) | ✅ 0건 |
| 외부 유료 API 호출(anthropic/openai/google) | ✅ 0건 — 전통 방식만, 비용 0 |
| 비용 가드 주석 | ✅ 엔진 `main.py` 상단에 명시 |
| `.env` 커밋 여부 | ✅ `.gitignore`로 차단, `.env.example`만 존재 |
| AI 기본 상태 | ✅ `AI_ENABLED=false` 기본 OFF |
| 토스 정책 선반영 | ⚠️ 현재 AI 기능 없음 → 해당 없음. AI 도입(Phase 2) 시 "AI 생성" 표시 코드 필수(`CLAUDE.md §6`에 기록됨) |

## 무료 티어 리소스
- 엔진: fonttools 기반으로 가벼움. 폰트 1회 생성 수십 ms~수백 ms 수준.
- 프론트: 무거운 UI 라이브러리 없음. Next 빌드 메모리만 배포 시 유의(infra/README 기재).

## 권고 (Warning)
- 업로드 `imagePng` 사용 시작 시 용량/형식 검증 추가(현재 미사용이라 표면 없음).
- 생성 요청 rate limit/동시성 가드는 트래픽 발생 전 추가 권장.
