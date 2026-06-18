# Phase 1 Audit — 광클대전 글로벌 기반 (i18n/topics)

> **결론: PASS — 비용 0·토스 정책·경계·5원칙 모두 준수. Blocker 0 / Warning 0 / Nit 2.**
> 순수 표현(presentation)층 가산 변경. 외부 API·CDN·폰트·네트워크 추가 0, Firestore 읽기/쓰기 증가 0, 게임플레이 수치 불변, 금지 파일 무수정. 테스트 14/14 통과(`node --test`).

- 감사 대상(staged): `static-apps/gwangclick/{topics.js(신규), i18n.js, index.html, sw.js, tests/i18n.test.mjs, tests/topics.test.mjs(신규)}`, `docs/gwangclick-global-plan.md`
- 브랜치: `claude/great-darwin-1FmUy` (= 설계서가 지정한 great-darwin 워크스페이스, **`main` 아님** → 경계 §1 준수)
- 미감사(범위 밖): `geo.js`는 이번 staged diff에 **없음** — 직전 커밋 `db01133`에 이미 존재(HEAD에 트래킹됨). 이번 변경은 `geo.js`를 *사용*만 함.

---

## 1. 비용 0 / 리소스 (D1/D2) — ✅ PASS
- staged 소스(+라인) 전수 스캔: **새 `https?://`·`fetch(`·`XMLHttpRequest`·`import(`·`new Image`·`.src=`·CDN·`googleapis`·`fonts.` 0건.** 모든 신규 문자열은 정적 사전(STR)·정적 데이터(BATTLES).
- 기존 pretendard CDN(`index.html`)은 **이번 diff에 등장하지 않음** = 무수정. 신규 의존성 아님.
- `i18n.js`/`topics.js`/`t()`/`localize()`/`pick()` 전부 순수 함수(I/O 없음, 오프라인 동작). ML/무거운 의존 도입 0.
- 페이로드: 신규 2파일(`i18n.js`+`topics.js`)은 정적 JS 텍스트, 앱 셸 캐시(`sw.js v3`)로 1회 캐시 → 액션당 네트워크 증가 0. 페이로드 회귀 없음.
- D1(비AI·무료 geo)·D2(모듈 분리 단일 정적 앱) 그대로 이행.

## 2. 토스 정책 (§6) — ✅ PASS
- **외부 광고망 직삽 0.** 광고 경로(`adRewarded`)의 우선순위 `토스 SDK → AD.webRewarded(웹 훅) → houseAd(하우스 데모)`는 **로직·`AD` 설정객체 모두 무수정**. 변경은 오버레이/토스트의 *문구만* `t(...)`로 치환(`adTag/adSkip/adNote/adWatching/adRewarded/adNeedFull/adApplied`). 어댑터 추상화 불변 → i18n이 AD 추상화를 깨지 않음.
- `adNote` 카피(ko/en)도 "토스/애드센스/애드핏 연결 시"라는 **자리표시자 안내**일 뿐 실제 광고망 임베드 아님.
- 핵심 플로우(그리기→탭→결과→공유) 전부 앱 내 완결. 외부 다운로드 유도·자사앱 설치 넛지 **신규 추가 0**(공유는 기존 `navigator.share`/클립보드 그대로).
- D6(보상형·초대 해금) 위배 없음. 결제/로그인 추상화 건드리지 않음.
- (참고) AI 미사용 기능이라 "AI 생성" 라벨 요구 비해당.

## 3. CLAUDE.md & 경계 준수 (D-boundary, 5원칙 #3/#4) — ✅ PASS
- **금지 파일 무수정 확인**: staged name-only에 `fb-config.js`·`net.js`·`home/`·`apps.json`·`toss.js` **0건**. 타 앱(냉비서/폰트/이모티콘) 무변경.
- **`main` 직접 수정 아님**: 작업 브랜치 `claude/great-darwin-…`.
- **게임플레이 밸런스 수치 불변(D-boundary)**: `comboMult(streak)=min(3,1+max(0,streak)*0.04)`, `rankEstimate`(pop 87431, 0.0002/0.9998 계수), `DURATION=60`, `dailyBias`, `fnv1a`(2166136261/16777619) 전부 현재 파일에서 **그대로**. diff의 해당 라인 매치는 `battleOfDay(date)`를 `GCTopics.localize(…, LANG)`로 **감싼 표현층 변경** + `comboMult()` *표시값 읽기*뿐, 공식 편집 아님.
- **Firestore 쓰기 경로 무수정**: 유일한 `GCNet` 매치는 데모 폴백 문자열 리터럴 1건. `GCNet.bump/submit` 등 쓰기 호출 변경 0.
- D1–D3 이행: D1(무료 geo, 외부 API 0)·D2(모듈 분리)·D3(가산적 i18n: `LANG`+`t(key)`+`STR{ko,en}`, 키 없으면 ko→key 폴백) 코드로 확인.
- 커밋 규칙: 직전 동류 커밋이 `[gwangclick] …` 형식(예: `db01133`) → `[gwangclick] …` 적절.

## 4. Firestore 무료티어(Spark) 영향 — ✅ PASS (증가 0)
- Phase 1은 **표현 전용**. `countries` 신규 필드/컬렉션·집계 문서 **미도입**(설계서대로 Phase 2로 남김). 탭/렌더당 신규 read/write **0**.
- 구독 패턴(`startWatch`/`onLive`/`leaderboard`/`peek`) 무변경 → 문서 읽기 횟수·쓰기 한도(2만/일) 영향 없음. D4/D5 보존.

## 5. 5원칙 준수 — ✅ PASS
- **#1 불신/경계테스트**: `localize`/`pick`/`side`가 null·비객체·문자열 taunts·미지원 lang(`ja`) 등 변조 입력에 throw 없이 안전기본값(`color:#888888`, `taunts:[]`, `''`) 반환. `tests/topics.test.mjs` 신규 6테스트가 정상/매핑(언어폴백)/None/변조 4종 커버. **`node --test` 14/14 PASS** (직접 실행 확인).
- **#3 스코프 수렴**: 변경 반경이 표현층(문자열·양어 데이터)에 한정. 한국 지역명 18종·메타/`<title>` 다국어·국가 집계는 명시적으로 후속으로 외화.
- **#4 가역성/가산성**: 기존 평탄 데이터를 갈아엎지 않고 `{ko,en}`+`localize` 어댑터를 **위에 얹음**. `pick`/`localize`가 평문(legacy)·배열 taunts 하위호환 유지 → 롤백 용이.
- **#5 완료 정의**: 동작(런타임 스모크 PASS 기재) + 테스트(14/14) + 문서 현행화(`gwangclick-global-plan.md` 진행상태 `[~]`로 갱신, 남긴 항목 명시) 충족.

---

## Findings (severity-tagged)

### Blocker — 없음
### Warning — 없음

### Nit
- **Nit** `static-apps/gwangclick/topics.js:163` — BATTLES 12종 중 신규 4종(coffee/petlove/toiletpaper/season)에 `tag.ko`가 한글 압축어("아아따아","개냥대전")로 들어감. 비용/정책엔 무관하나, en 사용자에겐 `tag`가 영문(`Iced vs Hot`)으로만 노출되므로 일관. 결과 카드 `#{bt.tag}` 해시태그가 ko 화면에서 신조어로 보이는 점만 카피 검수 권장(기능 영향 없음).
- **Nit** `docs/gwangclick-global-plan.md:46` — index.html 변경에 `MYINFO.flag`(geo.js 결과) 헤더 표기가 추가됨. `geo.js`의 폴백(미감지→Global/빈 국기) 동작은 *이번 staged diff 범위 밖*이라 본 감사에서 코드로 재확인 못 함. Verify가 미감지 환경에서 헤더 깨짐 없는지(빈 flag) 런타임 확인 권장. (설계서엔 "미상이면 Global 폴백"으로 외화되어 있어 정책상 문제는 아님.)

---
*Audit 기준: CLAUDE.md §2(비용·리소스), §6(토스), §8(5원칙) · gwangclick-global-plan.md D1–D7 + 경계 §1. READ-ONLY 감사 — 소스 무수정, 본 리포트만 기록.*
