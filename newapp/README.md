# 오늘 기분 — 구름이의 일기예보

하루 한 번 기분을 톡 누르면 마스코트 **구름이**가 *오늘의 노래*를 골라주는 한국형 정적 PWA.
일기 앱이 아니라 **SNS 인증/밈** 카테고리 — "광클릭의 따뜻한 버전". `todayfeelgood` 저장소 안의
**self-contained 독립 앱 폴더**(다른 앱과 코드가 섞이지 않음).

> 📘 기획·리서치 [`CONCEPT.md`](./CONCEPT.md) · 🧭 결정 로그 [`DECISIONS.md`](./DECISIONS.md)
> · 🎨 디자인 스펙 [`DESIGN_SPEC.md`](./DESIGN_SPEC.md) · 🔍 팀 리뷰 [`REVIEW.md`](./REVIEW.md)

## 핵심 기능
- **기분 1탭 → 오늘의 노래** — 기분 5종(행복·설렘·평온·우울·화남) → 날짜 시드 결정적 추천(같은 날 같은 곡).
  곡은 YouTube 임베드(관리자가 검증한 영상) 또는 YouTube Music 검색 링크아웃.
- **구름이 마스코트** — 기분=날씨(해·반짝·산들·비·번개). 픽셀 도트 SVG + CSS 키프레임.
- **전국 기분 날씨** — 익명 집계 톤(콜드스타트 예시 분포, 증분4에서 Firebase 연결 예정).
- **이번 주 플리** — 최근 7일 기록의 추천곡 모음(컬렉션) + 공유 카드.
- **음악 성향 테스트** — 5문항 → 구름이 타입(저장·표시) + 결과 카드.
- **기분 우표 앨범** — 월별 그리드 + streak + 프리즈(연속 보호).
- **공유 카드** — 일일/주간 1080×1920 Canvas 카드, Web Share / 저장.
- **관리자 음악 CMS** — `admin.html`에서 곡 추가/삭제, YouTube/Suno, 코드·JSON 내보내기.
- **PWA** — 오프라인 셸 캐시, 설치, 소셜 미리보기(OG), 접근성(다이얼로그·대비 AA·키보드).

## 구성
```
newapp/
  index.html              앱 셸 (멀티뷰 + 탭바, OG/아이콘 메타, CSP)
  admin.html / js/admin.js 음악 관리(관리자) CMS
  privacy.html            개인정보처리방침
  css/styles.css          토큰·[data-mood] 단일출처 테마·전체 컴포넌트
  js/app.js               해시 라우터 + 홈/결과 + 온보딩 + 설정
  js/mascot.js            구름이 SVG (의존성 0)
  js/store.js             상태 + localStorage + 불신 가드 + streak/프리즈
  js/recommend.js         오늘의 노래 추천 (순수·None-safe)
  js/views.js             전국날씨·컬렉션·주간플리(weeklyPlaylist 단일출처)
  js/quiz.js              음악 성향 테스트 + 결과 카드 + taste 저장
  js/share.js             일일/주간 공유 카드 (Canvas)
  js/catalog.js           카탈로그 레이어(localStorage 오버라이드 + 시드 폴백)
  js/a11y.js              모달 다이얼로그 공통(포커스 트랩·Esc·스크롤 잠금)
  js/data/{moods,songs,nation}.js  기분·곡 카탈로그(65곡)·전국 분포
  tests/engine.test.mjs   경계 테스트 20종 (정상/매핑/None/변조/streak/프리즈)
  sw.js                   오프라인 앱 셸 캐시 (버전·ASSETS 동반 관리)
  manifest.webmanifest    PWA 설치 정보
  icon.svg / icon-{192,512}.png / apple-touch-icon.png / og.png  아이콘·소셜 카드
```

## 로컬 실행 & 테스트
```bash
python3 -m http.server 8099   # 저장소 루트 → http://localhost:8099/newapp/
node newapp/tests/engine.test.mjs   # 엔진 경계 테스트 (20 passed)
```

## 배포 (자동)
`main` 병합 시 GitHub Pages 자동 배포(`.github/workflows/pages.yml`, `path: .`)
→ `https://ddukkit.com/mood/` (허브 마운트 / GitHub Pages 원본: `https://yonggunyoung.github.io/todayfeelgood/newapp/`)

## 음악 관리
`더보기 → 음악 관리(관리자)` 또는 `/newapp/admin.html`.
- **YouTube URL/ID** 입력 → 앱이 인앱 임베드 재생. 없으면 검색 링크.
- **내 Suno 곡**은 유튜브 업로드 후 그 URL을 넣으면 동일 임베드(변동비 0 원칙).
- *이 기기에 저장*(localStorage 즉시 반영) 또는 *코드 내보내기*로
  `js/data/songs.js` 교체 커밋 → 전 사용자 반영.

## 내 곡 추천 켜기 ("이런 곡은 어때요?")
결과 화면 아래 **내 Suno/큐레이션 곡**을 곁들여 추천하는 카드. `js/mymusic.js`만 채우면 등장(비면 숨김).
- 곡별: `videos`에 `{ title, artist, youtubeId }` 추가(유튜브 watch?v= 뒤 11자) → 날짜별 1곡 인앱 임베드.
- 또는 `playlistId`만 채우면 그 재생목록을 통째 임베드(매일 업로드하면 자동 반영).
- 임베드 막힌 영상은 "유튜브에서 열기 ↗" 링크로 폴백. (서버 호스팅 X — 전부 유튜브)

## 전국 집계 켜기 (Firebase)
"전국 기분 날씨"는 기본은 예시 분포(`data/nation.js`)로 동작하고, Firebase를 연결하면
실시간 익명 집계로 바뀝니다. **SDK 없이 Firestore REST(fetch)만** 써서 CSP는 `connect-src`만 엽니다.
1. Firebase 콘솔 → 프로젝트 생성 → **Firestore Database**를 *프로덕션 모드*로 생성.
2. 웹 앱 등록 후 config의 `projectId`·`apiKey`를 `js/firebase-config.js`에 채운다(둘 다 채워야 ON).
3. Firestore 규칙에 추가:
   ```
   match /databases/{db}/documents {
     match /nation/{day} {
       allow read: if true;
       allow write: if request.resource.data.keys().hasOnly(['happy','flutter','calm','blue','angry']);
     }
   }
   ```
4. CSP는 이미 `connect-src https://firestore.googleapis.com` 허용됨. 끝.

동작: 기분 1탭 → `nation/{날짜}` 문서의 기분 카운터 +1(하루 1회, 변경 시 이전 표 차감).
표본이 `MIN_SAMPLES`(기본 20) 미만이면 예시 분포 유지(콜드스타트 노이즈 방지). 홈 게이지·전국날씨
헤드라인·마스코트가 최다 기분으로 자동 전환. 공유 카드 % 는 일관성을 위해 예시값 고정.
한계: 익명 공개 쓰기라 대규모 조작에 취약 — 필요 시 App Check/Functions로 강화.

## 데이터·프라이버시
로컬 우선. 개인 기록(기분·streak·taste)은 기기 localStorage에만 저장(서버 미전송).
전국 집계는 익명 합산 카운터만(`nation/{날짜}` 문서, 개인 식별 행 없음). 음악은 외부 링크아웃/임베드.
자세히는 `privacy.html`.

## 엔지니어링 원칙 (DECISIONS 참고)
1. **불신 기본값** — 깨질 영상ID 안 지어냄(검색 딥링크), 손상 입력 None-safe 복구.
2. **단일 출처** — 무드색은 `[data-mood]` CSS 변수, 전국 분포는 `data/nation.js`,
   주간 플리는 `weeklyPlaylist()` 하나로.
3. **로직/뷰 분리** — `store/recommend`는 DOM 0 순수 모듈 → node 테스트.

## 로드맵
- [x] 기분 1탭 → 오늘의 노래(임베드/링크아웃) + 카드 + 저장 + 테스트
- [x] 디자인 적용(구름이·종이 질감·무드 테마)
- [x] 기분 달력 + streak/프리즈
- [x] 음악 성향 테스트 + taste 저장
- [x] 공유 카드(일일/주간) 9:16
- [x] 카탈로그 확장(국내·해외·다세대 65곡) + 관리자 CMS
- [x] 접근성·대비 AA·CSP·소셜 미리보기·PWA 아이콘
- [x] 전국 집계(Firebase) 연동 코드(REST·폴백·집계 전환) — `firebase-config.js`만 채우면 ON
- [ ] 전국 집계 실 데이터 연결(콘솔 config·규칙 입력) + 라이브 검증
- [ ] 다크 모드
- [ ] 수익화(광고·소액 IAP·앱인토스)

## 자산 재생성
`og.png`(1200×630)와 `icon-*.png`는 구름이 마스코트로 렌더한 정적 자산.
변경 시 `js/mascot.js` 기반으로 다시 렌더해 교체(헤드리스 브라우저 스크린샷).
