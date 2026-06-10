# 04. 기술 아키텍처

## 1. 스택 (1인 개발, 웹+앱 동시 운영 전제)

| 레이어 | 선택 | 이유 |
|---|---|---|
| 클라이언트 | **Expo (React Native) + expo-router** | iOS/Android/웹 단일 코드베이스. 카메라·푸시·공유 시트 등 네이티브 기능 필수라 PWA 단독보다 유리 |
| 백엔드 | **Firebase** (Auth, Firestore, Cloud Functions, Storage, FCM) | 이전 프로젝트 경험 재활용, 서버 운영 0, 무료 티어로 MVP 충분 |
| AI | **Claude API** (Cloud Functions 경유) | 파싱: Haiku 4.5 / 생성: Sonnet 4.6~Opus 4.8 (`02-ai-design.md`) |
| 데이터 시드 | 식약처 레시피 DB, 식약처 바코드 식품 DB, KAMIS 농산물 가격 | 전부 공공데이터, 무료 |
| 커머스 | 쿠팡 파트너스 (딥링크 + subId 추적) | 가입 승인 필요 — Phase 0에서 신청 |
| 분석 | Firebase Analytics + BigQuery export | KPI는 `05-roadmap.md` |

원칙: **AI 호출·파트너스 링크 생성·한도 차감은 전부 서버(Functions)에서.** 클라이언트에는 API 키가 절대 내려가지 않는다.

## 2. 데이터 모델 (Firestore)

```
users/{uid}
  profile: { mode: "fitness"|"frugal"|"maternity", householdId?, macroGoal? }
  plan: { tier: "free"|"premium", renewsAt }

households/{hid}                      // 가족 공유 (프리미엄)
  members: [uid...]

ingredients_master/{ingId}            // 전역 재료 사전 (정규화 기준)
  { name: "우유", aliases: ["서울우유","멸균우유"...],
    defaultShelfLife: {냉장:10}, qtyType: "count"|"level"|"bundle",
    nutritionPer100g: {...}, category }

pantry/{uid|hid}/items/{itemId}
  { ingId, displayName, qty: number|level, location: 냉장|냉동|실온,
    expiresAt, source: receipt|photo|manual|barcode, createdAt }

recipes/{recipeId}                    // 시드: 식약처 DB → 정규화 가공
  { title, ingredients: [{ingId, amount, unit, optional}], steps[],
    nutrition: {kcal, protein, ...}, tags[], modeFlags: {maternitySafe: bool...},
    source, servings }

cook_events/{uid}/events/{eventId}    // 요리 완료 기록 = 차감 원장
  { recipeId?, servings, deductions: [{itemId, before, after}],
    adhoc?: bool, leftoverId?, cookedAt }

leftovers/{uid}/items/{id}
  { name, photoUrl?, location, expiresAt, status: active|eaten|wasted,
    fromCookEventId }

shopping/{uid}/items/{id}
  { ingId, reason: depleted|expiring|recipe, affiliateUrl, state: open|done }

ai_usage/{uid}/months/{YYYY-MM}
  { count, byType: {receipt: n, generate: n...}, estCostUsd }   // 한도 집행 + 단가 모니터링

waste_ledger/{uid}/...                // 버린 돈/아낀 돈 리포트 원천
```

설계 포인트:
- `ingredients_master`가 시스템의 척추다. 영수증 파싱 결과·레시피 재료·재고가 전부 `ingId`로 만나야 매칭이 돈다. Phase 0에서 상위 ~500개 재료를 수동 큐레이션.
- 차감은 `cook_events`에 원장으로 남긴다 → 실행 취소(undo), 소비 패턴 학습(Phase 2)의 원천.

## 3. AI 호출 흐름 (영수증 예시)

```
클라이언트: 사진 촬영 → Storage 업로드 → Functions 호출(경로만 전달)
Functions:
  1. ai_usage 한도 확인 (초과 시 402 응답 → 클라가 업그레이드 모달)
  2. Claude API (Haiku 4.5, 이미지 + 시스템 프롬프트[캐시됨])
     output_config.format = json_schema:
       { items: [{ rawName, normalizedGuess, qty, unit, price? }] }
  3. rawName → ingredients_master 매칭 (사전 → 실패분은 응답의 normalizedGuess 사용)
  4. ai_usage 증가, 결과 반환
클라이언트: 확인 화면 → 일괄 등록 (pantry write)
```

신뢰성 규칙: AI 출력은 **항상 제안**이고, 쓰기는 사용자 확인 후 클라이언트가 수행. AI 실패 시에도 퀵추가로 항상 우회 가능 (코어 루프 무중단 원칙).

## 4. 추천 엔진 (비AI 기본형)

Functions 또는 클라이언트 로컬에서 실행 (레시피 ~1,100개면 클라 로컬 계산도 충분 — 오프라인 동작 보너스):

```
1. 후보: pantry ∩ recipe.ingredients 커버리지 ≥ 60%
2. 산모 모드면 modeFlags 하드 필터 선적용
3. 점수 = 0.4·커버리지 + 0.25·임박재료가중 + 0.2·잔반가중 + 0.15·모드점수
4. 상위 N개 + "부족 재료 1개" 그룹 별도 표시 (장보기 연결 고리)
```

## 5. 플랫폼 출시 전략

- **1차: Android + 웹** (Expo 동시 빌드) — 심사 빠르고 타겟(자취생) 안드 비중 높음
- **2차: iOS** — 구독은 앱 내 결제(IAP) 수수료 15~30% 감안해 웹 결제 병행 검토
- 웹은 마케팅 랜딩 + 데스크톱 레시피 열람용. 코어 사용은 모바일

## 6. 보안·운영 체크리스트

- Firestore Security Rules: 사용자 데이터 본인/가구원만 접근
- AI 한도 우회 방지: Functions에서만 차감·검증 (클라 신뢰 금지)
- 영수증 사진: 파싱 후 30일 자동 삭제 (개인정보 최소 보관)
- 처리방침에 명시: 사진은 식품 인식 목적으로만 AI 처리, 제3자 제공 없음
- 비용 가드레일: Functions에 일일 AI 비용 상한 알람 (예: $20/일 초과 시 알림 + 게이트)
