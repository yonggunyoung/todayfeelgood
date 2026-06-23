/* 글꾸미 — views/fonts.js : 멋글씨(특수문자·폰트) 변환 — 히어로 화면.
 * 입력 → 30+ 유니코드 스타일 실시간 미리보기 + 한글 자모/초성/데코. 탭 복사.
 */
"use strict";

import { el, clear, copy, debounce, toast } from "../ui.js";
import { isFavorite, toggleFavorite, setSetting } from "../store.js";
import { convertAll } from "../engine/unicode-fonts.js";
import { decompose, chosung, deco } from "../engine/hangul.js";

const SAMPLE = "글꾸미 Type Aa1";
let taRef = null;
let pending = "";

const HANGUL_DECOS = ["🌸", "⭐", "❤", "✨", "·", "ᰔ"];

function resultRow(name, value, kind) {
  const star = el("button.fout-star", {
    type: "button", "aria-label": "즐겨찾기", title: "즐겨찾기",
    text: isFavorite(value) ? "★" : "☆", "aria-pressed": isFavorite(value),
    onclick: (e) => {
      e.stopPropagation();
      const on = toggleFavorite(value, kind || "font");
      star.textContent = on ? "★" : "☆";
      star.setAttribute("aria-pressed", on);
      toast(on ? "즐겨찾기에 담음 ★" : "즐겨찾기 해제");
    },
  });
  const val = el("button.fout-val", {
    type: "button", title: "탭하면 복사",
    onclick: () => { copy(value, kind || "font"); setSetting("lastStyle", name); },
  }, value);
  return el("div.fout", null, [el("div.fout-name", null, name), val, star]);
}

function render(out, ta) {
  const raw = ta.value;
  const text = raw.trim() ? raw : SAMPLE;
  const dim = !raw.trim();
  clear(out);

  const list = el("div.fout-list" + (dim ? ".dim" : ""));
  convertAll(text).forEach((s) => list.append(resultRow(s.name, s.result)));
  out.append(el("div.sec-title", null, ["✨ 영문·숫자 멋글씨", el("span.sec-sub", null, "탭하면 바로 복사")]), list);

  if (/[가-힣]/.test(text)) {
    const k = el("div.fout-list");
    k.append(resultRow("자모 분해", decompose(text), "hangul"));
    k.append(resultRow("초성체", chosung(text), "hangul"));
    HANGUL_DECOS.forEach((sym) => k.append(resultRow("한글 데코 " + sym, deco(text, sym), "hangul")));
    out.append(el("div.sec-title", null, ["🇰🇷 한글 변환"]), k);
  }
}

function mount(root) {
  const wrap = el("div.view.view-fonts");
  const ta = el("textarea.input", {
    rows: 2, placeholder: "여기에 입력 → 아래에서 원하는 멋글씨를 탭하면 복사돼요",
    "aria-label": "변환할 텍스트",
  });
  taRef = ta;
  if (pending) { ta.value = pending; pending = ""; }

  const out = el("div.fout-wrap", { "aria-live": "polite" });
  const update = debounce(() => render(out, ta), 90);
  ta.addEventListener("input", update);

  const tools = el("div.toolbar", null, [
    el("button.tbtn", { type: "button", onclick: async () => {
      try { ta.value = await navigator.clipboard.readText(); update(); }
      catch { toast("붙여넣기 권한이 없어요 — 직접 붙여넣어 주세요", "warn"); }
    } }, "📋 붙여넣기"),
    el("button.tbtn", { type: "button", onclick: () => { ta.value = ""; ta.focus(); update(); } }, "✕ 지우기"),
  ]);

  wrap.append(
    el("p.lead", null, "입력 한 번이면 30가지 넘는 멋글씨로 — 인스타·카톡·게임 닉네임에 그대로 붙여넣기."),
    ta, tools, out,
  );
  root.append(wrap);
  render(out, ta);
}

export function prefill(text) {
  pending = text || "";
  if (taRef) { taRef.value = pending; pending = ""; taRef.dispatchEvent(new Event("input")); }
}

export default { id: "fonts", label: "멋글씨", icon: "✨", mount };
