/* ⚡ 광클대전 — geo.js : 무료 국가 감지 (D1: 비AI·비용 0).
 * 신호 우선순위: navigator.language 지역서브태그 → 타임존 매핑 → '' (미상).
 * 외부 API·네트워크 0. 모든 함수는 순수(입력만으로 결정) → tests/geo.test.mjs 경계 4종 검증.
 * 브라우저: window.GCGeo / Node(test): module.exports.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api; // Node 테스트
  if (root) root.GCGeo = api; // 브라우저
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // ISO2 → 국기 이모지(지역표시기호). 변조/미상은 백색기.
  function flagOf(code) {
    if (typeof code !== "string") return "🏳️";
    var c = code.trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(c)) return "🏳️";
    return String.fromCodePoint(0x1f1e6 + (c.charCodeAt(0) - 65), 0x1f1e6 + (c.charCodeAt(1) - 65));
  }

  // "en-US","ko_KR","zh-Hans-CN" → 지역서브태그(대문자 ISO2). 없으면 ''.
  function countryFromLocale(lang) {
    if (typeof lang !== "string" || !lang) return "";
    var parts = lang.replace(/_/g, "-").split("-");
    for (var i = 1; i < parts.length; i++) {
      if (/^[A-Za-z]{2}$/.test(parts[i])) return parts[i].toUpperCase();
    }
    return "";
  }

  // IANA 타임존 → 국가(주요 도시 위주). 미상은 ''. (정밀 지오는 D1 탈출구로 후속.)
  var TZ = {
    "Asia/Seoul": "KR", "Asia/Pyongyang": "KP", "Asia/Tokyo": "JP", "Asia/Shanghai": "CN",
    "Asia/Hong_Kong": "HK", "Asia/Taipei": "TW", "Asia/Singapore": "SG", "Asia/Bangkok": "TH",
    "Asia/Jakarta": "ID", "Asia/Manila": "PH", "Asia/Ho_Chi_Minh": "VN", "Asia/Kuala_Lumpur": "MY",
    "Asia/Kolkata": "IN", "Asia/Dubai": "AE", "Asia/Karachi": "PK",
    "Europe/London": "GB", "Europe/Paris": "FR", "Europe/Berlin": "DE", "Europe/Madrid": "ES",
    "Europe/Rome": "IT", "Europe/Amsterdam": "NL", "Europe/Moscow": "RU", "Europe/Istanbul": "TR",
    "Europe/Warsaw": "PL", "Europe/Stockholm": "SE",
    "America/New_York": "US", "America/Chicago": "US", "America/Denver": "US", "America/Los_Angeles": "US",
    "America/Toronto": "CA", "America/Vancouver": "CA", "America/Mexico_City": "MX",
    "America/Sao_Paulo": "BR", "America/Buenos_Aires": "AR", "America/Argentina/Buenos_Aires": "AR",
    "Australia/Sydney": "AU", "Australia/Melbourne": "AU", "Pacific/Auckland": "NZ",
    "Africa/Johannesburg": "ZA", "Africa/Cairo": "EG", "Africa/Lagos": "NG",
  };
  function countryFromTimezone(tz) {
    if (typeof tz !== "string" || !tz) return "";
    return TZ[tz] || "";
  }

  // {lang, tz} 신호 결합. 둘 다 없으면 '' (호출부가 '전 세계'로 폴백).
  function detectCountry(opts) {
    opts = opts || {};
    return countryFromLocale(opts.lang) || countryFromTimezone(opts.tz) || "";
  }

  // 표시용 국가명(ko/en). 표에 없으면 코드 자체를 이름으로(불신 #1: 깨지지 않음).
  var NAMES = {
    KR: ["대한민국", "Korea"], JP: ["일본", "Japan"], CN: ["중국", "China"], US: ["미국", "USA"],
    GB: ["영국", "UK"], FR: ["프랑스", "France"], DE: ["독일", "Germany"], TW: ["대만", "Taiwan"],
    VN: ["베트남", "Vietnam"], TH: ["태국", "Thailand"], ID: ["인도네시아", "Indonesia"],
    PH: ["필리핀", "Philippines"], IN: ["인도", "India"], BR: ["브라질", "Brazil"],
    CA: ["캐나다", "Canada"], AU: ["호주", "Australia"], MX: ["멕시코", "Mexico"],
    ES: ["스페인", "Spain"], IT: ["이탈리아", "Italy"], RU: ["러시아", "Russia"],
    SG: ["싱가포르", "Singapore"], MY: ["말레이시아", "Malaysia"], HK: ["홍콩", "Hong Kong"],
  };
  function countryInfo(code) {
    var c = typeof code === "string" ? code.trim().toUpperCase() : "";
    var nm = NAMES[c];
    return {
      code: c,
      flag: flagOf(c),
      nameKo: nm ? nm[0] : c || "전 세계",
      nameEn: nm ? nm[1] : c || "Global",
    };
  }

  // 브라우저 실측 신호 수집(런타임 전용 — 순수 함수와 분리).
  function detectFromBrowser() {
    var lang = "", tz = "";
    try { lang = (navigator.languages && navigator.languages[0]) || navigator.language || ""; } catch (e) {}
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (e) {}
    return detectCountry({ lang: lang, tz: tz });
  }

  return {
    flagOf: flagOf,
    countryFromLocale: countryFromLocale,
    countryFromTimezone: countryFromTimezone,
    detectCountry: detectCountry,
    countryInfo: countryInfo,
    detectFromBrowser: detectFromBrowser,
  };
});
