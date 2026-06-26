/* 글꾸미 — views/fonts.js : 멋글씨 변환(히어로).
 * 한글을 치면 '한글 꾸미기'를 맨 위에(프레임·끼우기·원/괄호 한글·자모/초성),
 * 그 아래 영문·숫자 멋글씨(자주 쓰는 순). 글자수 카운터·호환성 ⚠·탭 복사.
 */
"use strict";

import { el, clear, copy, debounce, toast } from "../ui.js";
import { isFavorite, toggleFavorite, setSetting, settings } from "../store.js";
import { convertAll, convert, zalgo, mixStyle } from "../engine/unicode-fonts.js";
import { decompose, chosung, deco, circledHangul, parenHangul } from "../engine/hangul.js";
import { applyFrame, randomDecorate } from "../engine/decorate.js";
import { FRAMES } from "../data/templates.js";
import { openPreview } from "../preview.js";

const SAMPLE = "글꾸미 Aa1";
let taRef = null;
let pending = "";

// 한글용 프레임 프리셋(항상 눈에 띄게 변함) + 사이 기호.
const KO_PRESETS = [
  "꒰ {} ꒱", "˚ʚ {} ɞ˚", "♡ {} ♡", "『 {} 』", "⋆｡°✩ {} ✩°｡⋆",
  "⭒˚｡⋆ {} ⭒˚｡⋆", "☾ {} ☽", "❀ {} ❀", "˗ˏˋ {} ´ˎ˗", "【 {} 】",
];
const KO_SEPS = ["˚", "⋆", "·", "♡", "✦", "𓏲"];

function bumpRecent(name) {
  const cur = (settings().recentStyles || []).filter((n) => n !== name);
  cur.unshift(name);
  setSetting("recentStyles", cur.slice(0, 6));
}

function resultRow(name, value, kind, risk) {
  const star = el("button.fout-star", {
    type: "button", "aria-label": "즐겨찾기", title: "즐겨찾기",
    text: isFavorite(value) ? "★" : "☆", "aria-pressed": isFavorite(value) ? "true" : "false",
    onclick: (e) => {
      e.stopPropagation();
      const on = toggleFavorite(value, kind || "font");
      star.textContent = on ? "★" : "☆";
      star.setAttribute("aria-pressed", on ? "true" : "false");
      toast(on ? "즐겨찾기에 담음 ★" : "즐겨찾기 해제");
    },
  });
  const nameCell = el("div.fout-name", {
    title: risk ? "일부 앱(인스타·일부 안드로이드)에서 깨질 수 있어요" : null,
  }, risk ? name + " ⚠" : name);
  const val = el("button.fout-val", {
    type: "button", title: "탭하면 복사",
    onclick: () => { copy(value, kind || "font"); if ((kind || "font") === "font") bumpRecent(name); },
  }, value);
  const pv = el("button.fout-pv", {
    type: "button", title: "미리보기", "aria-label": "붙여넣기 미리보기",
    onclick: (e) => { e.stopPropagation(); openPreview(value); },
  }, "👁");
  return el("div.fout" + (risk ? ".risky" : ""), null, [nameCell, val, pv, star]);
}

function renderKorean(out, text) {
  const list = el("div.fout-list");
  KO_PRESETS.forEach((tpl) => list.append(resultRow("꾸민 한글", applyFrame(tpl, text), "hangul")));
  KO_SEPS.forEach((s) => list.append(resultRow("사이 " + s, deco(text, s), "hangul")));
  list.append(resultRow("팔다리체", zalgo(text, 1, 0, 1), "hangul", true));
  list.append(resultRow("뚫는 한글", zalgo(text, 2, 0, 2), "hangul", true));
  const ch = circledHangul(text); if (ch !== text) list.append(resultRow("원문자 한글", ch, "hangul"));
  const ph = parenHangul(text); if (ph !== text) list.append(resultRow("괄호 한글", ph, "hangul"));
  list.append(resultRow("자모 분해", decompose(text), "hangul"));
  list.append(resultRow("초성체", chosung(text), "hangul"));
  out.append(el("div.sec-title", null, ["🇰🇷 한글 꾸미기", el("span.sec-sub", null, "탭하면 복사")]), list);
}

function renderEnglish(out, text, dim) {
  const recent = settings().recentStyles || [];
  const all = convertAll(text);
  // Tier 1(안전): 자주 쓰는 순으로 위에
  const safe = all.filter((s) => s.tier === 1).sort((a, b) => {
    const ra = recent.indexOf(a.name), rb = recent.indexOf(b.name);
    return (ra < 0 ? 999 : ra) - (rb < 0 ? 999 : rb);
  });
  const risky = all.filter((s) => s.tier >= 2); // Tier 2~3: 주의
  const l1 = el("div.fout-list" + (dim ? ".dim" : ""));
  safe.forEach((s) => l1.append(resultRow(s.name, s.result, "font", false)));
  out.append(el("div.sec-title", null, ["✨ 영문·숫자 멋글씨", el("span.sec-sub", null, "안전 · 자주 쓰는 순 · 탭 복사")]), l1);
  const l2 = el("div.fout-list" + (dim ? ".dim" : ""));
  risky.forEach((s) => l2.append(resultRow(s.name, s.result, "font", true)));
  out.append(el("div.sec-title", null, ["⚠️ 개성 스타일", el("span.sec-sub", null, "인스타 이름칸·일부 안드로이드에서 깨질 수 있어요")]), l2);
}

// 무AI 맥락 추천 — 입력 특징(한글/영문/숫자/이모지/ㅋㅠ)에 어울리는 한 탭 결과.
function recommend(text) {
  const out = [];
  const ko = /[가-힣]/.test(text), en = /[A-Za-z]/.test(text), num = /\d/.test(text);
  const emo = /[\u{1F300}-\u{1FAFF}☀-➿]/u.test(text), laugh = /[ㅋㅎㅠㅜ]/.test(text);
  if (ko) { out.push(["한글 데코", applyFrame("˚ʚ {} ɞ˚", text)], ["별가루", applyFrame("⋆｡°✩ {} ✩°｡⋆", text)]); }
  if (en) { out.push(["볼드", convert(text, "bold")], ["필기체", convert(text, "boldscript")]); }
  if (num && !ko) out.push(["전각", convert(text, "fullwidth")]);
  if (laugh) out.push(["하트", applyFrame("♡ {} ♡", text)]);
  if (emo) out.push(["반짝 프레임", applyFrame("✧･ﾟ {} ﾟ･✧", text)]);
  out.push(["와이드", convert(text, "wide")]);
  const seen = new Set(), uniq = [];
  for (const [n, v] of out) if (v && !seen.has(v)) { seen.add(v); uniq.push([n, v]); }
  return uniq.slice(0, 5);
}

// 🎲 믹스 & 자판기 — '개성' 생성 동선(조합 생성 철학). 시드 리롤로 무한 변주.
const VEND_STYLES = ["bold", "boldscript", "fullwidth", "sansbold", "script", "smallcaps", "italic", "fraktur"];
const VEND_SEPS = ["", "·", "˚", "⋆", "♡", "✦", "ᰔ", "₊˚"];
const VEND_FRAMES = FRAMES.map((f) => f.tpl);
function vending(text, seed) {
  const styled = convert(text, VEND_STYLES[((seed % VEND_STYLES.length) + VEND_STYLES.length) % VEND_STYLES.length]);
  return randomDecorate(styled, seed, { frames: VEND_FRAMES, seps: VEND_SEPS });
}

// 값이 리롤로 바뀌는 행 — 탭 복사 · 🎲 다시뽑기 · 👁 미리보기.
function playRow(name, startSeed, compute) {
  let seed = startSeed;
  const val = el("button.fout-val", { type: "button", title: "탭하면 복사" });
  const apply = () => { val.textContent = compute(seed) || "…"; };
  val.onclick = () => copy(val.textContent, "font");
  const dice = el("button.fout-pv", {
    type: "button", title: "다시 뽑기", "aria-label": "다시 뽑기",
    onclick: (e) => { e.stopPropagation(); seed++; apply(); },
  }, "🎲");
  const pv = el("button.fout-pv", {
    type: "button", title: "미리보기", "aria-label": "붙여넣기 미리보기",
    onclick: (e) => { e.stopPropagation(); openPreview(val.textContent); },
  }, "👁");
  apply();
  return el("div.fout", null, [el("div.fout-name", null, name), val, dice, pv]);
}

function renderPlay(out, text) {
  const list = el("div.fout-list");
  if (mixStyle(text, 7) !== text) list.append(playRow("믹스체", 7, (s) => mixStyle(text, s)));
  list.append(playRow("꾸미기 자판기", 3, (s) => vending(text, s)));
  out.append(el("div.sec-title", null, ["🎲 믹스 & 자판기", el("span.sec-sub", null, "🎲로 다시 뽑기 · 탭 복사")]), list);
}

function renderRecommend(out, text) {
  const recs = recommend(text);
  if (!recs.length) return;
  const row = el("div.rec-row");
  recs.forEach(([name, value]) => row.append(el("button.rec-chip", {
    type: "button", title: "탭하면 복사", onclick: () => copy(value, "font"),
  }, [el("span.rec-name", null, name), el("span.rec-val", null, value)])));
  out.append(el("div.sec-title", null, ["⭐ 추천", el("span.sec-sub", null, "입력에 어울리는 — 탭 복사")]), row);
}

function counterText(raw) {
  const n = [...raw].length;
  if (!n) return "";
  let warn = "";
  if (n > 280) warn = " · X 280자 초과";
  else if (n > 150) warn = " · 인스타 바이오(150) 근처";
  else if (n > 20) warn = " · 카톡 닉(20) 초과";
  return `보이는 ${n}자${warn}`;
}

function render(out, ta, counter) {
  const raw = ta.value;
  const text = raw.trim() ? raw : SAMPLE;
  const dim = !raw.trim();
  if (counter) {
    const c = counterText(raw);
    counter.textContent = c;
    counter.classList.toggle("warn", /초과|근처/.test(c));
  }
  clear(out);
  const hasKo = /[가-힣]/.test(text);
  const hasLatin = /[A-Za-z0-9]/.test(text);
  if (!dim) renderRecommend(out, text); // 실제 입력 시에만 추천
  if (!dim) renderPlay(out, text);      // 믹스체·자판기(개성 생성)
  if (hasKo) renderKorean(out, text);
  // 순수 한글 입력이면 영문 30줄(원본 그대로)은 생략 — 중복 노이즈 제거.
  if (hasLatin || !hasKo) renderEnglish(out, text, dim);
}

function mount(root) {
  const wrap = el("div.view.view-fonts");
  const ta = el("textarea.input", {
    rows: 2, placeholder: "여기에 입력 → 아래에서 원하는 글씨를 탭하면 복사돼요 (한글·영문 모두)",
    "aria-label": "변환할 텍스트",
  });
  taRef = ta;
  if (pending) { ta.value = pending; pending = ""; }

  const counter = el("span.counter", { "aria-live": "polite" });
  const out = el("div.fout-wrap", { "aria-live": "polite" });
  const update = debounce(() => render(out, ta, counter), 90);
  ta.addEventListener("input", update);

  const tools = el("div.toolbar", null, [
    el("button.tbtn", { type: "button", onclick: async () => {
      try { ta.value = await navigator.clipboard.readText(); update(); }
      catch { toast("붙여넣기 권한이 없어요 — 직접 붙여넣어 주세요", "warn"); }
    } }, "📋 붙여넣기"),
    el("button.tbtn", { type: "button", onclick: () => { ta.value = ""; ta.focus(); update(); } }, "✕ 지우기"),
    counter,
  ]);

  wrap.append(
    el("p.lead", null, "입력 한 번이면 한글·영문 멋글씨로 — 인스타·카톡·디스코드·게임 닉네임에 바로 붙여넣기."),
    ta, tools, out,
  );
  root.append(wrap);
  render(out, ta, counter);
}

export function prefill(text) {
  pending = text || "";
  if (taRef) { taRef.value = pending; pending = ""; taRef.dispatchEvent(new Event("input")); }
}

export default { id: "fonts", label: "멋글씨", icon: "✨", mount };
