# 앱 레지스트리 — 새 앱을 ddukkit.com 에 붙이는 법

> 목표: "앱 개발 → 배포·연결"을 **매번 5곳 수동 수정** 대신 **레지스트리 한 줄 + 명령 한 번**으로.

## 단일 출처: `/apps.json`

모든 웹앱은 루트 `apps.json` 한 곳에 등록한다. 여기서 파생되는 것:

| 산출물 | 생성 위치 | 쓰임 |
|---|---|---|
| nginx 라우팅(정적앱) | `infra/nginx/apps.generated.conf` | `ddukkit.com/<경로>` 서빙 |
| 홈 레지스트리 | `home/lib/appsRegistry.ts` | 도구공방 카드·허브 검색 자동 노출 |

둘 다 **자동 생성**이므로 직접 수정하지 않는다. `apps.json` 만 고치고 동기화한다.

## 두 가지 앱 타입

- **static** — 순수 HTML/JS/PWA(게임 등). `static-apps/<id>/` 에 파일을 두면 **nginx가 직접 서빙**. 빌드·컨테이너 불필요. GitHub Pages 의존 없음.
- **next** — Next.js 앱(font·textmoji 등). `apps/<id>/frontend`. docker-compose 서비스가 별도로 필요(아래 참고).

---

## A. 정적 미니앱 추가 (가장 흔한 경우)

### 1) 이미 만든 앱이 있다면
```bash
# 파일을 static-apps/<id>/ 에 넣고(상대경로 ./ 권장), 등록:
node infra/scripts/new-app.mjs <id> "<한글이름>" "<English name>" /<경로> <이모지>
# 예) node infra/scripts/new-app.mjs gwangclick "광클대전" "Click Battle" /gwangclick ⚡
```

### 2) 새로 시작한다면
같은 명령을 실행하면 `static-apps/<id>/index.html` 골격이 생긴다. 거기에 앱을 채우면 끝.

> 스크립트가 ① 폴더/골격 ② `apps.json` 등록 ③ 동기화까지 자동 수행한다.
> `apps.json` 의 `descKo/descEn/keywords` 는 다듬어 주면 좋다(검색·카드 문구).

### 3) 배포
커밋·푸시 후 **GitHub Actions → Deploy → Run workflow**(배포 버튼). 끝나면 `https://ddukkit.com/<경로>` 로 뜨고, 홈 도구공방 카드·검색에 자동 노출된다.

---

## B. Next 앱 추가

1. `apps/<id>/frontend` 생성(기존 textmoji 앱 구조 복사).
2. `apps.json` 에 `{ "type": "next", "port": <빈 포트>, ... }` 추가 후 `pnpm apps:sync`.
3. **docker-compose.yml** 에 서비스 추가(textmoji 서비스 블록 복붙 후 이름/포트/BASE_PATH 교체).
4. **infra/nginx/webapp.compose.conf** 에 `location /<경로>` 프록시 추가(textmoji 블록 패턴).
   - (정적앱과 달리 Next 는 컨테이너 프록시라 `apps.generated.conf` 가 아니라 메인 conf 에 둔다.)
5. 배포 버튼.

> 빈 포트: home 3000 / font 3001 / sticker 3002 / sign 3003 / kit 3004 / textmoji 3005 → 다음 3006.

---

## 명령 요약

```bash
pnpm apps:sync                 # apps.json 변경 후 파생물 재생성
pnpm apps:new <id> "<한글>" "<영문>" /<경로> <이모지>   # 정적앱 등록(스캐폴드 포함)
```

## 동작 원리(정적앱)

- docker-compose 의 nginx 가 `./static-apps` 를 `/srv/static-apps` 로, 생성된 conf 를 server 블록에 `include` 한다.
- 생성된 location: `/<경로>` → `/srv/static-apps/<id>/` (트레일링 슬래시 정규화 + index.html 폴백).
- 상대경로(`./asset`) 로 만든 정적앱은 어떤 하위 경로에서도 그대로 동작한다.
