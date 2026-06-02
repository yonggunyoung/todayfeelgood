# FE 인수인계 — 정체성 표면화 라운드

> 한 줄 결론: "잘 만든 iOS 클린 템플릿"에 **문방구 정체성(색지·붓획·스티커·살아있는 글자·큰 너굴이)** 을 입혔다. AI 클리셰 재발 0, 기존 iOS 기본기·테라코타 악센트 유지. build/lint 통과.

## 처리한 정체성 항목 (디자이너 B1/B2/W1~3 대응)

1. **색지 물성** — 두 globals.css에 `--paper-grain`(인라인 SVG feTurbulence, saturate 0, opacity 0.04 / 다크 흰점 0.05) 토큰 추가, `body`에 `background-image + background-attachment:fixed`로 미세 그레인. 순백 카드와 바탕이 구분됨. 과하지 않게 저대비.
2. **붓획 모티프** — `packages/ui`에 경량 `BrushStroke.tsx`(`BrushDivider`·`BrushUnderline`, 끝이 가늘어지는 불규칙 stroke + 잔획). 적용처: 홈/랜딩 섹션 디바이더 각 1곳, 랜딩 헤드라인 "글씨체" 강조 밑줄, 스튜디오 제목 밑줄. 직선 1px 대체.
3. **스티커/마스킹테이프** — `packages/ui`에 `Sticker.tsx`(tape=찢긴 반투명 띠 clip-path / sticker=둥근 그림자 알약, 기울기 prop). 절제 적용: 홈 견본카드 "견본 노트" 테이프, 홈 "다음 작업대" 준비중 스티커, 랜딩 견본띠 "한 벌 견본" 스티커.
4. **살아있는 글자** — `packages/ui`에 `LiveText.tsx`(글자별 시차 숨쉬기 keyframe, `prefers-reduced-motion` 시 정지). 랜딩 히어로 메인 글자에 적용(기존 굵기 호흡 + waviness 결합).
5. **너굴이 크게 + 표정** — 홈 meet 132px `love`, 홈 다음작업대 `focused` 64px, 랜딩 how 96px `focused`, 스튜디오 **다운로드 성공 토스트 `love` 56px**(`justDownloaded`가 만들어만 두고 미사용이던 것을 실제 연결). 빈/로딩 상태 마스코트(sleepy/surprised)는 기존 유지.
6. **홈 보강** — 견본 4칸을 캔디 색지 톤(butter/coral/mint/plum, `color-mix`로 16% 옅게 + 상단 4px 띠)으로, 마스킹테이프·붓획 디바이더·코너 마스코트로 휑함 제거.
7. **스튜디오 3단계 위계** — 7카드 평면 → **① 빠른 시작**(문자체계+프리셋+변주, 강조 그라데이션 표면+배지), **② 세부 조절**(`<details open>` 슬라이더), **③ 고급/실험**(PNG효과·스케치를 접힌 `<details>`로 강등). 아코디언 화살표·focus-visible 처리.

## 사용 모티프 / 토큰
- 신규 공용 컴포넌트(packages/ui): `BrushDivider`, `BrushUnderline`, `Sticker`, `LiveText` (index.ts export 추가). 전부 인라인 SVG/CSS, 에셋 0, 토큰 의존(다크 자동 대응).
- 신규 토큰: `--paper-grain`(두 globals.css 동기화).
- candy 변수를 배경 색지 면에 실사용(기존엔 마스코트 볼터치에만 쓰였음).

## 검증
- `pnpm install` OK / `pnpm -r build` ✅ (home 6쪽·font 7쪽 정적 생성) / `pnpm -r lint` ✅ (0 warnings).
- reduced-motion: LiveText·toast·mascot float 모두 애니메이션 정지. 붓획/스티커는 정적.
- basePath 링크(`SiteChrome` `<a href="/">`) 및 정직성 라벨("공개 폰트 변형…") 유지.
- 자기 영역(`apps/font/frontend`, `home`, `packages/ui`)만 수정. engine/infra/docs/core/CLAUDE.md 불변. git 미사용.

## 남은 권고(다음 라운드)
- 모바일 하단 시트/탭바(B1-4) 미구현 — 스튜디오 모바일은 여전히 세로 스택. 본 라운드는 위계·접기로 과밀만 완화.
- 변주 갤러리 자동 1회 생성(W3)·Segmented 3옵션 인디케이터 보정(W4)은 미착수.
