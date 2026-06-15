# 냉비서 Firebase 함수 — Gemini 게이트웨이 (서울 리전)

Gemini는 Cloudflare egress를 "지원 안 되는 위치"로 거부한다(`User location is not supported`).
그래서 Gemini 호출만 **구글 리전(asia-northeast3, 서울)**의 이 함수가 대신 처리한다.
Claude는 기존 Cloudflare 워커 그대로. (이 함수의 Claude용 `/scan` 등은 현재 미사용.)

엔드포인트:
- `POST /gscan` — 본문 `{ "image": "<base64 jpeg>" }` → `{ "items": [...] }` (영수증/식재료, confidence 포함)
- `POST /gytrecipe` — 본문 `{ "url": "<youtube>" }` → 레시피 JSON
- 인증 없음(익명 허용). 대신 **전역 일일 상한**(`GEMINI_DAILY_CAP`, 기본 300회/일)으로 비용 폭주를 막는다.

## 배포 (한 번)

전제: 이미 Firebase 프로젝트가 있고 Firestore(서울)가 켜져 있음.

```bash
npm i -g firebase-tools          # 설치(최초 1회)
firebase login                   # 구글 로그인
firebase use --add               # 이 프로젝트 선택(별칭 지정)

# Gemini 키를 시크릿으로 (값은 프롬프트에 붙여넣기 — 코드/깃엔 안 들어감)
firebase functions:secrets:set GEMINI_API_KEY

firebase deploy --only functions
```

배포가 끝나면 콘솔에 함수 URL이 찍힌다:
```
Function URL (ai(asia-northeast3)): https://asia-northeast3-<프로젝트ID>.cloudfunctions.net/ai
```
이 URL을 **`js/config.js`의 `AI_FN`**에 넣으면 된다(개발자가 처리). 끝.

## 무료(Spark)로 되나?
- Gemini는 **구글 서비스**라 Spark 요금제에서도 함수→Gemini 호출이 보통 허용된다.
- 혹시 외부 호출이 막히면 **Blaze(종량제)**로 올리면 된다 — 무료 한도가 커서 소규모는 사실상 무료.

## 환경변수(선택, 안 넣어도 기본값 동작)
| 이름 | 기본값 | 용도 |
|---|---|---|
| `GEMINI_MODEL` | `gemini-flash-latest` | 사용할 Gemini 모델 ID |
| `GEMINI_DAILY_CAP` | `300` | 하루 총 Gemini 호출 상한(비용 실링) |
| `ALLOWED_ORIGIN` | (비움=전체 허용) | 쉼표구분 허용 출처(예: `https://yonggunyoung.github.io`) |

설정하려면 `functions/.env` 파일에 `KEY=값` 형태로 적고 다시 배포한다.

## ⚠️ 현재 한계 (다음 단계)
`/gscan`·`/gytrecipe`는 **인증이 없어** 주소를 아는 사람은 일일 상한까지 호출할 수 있다(총비용은 상한으로 막힘, 사용자별 제한은 아직 없음).
다음 단계로 Firebase 익명/구글 로그인 토큰을 붙여 **사용자별 월 쿼터**(이 파일의 `consumeQuota` — 광고 보상·프리미엄 연동)로 올리면 된다.
