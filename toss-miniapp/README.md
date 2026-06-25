# 냉비서 → 앱인토스 미니앱 (WebView 스캐폴드 · 런북)

> 목표: 냉비서(빌드 무방식 바닐라 PWA)를 **토스 앱 안 WebView 미니앱**으로 출시.
> 이 폴더(`toss-miniapp/`)는 **Vite 프로젝트**로, 루트 냉비서 앱(`../js`, `../css`, `../icon.svg`)을
> `vendor/` 로 복사해 번들한다. **루트 앱은 절대 수정하지 않는다.**

이 스캐폴드는 공식 예제 **toss/apps-in-toss-examples → `weekly-todo-jquery`**(비React WebView 패턴)을
기준으로 조립했다. 단, 번들러는 예제의 webpack 대신 **Vite**를 쓴다(냉비서가 순수 ES 모듈이라 더 단순).

> **권위 있는 출처:** 어떤 필드가 다르면, 머신에서 `npx create-ait-app naengbiseo` 로 생성되는 골격이
> 최종 기준이다. 아래 "확인 필요(TODO verify)" 항목을 그 출력과 대조해 확정할 것.

---

## 사전 준비물
- **Node.js** (LTS 권장; Vite 5 / TypeScript 5 호환 버전)
- **yarn** (이 프로젝트의 패키지 매니저 — `package.json` 의 `packageManager` 참고)
- **앱인토스 CLI / SDK**: `@apps-in-toss/web-framework` (dependency 로 포함). `granite` / `ait` 명령을 제공.
  - `granite dev` / `granite build` 는 `@apps-in-toss/web-framework` 가 깔리면 사용 가능.
  - `ait deploy` 는 앱인토스 배포 CLI. 콘솔 로그인/토큰이 필요할 수 있음.

## 설치 & 실행 (정확한 명령)
```bash
cd toss-miniapp
yarn install            # 의존성 설치 (@apps-in-toss/web-framework, vite, typescript)
yarn dev                # → yarn vendor (루트 자산 복사) 후 granite dev (web.commands.dev = "vite")
```
- `yarn dev` 는 내부적으로 **`yarn vendor`** 를 먼저 실행한다(`scripts/vendor.mjs` 가 `../css`, `../js`,
  `../icon.svg` 를 `vendor/` 로 복사). 그 다음 `granite dev` 가 `granite.config.ts` 의
  `web.commands.dev`(=`vite`)를 구동한다. 기본 포트 **8080**(`localhost`).
- 코드 수정 후 루트 앱의 js/css를 다시 가져오려면 `yarn vendor` 재실행(또는 그냥 `yarn dev`/`yarn build`).

## 빌드 & 배포
```bash
yarn build              # → yarn vendor 후 granite build (vite build) → dist/
yarn deploy             # → ait deploy → 앱인토스 sandbox 로 배포
```
- 배포 후 콘솔에서 sandbox 확인 → 이상 없으면 **심사 제출**(최초 심사 며칠 소요).

---

## 핵심 주의사항

### appName 은 콘솔과 일치해야 한다
`granite.config.ts` 의 `appName` 은 **앱인토스 콘솔에 등록한 앱 식별자와 정확히 같아야** 한다.
지금은 `'naengbiseo'` 로 두었다 → 콘솔 등록 값으로 교체. (코드의 `// TODO(verify)` 참고)

### 브랜드 자산 위치
- `granite.config.ts` → `brand.icon` 에 아이콘 URL. **토스는 보통 PNG**를 요구한다.
  지금은 임시로 GitHub Pages SVG(`https://yonggunyoung.github.io/todayfeelgood/icon.svg`)를 넣어 뒀다.
- 600×600 로고 / 썸네일 PNG는 이 폴더의 **`assets.html`** 을 브라우저로 열어 생성·다운로드할 수 있다.
  생성한 PNG를 호스팅하고 그 URL로 `brand.icon` 을 교체.

### 로그인: 구글 → 토스 `appLogin` → 서버 교환
- 토스 WebView 안에서는 **구글 OAuth 팝업이 막힌다** → 토스 버전은 `appLogin()` 사용.
- 흐름: `appLogin()` → `{ authorizationCode, referrer }` 반환 → **서버에서 코드 교환**(클라 직접 불가).
- 서버 교환 지점: 냉비서는 이미 Firebase Cloud Functions 가 **`AI_FN`**
  (`https://asia-northeast3-icebi-308e0.cloudfunctions.net/ai`)에 있다.
  여기에 **`/tosslogin`** 엔드포인트를 추가해 코드→세션(커스텀 토큰)으로 교환할 것.
- 구현 위치: `src/toss-login.ts` (클라 어댑터, 교환 호출 예시가 주석으로 들어 있음).
  서버 측(`functions/`)은 아직 미구현 — `// TODO(verify)` 참고.

### PWA / 서비스워커 / FCM 은 토스 빌드에서 끈다
- 토스용 `index.html` 에서 **서비스워커 등록 `<script>` 를 제거**했다(루트 `../index.html` 에는 있음).
- `src/main.ts` 가 부팅 "전에" `window.__TOSS__ = true` 를 세팅한다(토스 환경일 때).
  - **단, 루트 앱은 아직 이 플래그를 검사하지 않는다.** FCM 자동 비활성/설치배너 가드를 원하면
    루트 앱에 분기를 추가해야 한다(`src/main.ts` 의 `TODO(verify)` 주석에 위치 명시).
  - 현재 FCM은 사용자가 "알림 켜기"를 눌러야만 동작하므로 자동 부작용은 없다.

### 네비게이션 바 테마
- 냉비서 상단은 **라이트(크림 `#f5f3ec`)** → 기본(라이트) 사용. `granite.config.ts` 에서 별도 지정 안 함.
- 다크(`theme:'dark'`)·투명 배경 옵션도 존재하나 라이트 유지. (SDK 버전별 키 이름은 문서로 확인.)

---

## 파일 구성
```
toss-miniapp/
├─ granite.config.ts     # 앱인토스 설정 (appName / web.commands / brand / webViewProps)
├─ package.json          # name "naengbiseo-toss", scripts(vendor/dev/build/deploy), deps
├─ vite.config.ts        # Vite (port 8080, base './', outDir dist)
├─ tsconfig.json         # vite+ts 최소 설정
├─ index.html            # 루트 index.html 의 body 골격 복사 (SW 스크립트 제거, 엔트리 → /src/main.ts)
├─ .gitignore            # node_modules, dist, vendor, .yarn
├─ assets.html           # (기존) 로고/썸네일 PNG 생성기
├─ scripts/
│  └─ vendor.mjs         # 루트 ../css ../js ../icon.svg → vendor/ 복사
├─ src/
│  ├─ main.ts            # 엔트리: 토스 감지 → __TOSS__ 세팅 → vendor 앱 부팅
│  └─ toss-login.ts      # appLogin() 어댑터 (+ 서버 교환 예시 주석)
└─ vendor/               # (자동 생성, .gitignore) 루트 앱 복사본
```

---

## 머신에서 확인해야 할 항목 (`TODO(verify)`)
스캐폴드는 검증된 사실 기준이지만, 아래는 머신에서(특히 `npx create-ait-app naengbiseo` 출력과 대조해) 확정할 것:

- **`granite.config.ts`**
  - `appName: 'naengbiseo'` — 콘솔 등록 appName과 일치시킬 것.
  - `brand.icon` — 토스가 PNG를 요구할 수 있음. 냉비서 PNG를 호스팅하고 URL 교체.
  - `permissions: []` — 카메라(영수증 스캔) 등 네이티브 권한이 필요하면 추가.
  - `navigationBar` 테마 옵션 키 이름/위치 — SDK 버전별 최신 문서로 확인.
- **`package.json`** — `vite ^5.4.0`, `typescript ^5.5.0`, `packageManager yarn@1.22.22` 버전이
  실제 환경/예제와 다르면 조정. (`@apps-in-toss/web-framework: 1.5.2` 는 예제 기준 확정값.)
- **`src/main.ts`**
  - `isTossWebView()` — 토스 WebView 식별 공식 방법(전역 이름/UA, 또는 SDK 제공 env API)으로 확정.
  - `window.__TOSS__` 분기 — 루트 앱(`js/push.js`, `js/main.js` 설치배너 IIFE)에 아직 미적용. 필요 시 추가.
- **`src/toss-login.ts`** — 서버 `/tosslogin` 엔드포인트 **미구현**. `functions/` 에 코드→토큰 교환 추가.
  서버가 반환할 토큰 형태/필드명도 확정.

## 참고
- [개발자센터](https://developers-apps-in-toss.toss.im/) · [WebView 튜토리얼](https://developers-apps-in-toss.toss.im/tutorials/webview.html) · [예제](https://github.com/toss/apps-in-toss-examples) · [개발자 커뮤니티](https://techchat-apps-in-toss.toss.im/) · [사업자등록 가이드](https://toss.im/apps-in-toss/blog/business_registration)

---

## 버전 등록(.ait) — 콘솔 "버전 등록하기"

콘솔의 **버전 등록하기 → "ait 파일 선택"** 에 올릴 `.ait` 번들은 **빌드 결과물**이에요.

```bash
cd toss-miniapp
# (권장) 정답 설정 확보 — 한 번만:
npx create-ait-app naengbiseo     # 생성된 granite.config.ts·package.json과 본 스캐폴드를 대조, 다른 필드 반영

yarn install
yarn build                        # = yarn vendor + granite build (web.commands.build=vite build → dist/)
                                  # → 프로젝트 루트에 <appName>.ait 생성 (예: naengbiseo.ait)
```

생성된 **`naengbiseo.ait`** 를 콘솔 "버전 등록하기"에 업로드 → 메모(출시노트) 작성 → **등록하기**.
→ **QR/테스트 스킴이 자동 생성**되고, **토스앱에서 실기기 테스트** 가능. 문제없으면 **검수 요청**(최대 3영업일).

> 빌드/실행 중 자산 404나 모듈 에러가 나면, 그 에러 메시지를 그대로 주세요 — vendor 경로/번들 설정을 맞춰드릴게요.
> `npx create-ait-app` 결과와 본 스캐폴드의 필드가 다르면 그쪽(콘솔 생성본)이 정답이에요.
