# 07. 서버 경유 AI 배포 가이드 (유료화 1단계)

사용자가 API 키를 몰라도 AI가 작동하는 운영 모드. 운영자(나)의 키 1개를 서버 시크릿으로 두고,
사용자별 **무료 월 한도(기본 10회)** 를 Firestore로 집계한다. 코드는 `functions/`에 준비 완료.

## 구조

```
앱 (설정: ☁️ 서버 모드 + 주소 입력)
  → Firebase 익명 로그인 토큰과 함께 POST
  → Functions(asia-northeast3): 토큰 검증 → 한도 차감 → Anthropic 호출 → 결과 반환
       시크릿: ANTHROPIC_API_KEY (운영자 키 — 클라이언트에 절대 노출 안 됨)
       기본 모델: 스캔=claude-haiku-4-5(비용 최적) / 레시피정리=claude-sonnet-4-6
       환경변수로 교체 가능: SCAN_MODEL, RECIPE_MODEL, FREE_QUOTA
```

## 배포 절차 (처음 1회, ~20분)

1. **Firebase 프로젝트** — 기기 연동 때 만든 프로젝트 재사용 (없으면 console.firebase.google.com에서 생성)
2. **Blaze(종량제) 플랜으로 업그레이드** — Functions가 외부(Anthropic) 호출을 하려면 필수.
   무료 할당량이 커서 소규모에선 실제 과금이 거의 0원에 가깝다 (AI 사용량만 Anthropic 쪽에 과금)
3. 로컬 PC에서:
   ```bash
   npm install -g firebase-tools
   firebase login
   git clone https://github.com/yonggunyoung/todayfeelgood && cd todayfeelgood
   firebase use <프로젝트ID>
   firebase functions:secrets:set ANTHROPIC_API_KEY   # 운영자 키 입력 (console.anthropic.com에서 발급)
   cd functions && npm install && cd ..
   firebase deploy --only functions
   ```
4. 배포 끝나면 출력되는 **함수 URL**(예: `https://ai-xxxxxxxx-du.a.run.app`)을 복사
5. 앱 → 설정 → **AI 기능 → ☁️ 서버(유료화)** 선택 → URL 붙여넣고 저장
6. 끝 — 이제 이 앱을 쓰는 누구나 (기기 연동만 켜면) 키 없이 월 10회 AI를 쓴다

## Firestore 보안 규칙 (콘솔 → Firestore → 규칙 탭에 붙여넣기)

계정 동기화·가족 공유·게임 랭킹이 안전하게 돌아가는 최소 규칙:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    // 내 계정 데이터 — 본인만
    match /userdata/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
    // 가족 공유 — 로그인 사용자(코드를 아는 사람)만
    match /spaces/{code} {
      allow read, write: if request.auth != null;
    }
    // 게임 랭킹 — 모두 읽기(로그인), 내 문서만 쓰기
    match /leaderboard/{uid} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == uid;
    }
    // AI 한도/구독은 서버(Functions=Admin)만 다룬다 — 클라이언트 직접 접근 차단
    match /ai_usage/{doc} { allow read, write: if false; }
    match /users/{uid} { allow read: if request.auth.uid == uid; allow write: if false; }
  }
}
```

## 운영 노트

- **한도 변경**: `firebase functions:config`가 아닌 환경변수 — 배포 시 `FREE_QUOTA=20 firebase deploy --only functions` 또는 콘솔에서 함수 환경변수 수정
- **사용량 확인**: Firestore `ai_usage` 컬렉션 — 문서ID `{uid}_{YYYY-MM}`, 필드 `count`, `by_scan`, `by_ytrecipe`
- **비용 가드**: Google Cloud 콘솔 → 예산 알림 설정 (예: 월 $20) + Anthropic 콘솔 사용량 한도 설정
- **프리미엄(구독자 무제한)**: G2 단계에서 `consumeQuota`에 구독 여부 분기 추가 — Firestore `users/{uid}.plan` 확인 한 줄
- **모델 교체 실험**: 클라이언트 수정 없이 서버 환경변수만 바꾸면 됨 (예: 스캔을 다른 모델로) — 멀티 프로바이더 전환도 이 파일 하나만 고치면 되는 구조

## AI 제공사 선택 근거 (2026-06 조사)

| | 입력/출력 ($/1M tok) | 이미지(영수증) | 비고 |
|---|---|---|---|
| Claude Haiku 4.5 (현재 스캔용) | $1.00 / $5.00 | ✅ | 코드 완성·검증됨, 구조화 출력 |
| Claude Sonnet 4.6 (레시피 정리용) | $3.00 / $15.00 | ✅ | 웹 도구(유튜브 정리) 사용 가능 |
| Gemini 2.5 Flash-Lite | ~$0.10 / $0.40 | ✅ | 최저가권 — G3 규모에서 스캔용 병행 검토 후보 |
| DeepSeek V4 Flash | ~$0.14 / $0.28 | ❌ 텍스트 전용 | 영수증 스캔 불가 → 우리 용도 부적합 |

결론: 영수증 1장당 비용이 Haiku ≈ 7원 vs Flash-Lite ≈ 1원 수준 — **차이가 사용자당 월 수십 원**이라
지금 규모에선 갈아타는 공수·품질 리스크가 절감액보다 크다. 유튜브 빠른 레시피는 Claude 서버측 웹 도구에
의존하므로 유지. 월 AI 비용이 수십만 원대(MAU 수천)에 도달하면 스캔만 Flash-Lite 병행을 재검토.

## 터미널(클로드 CLI 포함)에서 AI 테스트 — 관리자용

서버를 배포하기 전에도, 폰 없이도 파이프라인을 검증할 수 있다:

```bash
export ANTHROPIC_API_KEY=sk-ant-…           # 운영자 키
node tools/ai-test.mjs scan ./영수증.jpg     # 영수증/식재료 사진 → 품목 추출 결과 + 토큰 사용량
node tools/ai-test.mjs yt https://youtu.be/… # 유튜브 → 빠른 레시피 정리 결과
SCAN_MODEL=claude-sonnet-4-6 node tools/ai-test.mjs scan ./영수증.jpg  # 모델 교체 비교 실험
```

앱 쪽에서는 AI 설정이 **관리자 모드**(설정 → AI 기능 → 🔒 관리자, 최초 1회 PIN 설정) 뒤로 숨겨져 있어
일반 사용자는 "베타 준비 중" 안내만 보고, 키·서버 주소는 운영자만 만질 수 있다.

## 인앱 유튜브 검색 (서버 — 전 사용자 무료)

함수 환경변수 `YT_API_KEY`에 YouTube Data API v3 키를 넣고 배포하면, 모든 사용자가 키 입력 없이
앱 안에서 유튜브 레시피를 검색한다 (AI 한도 미차감 — YouTube 무료 쿼터는 일 ~100회 검색).
`YT_API_KEY=AIza… firebase deploy --only functions`
