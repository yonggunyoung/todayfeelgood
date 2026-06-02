# Verify 보고서 — Phase 1 MVP

**한 줄 결론:** 그리기 캔버스 + 슬라이더 → BFF(`/api/generate`) → 엔진 → **유효한 WOFF** 까지 e2e 동작 확인. **Blocker 없음.**

## 검증 환경
- Node 22 / pnpm 10.33 / Python 3.11, 로컬 컨테이너
- 엔진: `uvicorn main:app :8000`, 프론트: `next start :3001`

## 결과
| 항목 | 결과 |
|------|------|
| 프론트 빌드/타입체크/lint | ✅ 통과 (엔진 없이도) |
| 엔진 `GET /health` | ✅ `{status:ok, font_loaded:true}` (Recursive VF 2.3MB 다운로드·캐시 성공) |
| 엔진 `POST /generate` (700/-8/0.5) | ✅ 15032B, 매직 `wOFF`, fontTools 재오픈 OK, family `UserFont-eedaf217` |
| **e2e** 프론트 `POST /api/generate` (300/-15/1) | ✅ 18020B, 매직 `wOFF`, `generatedBy:traditional` |
| 파라미터 반영 | ✅ 파라미터별 출력 크기/내용 상이 (변형 실효성 확인) |
| pytest (engine) | ✅ 5 passed |
| 클램프 | ✅ `{9999,-99,5}` → `{900,-15,1}` |

## 알려진 한계 (Warning, 백로그)
- `start` 스크립트가 포트 3000 하드코딩 → nginx 규약(3001)과 불일치. 실행은 `next start -p 3001`로 우회 가능하나 스크립트 정리 권장.
- 폰트 다운로드 미러 모두 실패 시 `/generate` 503 (오프라인 취약).
- `curvature`는 Recursive `CASL` 축 근사. `imagePng`는 Phase 1 미사용(자리만).
- 다운로드 버튼 disabled(미구현, Phase 1 범위 외).
