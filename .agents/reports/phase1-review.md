# Review — 광클대전 글로벌 Phase 1 (staged diff)

> **결론: 출시 가능. Blocker 0.** ko/en 키셋 완전 일치(86개 사용 키 전부 양어 정의됨), KR 폴백 바이트 단위 동등, 변조 안전. 자잘한 Warning 2 / Nit 3만 남음 — 전부 plan에 명시된 후속 항목이거나 사소한 표현 이슈.

검증한 것: `node --test` 14/14 PASS · index.html의 `t()` 호출 86개를 STR(ko/en)와 자동 대조(누락 0, 비대칭 0) · 원본(HEAD) 대비 KR 문자열 동등성 확인 · 렌더 JS 내 미래(未来)래핑 한글 크롬 리터럴 스캔.

---

## GOOD (확인된 강점)
- **i18n 키 무결성(결정적):** index.html에서 쓰는 `t()` 키 86개가 **ko/en 양쪽에 모두** 존재. ko-only/en-only 키 0개. `i18n.js` STR의 ko/en 키셋이 완전히 동일.
- **`t()` 폴백 3단(lang→ko→key):** `i18n.js:t` — 키 없으면 ko, ko도 없으면 key 자체 반환 → 절대 빈문자/undefined 노출 없음(불신 #1 충족).
- **`localize` 폴백 + 변조 안전:** `topics.js` `pick`/`side`/`localize` — 미지원 lang→ko, en누락→ko, 비객체/null 입력에도 throw 없이 안전 기본값(`color:#888888`, `taunts:[]`). 경계 4종 테스트로 둘러쌈.
- **KR 폴백 바이트 동등(가역성 #4):**
  - `comma` ko-KR, `mdShort`/`mdLabel` ko 분기 = 원본과 동일("6.18","6월 18일").
  - `shareText`(ko) = 원본 공유문과 `\n` 포함 완전 동일. `shareRankReal/Est`(" · 전국 {n}위"/" · 예상 {n}위") = 원본 동일.
  - `verdictWin/Lose/Tie`, 랭킹 라벨, 광고 오버레이 문구 모두 ko 동일.
- **조사 처리 정확:** `joinLabel`(index.html:365)이 `LANG==='ko'`에서만 `withEuro` 호출, 그것도 **localize된 한국어 진영명**에 적용 → "민초단으로 참전" 정확. en에선 withEuro 미호출(영문명에 0xac00 연산 안 함).
- **`localize` 1회 호출 규율:** `GO()`가 시작 시 1회 localize→`B.bt`에 평탄 저장, 이후 `frame/ticker/result`는 `B.bt` 재사용(raw battle을 다시 렌더하는 경로 없음). intro/rankBoard도 각자 localize. → "raw battle로 렌더" 버그 없음.
- **XSS 일관성:** 닉네임 출력에 `esc()` 추가(intro 버튼 `esc(F.nick)`, 지역 옵션 `esc(rn)`) — 기존 누락분까지 보강.
- **shadowing 정리(좋은 리네이밍):** 기존 `t`(엘리먼트/팀/tot 지역변수)가 새 전역 `t()`(번역)와 충돌하던 자리를 `tk`/`tm`/`tot`/`rem`/`lt`로 전부 리네임 → `tickerBeat`,`renderBoard`,`renderRegion`,`houseAd`,`rankBoard`. 충돌 0.
- **자원/계약 보존:** geo는 외부 API 0(`Intl`+`navigator`만, D1·비용철칙). sw.js v3 + 신규 3파일 캐시 일치. `countryInfo`는 항상 객체 반환 → `MYINFO.flag` 접근 안전, `regionDefault`도 `MYINFO&&MYINFO.nameEn||'Global'` 가드.

---

## Blocker
- 없음.

## Warning
- **W1 — 영어 모드에서 한국 지역명이 한글로 노출** (`index.html:103 regionName`, `REGIONS` 18종).
  en 사용자가 지역을 고르거나 랭킹/지역점령에 한국 지역이 뜨면 "서울/경기…"가 한글로 보임. 단, 이는 **plan에 명시된 의도적 후속**(문서 §5 "남김(후속): 한국 지역명 18종", 경계 D-list)이라 *이번 스코프 버그는 아님*. 다만 영어 첫인상 품질에 영향 → Phase 2 진입 시 누락되지 않도록 추적 필요.
  제안: Phase 2에서 `REGIONS`에 `{k,n:{ko,en}}` 양어화 + `regionName`도 `pick` 사용. (지금 손대면 경계 침범이므로 *지금은 하지 말 것*.)
- **W2 — `<title>`/메타/OG가 한국어 고정** (index.html `<head>`, 이번 diff 미포함).
  LANG=en이어도 문서 타이틀·OG는 한국어 → SEO/공유 카드가 영어권에 안 맞음. plan §5에 "후속"으로 명시됨(역시 의도적). 추적용으로만 기록.

## Nit
- **N1 — ko 화면 kicker에 국기 글리프 상시 노출** (`index.html:377`).
  기존 ko는 "광클대전 · 6월 18일 · 전국". 신규는 "… · 🇰🇷 전국". 감지 성공 시 자연스러우나, **미감지 시 `flagOf('')`=🏳️(백색기)** 가 '전국' 앞에 붙어 "🏳️ 전국"으로 다소 어색. KR 경험 100% 동등 원칙(경계 #5)에 비춰 미세한 변화.
  제안(선택): ko이고 `MYINFO.code===''`일 때 flag 생략 → `(LANG==='ko'&&!MYINFO.code?'':MYINFO.flag+' ')`. 기능엔 무해, 표현만 정리.
- **N2 — 미사용처럼 보이는 STR 키 3종 보존:** `liveWorld`,`worldTitle`,`worldFlow`는 현재 `t()` 호출처 없음(literal 기준). 세계뷰(Phase 2) 대비 선반영으로 보임 → **dead code 아님**, 다만 "Phase 2 예약" 주석 한 줄 있으면 다음 작업자가 혼동 없음. (`shareRankReal/Est`는 동적 키 `t(real?...:...)`로 정상 사용 중 — 오탐 아님.)
- **N3 — `BATTLES = GCTopics.BATTLES` 전역이 raw(양어) 형태:** 의도된 설계(표시 직전 localize)지만, 만약 향후 누군가 `BATTLES[i].name`을 직접 렌더하면 `[object Object]`가 나올 수 있음. 현재 코드엔 그런 경로 없음. 방어적으로 주석(이미 있음: "표시 직전 localize")으로 충분 — 조치 불요, 인지만.

---

## 테스트/구조 메모
- `topics.test.mjs`(신규 124줄): 정상/매핑(언어폴백)/None(빈·미지원lang)/변조(null·42·문자열·비객체 진영) 4종 + id 유일성 + 비언어데이터 보존까지 커버. 양호.
- `i18n.test.mjs`: `joinA→join`,`{a}→{name}` 키 변경에 맞춰 테스트도 동기 수정됨(스펙-테스트 정합).
- 모듈 분리(i18n/geo/topics)가 기존 net.js/toss.js와 동급 UMD 패턴으로 일관(D2).
