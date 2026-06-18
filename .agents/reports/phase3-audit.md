# Phase 3 감사 보고서 — 광클대전 꾸미기 수익화 (commit `3b41587`)

> **한 줄 결론: PASS — Blocker 0 / Warning 0 / Nit 2.** 토스 §6 완전 준수(옵트인 보상형 `adRewarded`만 재사용·외부 광고망/실결제 0), 비용 0(외부 의존성·CDN·네트워크 0, `gc-cosmetics.js` 순수 오프라인), Firestore 신규 제출/규칙/색인 변경 없음(D5), 경계·5원칙 모두 충족, 테스트 39/39 실측 통과.

감사 대상: `git diff HEAD~1 HEAD` — 변경 7파일(`gc-cosmetics.js` 신규, `index.html`, `i18n.js`, `sw.js`, `FIREBASE.md`, `tests/cosmetics.test.mjs`, `docs/gwangclick-global-plan.md`). READ-ONLY 감사(소스 미수정).

---

## 1. 토스 §6 (수익화 핵심) — ✅ PASS

| 항목 | 판정 | 근거 |
|---|---|---|
| 옵트인 보상형(toss→web→house)만 사용 | ✅ | 광고 해금은 `cosTryUnlock`(index.html:915)이 **기존** `adRewarded`만 호출. `adRewarded`(index.html:551, **이번 diff 미수정**)는 `AD.enabled` 게이트 → Toss `rewardedAd` 우선 → `AD.webRewarded` → `houseAd`(순수 DOM 카운트다운, 외부 SDK·네트워크 0) 폴백. |
| 외부 광고망/배너/전면 신규 삽입 | ✅ 없음 | diff `+` 라인에 `googlesyndication`/`adsbygoogle`/`adfit`/`<script src="http`/`integrity=` 등 **0건**. `adNote` i18n("애드센스/애드핏 연결 시 실제 광고") 문자열은 기존 placeholder 안내문일 뿐 실제 embed 아님(이번에 추가 안 됨). |
| 실결제(real-money) 경로 | ✅ 없음 | 코스메틱 해금은 **광고 시청** 또는 **초대 공유(로컬)** 두 경로뿐. diff에 `payment`/`결제`/`purchase`/`iap`/`billing`/`price`/금액 토큰 **0건**(매칭은 전부 주석·테스트 문자열). |
| 유료 scaffold = 토스 SDK 추상화 뒤 | ✅ N/A | 결제 스캐폴드 자체가 없음. 문서·주석에 "결제 도입 시 토스 SDK로 추상화 유지"만 명시(plan D6, index.html 주석) — 가역적 탈출구 외화. |
| 자사앱 설치 유도 | ✅ 없음 | `cosInviteShare`(index.html:919)는 **현재 광클 URL**(`location.href.split('?')[0]+'?ref='`)만 공유. 외부 앱스토어/설치 링크 없음. |
| pay-to-win 여부 | ✅ 시각 전용 | 카탈로그 3종(tapFx·nameColor·badge) 전부 표현. `onTap`(index.html:482) 변경은 **파티클 색/스타일만** — 탭 수·콤보·점수 미변경(주석 명시 + 코드상 `B.tapsF`/`mult` 로직 불변). `gc-cosmetics.js` 어디에도 게임 수치 산출 없음. |

## 2. 비용 0 / 의존성 — ✅ PASS

- **외부 API/CDN/폰트/의존성 신규 0.** `gc-cosmetics.js`는 import/require/fetch/XHR 없는 자기완결 UMD. 카탈로그는 하드코딩 상수, `refCode`는 인라인 FNV-1a(외부 해시 lib 0).
- **순수·오프라인.** 모든 export 함수 입력만으로 결정·throw 금지(테스트 경계 4종으로 검증). `parseRef`의 `decodeURIComponent`는 try/catch로 감쌈.
- **페이로드.** 신규 모듈 199줄(소형). `sw.js` v4→v5에 `gc-cosmetics.js` 1개만 ASSETS 추가 — 번들 비대화 없음.

## 3. Firestore (D5) — ✅ PASS

- **이름색 = 로컬 전용.** `equippedNameColor`→`myNameColorStyle()`(index.html:262)는 본인 화면 '(나)/(you)' 행 인라인 `color`만. `GCNet.submit` 인자에 색 미포함 → **제출 0**. 타 사용자 미노출 확인.
- **프리미엄 배지 = 기존 `badge` 필드 재사용.** `effectiveBadge()`(index.html:266)가 `submit(...,{badge:effectiveBadge(),...})`(index.html:608)에 전달 — Phase 2와 **동일 경로**, 신규 필드 0. 방어 심층: 카탈로그 화이트리스트(`GCCos.badgeOf`) → net.js `sanBadge`/`sanitizeBadge` 재정제(net.js:101,129) → 규칙 `badge.size()<=16`. 프리미엄 이모지 전부 단일(≤2 코드포인트)이라 규칙 **기충족**.
- **per-tap/per-frame I/O 없음.** `onTap` 변경은 로컬 파티클뿐, 네트워크 호출 무추가. 해금/장착은 `persist()`(localStorage)만.
- **`FIREBASE.md` "Phase 3 규칙·색인 변경 없음" 주석 정확.** 신규 컬렉션/필드/제출 없음과 일치. badge 16 상한 근거 설명도 코드와 부합.

## 4. 경계 / CLAUDE.md — ✅ PASS

- **금지 파일 전부 불변.** `diff --name-only`로 변경된 건 선언된 7파일뿐. `fb-config.js`·`net.js`·`gc-util.js`·`home/`·`apps.json`·`infra/`·타 앱(font/냉비서)·`main` 브랜치 **미수정**(plan §1 경계, D6 준수). (참고: plan §1은 Phase 2부터 net.js/스키마 확장을 허용하지만, 이번 커밋은 그조차 건드리지 않음 — 더 보수적.)
- **게임플레이 수치 불변.** 콤보·타격·타이머·시드 로직 미변경. `onTap`/`endBattle` 변경은 표현·배지전달뿐.
- **D2 정당화.** 신규 `gc-cosmetics.js`는 D2(단일 정적 앱 + 모듈 분리, gc-util.js와 동급) 연장선 — 주석에 명시.

## 5. 5원칙 — ✅ PASS

- **#4 가산·가역.** 갈아엎기 0, 기존 위에 얹음. 잠긴 항목은 `normState`가 free로 폴백 → 기능 OFF 시 기존 동작과 동일.
- **#3 스코프 수렴.** plan §1 경계 준수, 변경 반경 = 광클 폴더 내 5파일 + docs.
- **#5 문서+테스트 현행화.** plan §5 Phase 3 [x] 갱신, `FIREBASE.md` 보강, 테스트 **39/39 실측 통과**(`node --test 'tests/*.test.mjs'`, 26→+13 cosmetics, 경계 4종: 미상 id·이중 해금·변조 F·잠긴 장착 차단).
- **#1 불신.** localStorage F를 `GCCos.normState`로 항상 재조립, `?ref=`는 저장/표시만(해금 판정 미사용), `parseRef` 영숫자 화이트리스트(주입 방어).

---

## 발견 항목 (Blocker 0 / Warning 0 / Nit 2)

- **Nit** `static-apps/gwangclick/index.html:923` — `cosInviteShare`: 초대 공유는 **성공·취소·실패 무관하게** `onShared()` 호출 → 공유 시트를 열고 즉시 닫아도 초대 코스메틱이 해금됨. 비용/정책 위반은 아님(백엔드 0·시각 전용·실결제 무관, 주석에 "초대 행동에 대한 보상"으로 의도 명시). 향후 남용이 신경 쓰이면 실제 공유 확인 시에만 해금 권장. 수익/토스 관점 영향 없음.
- **Nit** `static-apps/gwangclick/i18n.js:96,181` — 신규 키 `equipOff`("해제"/"Unequip")가 추가됐으나 UI 코드에서 미참조(해제는 `equipped` 토글 버튼으로 처리). 죽은 키 — 비용·정책 무관, 정리 시 제거 가능.

## 명시적 컴플라이언스 확인
- 토스 §6: 외부 광고망/배너/전면 신규 삽입 **없음**, 실결제 경로 **없음**, 옵트인 보상형만 재사용, 자사앱 설치 유도 **없음**, pay-to-win **아님**. ✅
- 비용 0: 외부 의존성/CDN/폰트/네트워크 신규 **0**, 모듈 순수·오프라인. ✅
- Firestore: 신규 제출/규칙/색인 변경 **없음**, FIREBASE.md 주석 정확. ✅
- 경계: 금지 파일 **전부 불변**, 게임 수치 불변, D6 준수. ✅
- 5원칙: 가산·가역·수렴, 문서+테스트(39/39) 현행. ✅
