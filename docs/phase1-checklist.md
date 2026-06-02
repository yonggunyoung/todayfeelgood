# Phase 1 시작 체크리스트

> 목표: 모노레포 뼈대 + "그리기 → 폰트 생성(전통 방식) → 미리보기"가 끝까지 동작하는 최소 버전(MVP) 완성.
> 각 항목은 클로드 코드에 그대로 지시로 줄 수 있도록 작성했다. 위에서부터 순서대로 진행.

---

## STEP 0. 준비 (마스터가 먼저 확인)

- [ ] **기존 서버 환경 점검**: tripavi.kr이 올라간 Oracle 서버의 Node 버전, Python 버전, 가용 메모리/디스크 확인
- [ ] **새 작업 폴더** 생성 후 그 안에서 클로드 코드 실행
- [ ] 이 폴더에 `docs/font-project-plan.md`(기획서)와 `CLAUDE.md`(작업 지시서)를 넣어둠
- [ ] 첫 지시 예시: *"CLAUDE.md와 docs의 기획서를 읽고, phase1-checklist STEP 1부터 순서대로 진행해줘."*

---

## STEP 1. 모노레포 뼈대 만들기

> 담당: Infra-Agent + Shared-Agent

- [ ] 루트 `webapp/` 생성, 패키지 매니저 결정(pnpm 워크스페이스 권장 — 모노레포에 적합하고 가벼움)
- [ ] 폴더 생성: `apps/font/{frontend,engine}`, `packages/{ui,seo,config,core}`, `home/`, `infra/`, `.agents/{handoff,reports}`, `docs/`
- [ ] 루트 워크스페이스 설정 파일(`pnpm-workspace.yaml` 등) 작성
- [ ] 공용 설정 `packages/config`에 tsconfig·eslint·prettier 기본값
- [ ] `.gitignore` (node_modules, `.env`, 빌드 산출물, 생성된 폰트 파일 등)
- [ ] `.env.example` 작성 (실제 `.env`는 커밋 금지)
- [ ] **검증**: `pnpm install`이 에러 없이 끝나는지 확인

**완료 기준**: 빈 모노레포가 설치·빌드 가능 상태.

---

## STEP 2. 폰트 엔진 — 전통 방식 파이프라인 (핵심)

> 담당: Engine-Agent · 위치: `apps/font/engine/`
> 비용 0. AI 없이 알고리즘만으로 동작해야 함.

5단계 파이프라인을 순서대로 구현한다.

- [ ] **2-1 입력 인식** (`traditional/input.py`): 업로드/그린 이미지(PNG)를 받아 표준화(크기·흑백 정규화)
- [ ] **2-2 글자 분리** (`traditional/segment.py`): OpenCV로 개별 글자/획 영역 분리(컨투어 검출)
- [ ] **2-3 벡터화** (`traditional/vectorize.py`): Potrace로 비트맵 → 윤곽선(벡터) 변환
- [ ] **2-4 보간·스타일 적용** (`traditional/interpolate.py`): 추출한 특징(굵기/기울기/곡률)을 파라미터로 받아 나머지 글자에 적용
- [ ] **2-5 폰트 인코딩** (`encode/build_font.py`): FontTools로 글리프 조립 → **WOFF** 파일 출력
- [ ] **2-6 API화** (`main.py`): FastAPI 엔드포인트 `POST /generate` (입력 이미지 + 파라미터 → WOFF 반환)
- [ ] **단위 테스트**: 각 단계 입출력 테스트 (특히 2-3, 2-5)
- [ ] **비용 가드**: 이 경로에 외부 유료 API 호출이 전혀 없음을 주석으로 명시

**완료 기준**: 샘플 손글씨 이미지 1장 + 파라미터 → 실제 열리는 WOFF 폰트 파일이 생성됨.

---

## STEP 3. 프론트엔드 — 폰트 웹앱 최소 버전

> 담당: FE-Agent · 위치: `apps/font/frontend/` + `packages/ui`

- [ ] **3-1 드로잉 캔버스** (`DrawingCanvas`): 마우스/터치로 글씨 그리기, 지우기, PNG로 내보내기
- [ ] **3-2 파라미터 패널** (`ParameterPanel`): 굵기·각도·곡률 슬라이더. 값 변경 시 상태 업데이트
- [ ] **3-3 실시간 프리뷰** (`FontPreview`): 현재 파라미터로 생성된 폰트로 예시 문장 렌더링
- [ ] **3-4 엔진 연결**: 캔버스 PNG + 파라미터를 `POST /generate`로 보내고 WOFF 받아 `@font-face`로 적용
- [ ] **3-5 디바운스**: 슬라이더 조작 시 과도한 요청 방지(일정 시간 멈추면 호출)
- [ ] **3-6 결과 표시**: 생성된 폰트 미리보기 + (후속) 다운로드 버튼 자리만 마련
- [ ] **공통화**: 재사용할 UI는 `packages/ui`로 추출

**완료 기준**: 브라우저에서 글씨 그리고 슬라이더 움직이면 미리보기 폰트가 바뀌는 게 보임.

---

## STEP 4. 메인 홈페이지 (SEO 진입점)

> 담당: FE-Agent + Shared-Agent · 위치: `home/` + `packages/seo`

- [ ] **4-1 레이아웃**: 헤더/푸터/네비게이션, 앱 카드 목록(지금은 폰트 앱 1개)
- [ ] **4-2 폰트 앱 카드**: 클릭하면 `/font`로 이동
- [ ] **4-3 SEO 기본**: 메타태그, OG, JSON-LD, `sitemap.xml`, `robots.txt`
- [ ] **4-4 키워드 세팅**: "글씨체 만들기", "손글씨 폰트", "자동 폰트 생성" 등 타깃 키워드 메타 반영

**완료 기준**: 홈에서 폰트 앱으로 이동 가능, 검색엔진이 읽을 메타/사이트맵 존재.

---

## STEP 5. 라우팅·배포 (서브경로 전략)

> 담당: Infra-Agent · 위치: `infra/`

- [ ] **5-1 nginx 라우팅**: `메인도메인/` → 홈, `메인도메인/font` → 폰트 앱. (1단계는 서브경로만! 독립 도메인은 Phase 3)
- [ ] **5-2 엔진 프록시**: 프론트의 `/generate` 요청을 Python FastAPI로 프록시
- [ ] **5-3 배포 스크립트**: Oracle 무료 티어에 올리는 스크립트 + 헬스체크
- [ ] **5-4 리소스 점검**: 메모리/CPU 사용량 측정해 무료 티어 한도 내인지 확인

**완료 기준**: 외부에서 `메인도메인/font` 접속 시 폰트 앱이 뜨고 생성이 동작.

---

## STEP 6. 품질 요원 점검 (병렬/주기)

> 담당: Verify / Review / Audit / Security 에이전트
> 산출물: `.agents/reports/`

- [ ] **검증(Verify)**: e2e — 그리기→생성→미리보기 전체 흐름이 끊김 없이 동작하는지. 빌드·테스트 통과.
- [ ] **검토(Review)**: 폴더 경계 준수, 중복 코드(→ packages로 추출 권고), 네이밍·구조 일관성.
- [ ] **감사(Audit)**: 유료 API 무단 호출 없음, 비밀키 노출 없음, 무료 티어 리소스 초과 없음, 토스 정책 위반 소지 점검.
- [ ] **보안(Security)**: 이미지 업로드 검증(용량/형식/악성), 입력 검증, 의존성 취약점 스캔.
- [ ] 각 보고서 **한 줄 결론 + Blocker/Warning 분류**. Blocker는 즉시 수정.

**완료 기준**: 4개 보고서가 모두 "Blocker 없음" 상태.

---

## STEP 7. Phase 1 마무리

- [ ] 마스터에게 데모: 그리기 → 폰트 생성 → 미리보기 시연
- [ ] 알게 된 점 정리: 전통 방식 품질·속도 체감, 개선 포인트
- [ ] Phase 2 백로그 작성: AI 방식 프로토타입, 전통 vs AI 비교 화면, 사용자 테스트, 다운로드(TTF/OTF) 기능

---

## 부록: AI 방식(Phase 2 미리보기, 지금은 금지)

- Phase 1에서는 **전통 방식만** 구현한다. AI 방식 코드는 아직 붙이지 않는다.
- Phase 2에서 `apps/font/engine/ai/`에 추가:
  - `local_model.py`: 개발/테스트용 (로컬 오픈소스 또는 Claude CLI, 비용 0)
  - `api_client.py`: 운영용 (Claude/Google API, **유료 사용자 호출 시에만** 과금)
- AI 결과물에는 반드시 "AI 생성" 표시. (토스 정책 + AI 표시 의무)
