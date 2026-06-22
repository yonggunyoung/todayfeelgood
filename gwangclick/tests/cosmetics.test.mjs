// gc-cosmetics.js 경계 테스트 — 정상 / 매핑 / None / 변조 (CLAUDE.md §8 #1)
// 대상: 카탈로그 무결성 · isUnlocked/unlock 리듀서 · equip 검증 · refCode 생성/파싱.
// Phase 3 핵심: 꾸미기는 표현만(게임 수치 불변), 잠긴 항목은 절대 적용/장착되지 않음.
import { test } from "node:test";
import assert from "node:assert/strict";
import cos from "../gc-cosmetics.js";

const {
  CATALOG, FREE_IDS, itemById, isKnownId, defaultIdFor,
  normState, isUnlocked, unlock, equip,
  equippedFxColors, equippedFxStyle, equippedNameColor,
  premiumBadges, isPremiumBadge, badgeOf, refCode, parseRef,
} = cos;

test("CATALOG — 무결성(고유 id·필수 필드·양어 라벨·유효 kind/unlock)", () => {
  assert.ok(Array.isArray(CATALOG) && CATALOG.length >= 6 && CATALOG.length <= 12); // 작고 단정하게
  const ids = new Set();
  const KINDS = new Set(["tapFx", "nameColor", "badge"]);
  const UNLOCKS = new Set(["free", "ad", "invite"]);
  for (const c of CATALOG) {
    assert.equal(typeof c.id, "string");
    assert.ok(!ids.has(c.id), "id 고유: " + c.id);
    ids.add(c.id);
    assert.ok(KINDS.has(c.kind), "kind 유효: " + c.kind);
    assert.ok(UNLOCKS.has(c.unlock), "unlock 유효: " + c.unlock);
    assert.ok(c.label && typeof c.label.ko === "string" && c.label.ko, "ko 라벨: " + c.id);
    assert.ok(c.label && typeof c.label.en === "string" && c.label.en, "en 라벨: " + c.id);
    if (c.kind === "badge") assert.ok(typeof c.badge === "string" && c.badge, "배지 이모지: " + c.id);
    if (c.kind === "tapFx") assert.ok(c.colors === null || Array.isArray(c.colors), "tapFx colors: " + c.id);
    if (c.kind === "nameColor") assert.ok(c.color === null || typeof c.color === "string", "nameColor: " + c.id);
  }
  // 각 표현 kind에 free 기본이 정확히 존재(빈 상태에서도 동작 보장).
  assert.ok(defaultIdFor("tapFx"), "tapFx free 기본 존재");
  assert.ok(defaultIdFor("nameColor"), "nameColor free 기본 존재");
  assert.ok(FREE_IDS.length >= 2);
  // 광고/초대 둘 다 존재(D6 수익+성장 경로).
  assert.ok(CATALOG.some((c) => c.unlock === "ad"), "ad 해금 항목 존재");
  assert.ok(CATALOG.some((c) => c.unlock === "invite"), "invite 해금 항목 존재");
});

test("itemById/isKnownId — 정상/매핑/None/변조", () => {
  assert.equal(itemById("fx_gold").kind, "tapFx"); // 정상
  assert.ok(isKnownId("nm_mint")); // 정상
  assert.equal(isKnownId("fx_GOLD"), false); // 매핑 없음(대소문자 구분) → 미상
  assert.equal(itemById("nope"), null); // None(미상)
  assert.equal(isKnownId(""), false); // None
  assert.equal(isKnownId(null), false); // 변조
  assert.equal(isKnownId(42), false); // 변조
  assert.equal(itemById({}), null); // 변조
});

test("normState — 정상(free 자동·equipped 폴백)", () => {
  const st = normState({}); // 빈 상태
  for (const id of FREE_IDS) assert.ok(st.unlocked.includes(id), "free 자동 해금: " + id);
  assert.equal(st.equipped.tapFx, defaultIdFor("tapFx")); // 기본 장착
  assert.equal(st.equipped.nameColor, defaultIdFor("nameColor"));
});

test("normState — 매핑(중복제거·정상 장착 유지)", () => {
  const st = normState({ unlocked: ["fx_gold", "fx_gold", "nm_gold"], cosmetics: { tapFx: "fx_gold", nameColor: "nm_gold" } });
  assert.equal(st.unlocked.filter((x) => x === "fx_gold").length, 1); // 중복 1개로
  assert.ok(st.unlocked.includes("nm_gold"));
  assert.equal(st.equipped.tapFx, "fx_gold"); // 해금된 항목 장착 유지
  assert.equal(st.equipped.nameColor, "nm_gold");
});

test("normState — None/변조(미상 id·잠긴 장착·이상 타입 폴백)", () => {
  // 미상 id는 unlocked에서 제거
  const a = normState({ unlocked: ["fx_gold", "ghost", "", null, 7], cosmetics: {} });
  assert.ok(a.unlocked.includes("fx_gold"));
  assert.ok(!a.unlocked.includes("ghost"));
  assert.ok(!a.unlocked.includes(""));
  // 잠긴(미해금) 항목을 장착하려 해도 free로 폴백 (잠긴 항목 절대 적용 X)
  const b = normState({ unlocked: [], cosmetics: { tapFx: "fx_gold", nameColor: "nm_gold" } });
  assert.equal(b.equipped.tapFx, defaultIdFor("tapFx"));
  assert.equal(b.equipped.nameColor, defaultIdFor("nameColor"));
  // kind 불일치 장착(닉색 자리에 탭이펙트 id) → 폴백
  const c = normState({ unlocked: ["fx_gold"], cosmetics: { nameColor: "fx_gold" } });
  assert.equal(c.equipped.nameColor, defaultIdFor("nameColor"));
  // 완전 변조 F → throw 금지, 기본 상태
  assert.doesNotThrow(() => normState(null));
  assert.doesNotThrow(() => normState(42));
  assert.doesNotThrow(() => normState("x"));
  const d = normState({ unlocked: "not-array", cosmetics: "nope" });
  assert.ok(d.unlocked.length === FREE_IDS.length); // free만
});

test("isUnlocked — 정상/매핑/None/변조 (free 항상 true·미상 항상 false)", () => {
  const F = { unlocked: ["fx_gold"] };
  assert.equal(isUnlocked(F, "fx_gold"), true); // 정상
  assert.equal(isUnlocked(F, "fx_default"), true); // 매핑: free 는 unlocked에 없어도 true
  assert.equal(isUnlocked(F, "nm_gold"), false); // None: 미해금
  assert.equal(isUnlocked(F, "ghost"), false); // 변조: 미상 id
  assert.equal(isUnlocked(null, "fx_default"), true); // 변조 F라도 free는 true
  assert.equal(isUnlocked(null, "fx_gold"), false);
});

test("unlock — 정상/이중해금/None/변조 (멱등·미상 무시·free 보존)", () => {
  let u = [];
  u = unlock(u, "fx_gold"); // 정상 해금
  assert.ok(u.includes("fx_gold"));
  for (const id of FREE_IDS) assert.ok(u.includes(id), "free 보존: " + id);
  const before = u.slice();
  u = unlock(u, "fx_gold"); // 이중 해금 → 변화 없음(멱등)
  assert.equal(u.filter((x) => x === "fx_gold").length, 1);
  assert.deepEqual(u.sort(), before.sort());
  // 미상 id → 추가 안 됨(변조 방어)
  const v = unlock(["fx_gold"], "ghost");
  assert.ok(!v.includes("ghost"));
  // None/변조 입력에도 throw 금지 + free 포함 배열 반환
  assert.doesNotThrow(() => unlock(null, "fx_gold"));
  assert.ok(unlock(null, "fx_gold").includes("fx_gold"));
  assert.doesNotThrow(() => unlock("bad", "nm_gold"));
  assert.doesNotThrow(() => unlock(undefined, undefined));
});

test("equip — 정상/매핑/None/변조 (미해금·미상·kind불일치·badge 거부)", () => {
  const unlocked = unlock([], "fx_gold"); // fx_gold 해금
  const c1 = equip({}, "tapFx", "fx_gold", unlocked); // 정상 장착
  assert.equal(c1.tapFx, "fx_gold");
  // 미해금 장착 시도 → 무시(변경 없음)
  const c2 = equip({}, "tapFx", "fx_neon", unlocked);
  assert.equal(c2.tapFx, undefined);
  // 미상 id → 무시
  const c3 = equip({ tapFx: "fx_gold" }, "tapFx", "ghost", unlocked);
  assert.equal(c3.tapFx, "fx_gold"); // 기존 유지
  // kind 불일치(닉색 자리에 탭이펙트) → 무시
  const c4 = equip({}, "nameColor", "fx_gold", unlocked);
  assert.equal(c4.nameColor, undefined);
  // badge kind는 equip에서 거부(별도 경로)
  const ub = unlock([], "bd_diamond");
  const c5 = equip({}, "badge", "bd_diamond", ub);
  assert.equal(c5.badge, undefined);
  // None/변조 → throw 금지
  assert.doesNotThrow(() => equip(null, "tapFx", "fx_gold", unlocked));
  assert.doesNotThrow(() => equip(42, null, null, null));
  assert.doesNotThrow(() => equip({}, "tapFx", "fx_gold", "bad-unlocked"));
});

test("equippedFxColors/Style — 잠긴 항목 절대 적용 안 됨(폴백)", () => {
  const fallback = ["#aaa", "#bbb"];
  // 해금+장착 → 카탈로그 색
  const F = { unlocked: ["fx_gold"], cosmetics: { tapFx: "fx_gold" } };
  assert.deepEqual(equippedFxColors(F, fallback), itemById("fx_gold").colors);
  assert.equal(equippedFxStyle(F), "spark");
  // 잠긴 항목을 장착했다 쳐도 normState가 기본으로 폴백 → fallback(진영색) 사용
  const locked = { unlocked: [], cosmetics: { tapFx: "fx_neon" } };
  assert.deepEqual(equippedFxColors(locked, fallback), fallback);
  // 기본(colors:null)은 항상 fallback 사용
  assert.deepEqual(equippedFxColors({}, fallback), fallback);
  // fallback 자체가 변조면 안전한 흰색
  assert.deepEqual(equippedFxColors({}, null), ["#ffffff"]);
  assert.doesNotThrow(() => equippedFxStyle(null));
});

test("equippedNameColor — 정상/잠금폴백/기본빈값/변조", () => {
  assert.equal(equippedNameColor({ unlocked: ["nm_gold"], cosmetics: { nameColor: "nm_gold" } }), "#ffd76a"); // 정상
  assert.equal(equippedNameColor({ unlocked: [], cosmetics: { nameColor: "nm_gold" } }), ""); // 잠김 → 기본('')
  assert.equal(equippedNameColor({}), ""); // 기본(null) → 빈값(테마 기본색)
  assert.equal(equippedNameColor(null), ""); // 변조 → 빈값
});

test("프리미엄 배지 화이트리스트 — 정상/매핑/None/변조", () => {
  const pb = premiumBadges();
  assert.ok(pb.length >= 2);
  assert.ok(isPremiumBadge("💎")); // 정상(카탈로그 등록)
  assert.equal(isPremiumBadge("🔥"), false); // 매핑: 무료 프리셋 배지는 프리미엄 아님
  assert.equal(isPremiumBadge(""), false); // None
  assert.equal(isPremiumBadge(null), false); // 변조
  // badgeOf: 해금돼야만 배지값 반환, 아니면 ''(거부)
  assert.equal(badgeOf({ unlocked: ["bd_diamond"] }, "bd_diamond"), "💎"); // 해금됨
  assert.equal(badgeOf({ unlocked: [] }, "bd_diamond"), ""); // 미해금 → 거부
  assert.equal(badgeOf({ unlocked: ["bd_diamond"] }, "fx_gold"), ""); // kind 불일치
  assert.equal(badgeOf({ unlocked: ["bd_diamond"] }, "ghost"), ""); // 미상
  assert.equal(badgeOf(null, null), ""); // 변조
});

test("refCode — 정상(결정적·영숫자6)/None/변조", () => {
  const a = refCode("uid-123");
  assert.match(a, /^[A-Z0-9]{6}$/); // 영숫자 6자
  assert.equal(a, refCode("uid-123")); // 결정적(같은 시드 → 같은 코드)
  assert.notEqual(a, refCode("uid-456")); // 다른 시드 → 보통 다름
  assert.match(refCode(""), /^[A-Z0-9]{6}$/); // None → anon 시드로 안전
  assert.match(refCode(null), /^[A-Z0-9]{6}$/); // 변조
  assert.match(refCode(12345), /^[A-Z0-9]{6}$/); // 변조(숫자) → 문자열화
});

test("parseRef — 정상/매핑/None/변조 (주입 방어·영숫자만)", () => {
  assert.equal(parseRef("?ref=ABC123"), "ABC123"); // 정상(쿼리)
  assert.equal(parseRef("https://x.com/?a=1&ref=xyz789&b=2"), "XYZ789"); // 매핑(URL 중간 + 대문자화)
  assert.equal(parseRef("ABC123"), "ABC123"); // 매핑(코드 단독)
  assert.equal(parseRef("?ref=<script>"), "SCRIPT"); // 변조: 비영숫자 제거(주입 방어)
  assert.equal(parseRef("?ref=ab cd"), "AB"); // 변조: 공백에서 절단(쿼리 토큰)
  assert.equal(parseRef(""), ""); // None
  assert.equal(parseRef(null), ""); // 변조
  assert.equal(parseRef(42), ""); // 변조(비문자)
  // 빈 ref 값("?ref=")은 정규식이 매칭 안 함 → 입력 전체를 코드로 보고 영숫자화("REF"). 해금 미사용이라 무해.
  assert.equal(parseRef("?ref="), "REF");
  assert.equal(parseRef("no-ref-here"), "NOREFHERE".slice(0, 12)); // 코드로 간주(영숫자화)
  assert.ok(parseRef("A".repeat(50)).length <= 12); // 길이 캡
});
