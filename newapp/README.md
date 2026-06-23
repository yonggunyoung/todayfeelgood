# 새 앱 (newapp) — 독립 PWA 개발 폴더

`todayfeelgood` 저장소 안의 **독립 앱 폴더**입니다. 광클릭(`/gwangclick`)과 같은 방식으로
이 폴더 안에 모든 파일이 self-contained 되어 있어, 냉비서 등 다른 앱과 코드가 섞이지 않습니다.
여기에 기능을 **하나씩 채워나가세요.**

> 📘 **제품 기획·리서치 전체는 [`CONCEPT.md`](./CONCEPT.md)** — "오늘 기분"(기분→음악 추천 + 전국 집계 + 주/월 Wrapped) 컨셉, 3종 리서치(니즈·마케팅·감사), MVP 순서, 리스크가 정리돼 있습니다.

## 구성

```
newapp/
  index.html            앱 셸
  css/styles.css        디자인 시스템 (색·폰트는 :root 변수만 바꾸면 됨)
  js/app.js             앱 로직 (저장 헬퍼 · 설치 프롬프트 · SW 등록)
  manifest.webmanifest  PWA 설치 정보
  sw.js                 오프라인 앱 셸 캐시 (파일 추가 시 ASSETS·버전 갱신)
  icon.svg              앱 아이콘 (교체용 플레이스홀더)
```

## 로컬 실행

저장소 루트에서:

```bash
npm start            # http://localhost:8080
```

→ 브라우저에서 `http://localhost:8080/newapp/` 열기

## 배포 (자동)

`main` 브랜치에 병합되면 GitHub Pages가 자동 배포합니다.
공개 주소: `https://yonggunyoung.github.io/todayfeelgood/newapp/`

## 앱 이름 바꾸기 (확정되면 한 번에)

1. 폴더 이름 `newapp` → 원하는 이름으로 변경
2. `manifest.webmanifest` 의 name / short_name / description
3. `sw.js` 상단 캐시 이름 `newapp-v1`
4. `js/app.js` 의 저장 키 접두어 `newapp:`
5. `index.html` 의 `<title>` · 설명 메타

## 채워나가기 체크리스트

- [ ] 앱 이름·아이콘 확정
- [ ] 첫 화면(홈) 디자인
- [ ] 핵심 기능 1개 (MVP)
- [ ] 데이터 저장 구조 (store 헬퍼 확장)
- [ ] (선택) 화면 전환 / 라우팅
- [ ] (선택) Firebase 동기화 · 외부 API 연동
