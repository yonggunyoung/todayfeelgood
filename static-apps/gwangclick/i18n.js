/* ⚡ 광클대전 — i18n.js : 언어 선택 + 문자열 사전 (D3: 가산적, KR 폴백).
 * pickLang/t 는 순수 함수 → tests/i18n.test.mjs 경계 4종 검증.
 * STR 키가 없으면 ko로, ko에도 없으면 key 자체 반환(불신 #1: 절대 빈화면 X).
 * 브라우저: window.GCI18n / Node(test): module.exports.
 * ※ STR는 index.html 배선 단계에서 점진 확장(현재는 기반 셋).
 */
(function (root, factory) {
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.GCI18n = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var SUPPORTED = ["ko", "en"];

  // navigator.language 류 입력 → 'ko'|'en'. 한국어면 ko, 그 외 en, 미상/빈값은 ko(보수적 폴백 #1).
  function pickLang(input) {
    if (typeof input !== "string" || !input.trim()) return "ko";
    return /^ko(-|_|$)/i.test(input.trim()) ? "ko" : "en";
  }

  var STR = {
    ko: {
      live: "LIVE", liveWorld: "전 세계 동시", demo: "데모 · 흐름 시뮬",
      worldTitle: "세계 광클대전", todayFlow: "전국 흐름", worldFlow: "세계 흐름",
      joinA: "{a}로 참전", joinB: "{b}로 참전",
      tapHint: "60초 동안 미친듯이 탭 → 내 편 흐름을 끌어와라. 콤보를 이으면 한 탭이 ×3까지.",
      firstJoin: "오늘의 첫 참전자가 되어보세요", streakDays: "{n}일 연속 참전",
      myContribution: "내 기여도", rankNation: "우리나라 순위", connecting: "🔴 전 세계 실시간 집계 연결 중…",
    },
    en: {
      live: "LIVE", liveWorld: "Worldwide live", demo: "Demo · simulated",
      worldTitle: "World Click Battle", todayFlow: "National flow", worldFlow: "World flow",
      joinA: "Join {a}", joinB: "Join {b}",
      tapHint: "Tap like crazy for 60s → pull the flow to your side. Combos boost a tap up to ×3.",
      firstJoin: "Be today's first to join", streakDays: "{n}-day streak",
      myContribution: "My contribution", rankNation: "Your country's rank", connecting: "🔴 Connecting to worldwide live count…",
    },
  };

  // (lang, key, vars?) → 문자열. 폴백: lang→ko→key. {placeholder} 치환.
  function t(lang, key, vars) {
    var L = SUPPORTED.indexOf(lang) >= 0 ? lang : "ko";
    var dict = STR[L] || STR.ko;
    var s = dict[key];
    if (s == null) s = STR.ko[key];
    if (s == null) return key;
    if (vars && typeof s === "string") {
      s = s.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? String(vars[k]) : m; });
    }
    return s;
  }

  return { SUPPORTED: SUPPORTED, pickLang: pickLang, t: t, STR: STR };
});
