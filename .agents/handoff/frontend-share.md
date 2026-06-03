# FE 인수인계 — 공유 링크 + 동적 OG 미리보기 (저장소 0)

한 줄: 손글씨 문구를 **URL에 상태를 인코딩**해 링크 하나로 공유 → 받는 사람은 설치 없이 `/font/s`에서 보고(이미지 저장·리믹스), 카톡/SNS엔 동적 OG 미리보기. **서버 저장 0.**

## 구현 (apps/font/frontend/ 만 수정)

### 1. 상태 인코딩/디코딩 — `lib/shareCodec.ts`
- 공유 대상 `SharePayload` = { script(latin|hangul), text, refine, style(bg/template/size/align/ink/bgColor/accent), glyphs(문구에 필요한 글자/자모의 획만) }.
- 파이프라인: 좌표 양자화(0..1→0..255) + 획 내 **델타 인코딩** → 짧은 키 JSON → **deflate(`CompressionStream` "deflate-raw")** → base64url.
- `encodeShare()`가 `SHARE_MAX_CODE_LEN`(6000자) 초과 시 **null** 반환 → 버튼이 "문구를 줄이세요" 안내.
- `decodeShare()`는 역순 + 보수적 재검증(script별 char 화이트리스트, 색은 형식만 두고 렌더 시 sanitizeColor 재살균, 텍스트 200자 상한).
- 라운드트립 검증 완료: text/style 정확 일치, 좌표 오차 ≤ 1/255(~0.002).

### 2. 공유 버튼 — `components/ShareButton.tsx` (+ `.module.css`)
- 두 이미지 패널(`HandwritingImagePanel`, `HangulImagePanel`)에 PNG 내보내기 아래 배치.
- 현재 상태 인코딩 → `${origin}/font/s?d=<코드>` 클립보드 복사(+execCommand 폴백) → 토스트 "링크 복사됐다 너굴."
- 패널은 **렌더되는 문구에 실제 쓰이는 글자/자모의 획만** 페이로드에 담음(URL 경량).
- 패널 prop 추가: `HandwritingImagePanel`에 `glyphs`/`refine` 전달(스튜디오 `HandwritingStudio.tsx`에서 연결). 한글은 기존 `jamo`/`refine` 재사용.

### 3. 공유 뷰 — `app/s/page.tsx` + `app/s/ShareView.tsx` (+ `share.module.css`)
- `?d=` 디코드 → BFF(`/api/handwriting` 또는 `/api/hangul-compose`)로 woff 폰트 → FontFace 등록 → `lib/shareRender.ts`(이미지 패널과 동일 렌더 알고리즘)로 캔버스 렌더.
- 방문자 액션: **이미지 저장(PNG)** + **나도 내 글씨로 만들기**(→ `/studio`). 설치 안내 없음. "내 손글씨로 만든 이미지" 라벨.
- 디코드/로드 실패 graceful(에러 메시지 + 마스코트).

### 4. 동적 OG — `app/s/og/route.tsx` (Route Handler) + `page.tsx` generateMetadata
- **중요**: Next 14 파일 컨벤션 `opengraph-image`는 `?d=` 쿼리를 핸들러에 전달하지 않음(params만). 그래서 **일반 라우트 핸들러**로 OG를 만들고, `generateMetadata`의 `ogImage`가 `/font/s/og?d=…`를 명시적으로 가리키게 함.
- 라우트: `?d=` 디코드 → same-origin BFF로 **ttf** 폰트(Satori는 woff2 미지원) → `ImageResponse` `fonts`로 등록해 문구 렌더. 실패 시 기본 OG 폴백. `Cache-Control: public, max-age=86400, immutable`.
- `generateMetadata`가 title/description(문구 기반)·og:image·twitter(summary_large_image)까지 세팅.

### 5. 정직성/안전
- 색 `sanitizeColor` 재살균(인코딩·디코딩·OG 모두), 텍스트 200자 상한, basePath(`/font`)는 `apiPath()`로 일관 prefix.

## 검증
- `pnpm -r build` ✅ / `pnpm -r lint` ✅ (전 워크스페이스). `/s`, `/s/og` 라우트 정상 빌드.
- 코덱 라운드트립 정확성 단위 점검 통과.

## Blocker / Warning
- **Blocker 없음.**
- **Warning(오케스트레이터 e2e 필요)**: 실제 OG 이미지·공유 뷰 폰트 렌더는 **엔진(`/handwriting`, `/hangul-compose`)이 떠 있어야** 확인 가능. 엔진이 ttf 포맷을 반환해야 OG가 폰트를 임베드함(미반환 시 폴백 OG로 안전 동작).
- **Warning**: OG는 엔진 BFF를 서버에서 same-origin 호출함(`origin + NEXT_PUBLIC_BASE_PATH + endpoint`). 운영 nginx/리버스프록시에서 `/font/api/*`가 same-origin으로 도달하는지 Infra 확인 권장.
