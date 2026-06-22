# ⚡ 광클대전 — 실제 전국 대전 백엔드 켜기 (10분)

`fb-config.js`를 채우면 "전국 흐름·순위·랭킹·지역 점령"이 **진짜 데이터**로 돌아갑니다.
비워두면 자동으로 폰 단독 시뮬레이션(데모)으로 폴백 — 앱은 절대 깨지지 않습니다.

> 냉비서와 **같은 Firebase 프로젝트**를 그대로 재사용하면 됩니다. (요금·콘솔 한 곳)

---

## 1) 웹 config 붙여넣기
Firebase 콘솔 → ⚙️ 프로젝트 설정 → 내 앱(웹) → SDK 설정 및 구성 → 구성 객체 복사
→ `gwangclick/fb-config.js` 의 `window.GC_FB = …` 에 붙여넣기.

```js
window.GC_FB = {
  apiKey: 'AIza…', authDomain: 'naengbiseo.firebaseapp.com',
  projectId: 'naengbiseo', storageBucket: 'naengbiseo.appspot.com',
  messagingSenderId: '1234567890', appId: '1:1234567890:web:abcdef',
};
```
(웹 config 값은 공개돼도 안전합니다 — 보안은 아래 4번 규칙이 담당)

## 2) 익명 인증 켜기
Authentication → 로그인 방법 → **익명(Anonymous)** → 사용 설정.
(로그인 없이도 모든 기기가 전국 집계에 참여하게 해줍니다)

## 3) 승인된 도메인 추가
Authentication → 설정 → 승인된 도메인 → **`ddukkit.com`** 추가.
(GitHub Pages로도 열려면 `yonggunyoung.github.io` 도 추가)

## 4) Firestore 보안 규칙 (복붙)
Firestore → 규칙 → 아래로 교체 후 게시. (냉비서 규칙이 이미 있으면 두 `match` 블록만 추가)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // 전국 집계 — 누구나 읽기, 로그인(익명 포함) 사용자만 증가 기록
    match /gc_battles/{date} {
      allow read: if true;
      allow write: if request.auth != null;
    }

    // 개인 점수(랭킹) — 누구나 읽기, 본인 문서만 생성/수정 + 서버측 어뷰징 상한
    // Phase 2: country/badge/comment 는 '있을 때만' 타입·길이 검증(옛 클라이언트는 미전송 → 통과, 하위호환).
    match /gc_scores/{docId} {
      allow read: if true;
      allow create, update: if request.auth != null
        && request.resource.data.uid == request.auth.uid
        && docId == request.resource.data.date + '__' + request.auth.uid
        && request.resource.data.taps is int
        && request.resource.data.taps >= 0
        && request.resource.data.taps <= 1500
        && request.resource.data.nick.size() <= 16
        && (!('country' in request.resource.data)
            || (request.resource.data.country is string && request.resource.data.country.size() <= 2))
        && (!('badge' in request.resource.data)
            || (request.resource.data.badge is string && request.resource.data.badge.size() <= 16))
        && (!('comment' in request.resource.data)
            || (request.resource.data.comment is string && request.resource.data.comment.size() <= 24));
    }

    // 떡밥 투표소(UGC) — 누구나 읽기. 생성은 로그인 + 필드/길이 검증 + likes/reports=0 강제.
    // 좋아요/신고는 update 로 '카운터 +1 만' 허용(다른 필드 변조·임의 점프 차단). 삭제 금지(owner는 콘솔에서).
    match /gc_proposals/{id} {
      allow read: if true;
      allow create: if request.auth != null
        && request.resource.data.uid == request.auth.uid
        && request.resource.data.q is string && request.resource.data.q.size() >= 1 && request.resource.data.q.size() <= 40
        && request.resource.data.aName is string && request.resource.data.aName.size() >= 1 && request.resource.data.aName.size() <= 14
        && request.resource.data.bName is string && request.resource.data.bName.size() >= 1 && request.resource.data.bName.size() <= 14
        && request.resource.data.likes == 0 && request.resource.data.reports == 0;
      // 좋아요/신고: 정확히 한 카운터만 +1, 나머지 불변(q/aName/bName/uid 보존).
      allow update: if request.auth != null
        && request.resource.data.q == resource.data.q
        && request.resource.data.aName == resource.data.aName
        && request.resource.data.bName == resource.data.bName
        && request.resource.data.uid == resource.data.uid
        && (
          (request.resource.data.likes == resource.data.likes + 1 && request.resource.data.reports == resource.data.reports)
          || (request.resource.data.reports == resource.data.reports + 1 && request.resource.data.likes == resource.data.likes)
        );
      allow delete: if false;
    }
  }
}
```

> **콘솔에서 1회 적용**: Phase 2 배포 전 위 `gc_scores` 규칙을 **다시 게시**하세요(badge/comment 길이를 서버에서도 강제 — 클라 정제 우회 방지).
> `gc_battles` 규칙은 **변경 불필요** — `countries` 맵은 기존 `regions`와 동일하게 `write: if request.auth != null` 범위에 이미 포함됩니다.
> `badge` 상한 16: 클라 정제(`sanitizeBadge`)가 **2 코드포인트**로 1차 캡하되, 합자(ZWJ)·이형선택(VS16)·국기 이모지의 길이 변동을 규칙이 흡수하도록 여유값으로 둠 — 정상 배지가 규칙에서 거부돼 점수쓰기가 실패하는 일을 방지.
>
> **Phase 3(꾸미기 수익화) — 규칙·색인 변경 없음.** 꾸미기는 해금/장착 모두 **로컬**(`F.unlocked`·`F.cosmetics`)이라 신규 컬렉션/필드/제출이 없습니다.
> - **이름색**: 본인만 보는 로컬 틴트 → Firestore 미제출(타 사용자 미노출).
> - **프리미엄 배지**: 별도 필드를 만들지 않고 **기존 `badge` 제출 경로를 그대로** 씁니다. 다만 자유입력이 아니라 카탈로그 화이트리스트(`gc-cosmetics.js`의 `badge` 항목)만 장착되며, 값은 단일 이모지(≤2 코드포인트, ≤2 UTF-16)로 위 `gc_scores`의 `badge.size() <= 16` 규칙을 **이미 충족** → 규칙 재게시 불필요. (서버는 여전히 길이만 강제 — 클라는 화이트리스트로 한 번 더 좁힘.)

## 5) 복합 색인 2개
첫 랭킹 조회 시 콘솔이 "색인 만들기" 링크를 줍니다(클릭 한 번). 미리 만들려면 Firestore → 색인 → 복합:

| 컬렉션 | 필드 1 | 필드 2 | 용도 |
|---|---|---|---|
| `gc_scores` | `date` (오름차순) | `taps` (내림차순) | 오늘의 TOP 랭킹 |
| `gc_scores` | `date` (오름차순) | `taps` (오름차순) | 내 순위 카운트(나보다 많이 친 사람 수) |

> **Phase 2 색인 추가 없음.** 나라대전(국가 순위·내 나라 vs 세계)은 `gc_battles/{오늘}` 한 문서의 `countries` 맵을
> 그대로 읽어 클라에서 집계하므로(기존 `regions`와 동일) **새 쿼리·복합 색인이 필요 없습니다.** 위 2개 그대로 유지.
>
> **떡밥 투표소 — 복합 색인 없음.** 목록은 `gc_proposals` 를 `createdAt` **단일 필드 내림차순**으로만 정렬(자동 색인) → 복합 색인 불필요. 추첨/숨김(신고임계) 판정은 클라(`GCProp.pickFeed`/`statusOf`)에서 처리. **콘솔에서 위 `gc_proposals` 규칙만 1회 추가 게시**하면 됩니다(신규 컬렉션이라 기존 규칙 영향 0).

---

## 동작 구조 (참고)
```
// Phase 2(하위호환 가산 — 기존 필드 불변):
gc_battles/{YYYY-MM-DD} = { a, b, na, nb,
                            regions:{서울:{a,b}, …},        // 지역 점령(한국)
                            countries:{KR:{a,b}, US:{a,b}, …}, // 나라대전(ISO2) ← Phase 2 신규
                            updatedAt }                       // 전국/세계 집계(increment)
gc_scores/{날짜__uid}    = { date, uid, nick, side, taps, region,
                            country, badge, comment,          // ← Phase 2 신규(없으면 '')
                            ts }                              // 랭킹/순위
gc_proposals/{자동id}    = { q, aName, bName, uid,            // ← 떡밥 투표소(UGC) 신규 컬렉션
                            likes, reports, createdAt }       // 좋아요/신고는 +1 update 만 허용(규칙)
```
- 광클 수는 **라운드 종료 시 1회**만 합산 전송 (비용·어뷰징 최소화). `countries` 도 이 1회 쓰기에 **편승**(탭마다 ❌).
- 배틀 게이지는 `gc_battles/{오늘}` 을 **실시간 구독** → 남이 끝낼 때마다 진짜로 움직임. 나라 순위도 같은 구독/읽기 재사용(추가 구독 ❌).
- 클라이언트·규칙 양쪽에서 1회 기여 **상한 1500** (60초 현실 최대치 보수값). `badge`/`comment` 는 타 사용자 노출 → 클라·규칙 양쪽에서 길이 캡.

## 더 단단하게(선택, 나중에)
- **App Check**(reCAPTCHA/DeviceCheck) 켜면 앱이 아닌 트래픽의 집계 위변조를 차단.
- 동시 접속이 아주 커지면 `gc_battles` 핫도큐먼트를 **샤딩 카운터**로 분산하거나, 5초 주기 스냅샷 도큐먼트로 읽기 비용을 낮출 수 있음. (현재 규모에선 불필요)
