# CLAUDE.md — 작업 지시서

> Claude Code가 자동으로 읽는 작업 규칙 파일.
> **"무엇을 만드는가"** = `docs/font-project-plan.md`(기획서)
> **"어떻게 작업하는가"** = 이 파일.
> 충돌 시 이 문서의 작업 규칙을 우선한다.

---

## 0. 한 줄 정의
사용자가 그린 글씨/그림에서 스타일을 추출해 폰트를 만드는 웹 서비스.
**웹앱을 반복해 찍어내는 모노레포 허브** 구조이며, 폰트 앱이 그 첫 앱이다.

## 0.1 Phase 1 확정 방향 (마스터 결정)
- **타깃 문자**: 라틴 a–z(+대문자/숫자) 먼저. 한글은 다음 단계.
- **생성 방식**: **기본 가변폰트 + 파라미터 변형**(굵기/기울기/곡률). **AI 미사용**.
  - 이유: 비AI "보간"으로는 본 적 없는 글자를 창조할 수 없음. few-shot 손글씨 생성은 Phase 2의 AI로 분리.
- **MVP 목표**: 그리기 → 슬라이더 조작 → 실시간 프리뷰 → WOFF 출력이 끝까지 동작.

---

## 1. 레포 구조 (모노레포 / 확장성 우선)
```
webapp/ (레포 루트)
├── CLAUDE.md                 # 이 파일
├── docs/                     # 기획서·체크리스트
├── apps/font/{frontend,engine}   # ① 폰트 앱 (Next.js + FastAPI)
├── packages/{ui,seo,config,core} # 공용 모듈 (모든 앱 재사용)
├── home/                     # 메인 홈페이지(검색 진입점) — 후속
├── infra/{nginx,scripts}     # 배포·라우팅 — 후속
└── .agents/{handoff,reports} # 에이전트 인수인계/보고서
```
**파라미터 계약**은 `packages/core/src/index.ts`(`FontParams` 등) 단일 출처. 프론트·엔진이 같은 스펙을 쓴다.

### 새 앱 추가 규칙
1. `apps/<새앱>/{frontend,engine}` 생성. 2. 공통 로직은 복붙 금지, `packages/`에 추가.
3. `home/`에 카드/링크 추가. 4. `infra/nginx`에 `메인도메인/<새앱>` 라우팅 추가.

## 2. 기술 스택 / 환경 제약 (준수)
- 프론트: **Next.js(App Router) + React + TypeScript**, SEO 위해 SSR/SSG.
- 엔진: **Python 3.11 + FastAPI**. 라이브러리: fontTools, (필요시) Pillow/OpenCV.
- DB: 초기 SQLite → 확장 시 Postgres. 서버: **Oracle 무료 티어**(메모리/CPU 의식).

### 비용·리소스 철칙
- **전통 방식이 기본이며 비용 0.** 모든 기능은 먼저 전통 방식으로 동작.
- AI 방식은 유료 사용자 전용. 외부 유료 API는 **환경변수 on/off** + 호출 전 **비용 경고 주석** 필수. 기본 OFF.
- 무거운 ML 의존성은 도입 전 메모리 영향 검토.

## 3. 병렬 에이전트 운영
- **빌더**: FE-Agent(`apps/*/frontend`,`home`,`packages/ui`) · Engine-Agent(`apps/*/engine`) · Infra-Agent(`infra`) · Shared-Agent(`packages/*`).
  - 충돌 방지: 각 빌더는 **자기 폴더만** 수정. 경계를 넘는 변경은 Shared-Agent 경유.
- **품질 요원**: Verify(동작) · Review(품질/구조) · Audit(비용/정책/토스) · Security(취약점).
  - 산출물은 `.agents/reports/*.md`, 인수인계는 `.agents/handoff/*.md`. **한 줄 결론 + Blocker/Warning** 형식.

## 4. 코딩 규칙
- 프론트/백엔드 TS, 엔진 Python. 주석 한국어 OK.
- 커밋: 작은 단위로 자주, `[앱이름] 무엇을` 형식 (예: `[font] 캔버스 입력 추가`).
- 핵심 로직(파라미터 변형, 폰트 인코딩)은 단위 테스트 동반.
- 비밀값은 `.env`+환경변수, `.env` 커밋 금지.
- 폰트 출력 초기엔 **WOFF**. AI 결과물엔 처음부터 **"AI 생성" 표시** 코드 포함(토스 대비).

## 5. SEO 규칙
- 모든 페이지 고유 title/description/OG(`packages/seo`). SSR/SSG 렌더. sitemap/robots/JSON-LD 기본.
- 도메인: 1단계는 `메인도메인/font` 서브경로만. 독립 도메인은 Phase 3에서 301+canonical.

## 6. 토스 미니앱 대비 (Phase 4, 코드 짤 때부터 의식)
- 핵심 기능 **앱 내 완결**(외부로 보내 다운로드 금지). 자사앱 설치유도 금지.
- AI 결과물 "AI 생성" 라벨. 결제=인앱결제 / 로그인=토스로 갈아끼우게 추상화. 외부 광고망 직접삽입 금지.

## 7. 현재 우선순위 (Phase 1)
1. 모노레포 뼈대 ✅(진행) → 2. Engine: 기본폰트 파라미터 변형 → WOFF. → 3. FE: 캔버스+슬라이더+프리뷰.
4. 둘 연결 후 Verify가 e2e 확인. 상세는 `docs/phase1-checklist.md`.
