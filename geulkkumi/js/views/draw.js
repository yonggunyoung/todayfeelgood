/* 글꾸미 — views/draw.js : 직접 그리기 → 도트(브라유)·문자·이모지 아트.
 * 흰 배경 + 검은 잉크 캔버스에 그리고, 다운샘플 → ascii-art 엔진으로 변환.
 */
"use strict";

import { el, copy, toast, debounce, share } from "../ui.js";
import { render as renderArt, imageDataToLum } from "../engine/ascii-art.js";
import { classify, codeBlock, compatBadge, widthWarning } from "../engine/channel.js";
import { downloadArtPng } from "../png.js";

const RES = 480;        // 내부 캔버스 해상도(정사각)
const INK = "#16181d", BG = "#ffffff";
const MODES = [
  { id: "braille", name: "도트" }, { id: "halfblocks", name: "하프블록" },
  { id: "ascii", name: "문자" }, { id: "emoji", name: "이모지" },
];

function dims(mode, cols) { // 정사각(ar=1) 기준
  if (mode === "braille") { const pw = cols * 2; return { pw, ph: pw }; }
  if (mode === "halfblocks" || mode === "emoji") { const pw = cols; return { pw, ph: pw }; }
  const pw = cols; return { pw, ph: Math.max(1, Math.round(pw * 0.5)) };
}

function mount(root) {
  const opt = { mode: "braille", width: 56, invert: false, pen: 14, erase: false };

  const canvas = el("canvas.draw-canvas", { width: RES, height: RES, "aria-label": "그림판" });
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.fillStyle = BG; ctx.fillRect(0, 0, RES, RES);
  ctx.lineCap = "round"; ctx.lineJoin = "round";

  const pre = el("pre.art-out.empty");
  const meta = el("div.art-meta", { "aria-live": "polite" }); // 채널 고지·폭 경고

  // ── 그리기 ────────────────────────────────────────────
  let drawing = false, lastX = 0, lastY = 0;
  const pos = (e) => {
    const r = canvas.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width * RES, (e.clientY - r.top) / r.height * RES];
  };
  const start = (e) => {
    e.preventDefault(); drawing = true; [lastX, lastY] = pos(e);
    ctx.beginPath(); ctx.fillStyle = opt.erase ? BG : INK;
    ctx.arc(lastX, lastY, (opt.erase ? opt.pen * 1.6 : opt.pen) / 2, 0, Math.PI * 2); ctx.fill();
    try { canvas.setPointerCapture(e.pointerId); } catch { /* noop */ }
  };
  const move = (e) => {
    if (!drawing) return; e.preventDefault();
    const [x, y] = pos(e);
    ctx.strokeStyle = opt.erase ? BG : INK;
    ctx.lineWidth = opt.erase ? opt.pen * 1.6 : opt.pen;
    ctx.beginPath(); ctx.moveTo(lastX, lastY); ctx.lineTo(x, y); ctx.stroke();
    [lastX, lastY] = [x, y];
  };
  const end = () => { if (drawing) { drawing = false; process(); } };
  canvas.addEventListener("pointerdown", start);
  canvas.addEventListener("pointermove", move);
  canvas.addEventListener("pointerup", end);
  canvas.addEventListener("pointerleave", end);

  // ── 변환 ──────────────────────────────────────────────
  function process() {
    const { pw, ph } = dims(opt.mode, opt.width);
    const t = el("canvas"); t.width = pw; t.height = ph;
    const c = t.getContext("2d", { willReadFrequently: true });
    c.fillStyle = BG; c.fillRect(0, 0, pw, ph);
    c.drawImage(canvas, 0, 0, pw, ph);
    const out = renderArt(imageDataToLum(c.getImageData(0, 0, pw, ph)),
      { mode: opt.mode, invert: opt.invert, dither: true });
    pre.textContent = out;
    const blank = !out.replace(/[\s⠀]/g, "");
    pre.classList.toggle("empty", blank);
    pre.classList.toggle("emoji", opt.mode === "emoji");
    if (blank) { meta.textContent = ""; cbBtn.style.display = "none"; }
    else {
      cbBtn.style.display = classify(out).kind === "emoji" ? "none" : "";
      const ww = widthWarning(out);
      meta.textContent = compatBadge(out).msg + (ww ? " · ↔ " + ww : "");
    }
  }
  const processDebounced = debounce(process, 100);

  function clearCanvas() { ctx.fillStyle = BG; ctx.fillRect(0, 0, RES, RES); process(); }

  // ── 옵션 UI ──────────────────────────────────────────
  const penLabel = el("span.opt-val", null, String(opt.pen));
  const pen = el("input", { type: "range", min: "4", max: "48", value: String(opt.pen), class: "slider" });
  pen.oninput = () => { opt.pen = +pen.value; penLabel.textContent = pen.value; };

  const eraseBtn = el("button.toggle", { type: "button" }, "🧽 지우개");
  eraseBtn.onclick = () => { opt.erase = !opt.erase; eraseBtn.classList.toggle("on", opt.erase); };
  const invertBtn = el("button.toggle", { type: "button" }, "반전");
  invertBtn.onclick = () => { opt.invert = !opt.invert; invertBtn.classList.toggle("on", opt.invert); process(); };

  const modeRow = el("div.chips");
  MODES.forEach((m) => {
    const b = el("button.chip-opt" + (m.id === opt.mode ? ".on" : ""), { type: "button", "data-mode": m.id }, m.name);
    b.onclick = () => {
      opt.mode = m.id;
      modeRow.querySelectorAll(".chip-opt").forEach((x) => x.classList.toggle("on", x.dataset.mode === m.id));
      if (m.id === "emoji" && opt.width > 40) { opt.width = 40; wSlider.value = "40"; wLabel.textContent = "40"; }
      process();
    };
    modeRow.append(b);
  });

  const wLabel = el("span.opt-val", null, String(opt.width));
  const wSlider = el("input", { type: "range", min: "16", max: "96", value: String(opt.width), class: "slider" });
  wSlider.oninput = () => { opt.width = +wSlider.value; wLabel.textContent = wSlider.value; processDebounced(); };

  const drawTools = el("div.toolbar", null, [
    eraseBtn,
    el("button.tbtn", { type: "button", onclick: clearCanvas }, "🗑 전체 지우기"),
  ]);

  const cbBtn = el("button.tbtn", { type: "button", onclick: () => copy(codeBlock(pre.textContent), "art") }, "⟨⟩ ``` 복사");
  cbBtn.style.display = "none";
  const actions = el("div.toolbar", null, [
    el("button.tbtn.primary", { type: "button", onclick: () => copy(pre.textContent, "art") }, "📋 복사"),
    cbBtn,
    el("button.tbtn", { type: "button", onclick: () => share(pre.textContent) }, "🔗 공유"),
    el("button.tbtn", { type: "button", onclick: () => downloadArtPng(pre.textContent, opt.mode, "geulkkumi-draw.png") }, "🖼️ 이미지 저장"),
  ]);

  const wrap = el("div.view.view-draw", null, [
    el("p.lead", null, "손으로 그리면 도트·문자 그림으로 — 이모지나 닉네임 옆 장식으로 딱."),
    el("div.draw-stage", null, [canvas]),
    el("label.opt", null, ["펜 굵기 ", pen, penLabel]),
    drawTools,
    el("div.options", null, [
      el("div.opt-title", null, "변환 방식"), modeRow,
      el("label.opt", null, ["해상도 ", wSlider, wLabel]),
      el("div.opt-row", null, [invertBtn]),
    ]),
    actions, pre, meta,
  ]);
  root.append(wrap);
  process();
}

export default { id: "draw", label: "그리기", icon: "✏️", mount };
