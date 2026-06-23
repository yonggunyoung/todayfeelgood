# 글꾸미 브라우저 확장 (PC 배지 → 채팅창 즉석 삽입)

어떤 사이트의 입력창에서든 **글꾸미 배지**를 띄워, 멋글씨·이모티콘·특수문자를 골라 **그 입력창에 바로 삽입**합니다. (인스타·카톡웹·디스코드·X·블로그 등)

메인 앱(`../geulkkumi`)의 **순수 엔진/데이터를 그대로 재사용**하므로 빌드가 없습니다.

## 설치 (개발자 모드, 크롬/엣지)

1. 먼저 엔진 동기화: 이 폴더에서 `node tools/sync-engine.mjs` (또는 `npm run sync`) → `engine/`·`data/` 생성·갱신.
2. 크롬 주소창에 `chrome://extensions` → 우상단 **개발자 모드** 켜기.
3. **압축해제된 확장 프로그램을 로드합니다** → 이 `geulkkumi-ext` 폴더 선택.
4. 끝. (Edge는 `edge://extensions`에서 동일)

## 사용법

1. 글 쓰는 입력창을 클릭(포커스)하면 근처에 **`글꾸미 ✨` 배지**가 뜹니다.
   - 배지가 안 보이면 툴바의 글꾸미 아이콘을 누르거나 **Alt+G**로 켜세요(권한 최소화를 위해 현재 탭에만 주입).
2. 배지를 누르면 미니 패널이 열립니다 → 글자 입력 → **멋글씨/이모티콘/특수문자** 중 탭해서 선택.
3. 선택하면 원래 입력창의 커서 위치에 **바로 삽입**됩니다. (삽입이 막히는 에디터면 자동으로 **클립보드 복사**로 폴백 → Ctrl+V)

## 호환·안전

- **삽입 방식 다단 폴백**: `beforeinput(insertText)` → `execCommand` → Range 직접삽입 → input/textarea native setter → 클립보드. Slate/DraftJS/Lexical(디스코드·X·인스타) 같은 까다로운 에디터도 최대한 대응.
- **항상 일반 텍스트**로만 삽입(서식 오염 0), 가능하면 **undo 보존**.
- ⚠ 표시된 스타일(프락투어·결합문자·지옥체 등)은 일부 사이트에서 깨질 수 있음(메인 앱과 동일한 호환성 등급).
- **권한 최소**: `activeTab`+`scripting`만. 광역 자동주입 없음(켠 탭에만). **네트워크 전송 0**(전부 로컬).

## 개발 메모

- 엔진/데이터는 `../geulkkumi/js/{engine,data}`가 **단일 소스**. 그쪽을 고치면 `node tools/sync-engine.mjs`로 다시 복사.
- 구조: `manifest.json`(MV3) · `background.js`(주입) · `content/{inserter,mount}.js`(배지·삽입) · `panel/`(미니 패널 UI, 엔진 import) · `engine/`·`data/`(동기화본).
- 파이어폭스 포팅은 `background.service_worker` → `background.scripts` 등 소폭 수정 필요.
