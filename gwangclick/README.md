# ⚡ 광클대전 (Gwangclick War)

> 오늘의 떡밥(민초·부먹·양념…)에 **내 편을 골라 60초 광클** → 전국 흐름 게이지를 내 편으로 끌어오는 **10대 진영전 밈 게임**.
> 토스 미니앱/독립 웹앱으로 배포하기 위한 **완전 자립형 단독 앱**입니다.

## 🔌 다른 앱(냉비서)과 완전히 분리됨

이 폴더는 **그 자체로 하나의 앱**입니다. 위층(냉비서) 코드를 전혀 import 하지 않습니다.

| 분리 포인트 | 광클대전 | 냉비서(상위 앱) |
|---|---|---|
| 코드 | `gwangclick/` 안에서 자기완결 (외부 의존 0) | `js/`, `index.html` … |
| URL | `…/gwangclick/` (또는 자체 도메인) | `…/`(루트) |
| 저장소 키 | `localStorage['gwangclick.v1']` | `localStorage['naengbiseo.v1']` |
| 빌드 | 없음 (정적 파일) | 없음 (정적 파일) |

→ 같은 저장소에 있어도 **데이터·URL·코드가 섞이지 않습니다.** 냉비서를 배포하든 말든 서로 영향 없음.

## ▶ 실행

- **🟢 가장 쉬움 (단일 파일)**: [`offline.html`](./offline.html) **하나만** 받아서 더블클릭(폰은 탭 → 브라우저로 열기). toss 어댑터까지 내장된 **완전 자립 파일**이라 다른 파일·서버·인터넷이 전혀 필요 없습니다. 카톡/메일로 보내 공유하기도 좋아요.
- **바로 해보기(앱 구조)**: `index.html` 더블클릭 (같은 폴더의 `toss.js` 등과 함께 있을 때).
- **로컬 서버**: 이 폴더에서 `python3 -m http.server 8080` → `http://localhost:8080`
  (서비스워커/매니페스트(PWA 설치)는 `http(s)`에서만 켜지고, 게임 자체는 `file://`에서도 돕니다.)

> `offline.html`은 `index.html`을 1개 파일로 합친 빌드입니다. 게임을 고치면 같은 방식으로 다시 만들 수 있어요(README 하단 참고).

## 🚀 배포 (3택)

### 1) 별도 GitHub 레포로 떼어내기 (토스 앱으로 가장 깔끔 · 권장)
완전히 다른 프로젝트로 운영하려면 새 레포가 정석입니다.
```bash
# 이 폴더만 새 레포로 (히스토리까지 떼고 싶으면 git subtree split 사용)
cd gwangclick
git init && git add . && git commit -m "광클대전 단독 앱"
git branch -M main
git remote add origin https://github.com/<나>/gwangclick.git   # 빈 레포 먼저 생성
git push -u origin main
```
→ 새 레포에서 **Settings → Pages**로 켜면 `https://<나>.github.io/gwangclick/` 로 단독 배포.

### 2) 지금 레포의 하위 경로로 배포 (레포 추가 생성 없이)
상위 레포가 GitHub Pages면 이 폴더는 자동으로 `…/todayfeelgood/gwangclick/` 에서 열립니다. 레포를 새로 안 만들어도 되고, 냉비서와 안 섞입니다.

### 3) 다른 정적 호스팅 (Vercel/Netlify/Cloudflare Pages)
이 폴더를 그대로 올리면 끝 (빌드 명령 없음, 출력 디렉터리 = 이 폴더).

## 🟦 토스 미니앱 입점 메모

- 토스 WebView SDK 환경이면 `toss.js`가 자동 감지해 **햅틱**을 네이티브로 처리(밖에선 `navigator.vibrate` 폴백).
- 수익화(예: "한 판 더" 보상형 광고)를 붙일 땐 토스 콘솔에서 광고 단위 ID를 발급받아 `toss.js`의 `rewardedAd(adUnitId)`를 호출하면 됩니다. (v1은 광고 없이 순수 게임)
- SDK 전역 객체/함수명은 입점 시점 공식 문서(`developers-apps-in-toss.toss.im`)로 최종 확인 후 `toss.js`만 손보면 됩니다.

## 📁 파일

```
gwangclick/
├─ index.html            # 게임 전체 (인라인 CSS+JS, 단일 파일)
├─ toss.js               # 토스 미니앱 어댑터(선택)
├─ manifest.webmanifest  # PWA 설치 정보
├─ icon.svg              # 앱 아이콘 (⚡ 진영 분할)
├─ sw.js                 # 오프라인 캐시
└─ README.md
```

## 🎮 게임 규칙

1. 오늘의 떡밥에서 **내 편** 선택 (그게 곧 내 정체성).
2. 60초 동안 **미친듯이 탭** → 콤보를 이으면 한 탭이 **×3**까지 불어남.
3. 내 광클이 **전국 흐름 게이지**를 내 편으로 끌어온다.
4. 끝나면 **칭호·기여도·예상 전국 등수**가 박힌 자랑 카드 → 스샷/공유로 친구 소환.
5. 같은 날 = 전국 같은 떡밥 → 매일 새 대결 + 연속 참전 streak.
