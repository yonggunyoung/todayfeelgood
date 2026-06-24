# 🎨 그림공장 — AI 이미지 배치 생성 스튜디오

**내 OpenAI·Gemini API 키로, 원하는 스타일의 프롬프트를 만들고 → 수치(N)만 넣으면 그만큼 이미지를 자동으로 생성·저장해 주는 개인용 스튜디오.**

빌드 과정이 없는 정적 웹앱(PWA)이라 어떤 정적 호스팅에든 올리면 바로 동작하고, 휴대폰 홈 화면에 앱처럼 설치할 수 있습니다. 모든 호출은 **본인 키로 본인 계정**에서 일어나며, 키는 이 기기에만 저장됩니다(전송·동기화 안 함).

---

## ⚠️ 먼저 — "구독"과 "API 키"는 다릅니다

이미지를 프로그램으로 만들려면 **API 키**가 필요합니다. 월 구독과는 별개입니다.

| 가지고 있는 것 | 이 앱에 필요한 것 | 발급처 |
|---|---|---|
| ChatGPT Plus 구독 | **OpenAI API 키** (사용량 과금, 별도) | [platform.openai.com](https://platform.openai.com/api-keys) → 결제수단 등록 → API keys |
| Gemini Advanced 구독 | **Gemini API 키** 또는 **Google 로그인(OAuth)** | [aistudio.google.com](https://aistudio.google.com/apikey) → Get API key |

> ChatGPT/Gemini 앱 구독료로는 API가 호출되지 않습니다. 위 콘솔에서 발급한 **API 키**(또는 Gemini는 Google 로그인)로 동작하며, 비용은 만든 장수만큼 **본인 계정에 과금**됩니다.
>
> **인증 방식 정리** — OpenAI는 **API 키 전용**(이미지 API용 공식 OAuth 없음). **Gemini는 API 키 또는 Google 로그인(OAuth)** 중 선택. 설정 → *Gemini 인증* 에서 토글합니다.

### Gemini를 ‘Google 로그인(OAuth)’으로 쓰기 (선택)

키를 저장하기 싫고 로그인 UX를 원하면 Gemini만 OAuth로 쓸 수 있습니다. 운영자가 **1회** 설정합니다.

1. [Google Cloud Console](https://console.cloud.google.com) → 프로젝트 선택/생성 → **API 및 서비스 → 라이브러리**에서 **Generative Language API** 사용 설정 (Imagen 사용 시 결제 계정 연결).
2. **API 및 서비스 → OAuth 동의 화면** 구성(외부, ‘테스트’ 모드면 본인을 *테스트 사용자*로 추가).
3. **사용자 인증 정보 → 사용자 인증 정보 만들기 → OAuth 클라이언트 ID → 웹 애플리케이션**. **승인된 JavaScript 원본**에 이 앱을 여는 주소를 정확히 추가:
   - 로컬: `http://localhost:8080`
   - 호스팅: `https://yonggunyoung.github.io` (도메인만, 경로 제외)
4. 발급된 **클라이언트 ID**(`...apps.googleusercontent.com`)를 앱 **설정 → Gemini 인증 → Google 로그인 → 클라이언트 ID** 칸에 붙여넣고 **‘Google로 로그인’**.

- 클라이언트 ID는 공개값이라 저장/커밋해도 안전합니다(저장소의 Firebase 설정과 동일한 성격).
- **액세스 토큰은 메모리에만** 보관하고 저장하지 않습니다. 토큰은 약 1시간 유효하며, 생성 직전 무UI로 자동 갱신됩니다(만료/철회 시 다시 ‘Google로 로그인’).
- 동의 화면 스코프는 `cloud-platform`(Google Cloud 접근)으로 표시됩니다 — 공식 Gemini OAuth가 요구하는 범위입니다.
- 할당량을 특정 프로젝트로 청구하려면 설정의 **GCP 프로젝트 ID**(선택) 칸을 채우면 `x-goog-user-project` 헤더로 전송됩니다.

---

## 쓰는 순서 (3단계)

1. **설정 ⚙️** 에 OpenAI 또는 Gemini API 키를 넣고 **테스트** — ✅ 가 뜨면 준비 완료.
2. **만들기 🎨** 에서 주제를 적고, 스타일·분위기·구도·색감·디테일 칩을 골라 **프롬프트 만들기** (원하면 **✨ AI로 다듬기** 로 더 풍부하게).
3. **수량(N)** 을 정하고 **⚡ 한 번에 생성** — N장이 자동 생성되어 **갤러리에 저장**됩니다. (설정에서 "생성 즉시 파일로 자동 저장" 을 켜면 다운로드까지 자동)

먼저 한 장만 확인하고 싶으면 **👁 시안 1장**.

---

## 기능

| 기능 | 설명 |
|---|---|
| 🧩 **프롬프트 빌더** | 스타일 20종 · 분위기/조명 · 구도 · 색감 · 디테일 부스터를 칩으로 조합 → 영문 프롬프트 자동 조립 (AI 없이도 동작) |
| ✨ **AI 프롬프트 보강** | 고른 옵션을 텍스트 모델(GPT-4o mini / Gemini Flash)이 더 구체적인 프롬프트로 확장 · 한글→영어 번역 |
| 👁 **시안 1장** | 배치 전에 1장만 빠르게 미리보기 |
| ⚡ **배치 생성** | 수량 N 입력 → 동시성 제어로 N장 자동 생성. 진행률·중지 지원. Imagen·GPT Image는 호출당 여러 장으로 묶어 효율 호출 |
| 💾 **자동 저장** | 생성 즉시 브라우저 갤러리(IndexedDB)에 영구 저장 · 옵션으로 파일 자동 다운로드 |
| 🖼 **갤러리** | 만든 그림 모아보기 · 확대 · 개별 다운로드 · 프롬프트 재사용 · 삭제 |
| ⬇ **전체 ZIP** | 모든 이미지 + `prompts.txt`(프롬프트·설정 메타)를 ZIP 한 파일로 (의존성 0 자체 구현) |
| 🎲 **다양화** | 여러 장일 때 장마다 살짝 다른 변형으로 생성 |
| 📱 **PWA** | 홈 화면 설치 · 앱 셸 오프라인 캐시 |

### 지원 모델

- **OpenAI** — `gpt-image-1`(고품질), `dall-e-3`(안정적), `dall-e-2`(저렴)
- **Google Gemini** — `gemini-2.5-flash-image`(빠름), `imagen-4`·`imagen-3`(고품질, 호출당 최대 4장)
- 모델명이 바뀌면 설정에서 직접 고르거나, 코드의 `js/providers/index.js` 카탈로그만 수정하면 됩니다.

---

## 실행

별도 빌드·설치가 필요 없습니다.

```bash
# 이 폴더(geurim/)에서
npm start         # 로컬 서버 → http://localhost:8080  (python3 http.server)
npm test          # 단위 테스트 (node --test) — 프롬프트/제공자/ZIP 로직
```

또는 정적 호스팅(GitHub Pages 등)에 올린 뒤 `…/geurim/` 경로로 접속하면 됩니다. (예: `https://yonggunyoung.github.io/todayfeelgood/geurim/`)

### CORS로 막힐 때 — 로컬 프록시 (선택)

브라우저에서 OpenAI/Gemini로 **직접** 호출하는 것이 기본입니다. 환경에 따라 브라우저 CORS 정책으로 막히면, 함께 들어 있는 의존성 0 프록시를 켜세요.

```bash
npm run proxy     # → http://localhost:8787  (node proxy.mjs, Node 18+)
```

그 다음 **설정 → 로컬 프록시** 칸에 `http://localhost:8787` 을 넣으면, 호출이 로컬 프록시를 거쳐 나갑니다. (키는 브라우저 → 내 PC 프록시 → 해당 제공자 로만 흐르며, 프록시는 키를 저장/로그하지 않습니다.)

---

## 보안

- API 키는 **이 기기의 localStorage** 에만 저장되고, 그 어디로도 동기화·업로드되지 않습니다. 호출 시에만 해당 제공자(OpenAI/Google)로 전송됩니다.
- **Google 로그인(OAuth)** 사용 시: 액세스 토큰은 **메모리에만** 두고 저장하지 않습니다(새로고침하면 무UI 재발급 시도). 저장되는 건 공개값인 클라이언트 ID와 ‘동의함’ 플래그뿐입니다.
- **공용 PC에서는 키를 넣거나 로그인하지 마세요.** 설정 → "설정·키 초기화"(로그아웃 포함) 로 언제든 지울 수 있습니다.
- 생성한 이미지는 이 브라우저의 IndexedDB에 저장됩니다(갤러리 → "전체 삭제" 로 제거).

---

## 구조

```
geurim/
  index.html              앱 셸 (3탭: 만들기 / 갤러리 / 설정)
  css/styles.css          디자인 시스템 (다크 스튜디오)
  js/
    app.js                UI 컨트롤러 (화면·이벤트·오케스트레이션)
    store.js              설정 영속화 (localStorage, 키 비동기화)
    db.js                 갤러리 영속화 (IndexedDB, Blob 저장)
    styles-data.js        스타일/옵션 프리셋 데이터 (순수)
    prompt.js             프롬프트 빌더 엔진 (순수, 비AI 코어)
    batch.js              배치 큐 — 수치만큼 자동 생성(동시성·재시도·취소)
    zip.js                의존성 0 ZIP 작성기 (CRC32, store 방식)
    gallery.js            갤러리 렌더 + 다운로드(개별/ZIP)
    providers/
      index.js            모델 카탈로그 + 인증(키/OAuth)·프록시 해석 + 디스패치
      openai.js           OpenAI 이미지·텍스트 (순수 빌더 + fetch)
      gemini.js           Gemini 이미지·텍스트 (키 또는 OAuth Bearer, 순수 빌더 + fetch)
      google-auth.js      Google 로그인(OAuth, GIS) — 토큰은 메모리에만
      net.js              공용 fetch (재시도·백오프·친절한 에러)
  proxy.mjs               선택용 로컬 CORS 프록시 (Node, 의존성 0)
  tests/                  단위 테스트 (prompt / providers / zip)
  manifest.webmanifest, sw.js, icon.svg
```

핵심 로직(프롬프트 조립, 제공자 요청 빌더, ZIP/CRC32, 배치 분해)은 모두 **DOM·네트워크 비의존 순수 함수**로 분리되어 `node --test` 로 검증됩니다.
