// geo.js 경계 테스트 — 정상 / 매핑 / None / 변조 (CLAUDE.md §8 #1)
import { test } from "node:test";
import assert from "node:assert/strict";
import geo from "../geo.js";

test("flagOf", () => {
  assert.equal(geo.flagOf("KR"), "🇰🇷"); // 정상
  assert.equal(geo.flagOf("kr"), "🇰🇷"); // 매핑(소문자)
  assert.equal(geo.flagOf(""), "🏳️"); // None
  assert.equal(geo.flagOf("12"), "🏳️"); // 변조
  assert.equal(geo.flagOf(null), "🏳️"); // 변조
});

test("countryFromLocale", () => {
  assert.equal(geo.countryFromLocale("en-US"), "US"); // 정상
  assert.equal(geo.countryFromLocale("ko_kr"), "KR"); // 매핑(_·소문자)
  assert.equal(geo.countryFromLocale("zh-Hans-CN"), "CN"); // 매핑(서브태그 다수)
  assert.equal(geo.countryFromLocale("ko"), ""); // None(지역 없음)
  assert.equal(geo.countryFromLocale(undefined), ""); // 변조
  assert.equal(geo.countryFromLocale(123), ""); // 변조
});

test("countryFromTimezone", () => {
  assert.equal(geo.countryFromTimezone("Asia/Seoul"), "KR"); // 정상
  assert.equal(geo.countryFromTimezone("America/Los_Angeles"), "US"); // 매핑
  assert.equal(geo.countryFromTimezone("Bogus/Nowhere"), ""); // None
  assert.equal(geo.countryFromTimezone(null), ""); // 변조
});

test("detectCountry — locale 우선, tz 폴백", () => {
  assert.equal(geo.detectCountry({ lang: "en-US", tz: "Asia/Seoul" }), "US"); // 정상(locale 우선)
  assert.equal(geo.detectCountry({ lang: "ko", tz: "Asia/Tokyo" }), "JP"); // 매핑(지역없는 locale→tz)
  assert.equal(geo.detectCountry({}), ""); // None
  assert.equal(geo.detectCountry(null), ""); // 변조(throw 금지)
});

test("countryInfo — 미상도 깨지지 않음", () => {
  const kr = geo.countryInfo("KR");
  assert.equal(kr.flag, "🇰🇷"); // 정상
  assert.equal(kr.nameEn, "Korea");
  assert.equal(geo.countryInfo("us").code, "US"); // 매핑(소문자)
  assert.equal(geo.countryInfo("").nameEn, "Global"); // None
  const zz = geo.countryInfo("ZZ"); // 변조(미상 코드)
  assert.equal(zz.nameEn, "ZZ");
  assert.equal(zz.nameKo, "ZZ");
});

// 국가 커버리지 보강: 대표 스프레드가 코드가 아닌 ko+en 실명으로 해석되어야(소외 0).
test("countryInfo — 전 대륙 대표국이 코드가 아닌 실명으로 해석", () => {
  const spread = [
    "KR", "US", "JP", "BR", "NG", "IN", "DE", "AU", "ZA", "MX",
    "ID", "EG", "SA", "TR", "VN", "FR", "GB", "CA", "RU", "TH",
    "PH", "AR", "NZ", "KE", "NO", "PL", "UA", "CO", "PE", "CL",
    "PK", "BD", "ET", "TZ", "DZ", "MA", "IR", "IQ", "MN", "KZ",
    "PG", "FJ", "CU", "IS", "LU",
  ];
  for (const c of spread) {
    const info = geo.countryInfo(c);
    assert.equal(info.code, c, "code 보존: " + c);
    // 실명이어야 함 — ko/en이 코드 자체와 같으면 미등록(소외).
    assert.notEqual(info.nameKo, c, "ko 실명 누락: " + c);
    assert.notEqual(info.nameEn, c, "en 실명 누락: " + c);
    assert.ok(info.nameKo.length > 0 && info.nameEn.length > 0, "빈 이름: " + c);
    assert.equal(info.flag.length >= 2, true, "국기 누락: " + c);
  }
});

// 타임존 보조 매핑 확장 — 지역 없는 locale일 때 흔한 IANA 존이 국가로 매핑.
test("countryFromTimezone — 확장된 흔한 존", () => {
  assert.equal(geo.countryFromTimezone("Europe/Oslo"), "NO"); // 정상(확장)
  assert.equal(geo.countryFromTimezone("Africa/Nairobi"), "KE");
  assert.equal(geo.countryFromTimezone("America/Bogota"), "CO");
  assert.equal(geo.countryFromTimezone("Asia/Tehran"), "IR");
  assert.equal(geo.countryFromTimezone("Pacific/Fiji"), "FJ");
  assert.equal(geo.countryFromTimezone("Europe/Kyiv"), "UA"); // 신/구 별칭 모두
  assert.equal(geo.countryFromTimezone("Europe/Kiev"), "UA");
  assert.equal(geo.countryFromTimezone("Mars/Olympus"), ""); // None/변조 — 여전히 graceful
});
