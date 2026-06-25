# 글꾸미 키보드 (안드로이드 커스텀 키보드 / IME) — 스캐폴드

폰에 깔면 **카톡·인스타·디스코드 등 어떤 앱의 입력창에서든** 글꾸미 키보드로 전환해
멋글씨·이모티콘·특수문자를 골라 **그 자리에 바로 입력**합니다(복붙 불필요 — `commitText`).

> ⚠ 네이티브 프로젝트라 이 환경에서는 빌드/검증을 못 합니다. **Android Studio에서 열어 빌드**하세요.
> 키보드 본체 UI·변환 로직은 100% 메인 앱 엔진을 재사용하므로, 네이티브 코드는 "WebView 띄우기 + commitText" 껍데기뿐입니다.

## 빌드/설치

1. 엔진 동기화: 이 폴더에서 `node tools/sync-engine.mjs` → `app/src/main/assets/web/{engine,data}` 채워짐.
2. **Android Studio**로 이 폴더 열기 → Gradle 동기화(필요 시 AGP/Gradle 버전 권장값 수락) → 기기/에뮬레이터에 Run.
3. 폰: **설정 → 일반 → 키보드 → 키보드 관리**에서 "글꾸미 키보드" 켜기 → 입력 시 키보드 전환(🌐/⌨)으로 선택.

## 구조

```
app/src/main/
  AndroidManifest.xml                 InputMethod 서비스 선언
  res/xml/method.xml                  IME 메타
  java/com/geulkkumi/keyboard/GkInputService.kt   WebView 키보드 + Gk.commit 브리지
  assets/web/
    keyboard.html · keyboard.js       키보드 UI(엔진 import, 선택 시 Gk.commit)
    engine/ · data/                   ← 동기화본(메인 앱 단일 소스)
tools/sync-engine.mjs                 엔진/데이터 동기화 스크립트
```

## 동작 원리

- `GkInputService`(InputMethodService)가 키보드 뷰를 **WebView**로 만들고 `assets/web/keyboard.html`을 로드.
- WebView에 `allowFileAccessFromFileURLs`를 켜 **ESM 모듈(import)** 을 file://에서 로드(빌드 없이 엔진 그대로).
- 사용자가 패널에서 선택 → `keyboard.js`가 `Gk.commit(text)` 호출 → `currentInputConnection.commitText()`로 입력창에 직접 입력.
- 평소 타이핑은 `⌨` 버튼으로 시스템 키보드 선택창을 열어 전환.

## 다음 단계(선택)

- 한/영 토글·백스페이스·스페이스 등 기본 자판 행 추가(현재는 '꾸밈 전용' 패널).
- 즐겨찾기/최근(메인 앱 store 로직 포팅 또는 WebView localStorage 재사용).
- iOS는 별도 키보드 익스텐션(Swift) 필요 — 엔진은 JavaScriptCore로 재사용 가능(`../MOBILE.md` 참고).
