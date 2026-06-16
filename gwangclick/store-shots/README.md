# 📸 광클대전 스토어 스크린샷 자동 생성

토스/스토어 등록용 스크린샷 4컷(인트로·배틀·결과·전국 랭킹)을 헤드리스 chromium으로 자동 촬영합니다.
게임을 고친 뒤 이 스크립트만 다시 돌리면 새 스크린샷이 나옵니다.

## 쓰는 법
```bash
# 1) 도구 설치 (npm 채널만 필요 — 브라우저 CDN 차단 환경에서도 동작)
npm install --prefix /tmp/shots @sparticuz/chromium puppeteer-core @fontsource/noto-sans-kr

# 2) 사본 + 목업 주입 후 촬영
mkdir -p /tmp/shots && cp shot.js mock.html /tmp/shots/
cp -r .. /tmp/shots/site            # gwangclick 폴더 통째로
# index.html의 <script src="./net.js"></script> 바로 뒤에 mock.html 내용을 끼워넣고
node /tmp/shots/shot.js             # → /tmp/shots/01..04.png
```

## 구성
- `shot.js` — puppeteer-core + @sparticuz/chromium 으로 폰 뷰포트(412×892@2x) 촬영. 인트로→배틀(자동 광클)→결과(강제 종료)→랭킹.
- `mock.html` — 스크린샷 전용. `GCNet` 응답을 실제 전국 데이터처럼 채워(네트워크 없이) LIVE 화면을 연출. 실제 배포본엔 들어가지 않음.

## 메모
- 한글은 시스템 CJK 폰트(WenQuanYi)로 렌더 — 별도 폰트 설치 불필요.
- 실제 게임 동작이 아니라 "보여주기용" 데이터다(순위·지역 점령 수치는 목업). 기능 자체는 net.js가 실제로 처리.
