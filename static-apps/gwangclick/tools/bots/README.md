# 🤖 광클대전 봇 시더 (관리자 전용)

초반 활성 유저가 붙기 전, **실제 플레이어와 동일한 형태**로 가상 플레이어를 Firestore에 심어
게이지·전국 랭킹·순위·지역 점령·지구본이 살아있게 보이게 한다. 유저는 **구분 불가**.
충분히 성장하면 `purge`로 **흔적 없이 회수**(실데이터는 그대로).

> ⚠️ 이건 클라이언트가 아니라 **관리자 PC/서버**에서 서비스 계정으로 실행한다.
> 클라이언트 표시용 합성(`gc-bots.js`의 `enabled`)은 **OFF**가 기본 — 이 시더가 단일 출처다(이중가산 방지).

## 동작 원리 (구분 불가 + 회수 가능)
- **심기**: `gc_scores/{date}__bot__NNNN` 개별 문서(실제와 같은 필드: nick/side/taps/region/country/badge/comment)
  + `gc_battles/{date}` 집계 증가. 회수용으로 서버에만 `bot:true` 태그(클라는 읽지/노출하지 않음).
- **성장**: 시간대 곡선으로 인원·점수가 자라남(아침 적고 저녁 많고, 리더보드 상위 변동). 결정적이라 기기마다 동일.
- **이중가산 0**: 원장 `gc_bots_state/{date}`에 누적 봇 기여를 절대값으로 기록 → 매 실행은 `목표−원장`만큼만
  `increment`로 반영. 동시 진행되는 **실제 유저 증가분과 안전하게 합성**된다.
- **회수**: `purge`가 원장만큼 `increment(−값)`으로 집계에서 정확히 빼고, `bot==true` 점수문서를 전부 삭제 → 실데이터 무손상.

## 설치
```bash
cd tools/bots
npm install          # firebase-admin
```

## 서비스 계정 키
Firebase 콘솔 → 프로젝트 설정 → 서비스 계정 → **새 비공개 키 생성** → 받은 JSON을
`tools/bots/service-account.json` 로 저장(이미 .gitignore 처리됨). 또는:
```bash
export GOOGLE_APPLICATION_CREDENTIALS=/절대경로/service-account.json
```

## 먼저 미리보기(계정 없이도 OK)
```bash
npm run dry
# date / 참전수 / A점유 / 상위5 / 쓰게 될 문서 수 출력
```

## 심기 / 성장
```bash
node seed.mjs                 # 오늘
node seed.mjs --date 2026-06-22 --at 2026-06-22T21:00:00   # 특정 시점 재현
```
**주기 실행(성장)** — cron 예시(2시간마다, 오전 8시~자정):
```
0 8-23/2 * * *  cd /path/tools/bots && node seed.mjs >> seed.log 2>&1
```
> 비용: 1회 = (참전 수)개 점수문서 + 집계1 + 원장1. 저녁 피크 ~700 내외.
> 무료 한도(쓰기 2만/일) 안에서 2~3시간 간격 권장. 더 아끼려면 간격을 늘린다.

## 제거(추후)
```bash
node purge.mjs --date 2026-06-22     # 그 날 봇 제거
node purge.mjs --all                 # 원장에 있는 모든 날짜 제거
node purge.mjs --all --dry           # 미리보기
```

## 규모 조절
`../../gc-bots.js` 상단 `FLOOR`/`PEAK`(인원), 점수 분포는 `lib.mjs`의 `endTaps` 수식.
완전히 끄려면 더 이상 `seed`를 돌리지 않고 한 번 `purge`하면 끝.
