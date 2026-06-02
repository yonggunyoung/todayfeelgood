# 통합 정리 라운드 — Shared-Agent 인수인계

**한 줄 결론:** 패널2 지적(토큰 복제·스티커 모바일 액션바·색 살균·인라인 컴포넌트·마스코트 표정)을 정리했고, `pnpm -r build`/`pnpm -r lint` 모두 green 유지.

## 완료 (P0)
1. **디자인 토큰 단일화** — `packages/ui/tokens.css` 신설(라이트+다크 변수 110여 개 + body/h1-3/.container 등 베이스 스타일 단일 출처). 5개 앱(font/sticker/sign/kit + home) globals.css는 `@import "@webapp/ui/tokens.css";` 한 줄 + 앱 고유 주석만 잔존. 빌드 산출 CSS에서 5개 앱 모두 `--bg` 동일·`prefers-color-scheme:dark` 1개 확인(다크 유지). 워크스페이스 심볼릭링크로 `@webapp/ui/tokens.css` 정상 resolve.
2. **스티커 모바일 하단 고정 액션바** — 폰트앱 패턴(`position:fixed` 하단 + `var(--safe-bottom)` safe-area + `.layout` padding-bottom 확보)을 스티커에 적용. 데스크톱 `.actions`는 모바일에서 숨기고 만들기/주사위/ZIP 버튼을 하단 바로. **kit**도 동일 하단 고정 받기 바 추가(`.desktopGet` 숨김 ↔ `.barGet`). **sign**은 상단 sticky 프리뷰 블록에 `max-height` 제한(프리뷰 44vh 스크롤)으로 받기 패널이 한 시야에 남도록 보완.
3. **색상 입력 살균(보안)** — `packages/ui/src/color.ts`의 `sanitizeColor`(hex/rgb·hsl 함수형/안전 키워드 화이트리스트, 그 외 fallback) 신설·export. sign `render.ts`의 SVG raw 보간(`stroke="${ink}"`, `fill="${bg}"`, `font-family='${fontFamily}'`)을 살균값으로 교체 + `clampSign`에 `inkColor`/`bgMode` 살균 추가. kit `buildHarmony`에 accent hex 화이트리스트 가드. (스티커는 사용자 색 입력 경로 없음 — 상수 팔레트라 변경 불요, 유틸은 피커 확장 대비 준비됨.)

## 완료 (P1·P2)
4. **공용 컴포넌트 통일** — sticker·kit의 인라인 Segmented/Chip을 `@webapp/ui`의 `Segmented`/`Chip`으로 교체(thumb 슬라이드·선택색 일관화). 해당 인라인 CSS(`.segmented/.seg/.segOn/.chip/.chipOn`) 제거.
5. **마스코트 표정** — 3개 스튜디오(sticker/kit/sign) 에러 상태에 `worried` 너굴이 연결(死장 자산 활용). 빈 상태=`sleepy`는 기존 유지.
6. **P2** — 색지 톤 depth: `--bg` `#f6f4f0`→`#f4f1ea`(흰 surface와 살짝 더 구분, 과하지 않게). 스티커 "12종" 카피를 `MAX_STICKER_SET_SIZE` 상수로 단일출처화(랜딩 2곳). font SiteChrome 주석 "획이"→"획" 정리.

## 미완 / 다음 라운드
- **마스코트 `surprised`(갱신 순간)** 미연결 — 디바운스 갱신 토스트가 없어 자연스러운 트리거 부재. 추가 시 별도 UI 필요.
- **홈 공용 헤더(W1)** 미도입 — home에 SiteHeader 부재. 도입 시 home/ 레이아웃 변경(자기 영역이나 범위 판단상 보류). 
- **landing의 `focused` 사용**(font/sign "만드는 법" 섹션)은 그리기/집중 맥락이라 오용 아님으로 판단해 유지.
- **W3 붓획 농도 균일화**(sticker/kit 랜딩 BrushUnderline) 미적용 — 시각 추가라 이번 정리 범위서 보류.

## 검증
- `pnpm -r build` EXIT 0 (9 프로젝트), `pnpm -r lint` EXIT 0 (No ESLint warnings or errors).
- 자기 영역(packages/ui, apps/*/frontend, home)만 수정. core/seo/engine/infra/docs/CLAUDE.md 미수정. git 미수행.
