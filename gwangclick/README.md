# ⚡ 광클대전 — dduckkit.com

> 오늘의 떡밥(민초·부먹·양념…)에 **내 편을 골라 60초 광클** → 전국 흐름 게이지를 내 편으로 끌어오는 **10대 진영전 밈 게임**.
> 디자인: **심야 아레나 / 네오 아케이드 스코어보드** — 딥다크 · 스코어보드 숫자(tabular) · 방송 LIVE/티커 · 필름 그레인 · 진영색 액센트.
> 토스 미니앱/독립 웹앱으로 배포하는 **완전 자립형 단독 앱** (냉비서와 코드·데이터·URL 분리).

## ▶ 실행
- **단일 파일**: [`offline.html`](./offline.html) 더블클릭(폰은 탭). 서버·빌드·인터넷 불필요.
- **앱 구조**: `index.html` (`toss.js`·`manifest`·`sw`·`icon` 동반) — PWA 설치/오프라인 지원.
- **로컬 서버**: 이 폴더에서 `python3 -m http.server 8080` → `http://localhost:8080`

## 🌐 dduckkit.com 에 올리기
이 폴더(`gwangclick`)가 **사이트 루트**가 되게 올리고 dduckkit.com을 연결합니다.
(GitHub Pages용 `CNAME` 파일에 `dduckkit.com`을 이미 넣어뒀습니다.)

### 방법 A — Cloudflare Pages / Netlify / Vercel  *(가장 쉬움 · 새 레포 불필요)*
1. 가입 → **이 폴더를 drag&drop 업로드**(또는 깃 연결).
2. 대시보드 → **Custom domain → `dduckkit.com`** 입력.
3. 화면이 알려주는 **DNS 레코드**(보통 CNAME 또는 A)를 도메인 등록처에 추가 → 끝.

### 방법 B — GitHub Pages  *(새 레포)*
1. 빈 레포 생성(예: `dduckkit`) 후 이 폴더 내용만 push:
   ```bash
   cd gwangclick
   git init && git add . && git commit -m "광클대전 단독 앱"
   git branch -M main
   git remote add origin https://github.com/<나>/dduckkit.git
   git push -u origin main
   ```
2. 레포 **Settings → Pages → Source**: `Deploy from a branch` → `main` / `/(root)` 저장.
3. **Settings → Pages → Custom domain**: `dduckkit.com` (CNAME 파일이 이미 있어 자동 인식) → **Enforce HTTPS** 체크.
4. 도메인 등록처 **DNS**:
   - apex `dduckkit.com` → **A 레코드 4개**: `185.199.108.153` · `185.199.109.153` · `185.199.110.153` · `185.199.111.153`
   - (선택) `www` → **CNAME**: `<나>.github.io`

> ⚠️ **DNS·도메인·레포 생성은 도메인/계정 소유자(=당신)만** 할 수 있어요(보안 권한). 저는 코드·`CNAME`·배포 안내까지 준비해 뒀습니다. 위 한 번만 해주시면 `https://dduckkit.com` 에서 열립니다.

## 🔒 냉비서와 완전 분리
| | 광클대전 | 냉비서 |
|---|---|---|
| 코드 | `gwangclick/` (외부 의존 0) | `js/`, `index.html` |
| 도메인 | **dduckkit.com** | (별도) |
| 저장 키 | `localStorage['gwangclick.v1']` | `naengbiseo.v1` |

## 🟦 토스 미니앱 입점 메모
- 토스 WebView SDK 환경이면 `toss.js`가 자동 감지해 **햅틱**을 네이티브로 처리(밖에선 `navigator.vibrate` 폴백).
- 보상형 광고 등 수익화는 토스 콘솔 광고 단위 ID를 발급받아 `toss.js`의 `rewardedAd(adUnitId)` 호출로 연결.

## 🎨 디자인 리스킨
진영색은 런타임에 `--team-a` / `--team-b` / `--me`로 주입됩니다(떡밥마다 자동 교체). 베이스·텍스트·보더는 진영색 비의존이라, 두 색만 바꿔도 전체 톤이 유지됩니다.

## 📁 파일
```
gwangclick/
├─ index.html            # 게임(앱 구조) — toss.js/manifest/sw 동반
├─ offline.html          # 단일 파일 빌드 (index를 1개로 합침) — 더블클릭 실행
├─ toss.js · manifest.webmanifest · icon.svg · sw.js
├─ CNAME                 # dduckkit.com (GitHub Pages 커스텀 도메인)
└─ README.md
```
> `offline.html`은 `index.html`을 1파일로 합친 빌드입니다. 게임을 고치면 같은 방식으로 다시 만들면 됩니다.
