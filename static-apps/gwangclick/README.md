# ⚡ 광클대전 — ddukkit.com

> 오늘의 떡밥(민초·부먹·양념…)에 **내 편을 골라 60초 광클** → 전국 흐름 게이지를 내 편으로 끌어오는 **10대 진영전 밈 게임**.
> 디자인: **심야 아레나 / 네오 아케이드 스코어보드** — 딥다크 · 스코어보드 숫자(tabular) · 방송 LIVE/티커 · 필름 그레인 · 진영색 액센트.
> 토스 미니앱/독립 웹앱으로 배포하는 **완전 자립형 단독 앱** (냉비서와 코드·데이터·URL 분리).

## ▶ 실행
- **단일 파일**: [`offline.html`](./offline.html) 더블클릭(폰은 탭). 서버·빌드·인터넷 불필요.
- **앱 구조**: `index.html` (`toss.js`·`manifest`·`sw`·`icon` 동반) — PWA 설치/오프라인 지원.
- **로컬 서버**: 이 폴더에서 `python3 -m http.server 8080` → `http://localhost:8080`

## 🌐 ddukkit.com 에 올리기
이 폴더(`gwangclick`)가 **사이트 루트**가 되게 올리고 ddukkit.com을 연결합니다.
(GitHub Pages용 `CNAME` 파일에 `ddukkit.com`을 이미 넣어뒀습니다.)

### 방법 A — Cloudflare Pages / Netlify / Vercel  *(가장 쉬움 · 새 레포 불필요)*
1. 가입 → **이 폴더를 drag&drop 업로드**(또는 깃 연결).
2. 대시보드 → **Custom domain → `ddukkit.com`** 입력.
3. 화면이 알려주는 **DNS 레코드**(보통 CNAME 또는 A)를 도메인 등록처에 추가 → 끝.

### 방법 B — GitHub Pages  *(새 레포)*
1. 빈 레포 생성(예: `ddukkit`) 후 이 폴더 내용만 push:
   ```bash
   cd gwangclick
   git init && git add . && git commit -m "광클대전 단독 앱"
   git branch -M main
   git remote add origin https://github.com/<나>/ddukkit.git
   git push -u origin main
   ```
2. 레포 **Settings → Pages → Source**: `Deploy from a branch` → `main` / `/(root)` 저장.
3. **Settings → Pages → Custom domain**: `ddukkit.com` (CNAME 파일이 이미 있어 자동 인식) → **Enforce HTTPS** 체크.
4. 도메인 등록처 **DNS**:
   - apex `ddukkit.com` → **A 레코드 4개**: `185.199.108.153` · `185.199.109.153` · `185.199.110.153` · `185.199.111.153`
   - (선택) `www` → **CNAME**: `<나>.github.io`

> ⚠️ **DNS·도메인·레포 생성은 도메인/계정 소유자(=당신)만** 할 수 있어요(보안 권한). 저는 코드·`CNAME`·배포 안내까지 준비해 뒀습니다. 위 한 번만 해주시면 `https://ddukkit.com` 에서 열립니다.

## 🔒 냉비서와 완전 분리
| | 광클대전 | 냉비서 |
|---|---|---|
| 코드 | `gwangclick/` (외부 의존 0) | `js/`, `index.html` |
| 도메인 | **ddukkit.com** | (별도) |
| 저장 키 | `localStorage['gwangclick.v1']` | `naengbiseo.v1` |

## 💰 광고 수익화 (보상형 · 옵트인)
**보상형 광고만** 씁니다(배너·전면 없음 → 10대 이탈·정책 리스크 최소화).
- 위치: **결과 화면 '📺 광고 보고 기여 2배 ⚡2X'** — 자발적. 보면 자랑 카드의 기여·등수·칭호가 2배로 커짐(밈 자랑과 시너지).
- 자동 분기: **토스 안 → 토스 보상형 SDK / 웹 → 웹 보상형 훅 / 둘 다 없으면 하우스(데모) 광고**로 흐름 유지(지금 바로 테스트 가능).
- **실광고 전환** — `index.html`/`offline.html` 상단 `AD` 객체만 채우면 됨:
  - 토스: 입점 후 콘솔에서 만든 보상형 **광고 그룹ID** → `AD.tossAdGroupId = '...'` (앱인토스 SDK는 adUnitId가 아닌 adGroupId 사용)
  - 웹: 제공자 보상형 함수 연결 → `AD.webRewarded = function(o){ /* ... */ return Promise; }` (해결값 `true`=완주보상 · `false`=중도이탈 · `null`=하우스폴백)
- ⚠️ **비개인화 광고 필수**: 10대 대상이라 `AD.nonPersonalized = true`(기본값). 각 광고 제공자 콘솔에서도 **child-directed / non-personalized** 플래그를 켜세요(청소년보호·COPPA).
- **배틀(60초) 화면엔 광고 없음** — 탭 영역 오탭 방지·정책 준수.

## 🟦 토스 미니앱 입점 메모
- 토스 WebView SDK 환경이면 `toss.js`가 자동 감지해 **햅틱**을 네이티브로 처리(밖에선 `navigator.vibrate` 폴백).
- 보상형 광고는 위 `AD.tossAdGroupId`에 토스 콘솔 **광고 그룹ID**를 넣으면 `toss.js`의 `rewardedAd()`로 자동 연결됩니다. `toss.js`는 실제 SDK 흐름(로드→표시·`adGroupId`·`userEarnedReward`/`dismissed`/`failedToShow` 이벤트·cleanup)에 정합되어 있고, web/RN 전역명 차이는 폴백 탐색으로 흡수합니다.
- 입점 자산: 아이콘 `icon-512.png`(+라운드 `icon-512-rounded.png`), 스토어 문구·스크린샷 가이드 `STORE.md`, 절차 `TOSS.md`.

## 👥 초반 가상 플레이어 — 2가지 모드
출시 초반 "전국 집계 0 → 죽은 앱"을 막는 콜드스타트 보정. **기본은 (B) DB 시더**다.

**(A) 클라이언트 표시용 합성 — `gc-bots.js`** *(기본 OFF: `enabled=false`)*
- 게이지·참전수·랭킹·지역·지구본에만 합성, **DB 기록 0**. 날짜 시드라 전 기기 동일, 실유저 늘면 `FADE`로 자동 소멸.
- 장점: 설정 0, 즉시. 단점: 기기에서 합성이라 "운영/제거" 개념이 약함. 빠르게 켜려면 `enabled=true`(단, B와 동시 사용 금지=이중가산).

**(B) DB 시더 — `tools/bots/` (관리자, 권장·기본)**
- 봇을 **실제 플레이어와 동일한 문서**로 Firestore에 심어 유저가 **구분 불가**. 관리자 스크립트로 주기 실행해 성장.
- **추후 제거**: 원장(`gc_bots_state`)에 봇 기여를 기록 → `purge` 한 번으로 집계에서 정확히 빼고 봇 문서 삭제(실데이터 무손상).
- 서버에만 `bot:true` 태그(클라 노출 X). 설정/실행/비용은 **`tools/bots/README.md`** 참고.

## 🎨 디자인 리스킨
진영색은 런타임에 `--team-a` / `--team-b` / `--me`로 주입됩니다(떡밥마다 자동 교체). 베이스·텍스트·보더는 진영색 비의존이라, 두 색만 바꿔도 전체 톤이 유지됩니다.

## 📁 파일
```
gwangclick/
├─ index.html            # 게임(앱 구조) — toss.js/manifest/sw 동반
├─ offline.html          # 단일 파일 빌드 (index를 1개로 합침) — 더블클릭 실행
├─ toss.js · manifest.webmanifest · icon.svg · sw.js
├─ CNAME                 # ddukkit.com (GitHub Pages 커스텀 도메인)
└─ README.md
```
> `offline.html`은 `index.html`을 1파일로 합친 빌드입니다. 게임을 고치면 같은 방식으로 다시 만들면 됩니다.
