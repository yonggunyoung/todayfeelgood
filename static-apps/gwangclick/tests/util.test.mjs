// gc-util.js 경계 테스트 — 정상 / 매핑 / None / 변조 (CLAUDE.md §8 #1)
// 대상: 나라대전 집계(countryStandings)·내나라vs세계(myCountryVsWorld)·배지/멘트 정제.
import { test } from "node:test";
import assert from "node:assert/strict";
import util from "../gc-util.js";

const { sanitizeBadge, sanitizeComment, countryStandings, myCountryVsWorld, BADGE_MAX, COMMENT_MAX, BADGE_PRESET } = util;

test("sanitizeBadge — 정상/매핑/None/변조 + 길이 캡", () => {
  assert.equal(sanitizeBadge("🔥"), "🔥"); // 정상(이모지 1개)
  assert.equal(sanitizeBadge("#1"), "#1"); // 정상(짧은 태그, 2자)
  // 매핑: 코드포인트 캡(이모지 서로게이트 페어를 쪼개지 않음) — 2개까지만
  assert.equal(sanitizeBadge("🔥👑⚡💪"), "🔥👑");
  assert.equal([...sanitizeBadge("🔥👑⚡")].length, BADGE_MAX); // 정확히 BADGE_MAX 코드포인트
  assert.equal(sanitizeBadge("👨‍👩‍👧"), "👨"); // 변조(ZWJ 합자: 캡 후 끝 joiner 제거 → 단독 이모지)
  assert.equal(sanitizeBadge(""), ""); // None
  assert.equal(sanitizeBadge("   "), ""); // None(공백만 → 빈값)
  assert.equal(sanitizeBadge(null), ""); // 변조
  assert.equal(sanitizeBadge(123), ""); // 변조(비문자)
  assert.equal(sanitizeBadge({}), ""); // 변조(객체)
  assert.equal(sanitizeBadge("a\nb"), "a"); // 변조(제어문자 제거 후 캡: "a b"→2자 "a ".trim()="a")
});

test("sanitizeComment — 정상/매핑/None/변조 + 길이 캡", () => {
  assert.equal(sanitizeComment("가볍게 한판"), "가볍게 한판"); // 정상
  // 매핑: COMMENT_MAX 코드포인트 캡
  const long = "가".repeat(40);
  assert.equal([...sanitizeComment(long)].length, COMMENT_MAX);
  // 변조: 개행·탭·제어문자 → 공백 1칸으로 축약(주입/레이아웃 깨짐 방지)
  assert.equal(sanitizeComment("a\nb\tc   d"), "a b c d");
  assert.equal(sanitizeComment("xy"), "x y");
  assert.equal(sanitizeComment(""), ""); // None
  assert.equal(sanitizeComment(null), ""); // 변조
  assert.equal(sanitizeComment(42), ""); // 변조(비문자)
  assert.equal(sanitizeComment("\n\n"), ""); // None(개행만 → 빈값)
});

test("BADGE_PRESET — 빈 배지 포함, 모두 정제 통과(자기일관성)", () => {
  assert.ok(Array.isArray(BADGE_PRESET) && BADGE_PRESET.length > 0);
  assert.equal(BADGE_PRESET[0], ""); // '없음' 옵션
  for (const b of BADGE_PRESET) {
    // 프리셋 배지는 정제해도 (빈값이거나) 자기 자신과 동일해야 함 — 캡에 안 걸림
    const s = sanitizeBadge(b);
    assert.ok(s === b || s === "", "preset survives sanitize: " + b);
  }
});

test("countryStandings — 정상(내림차순·우세진영·%)", () => {
  const countries = {
    US: { a: 30, b: 70 }, // b 우세 70%
    KR: { a: 90, b: 10 }, // a 우세 90%
    JP: { a: 50, b: 50 }, // 동률 → a (a>=b)
  };
  const cs = countryStandings(countries);
  assert.equal(cs.length, 3);
  // tot 내림차순: US(100)·KR(100)·JP(100) 동일 tot → 안정성은 보장 X, 값만 검증
  const byCode = Object.fromEntries(cs.map((c) => [c.code, c]));
  assert.equal(byCode.US.lead, "b");
  assert.equal(byCode.US.share, 70);
  assert.equal(byCode.KR.lead, "a");
  assert.equal(byCode.KR.share, 90);
  assert.equal(byCode.JP.lead, "a"); // 동률 → a
  assert.equal(byCode.JP.share, 50);
});

test("countryStandings — 매핑(정렬·max 슬라이스·0참여 제외)", () => {
  const countries = {
    US: { a: 10, b: 10 }, // tot 20
    KR: { a: 100, b: 100 }, // tot 200 (최다)
    JP: { a: 5, b: 5 }, // tot 10
    ZZ: { a: 0, b: 0 }, // 0 참여 → 제외
  };
  const cs = countryStandings(countries, 2);
  assert.equal(cs.length, 2); // max=2 슬라이스
  assert.equal(cs[0].code, "KR"); // 최다 참여 1위
  assert.equal(cs[1].code, "US"); // 2위
  assert.ok(!cs.find((c) => c.code === "ZZ")); // 0 참여 제외
});

test("countryStandings — None/빈 입력 안전", () => {
  assert.deepEqual(countryStandings({}), []); // 빈 맵
  assert.deepEqual(countryStandings(null), []); // None
  assert.deepEqual(countryStandings(undefined), []); // None
  assert.deepEqual(countryStandings({ US: { a: 0, b: 0 } }), []); // 모두 0 → 빈 배열
});

test("countryStandings — 변조 입력에도 throw 금지", () => {
  assert.doesNotThrow(() => countryStandings(42));
  assert.doesNotThrow(() => countryStandings("nope"));
  assert.doesNotThrow(() => countryStandings([1, 2, 3]));
  // 변조된 값들 섞임: 비객체·음수·문자 → 안전 무시/0 처리
  const cs = countryStandings({
    US: { a: 50, b: 50 }, // 정상
    BAD1: null, // 변조 → skip
    BAD2: "x", // 변조 → skip
    BAD3: { a: "abc", b: -5 }, // a 비숫자→0, b 음수→0 → tot 0 → skip
    KR: { a: 80, b: 20 }, // 정상
  });
  const codes = cs.map((c) => c.code).sort();
  assert.deepEqual(codes, ["KR", "US"]); // 변조 항목은 전부 제외
});

test("countryStandings — 알 수 없는 국가코드도 그대로(이름매핑은 렌더부 책임)", () => {
  // 이 함수는 코드 검증을 하지 않음 — 표시명/국기 폴백은 GCGeo.countryInfo 책임.
  const cs = countryStandings({ ZZ: { a: 7, b: 3 } });
  assert.equal(cs.length, 1);
  assert.equal(cs[0].code, "ZZ");
  assert.equal(cs[0].share, 70);
});

test("myCountryVsWorld — 정상(내 나라 vs 나머지 합)", () => {
  const countries = {
    KR: { a: 80, b: 20 }, // 내 나라: a 80%
    US: { a: 10, b: 90 },
    JP: { a: 40, b: 60 }, // 세계(US+JP): a=50, b=150 → a 25%
  };
  const r = myCountryVsWorld(countries, "KR");
  assert.ok(r);
  assert.equal(r.mine.tot, 100);
  assert.equal(Math.round(r.mine.aShare), 80);
  assert.equal(r.world.a, 50);
  assert.equal(r.world.b, 150);
  assert.equal(Math.round(r.world.aShare), 25);
});

test("myCountryVsWorld — 매핑(코드 소문자/공백 정규화, 내 나라가 유일하면 세계 50%)", () => {
  const countries = { KR: { a: 60, b: 40 } };
  const r = myCountryVsWorld(countries, " kr "); // 소문자+공백 → KR
  assert.ok(r);
  assert.equal(Math.round(r.mine.aShare), 60);
  assert.equal(r.world.tot, 0); // 다른 나라 없음
  assert.equal(r.world.aShare, 50); // 데이터 없으면 중립 50
});

test("myCountryVsWorld — None(미상 코드/데이터 없음 → null)", () => {
  assert.equal(myCountryVsWorld({ KR: { a: 1, b: 1 } }, ""), null); // 코드 미상
  assert.equal(myCountryVsWorld({ KR: { a: 1, b: 1 } }, null), null); // 코드 None
  assert.equal(myCountryVsWorld({ US: { a: 1, b: 1 } }, "KR"), null); // 내 나라 데이터 없음
  assert.equal(myCountryVsWorld({ KR: { a: 0, b: 0 } }, "KR"), null); // 내 나라 0 참여
  assert.equal(myCountryVsWorld({}, "KR"), null); // 빈 맵
  assert.equal(myCountryVsWorld(null, "KR"), null); // None
});

test("myCountryVsWorld — 변조 입력에도 throw 금지", () => {
  assert.doesNotThrow(() => myCountryVsWorld(42, "KR"));
  assert.doesNotThrow(() => myCountryVsWorld({ KR: "bad" }, "KR")); // 내 나라 값 비객체
  assert.equal(myCountryVsWorld({ KR: "bad" }, "KR"), null);
  // 세계 쪽에 변조 항목 섞여도 내 나라만 정상이면 계산 + 변조는 0 처리
  const r = myCountryVsWorld({ KR: { a: 10, b: 10 }, BAD: null, X: { a: "z", b: 5 } }, "KR");
  assert.ok(r);
  assert.equal(r.mine.tot, 20);
  assert.equal(r.world.a, 0); // X.a 비숫자→0, BAD skip
  assert.equal(r.world.b, 5); // X.b=5
});
