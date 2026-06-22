/* ⚡ 광클대전 — gc-util.js : Phase 2 순수 헬퍼 (나라대전 집계·배지/멘트 정제·내나라vs세계).
 * D2(모듈 분리·테스트 용이) 연장선: net.js/index.html 양쪽이 같은 순수 로직을 공유한다.
 * net.js는 Firebase 래퍼(브라우저 전용)라 직접 node 테스트가 어려우므로, 검증 대상 순수 로직만 분리.
 * 모든 함수는 순수(입력만으로 결정) + throw 금지 → tests/util.test.mjs 경계 4종(정상/매핑/None/변조).
 * 브라우저: window.GCUtil / Node(test): module.exports.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api; // Node 테스트
  if (root) root.GCUtil = api; // 브라우저
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // 배지/멘트 길이 상한(보안 #1: 타 사용자에게 노출되는 사용자입력 → 캡).
  // BADGE_MAX는 '문자(코드포인트) 수' 기준 — 이모지 1개(서로게이트 페어 포함)가 1로 세지게.
  var BADGE_MAX = 2; // 이모지/짧은 태그(예: "🔥","#1","S"). 보수적 2 코드포인트.
  var COMMENT_MAX = 24; // 한 줄 멘트.

  // 추천 배지 셋(설정 화면 칩) — 사용자는 직접 입력도 가능(아래 sanitize가 항상 캡).
  var BADGE_PRESET = ["", "🔥", "👑", "⚡", "💪", "🏆", "😎", "🐉", "🦁", "🚀", "💀", "🍀"];

  // 코드포인트 단위 안전 절단(이모지 서로게이트 페어를 쪼개지 않음).
  function sliceCP(s, max) {
    var out = "", n = 0;
    for (var i = 0; i < s.length; ) {
      var cp = s.codePointAt(i);
      if (cp == null) break;
      var ch = String.fromCodePoint(cp);
      if (n + 1 > max) break;
      out += ch; n += 1; i += ch.length;
    }
    return out;
  }

  // 제어문자 제거 + 양끝 공백 정리. 표시 안전용(esc는 렌더부 책임).
  // C0(\x00-\x1f, 개행·탭 포함)·DEL/C1(\x7f-\x9f) → 공백, 연속 공백은 1칸으로 축약.
  function stripCtrl(s) {
    return s.replace(/[\x00-\x1f\x7f-\x9f]/g, " ").replace(/\s+/g, " ").trim();
  }

  // 배지 정제: 문자열화 → 제어문자 제거 → 코드포인트 BADGE_MAX 캡 → 끝 ZWJ(합자 조각) 제거 → 양끝 공백 정리.
  // (캡이 ZWJ 합자 이모지를 쪼개 끝에 U+200D 조각이 남을 수 있어 제거. VS16(U+FE0F)은 표시에 필요하므로 보존.)
  function sanitizeBadge(v) {
    if (v == null || typeof v !== "string") return "";
    var s = stripCtrl(v);
    if (!s) return "";
    return sliceCP(s, BADGE_MAX).replace(/‍+$/, "").trim();
  }

  // 멘트 정제: 문자열화 → 제어문자 제거 → 코드포인트 COMMENT_MAX 캡. 비문자/빈값 → ''.
  function sanitizeComment(v) {
    if (v == null || typeof v !== "string") return "";
    var s = stripCtrl(v);
    if (!s) return "";
    return sliceCP(s, COMMENT_MAX);
  }

  // 국가 집계 맵 → 표시용 순위 배열.
  // 입력: countries = { US:{a,b}, KR:{a,b}, ... } (regions와 동일 패턴). null/변조 → [].
  // 출력(내림차순, 참여수 tot 기준): [{code,lead:'a'|'b',share:0~100,tot,a,b}]
  function countryStandings(countries, max) {
    var out = [];
    if (!countries || typeof countries !== "object") return out;
    var keys = Object.keys(countries);
    for (var i = 0; i < keys.length; i++) {
      var code = keys[i];
      var v = countries[code];
      if (!v || typeof v !== "object") continue;
      var a = num(v.a), b = num(v.b), sum = a + b;
      if (sum <= 0) continue;
      var lead = a >= b ? "a" : "b";
      var share = Math.round((lead === "a" ? a : b) / sum * 100);
      out.push({ code: code, lead: lead, share: share, tot: sum, a: a, b: b });
    }
    out.sort(function (x, y) { return y.tot - x.tot; });
    if (typeof max === "number" && max >= 0) out = out.slice(0, max);
    return out;
  }

  // "내 나라 vs 세계" — 내 나라 진영 비율 vs 나머지(세계) 진영 비율.
  // myCode 없거나(미상) 데이터 없으면 null (호출부가 섹션 자체를 숨김).
  // 반환 {mine:{a,b,tot,aShare}, world:{a,b,tot,aShare}} (aShare=A진영 %, 0~100).
  function myCountryVsWorld(countries, myCode) {
    if (!countries || typeof countries !== "object") return null;
    var c = typeof myCode === "string" ? myCode.trim().toUpperCase() : "";
    if (!c) return null;
    var mineV = countries[c];
    if (!mineV || typeof mineV !== "object") return null;
    var ma = num(mineV.a), mb = num(mineV.b), mtot = ma + mb;
    if (mtot <= 0) return null;
    var wa = 0, wb = 0, keys = Object.keys(countries);
    for (var i = 0; i < keys.length; i++) {
      if (keys[i] === c) continue;
      var v = countries[keys[i]];
      if (!v || typeof v !== "object") continue;
      wa += num(v.a); wb += num(v.b);
    }
    var wtot = wa + wb;
    return {
      mine: { a: ma, b: mb, tot: mtot, aShare: pct(ma, mtot) },
      world: { a: wa, b: wb, tot: wtot, aShare: wtot > 0 ? pct(wa, wtot) : 50 },
    };
  }

  function num(x) { var n = +x; return isFinite(n) && n > 0 ? n : 0; }
  function pct(part, total) { return total > 0 ? Math.max(0, Math.min(100, part / total * 100)) : 0; }

  return {
    BADGE_MAX: BADGE_MAX, COMMENT_MAX: COMMENT_MAX, BADGE_PRESET: BADGE_PRESET,
    sanitizeBadge: sanitizeBadge, sanitizeComment: sanitizeComment,
    countryStandings: countryStandings, myCountryVsWorld: myCountryVsWorld,
  };
});
