# Handoff — 텍스트 이모티콘공방(textmoji) MVP

**한 줄 결론:** 게이트 통과 코어(절차적 조합 생성기 + 호환성 안전등급)를 갖춘 `apps/textmoji/frontend`(서버 0) 신설 + home 전면 재배치 완료. build·lint·코어 스모크 통과.

## 무엇을 만들었나
- **신규 앱** `apps/textmoji/frontend` (`@webapp/textmoji-frontend`, Next, basePath `/textmoji`, 서버/engine 0). dev 포트 3003.
- **home 전면 재배치**: 텍스트 이모티콘 = 히어로 + 1순위 전면 카드. 폰트·스티커·키트는 하위 그리드. **싸인공방은 `<details>` "다른 공방 더 보기" 접힘 구석**으로 강등. 디자인/너굴이 유지.

## 게이트 코어(생성기 우선, 큐레이션은 시드)
- `lib/generate.ts` — 부품 × 감정 × 스타일 × **mulberry32 시드** → 절차적 조합. 좌우 미러 대칭, 팔/소품 액션, 장식 fancy 0~2. 같은 시드=같은 결과(재현/공유 가능). 🎲 더 만들기=시드 교체. 하드 필터(괄호 균형·선두 결합문자) 후 재시도.
- `lib/parts.ts`·`lib/emotions.ts`·`lib/curated.ts` — 전부 **데이터 배열**(트렌드=항목 추가만). 감정 12종(화남=trend), 큐레이션 시드 49개(첫인상용 부트스트랩).
- `lib/safety.ts` — **호환성 안전등급(정직성 코어)**. 유니코드 블록·결합문자·ZWJ·상위평면 휴리스틱으로 🟢safe/🟡ok/🔴fancy **추정**. UI·푸터·복사 토스트에 "추정치 / 상대 기기에선 □로 깨질 수 있음" 명시(거짓 안심 금지). 안전 우선 정렬 + "🟢 안전만" 필터.

## UX (모바일 단일 화면)
- `app/studio/TextmojiStudio.tsx` — 상단 sticky(검색·감정칩 가로스크롤·스타일칩), 큰 카드 그리드(원탭복사 큰 터치타깃·등급배지·★·생성라벨), 하단 🎲 더만들기, 하단 탭바(전체/즐겨찾기).
- **원탭 복사** `lib/clipboard.ts`(navigator.clipboard + execCommand 폴백), 토스트 `aria-live="polite"`. **즐겨찾기** `lib/favorites.ts`(localStorage). 검색=감정 라벨/키워드/텍스트 부분일치. `prefers-reduced-motion` 대응.
- 랜딩 `app/page.tsx` + SEO(buildMeta·JSON-LD·robots·sitemap, basePath `/textmoji`).

## 검증
- `pnpm install` OK → `pnpm --filter @webapp/textmoji-frontend build` ✅, `lint` ✅(0 경고), `@webapp/home build` ✅.
- 코어 스모크(tsc 트랜스파일 후 node): 등급 산정·well-formed·12감정 생성(전부 well-formed)·시드 결정성·safeOnly 필터·action·큐레이션 전수 — **ALL PASSED**.
- 스모크 중 발견·수정한 버그 1건: `ᴥ`(U+1D25, Phonetic Extensions)가 등급 미분류로 fancy 오판 → 해당 블록을 ok에 추가(곰 입 카오모지 정상 ok).

## 정책/토스
- 앱 내 완결(복사=인앱), 외부 유출 0, 텍스트만(XSS 없음), 광고망 없음. source="generated" 라벨 항상 노출.

## 남은 것(범위 밖·다음)
- 공유 URL `/textmoji/s/[seed]` OG 페이지(바이럴 루프) — 미구현(우선순위 4).
- "깨져요" 사용자 신고 → 등급 보정 누적(우선순위 5) — 휴리스틱만으로 시작.
- `infra/nginx`에 `/textmoji` 라우팅 추가, `packages/core`에 textmoji 계약 흡수(현재 자급)는 **Infra/Shared 에이전트 담당**(내 영역 밖).
