# 글꾸미 → 앱인토스 미니앱 (WebView 스캐폴드 · 런북)

> 목표: 글꾸미(빌드 무방식 바닐라 PWA)를 **토스 앱 안 WebView 미니앱**으로 출시.
> 이 폴더(`geulkkumi-toss/`)는 **Vite 프로젝트**로, 형제 폴더 글꾸미(`../geulkkumi/js`, `../geulkkumi/css`)를
> `vendor/` 로 복사해 번들한다. **글꾸미 원본은 단일 소스로 유지**(복사만 함).
>
> 냉비서 미니앱(`../toss-miniapp`)과 **완전히 동일한 패턴**이며, 기준 예제도 같다
> (toss/apps-in-toss-examples → `weekly-todo-jquery`, 비React WebView 패턴 / 번들러만 Vite).

## 🎯 글꾸미가 토스 입점에 유리한 점

냉비서와 달리 **미해결 TODO가 없다**:

| 항목 | 냉비서 | 글꾸미 |
|---|---|---|
| 로그인 | 구글 OAuth가 WebView에서 막힘 → `appLogin()` + **서버 코드 교환 필요**(미구현) | **로그인 자체가 없음** ✅ |
| 서버 | Firebase Functions 의존 | **서버 0** — 전부 기기 안에서 처리 ✅ |
| 네이티브 권한 | 카메라(영수증) 검토 필요 | **권한 선언 0** (파일 선택은 표준 `<input type=file>`) ✅ |
| 개인정보 | 계정·영수증 데이터 | **수집 0** (localStorage만) ✅ |

→ 심사에서 다툴 여지가 가장 적은 형태. 남은 건 **콘솔 등록 + 사업자등록**뿐.

## 사전 준비물
- **Node.js** (LTS), **yarn** (`packageManager` 참고)
- **앱인토스 CLI/SDK**: `@apps-in-toss/web-framework` (dependency). `granite` / `ait` 명령 제공.
- **⚠️ 사업자등록** — 앱인토스 입점의 필수 조건. ([가이드](https://toss.im/apps-in-toss/blog/business_registration))
- 앱인토스 콘솔에서 앱 등록 → 거기서 정한 **appName** 을 `granite.config.ts` 에 반영.

## 설치 & 실행
```bash
cd geulkkumi-toss
yarn install            # 의존성 설치
yarn dev                # → yarn vendor (글꾸미 자산 복사) 후 granite dev (vite) — http://localhost:8081
```
- `yarn dev` 는 먼저 **`yarn vendor`** 실행 → `scripts/vendor.mjs` 가
  `../geulkkumi/{css,js}` → `vendor/`, `mascot.svg`·`icon.svg` → `public/` 로 복사.
- 글꾸미 원본을 고친 뒤에는 `yarn vendor` 재실행(또는 그냥 `yarn dev`/`yarn build`).
- 포트 **8081** (냉비서 미니앱 8080과 동시에 띄울 수 있게).

## 빌드 & 배포
```bash
yarn build              # → yarn vendor 후 granite build (vite build) → dist/
yarn deploy             # → ait deploy → 앱인토스 sandbox 배포
```
배포 후 콘솔에서 sandbox 확인 → 이상 없으면 **심사 제출**(최초 심사 며칠 소요).

---

## 이 스캐폴드가 이미 처리해 둔 것

### 토스 환경 플래그 (`window.__TOSS__`)
`src/main.ts` 가 앱 부팅 **전에** 토스 WebView를 감지해 플래그를 세팅하고,
글꾸미 원본(`js/main.js`)이 이를 보고 아래를 **자동으로 끈다**:

1. **서비스워커 등록 skip** — 토스 빌드엔 `sw.js` 가 없고 WebView라 불필요.
2. **‘홈 화면에 설치’ 버튼 skip** — 토스 안에서는 불가/무의미. (토스용 `index.html` 에서도 버튼 자체를 제외)
3. **뒤로가기 히스토리 가드 skip** — ⚠️ **가장 중요**. 글꾸미는 설치 PWA에서 ‘한 번 더 누르면 나가요’
   가드를 위해 history를 조작하는데, 토스는 **자체 뒤로가기/네비게이션**을 쓰므로 가로채면 안 된다.

### 복사 햅틱
글꾸미의 핵심 동작은 “탭 → 복사”다. 토스 안에서는 복사 성공 시 가벼운 **햅틱**이 울리도록
`window.__TOSS_HAPTIC__` 훅을 주입한다(`src/main.ts` → 원본 `ui.js` 가 있을 때만 호출).
웹에서는 훅이 없어 아무 일도 일어나지 않는다.

### 광고
`js/ads.js` 는 퍼블리셔 ID가 없으면 **완전 OFF(no-op)** 라 토스 빌드에 AdSense가 실리지 않는다.
(토스 안에서 외부 광고 SDK는 정책 위반 소지 — 수익화는 토스 자체 보상형 광고를 쓸 것. `../js/toss.js` 참고)

---

## 파일 구성
```
geulkkumi-toss/
├─ granite.config.ts     # 앱인토스 설정 (appName / web.commands / brand / webViewProps)
├─ package.json          # scripts(vendor/dev/build/deploy), deps
├─ vite.config.ts        # Vite (port 8081, base './', outDir dist)
├─ tsconfig.json
├─ index.html            # 글꾸미 body 골격 (SW 스크립트·설치버튼 제외, 엔트리 → /src/main.ts)
├─ .gitignore            # node_modules, dist, vendor, public, .yarn
├─ scripts/vendor.mjs    # ../geulkkumi 자산 → vendor/ · public/ 복사
├─ src/main.ts           # 엔트리: 토스 감지 → __TOSS__/햅틱 훅 세팅 → vendor 앱 부팅
├─ vendor/               # (자동 생성, gitignore) css·js 복사본
└─ public/               # (자동 생성, gitignore) mascot.svg·icon.svg — 루트 경로로 서빙
```

## 머신에서 확인할 항목 (`TODO(verify)`)
- **`granite.config.ts`**
  - `appName: 'geulkkumi'` — **콘솔 등록값과 일치**시킬 것.
  - `brand.icon` — `https://ddukkit.com/geulkkumi/icon-512.png` (Deploy 후 200인지 확인).
    콘솔이 직접 업로드를 요구하면 `../geulkkumi/icon-512.png` 파일을 올리면 된다.
  - `permissions: []` — 글꾸미는 네이티브 권한 불필요. 심사에서 지적되면 그때 추가.
  - `navigationBar` 옵션 키 이름 — SDK 버전별 최신 문서로 확인.
- **`src/main.ts`** — `isTossWebView()` 판별 방법, 햅틱 API 이름을 공식 문서로 확정.
- **`package.json`** — `vite`/`typescript` 버전은 환경에 맞게. (`@apps-in-toss/web-framework: 1.5.2` 는 예제 기준값)

## 참고
- [개발자센터](https://developers-apps-in-toss.toss.im/) · [WebView 튜토리얼](https://developers-apps-in-toss.toss.im/tutorials/webview.html) · [예제](https://github.com/toss/apps-in-toss-examples) · [커뮤니티](https://techchat-apps-in-toss.toss.im/) · [사업자등록](https://toss.im/apps-in-toss/blog/business_registration)
