# webapp — 웹앱 모노레포 허브

사용자가 그린 글씨에서 스타일을 추출/변형해 폰트를 만드는 웹 서비스로 시작하는 **모노레포 허브**입니다. 웹앱을 계속 추가할 수 있는 구조이며, 첫 앱은 **폰트 생성 서비스(`apps/font`)** 입니다.

## 구조
```
apps/font/frontend   Next.js — 드로잉 캔버스 · 파라미터 슬라이더 · 실시간 프리뷰
apps/font/engine     Python FastAPI — 기본 가변폰트 + 파라미터 변형 → WOFF 출력
packages/core        프론트·엔진 공유 계약(FontParams 등)
packages/{ui,seo,config}  공용 UI / SEO / 설정
home, infra          메인 홈페이지 · 배포(후속)
docs/                기획서 · Phase 1 체크리스트
```

## Phase 1 범위 (현재)
- **타깃**: 라틴 a–z (한글은 다음 단계)
- **방식**: 기본 가변폰트를 굵기/기울기/곡률로 변형 (**AI 미사용, 비용 0**)
- **목표**: 그리기 → 슬라이더 → 실시간 프리뷰 → WOFF 출력 e2e 동작

## 개발
```bash
pnpm install                 # 워크스페이스 의존성 설치
pnpm dev:font                # 폰트 프론트엔드 개발 서버

# 엔진 (별도 터미널)
cd apps/font/engine
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

자세한 작업 규칙은 [`CLAUDE.md`](./CLAUDE.md), 기획은 [`docs/font-project-plan.md`](./docs/font-project-plan.md) 참고.

> 이전 프로젝트(로또)는 `lotto-backup` 브랜치에 보관되어 있습니다.
