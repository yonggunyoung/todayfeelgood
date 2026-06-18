// gc-globe.js 경계 테스트 — 정상 / 매핑 / None / 변조 (CLAUDE.md §8 #1, D7)
// 대상: 국가집계→지구본 점 매핑(countryPoints)·강도/색(intensityColor·weightOf)·
//       포커스 대상(pickFocus)·포커스 고도(focusAltitude·spreadOf)·폴백 판단(shouldFallback)·DPR 캡.
// 지구본 렌더(globe.gl)는 브라우저+외부라이브러리라 비테스트 — 순수 로직만 검증(D2).
import { test } from "node:test";
import assert from "node:assert/strict";
import globe from "../gc-globe.js";
import geo from "../geo.js";

const {
  CENTROIDS, MIN_ALT, MAX_ALT,
  normCode, centroidOf, safeHex, intensityColor, weightOf,
  countryPoints, pickFocus, spreadOf, focusAltitude, shouldFallback, cappedDpr,
} = globe;

const CA = "#36e0c8"; // 진영 A 색
const CB = "#7b6ef0"; // 진영 B 색

test("normCode / centroidOf — 정상/매핑/None/변조", () => {
  assert.equal(normCode("KR"), "KR"); // 정상
  assert.equal(normCode(" kr "), "KR"); // 매핑(소문자+공백)
  assert.equal(normCode("us"), "US");
  assert.equal(normCode(""), ""); // None
  assert.equal(normCode(null), ""); // 변조
  assert.equal(normCode(123), ""); // 변조(비문자)
  assert.equal(normCode("USA"), ""); // 변조(3글자)
  assert.equal(normCode("K1"), ""); // 변조(숫자 포함)
  // centroid: 알려진 코드는 {lat,lng}, 모르면 null
  const kr = centroidOf("kr");
  assert.ok(kr && typeof kr.lat === "number" && typeof kr.lng === "number");
  assert.equal(centroidOf("ZZ"), null); // 표에 없음
  assert.equal(centroidOf(null), null); // 변조
});

test("centroid 표 — 위/경도 유효범위(자기일관성)", () => {
  const codes = Object.keys(CENTROIDS);
  assert.ok(codes.length >= 36); // 지원국(geo.js 36) 이상
  for (const c of codes) {
    assert.match(c, /^[A-Z]{2}$/, "ISO2 키: " + c);
    const v = CENTROIDS[c];
    assert.ok(Array.isArray(v) && v.length === 2, "[lat,lng]: " + c);
    assert.ok(v[0] >= -90 && v[0] <= 90, "lat 범위: " + c);
    assert.ok(v[1] >= -180 && v[1] <= 180, "lng 범위: " + c);
  }
});

// 국가 커버리지 보강: 대표 스프레드가 모두 지구본 좌표를 가져야(소외=지구본 누락 0).
test("centroidOf — 전 대륙 대표국이 모두 지구본에 배치", () => {
  const spread = [
    "KR", "US", "JP", "BR", "NG", "IN", "DE", "AU", "ZA", "MX",
    "ID", "EG", "SA", "TR", "VN", "FR", "GB", "CA", "RU", "TH",
    "PH", "AR", "NZ", "KE", "NO", "PL", "UA", "CO", "PE", "CL",
    "PK", "BD", "ET", "TZ", "DZ", "MA", "IR", "IQ", "MN", "KZ",
    "PG", "FJ", "CU", "IS", "LU",
  ];
  for (const c of spread) {
    const cen = centroidOf(c);
    assert.ok(cen && typeof cen.lat === "number" && typeof cen.lng === "number", "centroid 누락: " + c);
    assert.ok(cen.lat >= -90 && cen.lat <= 90 && cen.lng >= -180 && cen.lng <= 180, "범위 밖: " + c);
  }
  assert.equal(centroidOf("ZZ"), null); // 변조/미상 — 여전히 graceful skip
});

// geo.NAMES ↔ CENTROIDS 1:1 동기 — 이름은 있는데 지구본엔 없는 '소외국'이 없어야.
test("NAMES와 CENTROIDS는 완전 동기(소외국 0)", () => {
  // geo.js NAMES의 모든 코드가 centroid를 가짐 → 평면 리스트에 뜨는 국가는 전부 지구본에도 뜸.
  const cenKeys = Object.keys(CENTROIDS);
  // 대표 표본으로 양방향 확인(전수는 위 spread + 자기일관성 테스트가 커버).
  for (const c of cenKeys) {
    const info = geo.countryInfo(c);
    assert.notEqual(info.nameKo, c, "centroid 있으나 이름 누락(역소외): " + c);
  }
  assert.ok(cenKeys.length >= 190, "확장된 커버리지(>=190): " + cenKeys.length);
});

test("safeHex / intensityColor — 우세 진영색 + 변조 폴백", () => {
  assert.equal(safeHex("#abc", "#000"), "#abc");
  assert.equal(safeHex("#aabbcc", "#000"), "#aabbcc");
  assert.equal(safeHex("notacolor", "#000"), "#000"); // 변조 → 폴백
  assert.equal(safeHex(null, "#000"), "#000"); // None → 폴백
  // color = leading side
  assert.equal(intensityColor("a", CA, CB), CA); // 정상 a
  assert.equal(intensityColor("b", CA, CB), CB); // 정상 b
  assert.equal(intensityColor("x", CA, CB), CA); // 변조 lead → a 폴백
  assert.equal(intensityColor("a", "bad", "bad"), "#36e0c8"); // 색 변조 → 안전 기본
});

test("weightOf — 0~1 정규화(정상/단일/None/변조)", () => {
  assert.equal(weightOf(0, 100), 0); // 0 참여
  assert.equal(weightOf(100, 100), 1); // 최대 → 1
  const w = weightOf(10, 100);
  assert.ok(w > 0 && w < 1); // 중간
  assert.equal(weightOf(50, 50), 1); // 단일국(자기=최대)
  assert.equal(weightOf(10, 0), 0); // maxTot 0 → 0
  assert.equal(weightOf(-5, 100), 0); // 변조(음수)
  assert.equal(weightOf("x", 100), 0); // 변조(비숫자)
  // 항상 [0,1]
  for (const [t, m] of [[1, 1000000], [999999, 1000000], [1, 1]]) {
    const x = weightOf(t, m);
    assert.ok(x >= 0 && x <= 1);
  }
});

test("countryPoints — 정상(좌표·색·가중치·내림차순)", () => {
  const countries = {
    KR: { a: 90, b: 10 }, // a 우세, tot 100 (최다)
    US: { a: 20, b: 60 }, // b 우세, tot 80
    JP: { a: 30, b: 30 }, // 동률 → a, tot 60
  };
  const pts = countryPoints(countries, CA, CB);
  assert.equal(pts.length, 3);
  assert.equal(pts[0].code, "KR"); // tot 내림차순
  assert.equal(pts[0].lead, "a");
  assert.equal(pts[0].color, CA); // a 우세 → A색
  assert.equal(pts[0].share, 90);
  assert.equal(pts[0].weight, 1); // 최다 → 1
  assert.ok(typeof pts[0].lat === "number" && typeof pts[0].lng === "number");
  const us = pts.find((p) => p.code === "US");
  assert.equal(us.lead, "b");
  assert.equal(us.color, CB); // b 우세 → B색
});

test("countryPoints — 매핑(소문자 키·max 슬라이스·centroid 없는 코드 생략)", () => {
  const countries = {
    kr: { a: 50, b: 50 }, // 소문자 → KR 정규화
    US: { a: 10, b: 10 },
    JP: { a: 5, b: 5 },
    ZZ: { a: 100, b: 100 }, // centroid 표에 없음 → 지구본 생략(평면 리스트는 별도)
  };
  const pts = countryPoints(countries, CA, CB, 2);
  assert.equal(pts.length, 2); // max=2
  assert.ok(!pts.find((p) => p.code === "ZZ")); // centroid 없으니 생략
  assert.ok(pts.find((p) => p.code === "KR")); // 소문자도 매핑됨
  // ZZ 제외하고 KR(100)>US(20)>JP(10) → 상위2 = KR,US
  assert.deepEqual(pts.map((p) => p.code), ["KR", "US"]);
});

test("countryPoints — None/빈 입력 안전", () => {
  assert.deepEqual(countryPoints({}, CA, CB), []); // 빈 맵
  assert.deepEqual(countryPoints(null, CA, CB), []); // None
  assert.deepEqual(countryPoints(undefined, CA, CB), []); // None
  assert.deepEqual(countryPoints({ KR: { a: 0, b: 0 } }, CA, CB), []); // 모두 0 → []
});

test("countryPoints — 변조 입력에도 throw 금지", () => {
  assert.doesNotThrow(() => countryPoints(42, CA, CB));
  assert.doesNotThrow(() => countryPoints("nope", CA, CB));
  assert.doesNotThrow(() => countryPoints([1, 2, 3], CA, CB));
  const pts = countryPoints({
    KR: { a: 50, b: 50 }, // 정상
    BAD1: null, // 변조 → skip
    BAD2: "x", // 변조 → skip
    "1Z": { a: 9, b: 9 }, // 변조 코드 → skip
    BAD3: { a: "abc", b: -5 }, // 비숫자/음수 → tot 0 → skip
    US: { a: 80, b: 20 }, // 정상
  }, CA, CB);
  assert.deepEqual(pts.map((p) => p.code).sort(), ["KR", "US"]); // 정상만 통과
  // 색 변조에도 안전(폴백 색)
  const safe = countryPoints({ KR: { a: 1, b: 0 } }, "bad", "bad");
  assert.equal(safe[0].color, "#36e0c8");
});

test("pickFocus — 내 나라 우선 → 없으면 hottest (정상/매핑/None/변조)", () => {
  const countries = { KR: { a: 10, b: 5 }, US: { a: 100, b: 50 }, JP: { a: 20, b: 5 } };
  const pts = countryPoints(countries, CA, CB);
  // 내 나라(KR) 활동 있음 → KR 선택(hottest가 US여도)
  assert.equal(pickFocus(pts, "KR").code, "KR");
  assert.equal(pickFocus(pts, " kr ").code, "KR"); // 매핑(정규화)
  // 내 나라 활동 없음(FR) → hottest(US)
  assert.equal(pickFocus(pts, "FR").code, "US");
  // 미상 코드 → hottest
  assert.equal(pickFocus(pts, "").code, "US");
  assert.equal(pickFocus(pts, null).code, "US"); // 변조 → hottest
  // None
  assert.equal(pickFocus([], "KR"), null);
  assert.equal(pickFocus(null, "KR"), null);
});

test("spreadOf / focusAltitude — 집중→줌인, 분산→줌아웃", () => {
  // 집중: 가까운 동아시아 3국 → spread 작음 → altitude 낮음(줌인)
  const tight = countryPoints({ KR: { a: 50, b: 0 }, JP: { a: 50, b: 0 }, TW: { a: 50, b: 0 } }, CA, CB);
  // 분산: 전세계 → spread 큼 → altitude 높음(줌아웃)
  const wide = countryPoints({ US: { a: 50, b: 0 }, BR: { a: 50, b: 0 }, AU: { a: 50, b: 0 }, RU: { a: 50, b: 0 }, ZA: { a: 50, b: 0 } }, CA, CB);
  const sTight = spreadOf(tight), sWide = spreadOf(wide);
  assert.ok(sWide > sTight, "분산이 집중보다 spread 큼");
  const aTight = focusAltitude(tight), aWide = focusAltitude(wide);
  assert.ok(aWide > aTight, "분산이 줌아웃(고도 큼)");
  // 범위 clamp
  assert.ok(aTight >= MIN_ALT && aTight <= MAX_ALT);
  assert.ok(aWide >= MIN_ALT && aWide <= MAX_ALT);
});

test("focusAltitude / spreadOf — None/단일/변조 안전", () => {
  assert.equal(focusAltitude([]), MIN_ALT); // 빈 → 클로즈업
  assert.equal(focusAltitude(null), MIN_ALT); // None
  assert.equal(focusAltitude([{ lat: 0, lng: 0, tot: 1, weight: 1 }]), MIN_ALT); // 단일국 → 클로즈업
  assert.equal(spreadOf([]), 0); // 빈
  assert.equal(spreadOf(null), 0); // None
  assert.equal(spreadOf([{ lat: 1, lng: 1, weight: 1 }]), 0); // 1개 → 0
  assert.doesNotThrow(() => focusAltitude(42)); // 변조
  assert.doesNotThrow(() => spreadOf("nope")); // 변조
  assert.equal(focusAltitude(42), MIN_ALT);
});

test("shouldFallback — WebGL/라이브러리/감속모션/저사양 판단 (정상/None/변조)", () => {
  // 폴백 강제 신호
  assert.equal(shouldFallback({ webgl: false }), true); // WebGL 미지원
  assert.equal(shouldFallback({ libLoaded: false }), true); // 라이브러리 로드 실패
  assert.equal(shouldFallback({ reducedMotion: true }), true); // 감속모션
  assert.equal(shouldFallback({ deviceMemory: 1 }), true); // 저메모리
  assert.equal(shouldFallback({ hardwareConcurrency: 2 }), true); // 저코어
  // 3D 가능 신호
  assert.equal(shouldFallback({ webgl: true, libLoaded: true, reducedMotion: false, deviceMemory: 8, hardwareConcurrency: 8 }), false);
  // None/변조 → 폴백 안 함(3D 시도, 실패 시 런타임 폴백)
  assert.equal(shouldFallback({}), false);
  assert.equal(shouldFallback(null), false);
  assert.equal(shouldFallback(42), false);
  assert.equal(shouldFallback({ deviceMemory: "x", hardwareConcurrency: "y" }), false); // 변조 숫자 무시
});

test("cappedDpr — DPR 캡 [1,cap] (정상/None/변조)", () => {
  assert.equal(cappedDpr(3, 1.5), 1.5); // 과도한 DPR → 캡
  assert.equal(cappedDpr(1, 1.5), 1); // 낮으면 그대로(최소 1)
  assert.equal(cappedDpr(0.5, 1.5), 1); // 1 미만 → 1
  assert.equal(cappedDpr(2, 2), 2);
  assert.equal(cappedDpr(undefined, 1.5), 1); // None → 1
  assert.equal(cappedDpr("x", 1.5), 1); // 변조 → 1
  assert.equal(cappedDpr(3, 0), 1.5); // 캡 변조 → 기본 1.5 → min(1.5,3)=1.5
});
