/* 글꾸미 — views/library.js : 꾸미기 DB(특수문자·카오모지·혼합 생성·텍대).
 * 세그먼트 4개 + 검색 + 카테고리. 탭 복사·즐겨찾기. '혼합'은 폰트+프레임+끼우기 합성기.
 */
"use strict";

import { el, clear, copyChip, copy, share, toast, debounce } from "../ui.js";
import { SYMBOLS, allSymbolItems } from "../data/symbols.js";
import { KAOMOJI, allKaomoji } from "../data/kaomoji.js";
import { FRAMES, DECO_LINES, BLOCKS, renderTemplate } from "../data/templates.js";
import { STYLES, convert } from "../engine/unicode-fonts.js";
import { mix } from "../engine/decorate.js";
import { openPreview } from "../preview.js";

const SEGMENTS = [
  { id: "symbols", name: "특수문자" },
  { id: "kaomoji", name: "이모티콘" },
  { id: "mix", name: "혼합 생성" },
  { id: "deco", name: "텍대·구분선" },
];

function grid(items, kind) {
  const g = el("div.sym-grid");
  items.forEach((it) => g.append(copyChip(it.char, { kind, label: it.char })));
  if (!items.length) g.append(el("div.empty-note", null, "검색 결과가 없어요"));
  return g;
}

function catChips(cats, active, onPick) {
  const row = el("div.chips.cat-row");
  const mk = (id, name) => {
    const b = el("button.chip-opt" + (id === active ? ".on" : ""), { type: "button", dataset: { id } }, name);
    b.onclick = () => onPick(id);
    return b;
  };
  row.append(mk("all", "전체"));
  cats.forEach((c) => row.append(mk(c.id, c.name)));
  return row;
}

// ── 특수문자 / 카오모지 공통 렌더 ──────────────────────────
function browseSection(allCats, flatAll, kind) {
  const box = el("div.lib-section");
  let cat = "all", q = "";
  const body = el("div");
  function refresh() {
    let items;
    if (q) {
      const k = q.toLowerCase();
      items = flatAll.filter((it) => it.char.includes(q) || (it.keywords && it.keywords.includes(q)) || it.cat.includes(q) || it.cat.toLowerCase().includes(k));
    } else if (cat === "all") {
      items = flatAll;
    } else {
      const c = allCats.find((x) => x.id === cat);
      items = c ? c.items.map((ch) => ({ char: ch })) : [];
    }
    clear(body); body.append(grid(items, kind));
  }
  const search = el("input.input.search", { type: "search", placeholder: "기호·이모티콘 검색 (예: 하트, star, 화살표)" });
  search.addEventListener("input", debounce(() => { q = search.value.trim(); refresh(); }, 80));
  const cats = catChips(allCats, cat, (id) => {
    cat = id; q = ""; search.value = "";
    box.querySelectorAll(".cat-row .chip-opt").forEach((b) => b.classList.toggle("on", b.dataset.id === id));
    refresh();
  });
  box.append(search, cats, body);
  refresh();
  return box;
}

// ── 혼합 생성기 ────────────────────────────────────────────
function mixSection() {
  const box = el("div.lib-section");
  const state = { text: "예쁘게", style: "boldscript", frame: FRAMES[0].tpl, sep: "" };

  const preview = el("div.mix-preview", { "aria-live": "polite" });
  const input = el("input.input", { value: state.text, placeholder: "여기에 글자를 입력하세요" });

  const styleSel = el("select.select");
  styleSel.append(el("option", { value: "" }, "원본 글꼴"));
  STYLES.forEach((s) => styleSel.append(el("option", { value: s.id }, s.name)));
  styleSel.value = state.style;

  const frameSel = el("select.select");
  frameSel.append(el("option", { value: "" }, "프레임 없음"));
  FRAMES.forEach((f) => frameSel.append(el("option", { value: f.tpl }, f.name)));
  frameSel.value = state.frame;

  const seps = ["", " ", "·", "˚", "♡", "✦", "🌸", "ᰔ"];
  const sepRow = el("div.chips");
  seps.forEach((s) => {
    const b = el("button.chip-opt" + (s === state.sep ? ".on" : ""), { type: "button" }, s === "" ? "없음" : s);
    b.onclick = () => { state.sep = s; sepRow.querySelectorAll(".chip-opt").forEach((x) => x.classList.remove("on")); b.classList.add("on"); render(); };
    sepRow.append(b);
  });

  function compute() {
    const styled = state.style ? convert(state.text || "", state.style) : (state.text || "");
    return mix(styled, { interleaveSep: state.sep, frame: state.frame });
  }
  function render() {
    const out = compute();
    clear(preview);
    preview.append(el("div.mix-out", null, out || "…"));
  }
  input.addEventListener("input", debounce(() => { state.text = input.value; render(); }, 70));
  styleSel.onchange = () => { state.style = styleSel.value; render(); };
  frameSel.onchange = () => { state.frame = frameSel.value; render(); };

  const actions = el("div.toolbar", null, [
    el("button.tbtn.primary", { type: "button", onclick: () => copy(compute(), "mix") }, "📋 복사"),
    el("button.tbtn", { type: "button", onclick: () => openPreview(compute()) }, "👁 미리보기"),
    el("button.tbtn", { type: "button", onclick: () => share(compute()) }, "🔗 공유"),
  ]);

  box.append(
    el("p.lead", null, "글꼴 + 끼우기 + 프레임을 섞어 나만의 꾸민 글씨를 만들어요."),
    input,
    el("label.opt", null, ["글꼴", styleSel]),
    el("label.opt", null, ["프레임", frameSel]),
    el("div.opt-title", null, "글자 사이 기호"), sepRow,
    preview, actions,
  );
  render();
  return box;
}

// ── 텍대·구분선 ────────────────────────────────────────────
function decoSection() {
  const box = el("div.lib-section");
  const lines = el("div.deco-list");
  DECO_LINES.forEach((s) => lines.append(copyChip(s, { kind: "deco", label: s })));

  const blockWrap = el("div");
  const blockInput = el("input.input", { value: "글꾸미", placeholder: "텍대 안에 들어갈 글자" });
  function renderBlocks() {
    clear(blockWrap);
    BLOCKS.forEach((b) => {
      const out = renderTemplate(b.tpl, blockInput.value || "");
      const card = el("div.block-card", null, [
        el("div.block-name", null, b.name),
        el("pre.block-out", null, out),
        el("div.toolbar", null, [
          el("button.tbtn", { type: "button", onclick: () => copy(out, "block") }, "복사"),
          el("button.tbtn", { type: "button", onclick: () => share(out) }, "공유"),
        ]),
      ]);
      blockWrap.append(card);
    });
  }
  blockInput.addEventListener("input", debounce(renderBlocks, 80));

  box.append(
    el("div.sec-title", null, "구분선·장식 (탭하면 복사)"), lines,
    el("div.sec-title", null, "텍대 블록"), blockInput, blockWrap,
  );
  renderBlocks();
  return box;
}

function mount(root) {
  let seg = "symbols";
  const wrap = el("div.view.view-library");
  const segRow = el("div.segmented");
  const body = el("div.lib-body");

  // 전역 검색: 특수문자 + 이모티콘 + 구분선을 한 번에.
  const combined = [
    ...allSymbolItems(),
    ...allKaomoji(),
    ...DECO_LINES.map((s) => ({ char: s, cat: "구분선", keywords: "구분선 라인 divider" })),
  ];
  const globalSearch = el("input.input.search", { type: "search",
    placeholder: "전체 검색 — 기호·이모티콘·구분선 (예: 하트, ㅋㅋ, 화살표)" });
  function runGlobal() {
    const q = globalSearch.value.trim();
    if (!q) { renderSeg(); return; }
    const k = q.toLowerCase();
    const items = combined.filter((it) => it.char.includes(q)
      || (it.keywords && (it.keywords.includes(q) || it.keywords.toLowerCase().includes(k)))
      || it.cat.includes(q));
    clear(body);
    body.append(el("div.sec-title", null, [`🔎 “${q}” ${items.length}개`]), grid(items, "search"));
  }
  globalSearch.addEventListener("input", debounce(runGlobal, 80));

  function renderSeg() {
    clear(body);
    if (seg === "symbols") body.append(browseSection(SYMBOLS, allSymbolItems(), "symbol"));
    else if (seg === "kaomoji") body.append(browseSection(KAOMOJI, allKaomoji(), "kaomoji"));
    else if (seg === "mix") body.append(mixSection());
    else body.append(decoSection());
  }
  SEGMENTS.forEach((s) => {
    const b = el("button.seg" + (s.id === seg ? ".on" : ""), { type: "button" }, s.name);
    b.onclick = () => {
      seg = s.id; globalSearch.value = "";
      segRow.querySelectorAll(".seg").forEach((x) => x.classList.toggle("on", x === b));
      renderSeg();
    };
    segRow.append(b);
  });

  wrap.append(globalSearch, segRow, body);
  root.append(wrap);
  renderSeg();
}

export default { id: "library", label: "꾸미기", icon: "🎀", mount };
