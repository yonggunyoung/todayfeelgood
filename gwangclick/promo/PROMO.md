# 🧵 광클대전 — 스레드(Threads) 홍보 패키지

> 자동 업로드 프로그램용. **`threads-posts.json`** 한 파일만 먹이면 됨(국내 KO / 해외 EN 분기 포함).
> 링크: **https://ddukkit.com/gwangclick**

## 구성
```
promo/
├── threads-posts.json   # 자동화용: posts[].full(본문 그대로) + posts[].image(첨부 카드) + lang
├── PROMO.md             # 이 문서(사람용)
└── cards/               # 1080×1080 정사각 카드 (스레드 권장 비율)
    ├── ko-1.png  민초 vs 반민초
    ├── ko-2.png  부먹 vs 찍먹
    ├── ko-3.png  60초 떡밥
    ├── en-1.png  Pineapple on pizza
    ├── en-2.png  Cats vs Dogs
    └── en-3.png  60 seconds
```

## 자동화에 넣는 법 (한방)
`threads-posts.json`의 `posts` 배열에서 하나 골라:
- 본문 = `full` (텍스트 + 링크 + 해시태그까지 이미 합쳐져 있음 → 그대로 업로드)
- 이미지 = `image` (같은 카드 첨부)
- `lang`으로 한국 계정엔 `ko`, 해외 계정엔 `en`만 필터링해서 돌리면 됨.

예) 의사코드
```python
import json, random
data = json.load(open("promo/threads-posts.json"))
ko = [p for p in data["posts"] if p["lang"] == "ko"]
p = random.choice(ko)
threads.post(text=p["full"], image=p["image"])   # 본문+이미지 한 번에
```

### 매일 자동 글 (떡밥만 바꿔 무한 생성)
`daily_template.ko / .en`에 `{A} {B}` 자리표시자가 있음 → 오늘 떡밥 두 진영명만 끼워 넣으면 매일 새 글.
```python
t = data["daily_template"]["ko"].format(A="민초", B="반민초")
```

## 운영 팁
- **첫 2줄이 생명**: 미리보기에 앞 2줄만 보임 → 전부 질문/도발로 시작하게 짜둠.
- **이미지 동반 시 도달 2~3배** → 항상 카드 첨부 권장.
- **시간대**: 평일 점심(12시)·저녁(21~23시) 반응 best.
- **해외(EN)**: 민초처럼 한국 한정 밈 대신 pineapple-pizza / cats-vs-dogs 같은 글로벌 떡밥 사용(카드도 그렇게 제작).
- **고정 댓글**에 링크 한 번 더 + "지금 어느 편이 이기는지 보고와 👀" → 클릭률↑.

## ⚠️ 광고 상태 (현재: 광고 OFF로 출시)
지금은 **광고 미부착 버전**입니다(`AD.enabled=false`). '결과 2배'는 광고 없이 무료로 동작.
→ 토스 광고 승인 후 `index.html`·`offline.html`에서 `AD.enabled=true` + `AD.tossAdGroupId='...'`만 바꾸면 광고 버전으로 전환(코드 그대로). 홍보 문구/링크는 그대로 둬도 됨.
