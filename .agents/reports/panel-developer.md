# 🧑‍💻 개발자 참견쟁이 — Phase 2 코드 리뷰

**한 줄 결론:** 계약 v4 정합성·재현성·에러 살균은 탄탄하나, **변주 갤러리(9회 생성)가 한글에서 무료티어 OOM/지연을 유발하는 구조적 부하**와 **PNG 내보내기의 비결정성·접근성 공백**이 출시 전 정리 대상이다.

**Blocker: 2 / Warning: 9**

---

## BLOCKER

### B1. 변주 갤러리 9회 생성 × 한글 = 무료티어 직격 (성능/회귀)
- `apps/font/frontend/components/VariationGallery.tsx:31,151` — 프론트 `CONCURRENCY=3`로 9개를 3개씩 던진다.
- `apps/font/engine/main.py:50,213-218` — 한글 세마포어는 `MAX_CONCURRENT_HANGUL=1`. 즉 갤러리가 한글에서 3개를 동시에 쏘면 **1개만 통과, 나머지 2개는 즉시 503**(`sem.locked()` 체크). 워커는 503을 `catch`해 해당 칸을 `error("—")`로 칠한다(`:140-148`). 결과적으로 **한글 갤러리는 9칸 중 상당수가 항상 "—"로 깨진 채 뜨는 회귀**다(동시 사용자 0명이어도 자기 자신끼리 충돌).
- 동시에, 라틴이라도 한글 한 번 생성 = Pretendard 6.7MB 로드 + 2,424자 서브셋 + 전 글리프 좌표 변형. 이를 **9연속**으로 돌리면 스레드풀(`run_in_executor` 기본 워커)에서 TTFont 인스턴스가 여러 개 동시 상주 → Oracle 무료티어(통상 1GB) 메모리 피크가 위험.
- **영향:** 한글 갤러리 기능이 사실상 동작하지 않음 + 메모리 스파이크.
- **수정안:**
  1. 갤러리는 **한글일 때 `CONCURRENCY=1`**로 낮추고, 503을 받으면 즉시 error 처리 말고 **소폭 백오프 후 재시도**(예: 1회). 또는
  2. 9칸을 매번 풀 폰트로 굽지 말고, **공통 베이스(인스턴싱+서브셋)를 1회 만든 뒤 좌표 변형만 9회** 적용하는 엔진 전용 배치 엔드포인트(`/generate-batch`)를 두어 폰트 로드/서브셋 비용을 1/9로. 후자가 무료티어에 정답.

### B2. 베이스 폰트가 매 요청마다 디스크에서 재파싱됨 (성능)
- `apps/font/engine/main.py:160-167` → `generator.generate_font():404` 가 `TTFont(base_font_path, ...)`를 **요청마다 새로 파싱**한다. "startup 1회 로드/캐시"라는 docstring(main.py:18)과 달리, 캐시되는 것은 **파일 경로(disk 존재)**일 뿐 파싱된 `TTFont` 객체가 아니다.
- 한글 Pretendard 6.7MB 파싱은 매 호출 수백 ms~초. 갤러리 9회면 9회 파싱.
- **영향:** CPU·지연 낭비, B1과 곱연산으로 악화.
- **수정안:** 인스턴싱이 `inplace=True`로 원본을 변형하므로 객체 캐싱은 `deepcopy` 필요 → 비용 큼. 대안으로 **직렬화된 base bytes를 메모리에 캐시**(`path.read_bytes()` 1회)해 `TTFont(io.BytesIO(cached_bytes))`로 파싱만 반복(디스크 I/O 제거). 근본 해결은 B1-2의 배치화.

---

## WARNING

### W1. PNG 내보내기가 비결정적 + 메모리 스파이크 (버그/성능)
- `components/FontPreview.tsx:209-217` — 질감을 `Math.random()`으로 `density` 14,000~26,000개 점을 1px씩 `fillRect`. (a) **재현 불가**(같은 설정도 매번 다른 PNG), (b) rough에서 26k회 개별 draw call은 저사양 기기에서 수백 ms 프리즈. 또한 1200×675 캔버스 `toDataURL`은 동기 대용량 문자열.
- **수정안:** 질감은 시드 기반 결정적 노이즈(작은 오프스크린 타일을 반복 패턴으로) 또는 `createImageData` 한 번에. 점 개수 대폭 축소.

### W2. PNG가 등록된 모든 폰트의 `fonts.ready`를 기다림 (버그)
- `FontPreview.tsx:197` `await document.fonts.ready` — 갤러리가 9개 FontFace를 비동기 로드 중이면 PNG가 그 전부를 기다린다. 또 `ctx.font`에 넣은 `activeFamily`가 그 시점 로드 완료라는 보장은 `fonts.ready`에만 의존 → 레이스 가능.
- **수정안:** `await face.load()` 핸들을 보관해 그것만 `await`. 전역 `fonts.ready` 의존 제거.

### W3. 갤러리 FontFace 누수 — `loading`과 disabled 불일치 + 미정리 경로 (성능/버그)
- `VariationGallery.tsx:128-138` — 9개 FontFace를 `document.fonts`에 add하고 `facesRef`로 추적하지만, **컴포넌트 언마운트 시에만** cleanup(`:91`). 스튜디오에 머무르며 "다시 9가지 뽑기"를 반복하면 `cleanupFaces()`가 앞 세트를 지우긴 하나, `myseq!==seqRef` early-return 경로(`:125,131`)에서 **이미 `document.fonts.add` 된 face가 `facesRef`에 push되기 전 return**되면 추적 누락 → 영구 누수.
- 또 `FontStudio.tsx:245`에서 갤러리 `disabled`에 `loading`을 빼고 `downloading`만 넘긴다(프리뷰 슬라이더 패널은 `loading||downloading`). 프리뷰 생성 중에도 갤러리 9연발이 가능 → B1 부하 가중.
- **수정안:** add 직후 즉시 push, early-return 전에 `loaded` 정리. 갤러리 `disabled={loading||downloading}`.

### W4. contrast/roundness/wave 변형 순서로 인한 좌표 왜곡 (버그)
- `generator.py:312-340` — 한 루프에서 (1)smoothed/jitter → `ny` 확정 → (2)contrast가 `cx`(원좌표 평균, `:278`) 기준으로 `nx` 압축 → (3)wave는 `ny`로 sin → (4)shear는 `ny`로. weirdness가 켜지면 `ny`에 jitter+baseline이 섞인 값으로 contrast/wave 위상이 계산돼, **"contrast는 결정적·seed무관"이라는 계약 주석(index.ts:30)·테스트(test_contrast_seed_independent)와 어긋날 수 있다**(현재 테스트는 weirdness=0이라 통과). weirdness+contrast 동시 사용 시 seed가 contrast 결과까지 흔든다.
- **영향:** 문서/계약상 "직교" 주장 위반(기능은 동작). 프리셋 `rough`(weirdness 68)+contrast 조합에서 미묘.
- **수정안:** contrast/wave를 **원본 y(`coords` 초기값) 기준**으로 계산하거나, 주석을 "weirdness와 함께 쓰면 상호작용함"으로 정정.

### W5. roundness 컨투어 경계 인덱싱 검증 필요 (버그 가능성)
- `generator.py:294-310` — `endPtsOfContours` 기반 순환 이웃. `clen<3`이면 스킵하나, glyf의 **2점 컨투어(드묾)·implied on/off-curve 혼재**를 점 종류 무시하고 평균낸다 → off-curve 컨트롤점을 잘못 끌어당겨 형태 붕괴 가능. 현재 테스트는 좌표 변화만 확인(`!=`)하고 시각 검증은 없음.
- **수정안:** `glyph.flags`로 on-curve 점만 스무딩 대상. 최소한 round=1.0 글리프 렌더 스냅샷 회귀 테스트.

### W6. 다운로드/PNG 파일명 해시가 v4 파라미터를 무시 (버그·UX)
- `FontStudio.tsx:43-47` `shortHash`는 `weight/slant/curvature/weirdness/seed`만 사용. waviness/contrast/roundness/waveFreq/mono/cursive/letterSpacing가 달라도 **같은 파일명** → 사용자 다운로드 폴더에서 덮어쓰기 혼동. (엔진 `_build_font_family`는 전 파라미터 반영하므로 폰트 내부명과 파일명도 불일치.)
- PNG 파일명(`FontPreview.tsx:223`)은 `hwoek-specimen-${script}.png`로 **파라미터 전무** → 여러 번 저장 시 (n) 중복.
- **수정안:** `shortHash`에 전체 params 직렬화. PNG에도 해시 포함.

### W7. PreviewStyle 색 입력이 6색 스와치 고정 — 라벨/대비/커스텀 부재 (접근성/UX)
- `PreviewStylePanel.tsx:32-33` — `<input type="color">` 없이 스와치 6개만. 색 이름이 hex(`aria-label="글자색 #2b2a33"`)라 스크린리더 무의미. 흰 잉크+투명 배경이면 화면에서 글자 안 보임(대비 가드 없음). PNG도 동일.
- **수정안:** 색에 의미 라벨(먹색/주황 등), 대비 경고, 선택적 커스텀 컬러 피커.

### W8. 슬라이더 10개+에 그룹/단위 ARIA 보강 여지 (접근성)
- `packages/ui/src/Slider.tsx` — 네이티브 range + `aria-valuetext` 양호. 다만 `ParameterPanel`의 subgroup 제목(`기본 골격` 등)이 `<p>`라 슬라이더와 프로그램적으로 묶이지 않음(`role="group"`+`aria-labelledby` 없음). "물결 주기" 비활성(waviness=0) 시 이유 미고지.
- 갤러리 셀은 `role="list/listitem"`을 `<button>`에 얹어 **암묵적 role 충돌**(button role이 listitem을 덮음). `aria-label`은 있으나 키보드 포커스 순서/포커스링 확인 필요.
- **수정안:** subgroup `<fieldset>`/`role=group aria-labelledby`. 갤러리는 `<ul><li><button>` 구조로.

### W9. FE 테스트 전무 / BFF·갤러리·PNG 미검증 (품질)
- 엔진 39 passed로 견고하나 **프론트엔드 테스트 0건**. `route.ts`의 413/imagePng data-URI 검증, `clampParams` 재호출, `VariationGallery.buildVariants` 결정성, `base64ToBlob` 등 순수 함수조차 미검증. 회귀(B1·W6) 재발 방지 불가.
- **수정안:** 최소 `route.ts`(크기/스킴/타임아웃 mock) + core `clampParams/STYLE_PRESETS` 단위 테스트 도입.

---

## 정합성·보안 점검 결과 (양호 항목, 근거)
- 계약 v4 ↔ 엔진 ↔ FE **필드 12개 전부 일치**(index.ts:33 / main.py:92 / generator.py:55). 범위·기본값 동일. **MAX_IMAGE_PNG_BYTES=2_000_000 3곳 동기화**(index.ts:145, main.py:45, route.ts:12) — 과거 누락 회귀 재발 없음.
- **PreviewStyle은 엔진에 새지 않음**: FE는 `GenerateRequest`에 texture/pattern/color 미포함(FontStudio.tsx:89-93,157-161), 엔진 모델에도 필드 없음. 정직성 라벨 명시(PreviewStylePanel.tsx:43). 양호.
- **SVG/XSS:** PNG는 Canvas 2D 직접 렌더(SVG `foreignObject` 미사용)라 SVG injection 없음. 색은 `ctx.fillStyle`/CSS에만 들어가고 DOM에 사용자 문자열 미주입.
- 에러 살균(main.py:140-147, route.ts:113-136), CORS 화이트리스트(main.py:82-88), 재현성 타임스탬프 고정(generator.py:464), 폰트 다운로드 스트리밍 상한/HTTPS/content-type 검증(font_loader.py) — 모두 양호.
- ⚠ 사소: `route.ts:17 maxDuration=30` > `ENGINE_TIMEOUT_MS=20s`라 BFF가 먼저 504 abort → 일관. 단 갤러리 9연발 시 클라 측 전체 타임아웃 가드는 없음.
- ⚠ 사소: `font_loader` HANGUL 폴백이 Pretendard→NotoSansKR-VF인데 두 폰트 metrics가 달라 폴백 시 좌표 변형 강도(em_scale)는 보정되나 **HANGUL_SUBSET_TEXT가 Pretendard 가정** — Noto 폴백 시 일부 음절 누락 가능(회귀 테스트 없음).

---

## 필수 수정 TOP 5 (무료티어 성능·회귀 우선)
1. **[B1]** 갤러리 한글 `CONCURRENCY=1` + 503 백오프, 또는 엔진 배치 엔드포인트로 폰트 로드/서브셋 1회화. *(한글 갤러리 깨짐 회귀 + OOM)*
2. **[B2]** 베이스 폰트 bytes 메모리 캐시로 매요청 디스크 재파싱 제거.
3. **[W3]** 갤러리 `disabled={loading||downloading}` + FontFace 누수 정리(add 직후 추적, early-return 전 cleanup).
4. **[W1/W2]** PNG 질감 결정화·점수 축소 + `activeFamily` face만 await(전역 `fonts.ready` 의존 제거).
5. **[W6/W9]** 다운로드·PNG 파일명에 전체 params 해시 반영 + 최소 FE 단위 테스트(route 검증·clampParams·buildVariants).
