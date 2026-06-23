# 오늘 기분 (newapp) — 독립 PWA 개발 폴더

`todayfeelgood` 저장소 안의 **독립 앱 폴더**입니다. 광클릭(`/gwangclick`)과 같은 방식으로
이 폴더 안에 모든 파일이 self-contained 되어 있어, 냉비서 등 다른 앱과 코드가 섞이지 않습니다.

> 📘 **제품 기획·리서치 전체:** [`CONCEPT.md`](./CONCEPT.md) — 컨셉·3종 리서치·MVP·리스크
> 🧭 **결정 로그(D1~D11):** [`DECISIONS.md`](./DECISIONS.md) — 이유·비용·탈출구
>
> ⚠️ **현재 상태:** 증분1 *로직*은 완성·테스트됨. 화면은 **임시 기능 셸**이며, 디자인 시안(`preview.html`)
> 도착 시 뷰만 교체합니다. 핵심 로직은 `js/`에 분리되어 디자인과 독립적입니다.

## 구성
```
newapp/
  index.html             임시 기능 셸 (디자인 교체 예정)
  css/styles.css         임시 스타일 (교체 예정)
  js/app.js              뷰 연결 (얇게 — 로직은 아래 모듈)
  js/store.js            상태 + localStorage + 불신 가드 (D5/D6)
  js/recommend.js        오늘의 노래 추천 (순수·None-safe, D3)
  js/data/moods.js       기분 5종
  js/data/songs.js       오늘의 노래 시드 카탈로그 (Tier A, D2/D8)
  tests/engine.test.mjs  경계 테스트 4종 (정상/매핑/None/변조)
  sw.js                  오프라인 앱 셸 캐시
  manifest.webmanifest   PWA 설치 정보
  icon.svg               아이콘 (교체용 임시)
  CONCEPT.md / DECISIONS.md  기획·결정 문서
```

## 로컬 실행 & 테스트
```bash
npm start                          # 저장소 루트에서 → http://localhost:8080/newapp/
node newapp/tests/engine.test.mjs  # 엔진 경계 테스트 (현재 13 passed)
```

## 배포 (자동)
`main` 병합 시 GitHub Pages가 자동 배포 → `https://yonggunyoung.github.io/todayfeelgood/newapp/`

## 증분 로드맵 (DECISIONS D7 기준)
- [x] **증분1 로직** — 기분 1탭 → 오늘의 노래(Tier A 링크아웃) → 카드 + 저장 + 테스트
- [ ] **디자인 시안** 적용 (preview.html → index/styles 교체)
- [ ] 증분2 — 기분 달력 + streak UI (프리즈)
- [ ] 증분3 — 음악 성향 테스트(바이럴 유입구)
- [ ] 증분4 — 전국 집계(Firebase) + "전국 날씨" 콜드스타트
- [ ] 증분5 — 공유 카드 9:16
- [ ] 증분6 — 주/월 Wrapped + 데이터 내보내기
- [ ] 증분7 — 앱인토스 입점

## 앱 이름 바꾸기 (확정 시)
폴더명 · `manifest`(name/short_name/description) · `sw.js` 캐시명 `oneulgibun-v2` ·
`store.js` 저장 키 `oneulgibun:` · `index.html` `<title>` 일괄 변경.
