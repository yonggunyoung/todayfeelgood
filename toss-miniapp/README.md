# 냉비서 → 앱인토스 미니앱 (런북)

> 목표: 냉비서를 **토스 앱 안 미니앱**으로 출시(토스 누적 3천만 유저 노출).
> 이 문서는 조사로 검증된 사실 기준. 정확한 SDK 함수는 항상 [개발자센터](https://developers-apps-in-toss.toss.im/) 최신 문서 기준으로 확정한다.

## ⚠️ 핵심 현실 (오해 방지)
- **iframe 금지** — `ddukkit.com/fridge`를 iframe/링크로 붙이면 **보안심사 반려**.
- 기존 서비스는 **`@apps-in-toss/web-framework`** 를 설치해 **WebView SDK로 연동**해야 한다.
- 이 SDK는 **번들러(Vite) 전제** → 냉비서(빌드 무방식 바닐라 PWA)는 **별도 빌드 프로젝트**가 필요하다.

## 아키텍처 결정
**`toss-miniapp/` 안에 Vite 프로젝트를 두고, 냉비서의 로직(`js/`, `css/`, `js/data/`)을 재사용**한다.
- 웹 버전(`ddukkit.com/fridge`, GitHub Pages)은 그대로 유지(빌드 무방식).
- 토스 버전만 번들링 + 토스 SDK 연동 + 토스 로그인.

## 단계별 절차
### 0) 콘솔 (코드 0 — 지금)
1. 앱인토스 콘솔 → 워크스페이스 생성 → **앱 +등록하기** (이름/아이콘/카테고리/설명). 개발 전이라도 미리 등록 가능.
2. **사업자등록 시작**(병행) — 출시 자체엔 선택이나 **`appLogin`(토스 로그인)·인앱 광고·결제·정산**엔 필수. 개인사업자 검토 1~2영업일. ⚠️ 면세사업자 불가 / 직장인은 겸업금지 확인.

### 1) 스캐폴드
```bash
npx create-ait-app naengbiseo-toss   # Vite(React+TS) 기준 미니앱 골격 생성
```
→ 생성된 SDK **초기화 코드 + `appLogin` 예제**를 기준 삼는다(여기의 정확한 init API를 그대로 사용).

### 2) 냉비서 이식
- 냉비서 화면/로직은 vanilla JS라 그대로 번들 가능. 미니앱 엔트리에서 기존 `js/main.js` 흐름을 마운트하거나, `@apps-in-toss/web-framework`를 냉비서 빌드에 설치.
- 정적 데이터(`js/data/*`)·CSS 재사용.

### 3) 로그인 교체 (중요)
- **Google OAuth는 토스 WebView에서 팝업이 막힘** → 토스 버전은 **`appLogin()`** 사용.
  - `appLogin()` → (신규 유저는 약관 동의 후) **authorization code** 반환 → 서버(Cloud Function)에서 검증/세션화.
  - 기존 Firebase 동기화와 연결: appLogin uid ↔ Firestore `userdata` 매핑 어댑터 추가.

### 4) 토스 환경 대응
- safe-area(상태바/노치), 뒤로가기/네비게이션 SDK 연동, 외부링크 처리.
- 웹 PWA 전용(서비스워커 설치배너·FCM 웹푸시)은 토스 빌드에선 분기 처리.

### 5) 빌드 → 제출
- Vite 빌드 → 앱인토스 **sandbox 배포** → 콘솔에서 **심사 제출**.
- 심사: 앱인토스 체크리스트(개발/디자인) · 기능 이슈 · 개인정보/보안. **최초 심사 며칠**.

## 자동화(권장)
firebase·허브처럼 **GitHub Actions로 토스 빌드/배포 자동화** 가능(시크릿: 토스 배포 토큰). 셋업하면 "푸시 → 토스 sandbox 갱신".

## 참고
- [개발자센터](https://developers-apps-in-toss.toss.im/) · [WebView 튜토리얼](https://developers-apps-in-toss.toss.im/tutorials/webview.html) · [예제](https://github.com/toss/apps-in-toss-examples) · [개발자 커뮤니티](https://techchat-apps-in-toss.toss.im/) · [사업자등록 가이드](https://toss.im/apps-in-toss/blog/business_registration)
