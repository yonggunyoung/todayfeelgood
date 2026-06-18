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
