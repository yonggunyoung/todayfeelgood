// 글꾸미 — 리빌드 라운드 테스트: 신규 스타일 7종 · 타깃 호환 · 프리셋 · 오늘의 추천.
import { test } from "node:test";
import assert from "node:assert/strict";
import { convert, STYLES } from "../js/engine/unicode-fonts.js";
import { TARGETS, getTarget, rateForTarget, counterFor, countFor } from "../js/engine/targets.js";
import { NICK_PRESETS, renderNick } from "../js/data/presets.js";
import { dailyPicks, dateSeed } from "../js/engine/daily.js";

test("신규 스타일 7종 — 등록·매핑·대소문자 동일", () => {
  for (const id of ["roundy", "currency", "fauxcyr", "greek", "runes", "glitter", "underspark"])
    assert.ok(STYLES.some((s) => s.id === id), id + " 등록");
  assert.equal(convert("A", "roundy"), "ᗩ");
  assert.equal(convert("a", "roundy"), "ᗩ");          // 소문자도 같은 모양
  assert.equal(convert("Y", "currency"), "¥");
  assert.equal(convert("R", "fauxcyr"), "Я");
  assert.equal(convert("W", "greek"), "Ω");
  assert.equal(convert("b", "runes"), "ᛒ");
  assert.equal(convert("A", "glitter"), "A꙰");         // 결합 U+A670
  assert.equal(convert("ab", "underspark"), "a͙b͙");
  assert.equal(convert("한", "roundy"), "한");          // 미매핑 원형 유지
  assert.ok(STYLES.length >= 37, "스타일 37+ (현재 " + STYLES.length + ")");
});

test("타깃 호환 — 글자수 초과·한줄·결합문자·게임닉 규칙", () => {
  assert.equal(TARGETS.length >= 7, true);
  assert.equal(getTarget("없음").id, "free");           // 폴백
  // 카톡 닉 20자: 21자는 warn + 잘림 노트
  const long = "가".repeat(21);
  const r1 = rateForTarget("kakaoNick", long);
  assert.equal(r1.level, "warn"); assert.equal(r1.over, 1);
  assert.match(r1.notes.join(" "), /초과/);
  // 인스타 이름: 결합문자 warn
  const r2 = rateForTarget("igName", "a̶b̶");
  assert.equal(r2.level, "warn");
  assert.match(r2.notes.join(" "), /결합문자/);
  // 게임닉: astral(수학 볼드) → strict warn
  const r3 = rateForTarget("gameNick", convert("abc", "bold"));
  assert.equal(r3.level, "warn");
  // 인스타 이름: astral은 info 수준(안내)
  const r4 = rateForTarget("igName", convert("abc", "bold"));
  assert.equal(r4.level, "info");
  // 안전 케이스
  const r5 = rateForTarget("kakaoNick", "유미");
  assert.equal(r5.level, "ok");
  assert.match(r5.notes[0], /남음/);
  // 자유: 제한 없음 + 카운터 null
  assert.equal(rateForTarget("free", "아무거나").level, "ok");
  assert.equal(counterFor("free", "abc"), null);
  const c = counterFor("kakaoNick", "가나다");
  assert.equal(c.text.startsWith("3/20자"), true); assert.equal(c.over, false);
  assert.equal(countFor("😀a"), 2);                     // 코드포인트 단위
});

test("닉 프리셋 — 44+ 레시피, 렌더에 사용자 글자 포함(변형 감안)", () => {
  assert.ok(NICK_PRESETS.length >= 44, "프리셋 44+ (현재 " + NICK_PRESETS.length + ")");
  const ids = new Set(NICK_PRESETS.map((p) => p.id));
  assert.equal(ids.size, NICK_PRESETS.length, "id 중복 없음");
  for (const p of NICK_PRESETS) {
    const out = renderNick(p, "yumi");
    assert.equal(typeof out, "string");
    assert.ok(out.length >= 4, p.id + " 결과 유효");
  }
  // 스타일 없는 프리셋은 원문이 그대로 들어간다
  const plain = NICK_PRESETS.find((p) => !p.style && !p.sep);
  assert.ok(renderNick(plain, "유미").includes("유미"));
  assert.equal(renderNick(null, "x"), "x");
});

test("오늘의 글꾸밈 — 날짜 결정론 + 날짜 바뀌면 변화", () => {
  const a1 = dailyPicks("2026-06-27");
  const a2 = dailyPicks("2026-06-27");
  assert.deepEqual(a1, a2);                              // 같은 날 = 같은 추천
  assert.ok(a1.kaomoji && a1.preset && a1.line);
  const b = dailyPicks("2026-06-28");
  assert.notDeepEqual({ k: a1.kaomoji, p: a1.preset.id }, { k: b.kaomoji, p: b.preset.id });
  assert.equal(dateSeed("2026-06-27"), dateSeed("2026-06-27"));
});
