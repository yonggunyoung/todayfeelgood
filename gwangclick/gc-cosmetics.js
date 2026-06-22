/* ⚡ 광클대전 — gc-cosmetics.js : Phase 3 순수 헬퍼 (꾸미기 카탈로그 + 해금/장착 리듀서 + 레퍼럴 코드).
 * D2(모듈 분리·테스트 용이)·D6(수익화=기존 광고 어댑터 위에 꾸미기 해금) 연장선.
 *  - 꾸미기는 100% '표현'만 — 콤보/탭/점수/밸런스에 절대 영향 없음(경계 #3: 게임플레이 수치 불변).
 *  - 모든 함수는 순수(입력만으로 결정) + throw 금지 → tests/cosmetics.test.mjs 경계 4종(정상/매핑/None/변조).
 *  - 해금 상태는 로컬(F.unlocked=[ids], F.cosmetics={tapFx,nameColor}) — Firestore 신규 제출 없음(비용 0·하위호환).
 * 브라우저: window.GCCos / Node(test): module.exports.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api; // Node 테스트
  if (root) root.GCCos = api; // 브라우저
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* ── 카탈로그 ──
   * 각 항목: { id, kind, unlock, label:{ko,en}, ...payload }
   *  - kind: 'tapFx'(탭 파티클 색/스타일) | 'nameColor'(닉 색 — 로컬 전용) | 'badge'(프리미엄 배지)
   *  - unlock: 'free'(기본 해금) | 'ad'(보상형 광고) | 'invite'(초대/공유)
   *  - tapFx payload: { colors:[hex...], style:'spark'|'star' }  (style은 표현용 힌트)
   *  - nameColor payload: { color:'#hex' }  (오직 본인만 보는 닉 틴트 → Firestore 미제출)
   *  - badge payload: { badge:'<이모지>' }  (기존 배지 제출 경로 재사용 — 화이트리스트는 아래 isPremiumBadge)
   * D6 비용 0: 광고=수익 경로 / 초대=성장 경로. 외부 광고망 직삽 ❌(토스 §6).
   */
  var CATALOG = [
    // 탭 이펙트(파티클 색·스타일) — 배틀 화면 탭 시 fxSpark 색/모양에 반영.
    { id: "fx_default", kind: "tapFx", unlock: "free",
      label: { ko: "기본 스파크", en: "Default spark" }, colors: null, style: "spark" }, // colors:null = 진영색(런타임) 사용
    { id: "fx_gold", kind: "tapFx", unlock: "ad",
      label: { ko: "황금 폭죽", en: "Golden burst" }, colors: ["#ffd76a", "#ffb33a", "#ffffff"], style: "spark" },
    { id: "fx_neon", kind: "tapFx", unlock: "ad",
      label: { ko: "네온 펄스", en: "Neon pulse" }, colors: ["#36e0c8", "#7b6ef0", "#ffffff"], style: "spark" },
    { id: "fx_star", kind: "tapFx", unlock: "invite",
      label: { ko: "별가루", en: "Stardust" }, colors: ["#ffffff", "#ffe27a", "#9ad0ff"], style: "star" },

    // 이름 색(닉 틴트) — 결과/리더보드의 '내(나)/(you)' 행에만 적용. 로컬 전용(타인 미노출 → 제출 없음).
    { id: "nm_default", kind: "nameColor", unlock: "free",
      label: { ko: "기본 색", en: "Default" }, color: null }, // null = 테마 기본(--ink)
    { id: "nm_gold", kind: "nameColor", unlock: "ad",
      label: { ko: "골드 닉네임", en: "Gold name" }, color: "#ffd76a" },
    { id: "nm_mint", kind: "nameColor", unlock: "invite",
      label: { ko: "민트 닉네임", en: "Mint name" }, color: "#12b39a" },

    // 프리미엄 배지 — 무료 BADGE_PRESET(gc-util.js) 너머의 배지. 기존 배지 제출 경로 재사용(화이트리스트).
    { id: "bd_crown_star", kind: "badge", unlock: "ad",
      label: { ko: "별왕관", en: "Star crown" }, badge: "🌟" },
    { id: "bd_diamond", kind: "badge", unlock: "invite",
      label: { ko: "다이아", en: "Diamond" }, badge: "💎" },
    { id: "bd_meteor", kind: "badge", unlock: "ad",
      label: { ko: "유성", en: "Meteor" }, badge: "☄️" },
  ];

  // 기본 해금(free) 항목 id 목록 — normState가 항상 포함시킴(불신 #1: 빈 상태에서도 기본은 동작).
  var FREE_IDS = CATALOG.filter(function (c) { return c.unlock === "free"; }).map(function (c) { return c.id; });
  // id → 항목 인덱스(O(1) 조회). 알 수 없는 id는 null.
  var BY_ID = {};
  for (var i = 0; i < CATALOG.length; i++) BY_ID[CATALOG[i].id] = CATALOG[i];

  function itemById(id) { return (typeof id === "string" && BY_ID[id]) || null; }
  function isKnownId(id) { return !!itemById(id); }

  // kind별 기본(free) 항목 id — 장착 폴백에 사용.
  function defaultIdFor(kind) {
    for (var i = 0; i < CATALOG.length; i++) if (CATALOG[i].kind === kind && CATALOG[i].unlock === "free") return CATALOG[i].id;
    return "";
  }

  /* ── 상태 정규화(불신 #1) ──
   * 외부(localStorage)에서 온 F.unlocked / F.cosmetics 는 변조됐을 수 있음 → 항상 재조립.
   * 반환: { unlocked:[알려진 id만, free 포함, 중복제거], equipped:{tapFx, nameColor} }
   *  - equipped 값은 '해금된 알려진 id'만 허용, 아니면 그 kind의 free 기본으로 폴백.
   *  - badge kind는 equipped에 두지 않음(배지는 기존 설정 UI의 배지값으로 장착 — applyBadgeChoice 참고).
   */
  function normState(F) {
    F = (F && typeof F === "object") ? F : {};
    var rawU = Array.isArray(F.unlocked) ? F.unlocked : [];
    var set = {}, unlocked = [];
    // free 는 무조건 해금
    for (var i = 0; i < FREE_IDS.length; i++) { if (!set[FREE_IDS[i]]) { set[FREE_IDS[i]] = 1; unlocked.push(FREE_IDS[i]); } }
    for (var j = 0; j < rawU.length; j++) {
      var id = rawU[j];
      if (isKnownId(id) && !set[id]) { set[id] = 1; unlocked.push(id); } // 알 수 없는 id·중복은 버림(변조 방어)
    }
    var rawC = (F.cosmetics && typeof F.cosmetics === "object") ? F.cosmetics : {};
    var equipped = {
      tapFx: pickEquipped(rawC.tapFx, "tapFx", set),
      nameColor: pickEquipped(rawC.nameColor, "nameColor", set),
    };
    return { unlocked: unlocked, equipped: equipped };
  }
  // 장착 후보가 (알려진 + 해당 kind + 해금됨)이면 그대로, 아니면 free 기본.
  function pickEquipped(id, kind, unlockedSet) {
    var it = itemById(id);
    if (it && it.kind === kind && unlockedSet[id]) return id;
    return defaultIdFor(kind);
  }

  // 해금 여부 — free 는 항상 true. (정규화된 배열 없이도 단독 판정 가능하게 F 직접 수용.)
  function isUnlocked(F, id) {
    if (!isKnownId(id)) return false; // 알 수 없는 id는 해금 불가(변조 방어)
    var st = normState(F);
    for (var i = 0; i < st.unlocked.length; i++) if (st.unlocked[i] === id) return true;
    return false;
  }

  /* 해금 리듀서 — 순수: (현재 unlocked 배열, id) → 새 unlocked 배열.
   * 알 수 없는 id는 무시(변조 방어). 이미 해금이면 그대로(중복 해금 방어). free 는 항상 포함.
   * 호출부: F.unlocked = GCCos.unlock(F.unlocked, id); persist();
   */
  function unlock(unlockedArr, id) {
    var base = Array.isArray(unlockedArr) ? unlockedArr : [];
    var st = normState({ unlocked: base });
    if (!isKnownId(id)) return st.unlocked; // 변조: 그대로(추가 없음)
    for (var i = 0; i < st.unlocked.length; i++) if (st.unlocked[i] === id) return st.unlocked; // 이미 있음
    return st.unlocked.concat([id]);
  }

  /* 장착 검증 리듀서 — 순수: (현재 cosmetics 맵, kind, id, 해금배열) → 새 cosmetics 맵.
   * 해금되지 않았거나 kind 불일치/미상 id면 변경 없이 그대로(불신 #1). badge kind는 거부(별도 경로).
   */
  function equip(cosmetics, kind, id, unlockedArr) {
    var out = (cosmetics && typeof cosmetics === "object") ? clone(cosmetics) : {};
    if (kind !== "tapFx" && kind !== "nameColor") return out; // badge 등은 여기서 처리 안 함
    var it = itemById(id);
    if (!it || it.kind !== kind) return out; // 미상/불일치 → 무시
    var set = {}; var u = normState({ unlocked: unlockedArr }).unlocked;
    for (var i = 0; i < u.length; i++) set[u[i]] = 1;
    if (!set[id]) return out; // 미해금 → 무시(잠긴 항목 장착 금지)
    out[kind] = id;
    return out;
  }
  function clone(o) { var r = {}; for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) r[k] = o[k]; return r; }

  /* ── 장착값 → 렌더 입력(잠긴 항목은 절대 적용 안 됨: normState가 free로 폴백) ── */
  // 탭 이펙트 색 배열. colors:null(기본)이면 fallbackColors(진영색)를 반환 → 호출부가 그대로 fxSpark에 사용.
  function equippedFxColors(F, fallbackColors) {
    var it = itemById(normState(F).equipped.tapFx);
    if (it && Array.isArray(it.colors) && it.colors.length) return it.colors.slice();
    return Array.isArray(fallbackColors) && fallbackColors.length ? fallbackColors.slice() : ["#ffffff"];
  }
  function equippedFxStyle(F) {
    var it = itemById(normState(F).equipped.tapFx);
    return it && it.style ? it.style : "spark";
  }
  // 닉 색(로컬 전용). 기본(null)이면 '' 반환 → 호출부가 색 미적용(테마 기본).
  function equippedNameColor(F) {
    var it = itemById(normState(F).equipped.nameColor);
    return it && typeof it.color === "string" ? it.color : "";
  }

  /* ── 프리미엄 배지 화이트리스트(보안 #1) ──
   * 배지는 기존 제출 경로(net.js)로 타 사용자에게 노출됨 → 카탈로그에 등록된 'badge' 항목의 정확한 이모지만 허용.
   * 자유 입력 배지(무료 BADGE_PRESET 포함)는 기존 sanitizeBadge가 담당 — 여기선 '프리미엄 배지인지'만 판정.
   */
  function premiumBadges() {
    var out = []; for (var i = 0; i < CATALOG.length; i++) if (CATALOG[i].kind === "badge") out.push(CATALOG[i].badge);
    return out;
  }
  function isPremiumBadge(emoji) { return premiumBadges().indexOf(emoji) >= 0; }
  // 사용자가 프리미엄 배지를 '장착'하려 할 때: 해금된 카탈로그 배지값만 통과, 아니면 ''(거부).
  function badgeOf(F, id) {
    var it = itemById(id);
    if (!it || it.kind !== "badge") return "";
    if (!isUnlocked(F, id)) return ""; // 미해금 → 거부
    return it.badge || "";
  }

  /* ── 레퍼럴 코드(초대 성장 경로, 비용 0 · 백엔드 없음) ──
   * 코드 = 영숫자 6자(uid/시드에서 결정). 공유 링크 ?ref=<code> 부착용. 파싱은 '표시/저장'만, 해금 판정엔 미사용(불신 #1).
   */
  function refCode(seed) {
    var s = (seed == null ? "" : String(seed));
    if (!s) s = "anon";
    // FNV-1a 32bit → base36 6자 패딩(결정적·충돌 무해: 표시·링크용일 뿐).
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 16777619) >>> 0; }
    var c = (h >>> 0).toString(36).toUpperCase();
    while (c.length < 6) c = "0" + c;
    return c.slice(0, 6);
  }
  // "?ref=ABC123" / "http://x/?ref=abc123&y=1" / "ABC123" → 정규화 코드(영숫자 1~12, 대문자) | "".
  function parseRef(input) {
    if (typeof input !== "string" || !input) return "";
    var raw = input;
    var m = input.match(/[?&]ref=([^&#\s]+)/i); // URL/쿼리에서 추출
    if (m) raw = m[1];
    try { raw = decodeURIComponent(raw); } catch (e) {}
    raw = raw.replace(/[^A-Za-z0-9]/g, "").toUpperCase(); // 영숫자만(주입 방어)
    return raw ? raw.slice(0, 12) : "";
  }

  return {
    CATALOG: CATALOG, FREE_IDS: FREE_IDS,
    itemById: itemById, isKnownId: isKnownId, defaultIdFor: defaultIdFor,
    normState: normState, isUnlocked: isUnlocked, unlock: unlock, equip: equip,
    equippedFxColors: equippedFxColors, equippedFxStyle: equippedFxStyle, equippedNameColor: equippedNameColor,
    premiumBadges: premiumBadges, isPremiumBadge: isPremiumBadge, badgeOf: badgeOf,
    refCode: refCode, parseRef: parseRef,
  };
});
